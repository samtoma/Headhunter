import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
    Activity, AlertCircle, RefreshCw, Clock, Server, TrendingUp, AlertTriangle,
    CheckCircle, XCircle, ChevronDown, ChevronUp, Database, Trash2, Zap, Gauge, Wifi, WifiOff, Brain, Sparkles
} from 'lucide-react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend, ReferenceLine } from 'recharts'

// Helper function to identify AI/LLM endpoints
const isAiEndpoint = (path) => {
    return (
        path.includes('/company/regenerate') ||
        path.includes('/departments/generate') ||
        path.includes('/jobs/analyze') ||
        path.includes('/interviews/') && (path.includes('generate-feedback') || path.includes('stream-feedback'))
    )
}

const AdminLogsDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview")
    const [metrics, setMetrics] = useState(null)
    const [logs, setLogs] = useState([])
    const [invitations, setInvitations] = useState([])
    const [errors, setErrors] = useState([])
    const [loading, setLoading] = useState(true)

    // New state for enhanced dashboard
    const [health, setHealth] = useState(null)
    const [uxAnalytics, setUxAnalytics] = useState(null)
    const [dbStats, setDbStats] = useState(null)
    const [cleanupPreview, setCleanupPreview] = useState(null)
    const [cleanupDays, setCleanupDays] = useState(30)
    const [isCleaningUp, setIsCleaningUp] = useState(false)
    const [healthHistory, setHealthHistory] = useState(null)
    const [historyHours, setHistoryHours] = useState(24)
    const [historyInterval, setHistoryInterval] = useState(1) // minutes, default 1 minute for higher granularity
    const [refreshRate, setRefreshRate] = useState(5) // seconds
    const [llmMetrics, setLlmMetrics] = useState(null)
    const [llmCompanyFilter, setLlmCompanyFilter] = useState('')
    const [thresholds, setThresholds] = useState({
        response_time_warning_ms: 200,
        response_time_critical_ms: 500,
        error_rate_warning_percent: 1.0,
        error_rate_critical_percent: 5.0,
        p95_warning_ms: 300,
        p95_critical_ms: 500,
        p99_warning_ms: 500,
        p99_critical_ms: 1000
    })
    const [wsConnected, setWsConnected] = useState(false)
    const [reconnectTrigger, setReconnectTrigger] = useState(0)
    const [showAboutSection, setShowAboutSection] = useState(true)
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)

    // Filters
    const [filters, setFilters] = useState({
        level: "",
        component: "",
        action: "",
        startDate: "",
        endDate: "",
        searchText: "",
        hasError: null
    })

    const [pagination, setPagination] = useState({
        limit: 100,
        offset: 0,
        total: 0
    })

    const [expandedLogs, setExpandedLogs] = useState(new Set())

    // Fetch thresholds on mount
    useEffect(() => {
        fetchThresholds()
    }, [])

    // WebSocket connection for real-time updates
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            console.log('No token found, skipping WebSocket connection')
            return
        }

        // Determine WebSocket URL - use same protocol and host as current page
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = window.location.host

        // Try different paths based on environment
        // In dev with Vite proxy: /api/api/v1/admin/ws/monitoring (proxy removes first /api)
        // In production: /api/v1/admin/ws/monitoring (direct to backend)
        const isDev = import.meta.env.DEV
        const wsPath = isDev
            ? '/api/api/v1/admin/ws/monitoring'  // Vite proxy will rewrite /api to empty
            : '/api/v1/admin/ws/monitoring'       // Direct path in production
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}?token=${encodeURIComponent(token)}`

        console.log('Attempting WebSocket connection:', {
            url: wsUrl.replace(/token=[^&]+/, 'token=***'),
            isDev,
            protocol: wsProtocol,
            host: wsHost
        })

        try {
            wsRef.current = new WebSocket(wsUrl)

            wsRef.current.onopen = () => {
                console.log('✅ WebSocket connected successfully')
                setWsConnected(true)
                // Set initial refresh rate
                try {
                    wsRef.current.send(JSON.stringify({
                        type: 'set_refresh_rate',
                        refresh_interval: refreshRate
                    }))
                } catch (e) {
                    console.error('Error sending initial refresh rate:', e)
                }
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'monitoring_update') {
                        // Update metrics from WebSocket
                        if (data.metrics) {
                            setMetrics(prev => ({
                                ...prev,
                                ...data.metrics,
                                error_rate_24h: data.metrics.error_rate_24h
                            }))
                        }
                        // Only update health if it has all services (4 services: Database, Redis, Celery, ChromaDB)
                        if (data.health && data.health.services && data.health.services.length >= 4) {
                            setHealth(data.health)
                        }
                    } else if (data.type === 'error') {
                        console.error('WebSocket error message:', data.message)
                    }
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e)
                }
            }

            wsRef.current.onerror = (error) => {
                console.error('❌ WebSocket error:', error)
                console.error('WebSocket readyState:', wsRef.current?.readyState)
                setWsConnected(false)
            }

            wsRef.current.onclose = (event) => {
                console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason)
                setWsConnected(false)
                // Clear any existing reconnect timeout
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current)
                }
                // Attempt to reconnect after 5 seconds if it wasn't a normal closure
                if (event.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (wsRef.current?.readyState === WebSocket.CLOSED || !wsRef.current) {
                            console.log('Attempting to reconnect WebSocket...')
                            // Trigger reconnection by updating reconnectTrigger state
                            setReconnectTrigger(prev => prev + 1)
                        }
                    }, 5000)
                }
            }
        } catch (error) {
            console.error('Failed to create WebSocket:', error)
            setWsConnected(false)
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
                reconnectTimeoutRef.current = null
            }
            if (wsRef.current) {
                console.log('Cleaning up WebSocket connection')
                wsRef.current.close()
                wsRef.current = null
            }
        }
    }, [refreshRate, reconnectTrigger])

    // Update refresh rate via WebSocket
    useEffect(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'set_refresh_rate',
                refresh_interval: refreshRate
            }))
        }
    }, [refreshRate])

    useEffect(() => {
        // Initial fetch (WebSocket will handle updates)
        fetchMetrics()
        fetchHealth()
        fetchUxAnalytics()
        fetchDbStats()
        if (activeTab === "logs") {
            fetchLogs()
        } else if (activeTab === "invitations") {
            fetchInvitations()
        } else if (activeTab === "errors") {
            fetchErrors()
        } else if (activeTab === "health-history") {
            fetchHealthHistory()
        } else if (activeTab === "llm") {
            fetchLlmMetrics()
        }
    }, [activeTab, filters, pagination.offset, historyHours, historyInterval])

    const fetchThresholds = async () => {
        try {
            const res = await axios.get('/api/api/v1/admin/thresholds')
            setThresholds(res.data)
        } catch (err) {
            console.error("Failed to fetch thresholds", err)
        }
    }

    const fetchMetrics = async () => {
        try {
            const res = await axios.get('/api/api/v1/admin/metrics')
            setMetrics(res.data)
        } catch (err) {
            console.error("Failed to fetch metrics", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchHealth = async () => {
        try {
            const res = await axios.get('/api/api/v1/admin/health')
            setHealth(res.data)
        } catch (err) {
            console.error("Failed to fetch health", err)
        }
    }

    const fetchUxAnalytics = async () => {
        try {
            const res = await axios.get('/api/api/v1/admin/ux-analytics?hours=24')
            setUxAnalytics(res.data)
        } catch (err) {
            console.error("Failed to fetch UX analytics", err)
        }
    }

    const fetchDbStats = async () => {
        try {
            const res = await axios.get('/api/api/v1/admin/database/stats')
            setDbStats(res.data)
        } catch (err) {
            console.error("Failed to fetch DB stats", err)
        }
    }

    const previewCleanup = async () => {
        try {
            const res = await axios.delete(`/api/api/v1/admin/logs/cleanup?older_than_days=${cleanupDays}&confirm=false`)
            setCleanupPreview(res.data)
        } catch (err) {
            console.error("Failed to preview cleanup", err)
        }
    }

    const executeCleanup = async () => {
        if (!window.confirm(`Are you sure you want to delete ${cleanupPreview?.logs_to_delete} logs?`)) return
        setIsCleaningUp(true)
        try {
            await axios.delete(`/api/api/v1/admin/logs/cleanup?older_than_days=${cleanupDays}&confirm=true`)
            setCleanupPreview(null)
            fetchMetrics()
            fetchLogs()
        } catch (err) {
            console.error("Failed to cleanup", err)
        } finally {
            setIsCleaningUp(false)
        }
    }

    const fetchLogs = async () => {
        try {
            const params = new URLSearchParams()
            if (filters.level) params.append('level', filters.level)
            if (filters.component) params.append('component', filters.component)
            if (filters.action) params.append('action', filters.action)
            if (filters.startDate) params.append('start_date', filters.startDate)
            if (filters.endDate) params.append('end_date', filters.endDate)
            if (filters.searchText) params.append('search_text', filters.searchText)
            if (filters.hasError !== null) params.append('has_error', filters.hasError)
            params.append('limit', pagination.limit)
            params.append('offset', pagination.offset)

            const res = await axios.get(`/api/api/v1/admin/logs?${params}`)
            setLogs(res.data)
        } catch (err) {
            console.error("Failed to fetch logs", err)
        }
    }

    const fetchInvitations = async () => {
        try {
            const res = await axios.get('/api/api/v1/admin/invitations')
            setInvitations(res.data)
        } catch (err) {
            console.error("Failed to fetch invitations", err)
        }
    }

    const fetchErrors = async () => {
        try {
            const res = await axios.get('/api/api/v1/admin/errors?limit=50')
            setErrors(res.data)
        } catch (err) {
            console.error("Failed to fetch errors", err)
        }
    }

    const fetchLlmMetrics = async () => {
        try {
            const params = new URLSearchParams()
            if (llmCompanyFilter) {
                params.append('company_id', llmCompanyFilter)
            }
            const url = `/api/api/v1/admin/llm/metrics${params.toString() ? '?' + params.toString() : ''}`
            const res = await axios.get(url)
            setLlmMetrics(res.data)
        } catch (err) {
            console.error("Failed to fetch LLM metrics", err)
        }
    }

    const fetchHealthHistory = async () => {
        try {
            const res = await axios.get(`/api/api/v1/admin/health/history?hours=${historyHours}&interval_minutes=${historyInterval}`)
            setHealthHistory(res.data)
        } catch (err) {
            console.error("Failed to fetch health history", err)
        }
    }

    const toggleLogExpand = (logId) => {
        const newExpanded = new Set(expandedLogs)
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId)
        } else {
            newExpanded.add(logId)
        }
        setExpandedLogs(newExpanded)
    }

    const getLevelColor = (level) => {
        const colors = {
            DEBUG: "bg-slate-100 text-slate-700",
            INFO: "bg-blue-100 text-blue-700",
            WARNING: "bg-yellow-100 text-yellow-700",
            ERROR: "bg-red-100 text-red-700",
            CRITICAL: "bg-purple-100 text-purple-700"
        }
        return colors[level] || "bg-slate-100 text-slate-700"
    }

    const getStatusColor = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-700",
            sent: "bg-blue-100 text-blue-700",
            accepted: "bg-green-100 text-green-700",
            expired: "bg-red-100 text-red-700",
            cancelled: "bg-slate-100 text-slate-500"
        }
        return colors[status] || "bg-slate-100 text-slate-500"
    }

    const formatDate = (dateString) => {
        if (!dateString) return "-"
        return new Date(dateString).toLocaleString()
    }

    if (loading && !metrics) {
        return <div className="p-8 text-center text-slate-500">Loading admin dashboard...</div>
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="text-sm text-slate-500 mt-1">System monitoring, logs, and analytics</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* WebSocket Status */}
                        <div className="flex items-center gap-2">
                            {wsConnected ? (
                                <>
                                    <Wifi size={18} className="text-green-600" />
                                    <span className="text-sm text-green-600">Live Updates</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={18} className="text-red-600" />
                                    <span className="text-sm text-red-600">Polling Mode</span>
                                </>
                            )}
                        </div>
                        {/* Refresh Rate Selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600">Refresh:</label>
                            <select
                                value={refreshRate}
                                onChange={(e) => setRefreshRate(parseInt(e.target.value))}
                                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value={1}>1s</option>
                                <option value={5}>5s</option>
                                <option value={10}>10s</option>
                                <option value={30}>30s</option>
                                <option value={60}>60s</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description Section */}
            {activeTab === "overview" && showAboutSection && (
                <div className="bg-indigo-50 border-b border-indigo-200 px-8 py-4 relative">
                    <button
                        onClick={() => setShowAboutSection(false)}
                        className="absolute top-4 right-4 text-indigo-600 hover:text-indigo-800 transition-colors"
                        aria-label="Close about section"
                    >
                        <XCircle size={20} />
                    </button>
                    <div className="max-w-4xl">
                        <h2 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                            <Activity size={20} />
                            About This Dashboard
                        </h2>
                        <p className="text-sm text-indigo-800 mb-3">
                            The Admin Monitoring Dashboard provides real-time visibility into your Headhunter AI system&apos;s health, performance, and operational metrics.
                            This comprehensive monitoring tool helps you track system status, identify issues, and optimize performance.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-800">
                            <div>
                                <h3 className="font-semibold mb-1">What You Can Monitor:</h3>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>System health status (Database, Redis, Celery, ChromaDB)</li>
                                    <li>Response time percentiles (p50, p95, p99)</li>
                                    <li>Error rates and slow endpoints</li>
                                    <li>Database connection pool and table sizes</li>
                                    <li>System logs with advanced filtering</li>
                                    <li>User invitation tracking</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">How to Test:</h3>
                                <ol className="list-decimal list-inside space-y-1 ml-2">
                                    <li>Check the <strong>System Health</strong> section - all services should show &quot;healthy&quot; status</li>
                                    <li>Review <strong>Response Time Percentiles</strong> - p95 should typically be under 500ms</li>
                                    <li>Monitor <strong>Error Rate</strong> - should be below 1% for healthy systems</li>
                                    <li>Navigate to <strong>System Logs</strong> tab to view recent activity</li>
                                    <li>Use <strong>Health History</strong> tab to view historical trends over time</li>
                                    <li>Test filtering in <strong>System Logs</strong> by level, component, or date range</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-8 py-4 border-b border-slate-200 bg-white flex gap-6">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "overview"
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab("logs")}
                    className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "logs"
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    System Logs
                </button>
                <button
                    onClick={() => setActiveTab("invitations")}
                    className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "invitations"
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Invitations
                </button>
                <button
                    onClick={() => setActiveTab("errors")}
                    className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "errors"
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Errors
                </button>
                <button
                    onClick={() => setActiveTab("health-history")}
                    className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "health-history"
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Health History
                </button>
                <button
                    onClick={() => setActiveTab("llm")}
                    className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "llm"
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    LLM Monitoring
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === "overview" && metrics && (
                    <OverviewTab
                        metrics={metrics}
                        health={health}
                        uxAnalytics={uxAnalytics}
                        dbStats={dbStats}
                        cleanupPreview={cleanupPreview}
                        cleanupDays={cleanupDays}
                        setCleanupDays={setCleanupDays}
                        previewCleanup={previewCleanup}
                        executeCleanup={executeCleanup}
                        isCleaningUp={isCleaningUp}
                        thresholds={thresholds}
                    />
                )}

                {activeTab === "logs" && (
                    <LogsTab
                        logs={logs}
                        filters={filters}
                        setFilters={setFilters}
                        pagination={pagination}
                        setPagination={setPagination}
                        expandedLogs={expandedLogs}
                        toggleLogExpand={toggleLogExpand}
                        getLevelColor={getLevelColor}
                        formatDate={formatDate}
                        fetchLogs={fetchLogs}
                    />
                )}

                {activeTab === "invitations" && (
                    <InvitationsTab
                        invitations={invitations}
                        getStatusColor={getStatusColor}
                        formatDate={formatDate}
                    />
                )}

                {activeTab === "errors" && (
                    <ErrorsTab
                        errors={errors}
                        expandedLogs={expandedLogs}
                        toggleLogExpand={toggleLogExpand}
                        formatDate={formatDate}
                    />
                )}

                {activeTab === "health-history" && (
                    <HealthHistoryTab
                        healthHistory={healthHistory}
                        historyHours={historyHours}
                        setHistoryHours={setHistoryHours}
                        historyInterval={historyInterval}
                        setHistoryInterval={setHistoryInterval}
                        fetchHealthHistory={fetchHealthHistory}
                        thresholds={thresholds}
                    />
                )}

                {activeTab === "llm" && (
                    <LLMMonitoringTab
                        llmMetrics={llmMetrics}
                        llmCompanyFilter={llmCompanyFilter}
                        setLlmCompanyFilter={setLlmCompanyFilter}
                        fetchLlmMetrics={fetchLlmMetrics}

                        formatDate={formatDate}
                    />
                )}
            </div>
        </div>
    )
}

// Overview Tab Component - Enhanced with Health, Analytics, DB Stats
const OverviewTab = ({
    metrics,
    health,
    uxAnalytics,
    dbStats,
    cleanupPreview,
    cleanupDays,
    setCleanupDays,
    previewCleanup,
    executeCleanup,
    isCleaningUp,
    thresholds
}) => {
    const levelColors = {
        DEBUG: "#94a3b8",
        INFO: "#3b82f6",
        WARNING: "#eab308",
        ERROR: "#ef4444",
        CRITICAL: "#a855f7"
    }

    const logsByLevelData = Object.entries(metrics.logs_by_level || {}).map(([level, count]) => ({
        name: level,
        value: count,
        color: levelColors[level] || "#94a3b8"
    }))

    const getHealthColor = (status) => {
        switch (status) {
            case 'healthy': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
            case 'degraded': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'unhealthy': return 'bg-red-100 text-red-700 border-red-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    const getHealthIcon = (status) => {
        switch (status) {
            case 'healthy': return <CheckCircle size={20} className="text-emerald-600" />
            case 'degraded': return <AlertTriangle size={20} className="text-amber-600" />
            case 'unhealthy': return <XCircle size={20} className="text-red-600" />
            default: return <Clock size={20} className="text-slate-600" />
        }
    }

    return (
        <div className="space-y-6">
            {/* System Health Status */}
            {health && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <Server size={18} />
                            System Health
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getHealthColor(health.overall_status)}`}>
                            {health.overall_status?.toUpperCase()}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {health.services?.map((service) => (
                            <div key={service.name} className={`p-4 rounded-lg border ${getHealthColor(service.status)}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold">{service.name}</span>
                                    {getHealthIcon(service.status)}
                                </div>
                                {service.response_time_ms && (
                                    <div className="text-xs">{service.response_time_ms.toFixed(0)}ms</div>
                                )}
                                <div className="text-xs mt-1 opacity-75">{service.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Logs"
                    value={metrics.total_logs?.toLocaleString() || "0"}
                    icon={Activity}
                    color="indigo"
                />
                <MetricCard
                    title="Error Rate (24h)"
                    value={`${uxAnalytics?.error_rate_percent?.toFixed(1) || metrics.error_rate_24h?.toFixed(1) || 0}%`}
                    icon={AlertCircle}
                    color="red"
                />
                <MetricCard
                    title="Response p95"
                    value={`${uxAnalytics?.response_time_p95_ms?.toFixed(0) || metrics.avg_response_time_ms?.toFixed(0) || 0}ms`}
                    icon={Zap}
                    color="blue"
                />
                <MetricCard
                    title="API Requests (24h)"
                    value={uxAnalytics?.total_requests?.toLocaleString() || metrics.api_requests_24h?.toLocaleString() || "0"}
                    icon={TrendingUp}
                    color="green"
                />
            </div>

            {/* UX Analytics */}
            {uxAnalytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Response Time Percentiles */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Gauge size={18} />
                            Response Time Percentiles
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">API endpoints only (AI operations excluded)</p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <div className="text-2xl font-bold text-slate-900">{uxAnalytics.response_time_p50_ms?.toFixed(0)}ms</div>
                                <div className="text-sm text-slate-500">p50 (Median)</div>
                            </div>
                            <div className="text-center p-4 bg-amber-50 rounded-lg">
                                <div className="text-2xl font-bold text-amber-700">{uxAnalytics.response_time_p95_ms?.toFixed(0)}ms</div>
                                <div className="text-sm text-slate-500">p95</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-700">{uxAnalytics.response_time_p99_ms?.toFixed(0)}ms</div>
                                <div className="text-sm text-slate-500">p99</div>
                            </div>
                        </div>
                    </div>

                    {/* AI Endpoints */}
                    {uxAnalytics.slow_endpoints?.some(ep => isAiEndpoint(ep.path)) && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Zap size={18} className="text-indigo-600" />
                                AI Endpoints
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-normal">
                                    LLM Operations
                                </span>
                            </h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {uxAnalytics.slow_endpoints
                                    .filter(ep => isAiEndpoint(ep.path))
                                    .map((ep, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-sm font-mono text-slate-600 truncate max-w-[200px]">{ep.path}</span>
                                            <span className="text-sm font-bold text-indigo-600">{ep.avg_response_ms?.toFixed(0)}ms</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* Regular Slow Endpoints */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            Slow Endpoints (avg &gt; 200ms)
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {uxAnalytics.slow_endpoints?.filter(ep => !isAiEndpoint(ep.path)).length > 0 ? (
                                uxAnalytics.slow_endpoints
                                    .filter(ep => !isAiEndpoint(ep.path))
                                    .map((ep, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-sm font-mono text-slate-600 truncate max-w-[200px]">{ep.path}</span>
                                            <span className="text-sm font-bold text-amber-600">{ep.avg_response_ms?.toFixed(0)}ms</span>
                                        </div>
                                    ))
                            ) : (
                                <div className="text-sm text-slate-400 text-center py-4">
                                    {uxAnalytics.slow_endpoints?.length > 0
                                        ? "All non-AI endpoints are fast! 🚀"
                                        : "All endpoints are fast! 🚀"
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Database Stats */}
            {dbStats && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Database size={18} />
                        Database Statistics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-xl font-bold text-slate-900">{dbStats.connection_pool_size}</div>
                            <div className="text-xs text-slate-500">Pool Size</div>
                        </div>
                        <div className="text-center p-3 bg-indigo-50 rounded-lg">
                            <div className="text-xl font-bold text-indigo-700">{dbStats.connections_in_use}</div>
                            <div className="text-xs text-slate-500">In Use</div>
                        </div>
                        <div className="text-center p-3 bg-emerald-50 rounded-lg">
                            <div className="text-xl font-bold text-emerald-700">{dbStats.connections_available}</div>
                            <div className="text-xs text-slate-500">Available</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                            <div className="text-xl font-bold text-slate-900">{dbStats.total_tables}</div>
                            <div className="text-xs text-slate-500">Tables</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-xl font-bold text-blue-700">{dbStats.total_db_size_mb?.toFixed(1)} MB</div>
                            <div className="text-xs text-slate-500">Total Size</div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <h4 className="text-sm font-bold text-slate-600 mb-2">Top Tables by Size</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {dbStats.table_sizes?.slice(0, 8).map((t, i) => (
                                <div key={i} className="text-xs p-2 bg-slate-50 rounded flex justify-between">
                                    <span className="font-mono truncate">{t.table}</span>
                                    <span className="text-slate-500 ml-2">{t.size}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4">Logs by Level</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={logsByLevelData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {logsByLevelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Requests by Hour Chart */}
                {uxAnalytics?.requests_by_hour?.length > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4">Requests by Hour (Last 24h)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={uxAnalytics.requests_by_hour}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#c7d2fe" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Response Time Percentiles with Thresholds */}
                {uxAnalytics && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Gauge size={18} />
                            Response Time Percentiles with Thresholds
                        </h3>
                        <p className="text-xs text-slate-500 mb-2">API endpoints only (AI operations excluded)</p>
                        <div className="mb-2 text-xs text-slate-500">
                            Yellow: {thresholds.p95_warning_ms}ms | Red: {thresholds.p95_critical_ms}ms
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={[
                                { name: 'p50', value: uxAnalytics.response_time_p50_ms || 0 },
                                { name: 'p95', value: uxAnalytics.response_time_p95_ms || 0 },
                                { name: 'p99', value: uxAnalytics.response_time_p99_ms || 0 }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                                <Tooltip />
                                <ReferenceLine y={thresholds.p95_warning_ms} stroke="#eab308" strokeDasharray="5 5" label="Warning" />
                                <ReferenceLine y={thresholds.p95_critical_ms} stroke="#ef4444" strokeDasharray="5 5" label="Critical" />
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Log Cleanup */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Trash2 size={18} />
                    Log Cleanup
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Delete logs older than</label>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={cleanupDays}
                            onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                            className="w-20 p-2 border border-slate-200 rounded-lg text-sm"
                        />
                        <span className="text-sm text-slate-600">days</span>
                    </div>
                    <button
                        onClick={previewCleanup}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition"
                    >
                        Preview
                    </button>
                    {cleanupPreview && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-600">
                                <strong>{cleanupPreview.logs_to_delete}</strong> logs will be deleted
                            </span>
                            <button
                                onClick={executeCleanup}
                                disabled={isCleaningUp || cleanupPreview.logs_to_delete === 0}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {isCleaningUp ? 'Deleting...' : 'Delete Now'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const MetricCard = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        indigo: "bg-indigo-50 text-indigo-600",
        red: "bg-red-50 text-red-600",
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600"
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-900">{value}</div>
                    <div className="text-sm text-slate-500">{title}</div>
                </div>
            </div>
        </div>
    )
}

// Logs Tab Component
const LogsTab = ({
    logs,
    filters,
    setFilters,
    pagination,
    setPagination,
    expandedLogs,
    toggleLogExpand,
    getLevelColor,
    formatDate,
    fetchLogs
}) => {
    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                        <select
                            value={filters.level}
                            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">All Levels</option>
                            <option value="DEBUG">DEBUG</option>
                            <option value="INFO">INFO</option>
                            <option value="WARNING">WARNING</option>
                            <option value="ERROR">ERROR</option>
                            <option value="CRITICAL">CRITICAL</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Component</label>
                        <input
                            type="text"
                            value={filters.component}
                            onChange={(e) => setFilters({ ...filters, component: e.target.value })}
                            placeholder="e.g. api, celery"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                        <input
                            type="text"
                            value={filters.searchText}
                            onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                            placeholder="Search in messages..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLogs}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setFilters({
                            level: "", component: "", action: "", startDate: "", endDate: "", searchText: "", hasError: null
                        })}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Level</th>
                                <th className="p-4">Component</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Message</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Time (ms)</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr className="hover:bg-slate-50/50">
                                        <td className="p-4 text-slate-500 whitespace-nowrap text-xs">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getLevelColor(log.level)}`}>
                                                {log.level}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600 font-mono text-xs">{log.component}</td>
                                        <td className="p-4 text-slate-600 text-xs">{log.action}</td>
                                        <td className="p-4 text-slate-700 max-w-md truncate">{log.message}</td>
                                        <td className="p-4 text-slate-500 text-xs">{log.user_email || "-"}</td>
                                        <td className="p-4">
                                            {log.http_status && (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${log.http_status < 400 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {log.http_status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">{log.response_time_ms || "-"}</td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleLogExpand(log.id)}
                                                className="text-indigo-600 hover:text-indigo-700"
                                            >
                                                {expandedLogs.has(log.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Expanded detail row */}
                                    {expandedLogs.has(log.id) && (
                                        <tr className="bg-slate-50">
                                            <td colSpan={9} className="p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    {/* Request Details */}
                                                    <div className="space-y-2">
                                                        <h4 className="font-bold text-slate-700">Request Details</h4>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div><span className="text-slate-500">Request ID:</span></div>
                                                            <div className="font-mono text-slate-700">{log.request_id || "-"}</div>
                                                            <div><span className="text-slate-500">Method:</span></div>
                                                            <div className="font-mono text-slate-700">{log.http_method || "-"}</div>
                                                            <div><span className="text-slate-500">Path:</span></div>
                                                            <div className="font-mono text-slate-700">{log.http_path || "-"}</div>
                                                            <div><span className="text-slate-500">IP Address:</span></div>
                                                            <div className="font-mono text-slate-700">{log.ip_address || "-"}</div>
                                                            <div><span className="text-slate-500">Company:</span></div>
                                                            <div className="text-slate-700">{log.company_name || "-"}</div>
                                                        </div>
                                                    </div>

                                                    {/* Error Details (if present) */}
                                                    {log.error_type && (
                                                        <div className="space-y-2">
                                                            <h4 className="font-bold text-red-700">Error Details</h4>
                                                            <div className="text-xs">
                                                                <div className="text-slate-500">Type:</div>
                                                                <div className="font-mono text-red-600">{log.error_type}</div>
                                                                <div className="text-slate-500 mt-1">Message:</div>
                                                                <div className="text-red-600">{log.error_message}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Metadata (if present) */}
                                                    {log.metadata && (
                                                        <div className="md:col-span-2 space-y-2">
                                                            <h4 className="font-bold text-slate-700">Metadata</h4>
                                                            <pre className="bg-white p-2 rounded text-xs overflow-x-auto border border-slate-200">
                                                                {JSON.stringify(log.metadata, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// Invitations Tab Component
const InvitationsTab = ({ invitations, getStatusColor, formatDate }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Invited By</th>
                        <th className="p-4">Sent At</th>
                        <th className="p-4">Expires At</th>
                        <th className="p-4">Accepted At</th>
                        <th className="p-4">Email Error</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-medium text-slate-900">{inv.email}</td>
                            <td className="p-4 text-slate-600">{inv.role}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(inv.status)}`}>
                                    {inv.status}
                                </span>
                            </td>
                            <td className="p-4 text-slate-500 text-xs">{inv.invited_by_email || "-"}</td>
                            <td className="p-4 text-slate-500 text-xs">{formatDate(inv.sent_at)}</td>
                            <td className="p-4 text-slate-500 text-xs">{formatDate(inv.expires_at)}</td>
                            <td className="p-4 text-slate-500 text-xs">{formatDate(inv.accepted_at) || "-"}</td>
                            <td className="p-4 text-red-600 text-xs">{inv.email_error || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// Errors Tab Component
const ErrorsTab = ({ errors, expandedLogs, toggleLogExpand, formatDate }) => {
    return (
        <div className="space-y-4">
            {errors.map((error) => (
                <div key={error.id} className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="text-red-600" size={20} />
                                    <span className="font-bold text-red-700">{error.error_type}</span>
                                    <span className="text-xs text-slate-500">{formatDate(error.created_at)}</span>
                                </div>
                                <div className="text-slate-700 mb-2">{error.message}</div>
                                <div className="text-sm text-slate-500">
                                    <strong>Component:</strong> {error.component} |
                                    <strong> Path:</strong> {error.http_path || "-"} |
                                    <strong> User:</strong> {error.user_email || "-"}
                                </div>
                            </div>
                            <button
                                onClick={() => toggleLogExpand(error.id)}
                                className="text-indigo-600 hover:text-indigo-700"
                            >
                                {expandedLogs.has(error.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>
                    </div>
                    {expandedLogs.has(error.id) && (
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <div className="mb-2">
                                <strong className="text-slate-700">Error Message:</strong>
                                <pre className="mt-1 p-2 bg-white rounded text-xs text-red-700 overflow-x-auto">
                                    {error.error_message}
                                </pre>
                            </div>
                            {error.stack_trace && (
                                <div>
                                    <strong className="text-slate-700">Stack Trace:</strong>
                                    <pre className="mt-1 p-2 bg-white rounded text-xs text-slate-700 overflow-x-auto max-h-96">
                                        {error.stack_trace}
                                    </pre>
                                </div>
                            )}
                            {error.metadata && (
                                <div className="mt-2">
                                    <strong className="text-slate-700">Metadata:</strong>
                                    <pre className="mt-1 p-2 bg-white rounded text-xs text-slate-600 overflow-x-auto">
                                        {JSON.stringify(error.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

// Health History Tab Component - Datadog Style
const HealthHistoryTab = ({ healthHistory, historyHours, setHistoryHours, historyInterval, setHistoryInterval, fetchHealthHistory, thresholds }) => {
    const getStatusValue = (status) => {
        switch (status) {
            case 'healthy': return 1
            case 'degraded': return 0.5
            case 'unhealthy': return 0
            default: return 0
        }
    }

    const getStatusColor = (serviceName) => {
        const colors = {
            'Database': '#3b82f6',
            'Redis': '#ef4444',
            'Celery': '#10b981',
            'ChromaDB': '#8b5cf6'
        }
        return colors[serviceName] || '#6b7280'
    }

    if (!healthHistory) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-indigo-600" size={32} />
                    <p className="text-slate-500">Loading health history...</p>
                </div>
            </div>
        )
    }

    // Format timestamp based on granularity (show seconds for high granularity)
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp)
        // If interval is less than 5 minutes, show seconds
        if (historyInterval < 5) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            })
        }
        // Otherwise show just hours and minutes
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    }

    // Prepare data for charts
    const responseTimeData = healthHistory.time_series?.map(point => ({
        timestamp: formatTimestamp(point.timestamp),
        Database: point.services?.find(s => s.name === 'Database')?.response_time_ms || 0,
        Redis: point.services?.find(s => s.name === 'Redis')?.response_time_ms || 0,
        Celery: point.services?.find(s => s.name === 'Celery')?.response_time_ms || 0,
        ChromaDB: point.services?.find(s => s.name === 'ChromaDB')?.response_time_ms || 0,
    })) || []

    const healthStatusData = healthHistory.time_series?.map(point => ({
        timestamp: formatTimestamp(point.timestamp),
        Database: getStatusValue(point.services?.find(s => s.name === 'Database')?.status),
        Redis: getStatusValue(point.services?.find(s => s.name === 'Redis')?.status),
        Celery: getStatusValue(point.services?.find(s => s.name === 'Celery')?.status),
        ChromaDB: getStatusValue(point.services?.find(s => s.name === 'ChromaDB')?.status),
    })) || []

    const errorRateData = healthHistory.time_series?.map(point => ({
        timestamp: formatTimestamp(point.timestamp),
        error_rate: point.error_rate_percent || 0,
    })) || []

    const responseTimePercentilesData = healthHistory.time_series?.map(point => ({
        timestamp: formatTimestamp(point.timestamp),
        p50: point.response_time_p50_ms || 0,
        p95: point.response_time_p95_ms || 0,
        p99: point.response_time_p99_ms || 0,
    })) || []

    return (
        <div className="space-y-6">
            {/* Time Range and Granularity Selector */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">Time Range:</label>
                            <select
                                value={historyHours}
                                onChange={(e) => {
                                    setHistoryHours(parseInt(e.target.value))
                                }}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value={1}>Last 1 hour</option>
                                <option value={6}>Last 6 hours</option>
                                <option value={12}>Last 12 hours</option>
                                <option value={24}>Last 24 hours</option>
                                <option value={48}>Last 48 hours</option>
                                <option value={168}>Last 7 days</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">Granularity:</label>
                            <select
                                value={historyInterval}
                                onChange={(e) => {
                                    setHistoryInterval(parseFloat(e.target.value))
                                }}
                                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value={0.5}>30 seconds</option>
                                <option value={1}>1 minute</option>
                                <option value={2}>2 minutes</option>
                                <option value={5}>5 minutes</option>
                                <option value={10}>10 minutes</option>
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>1 hour</option>
                            </select>
                        </div>
                        <button
                            onClick={fetchHealthHistory}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                    <div className="text-sm text-slate-500">
                        {healthHistory.time_series?.length || 0} data points
                        {healthHistory.time_series?.length > 0 && (
                            <span className="ml-2 text-xs">
                                (~{Math.round(historyHours * 60 / historyInterval)} max)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Response Time by Service */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Clock size={18} />
                    Response Time by Service (ms)
                </h3>
                <p className="text-xs text-slate-500 mb-2">API endpoints only (AI operations excluded)</p>
                <div className="mb-2 text-xs text-slate-500 flex gap-4">
                    <span>Yellow: {thresholds.response_time_warning_ms}ms</span>
                    <span>Red: {thresholds.response_time_critical_ms}ms</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={responseTimeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                            stroke="#64748b"
                        />
                        <YAxis
                            label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                            stroke="#64748b"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                        <Legend />
                        <ReferenceLine
                            y={thresholds.response_time_warning_ms}
                            stroke="#eab308"
                            strokeDasharray="5 5"
                            label={{ value: "Warning", position: "topRight" }}
                        />
                        <ReferenceLine
                            y={thresholds.response_time_critical_ms}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            label={{ value: "Critical", position: "topRight" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="Database"
                            stroke={getStatusColor('Database')}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="Redis"
                            stroke={getStatusColor('Redis')}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="Celery"
                            stroke={getStatusColor('Celery')}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="ChromaDB"
                            stroke={getStatusColor('ChromaDB')}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Health Status Over Time */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <CheckCircle size={18} />
                    Health Status Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={healthStatusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                            stroke="#64748b"
                        />
                        <YAxis
                            domain={[0, 1]}
                            tickFormatter={(value) => {
                                if (value === 1) return 'Healthy'
                                if (value === 0.5) return 'Degraded'
                                return 'Unhealthy'
                            }}
                            stroke="#64748b"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            formatter={(value) => {
                                if (value === 1) return 'Healthy'
                                if (value === 0.5) return 'Degraded'
                                return 'Unhealthy'
                            }}
                        />
                        <Legend />
                        <Area
                            type="monotone"
                            dataKey="Database"
                            stackId="1"
                            stroke={getStatusColor('Database')}
                            fill={getStatusColor('Database')}
                            fillOpacity={0.6}
                        />
                        <Area
                            type="monotone"
                            dataKey="Redis"
                            stackId="1"
                            stroke={getStatusColor('Redis')}
                            fill={getStatusColor('Redis')}
                            fillOpacity={0.6}
                        />
                        <Area
                            type="monotone"
                            dataKey="Celery"
                            stackId="1"
                            stroke={getStatusColor('Celery')}
                            fill={getStatusColor('Celery')}
                            fillOpacity={0.6}
                        />
                        <Area
                            type="monotone"
                            dataKey="ChromaDB"
                            stackId="1"
                            stroke={getStatusColor('ChromaDB')}
                            fill={getStatusColor('ChromaDB')}
                            fillOpacity={0.6}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Response Time Percentiles */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Gauge size={18} />
                    Response Time Percentiles (ms)
                </h3>
                <div className="mb-2 text-xs text-slate-500 flex gap-4">
                    <span>Yellow (p95): {thresholds.p95_warning_ms}ms</span>
                    <span>Red (p95): {thresholds.p95_critical_ms}ms</span>
                    <span>Yellow (p99): {thresholds.p99_warning_ms}ms</span>
                    <span>Red (p99): {thresholds.p99_critical_ms}ms</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={responseTimePercentilesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                            stroke="#64748b"
                        />
                        <YAxis
                            label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                            stroke="#64748b"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                        <Legend />
                        <ReferenceLine
                            y={thresholds.p95_warning_ms}
                            stroke="#eab308"
                            strokeDasharray="5 5"
                            label={{ value: "p95 Warning", position: "topRight" }}
                        />
                        <ReferenceLine
                            y={thresholds.p95_critical_ms}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            label={{ value: "p95 Critical", position: "topRight" }}
                        />
                        <ReferenceLine
                            y={thresholds.p99_warning_ms}
                            stroke="#eab308"
                            strokeDasharray="3 3"
                            strokeOpacity={0.5}
                        />
                        <ReferenceLine
                            y={thresholds.p99_critical_ms}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            strokeOpacity={0.5}
                        />
                        <Line
                            type="monotone"
                            dataKey="p50"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="p50 (Median)"
                        />
                        <Line
                            type="monotone"
                            dataKey="p95"
                            stroke="#eab308"
                            strokeWidth={2}
                            dot={false}
                            name="p95"
                        />
                        <Line
                            type="monotone"
                            dataKey="p99"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                            name="p99"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Error Rate */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Error Rate Over Time (%)
                </h3>
                <div className="mb-2 text-xs text-slate-500 flex gap-4">
                    <span>Yellow: {thresholds.error_rate_warning_percent}%</span>
                    <span>Red: {thresholds.error_rate_critical_percent}%</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={errorRateData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                            stroke="#64748b"
                        />
                        <YAxis
                            label={{ value: 'Error Rate (%)', angle: -90, position: 'insideLeft' }}
                            stroke="#64748b"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            formatter={(value) => `${value.toFixed(2)}%`}
                        />
                        <ReferenceLine
                            y={thresholds.error_rate_warning_percent}
                            stroke="#eab308"
                            strokeDasharray="5 5"
                            label={{ value: "Warning", position: "topRight" }}
                        />
                        <ReferenceLine
                            y={thresholds.error_rate_critical_percent}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            label={{ value: "Critical", position: "topRight" }}
                        />
                        <Area
                            type="monotone"
                            dataKey="error_rate"
                            stroke="#ef4444"
                            fill="#ef4444"
                            fillOpacity={0.3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

// LLM Monitoring Tab Component
const LLMMonitoringTab = ({ llmMetrics, llmCompanyFilter, setLlmCompanyFilter, fetchLlmMetrics, formatDate }) => {
    if (!llmMetrics) {
        return (
            <div className="p-8 text-center">
                <RefreshCw className="animate-spin mx-auto mb-4 text-indigo-600" size={32} />
                <p className="text-slate-600">Loading LLM metrics...</p>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Brain className="text-indigo-600" size={28} />
                        LLM Operations Monitoring
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Monitor AI/LLM operations, token usage, latency, and performance metrics
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600">Company:</label>
                        <select
                            value={llmCompanyFilter}
                            onChange={(e) => setLlmCompanyFilter(e.target.value)}
                            className="px-3 py-1 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">All Companies</option>
                            {/* TODO: Fetch companies dynamically */}
                            <option value="1">Company 1</option>
                            <option value="2">Company 2</option>
                        </select>
                    </div>
                    <button
                        onClick={fetchLlmMetrics}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-slate-500">Total Operations</div>
                        <Sparkles className="text-indigo-600" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{llmMetrics.total_operations}</div>
                    <div className="text-xs text-slate-500 mt-1">{llmMetrics.operations_24h} in last 24h</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-slate-500">Total Tokens</div>
                        <TrendingUp className="text-emerald-600" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {llmMetrics.total_tokens_used.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {llmMetrics.tokens_24h.toLocaleString()} in last 24h
                    </div>
                    <div className="mt-2 text-xs">
                        <span className="text-emerald-600">Input: {llmMetrics.total_tokens_input.toLocaleString()}</span>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="text-blue-600">Output: {llmMetrics.total_tokens_output.toLocaleString()}</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-slate-500">Avg Latency</div>
                        <Clock className="text-blue-600" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {Math.round(llmMetrics.avg_latency_ms)}ms
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {Math.round(llmMetrics.avg_latency_24h_ms)}ms (24h avg)
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-slate-500">Error Rate</div>
                        <AlertCircle className="text-red-600" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {llmMetrics.error_rate_percent.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {llmMetrics.errors_24h} errors in last 24h
                    </div>
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Gauge size={18} />
                        Latency Percentiles
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">P50 (Median)</span>
                            <span className="font-semibold text-slate-900">{Math.round(llmMetrics.latency_p50_ms)}ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">P95</span>
                            <span className="font-semibold text-slate-900">{Math.round(llmMetrics.latency_p95_ms)}ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">P99</span>
                            <span className="font-semibold text-slate-900">{Math.round(llmMetrics.latency_p99_ms)}ms</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Zap size={18} />
                        Time Breakdown
                    </h3>
                    <div className="space-y-3">
                        {llmMetrics.thinking_time_avg_ms && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Avg Thinking Time</span>
                                <span className="font-semibold text-slate-900">{Math.round(llmMetrics.thinking_time_avg_ms)}ms</span>
                            </div>
                        )}
                        {llmMetrics.response_time_avg_ms && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Avg Response Time</span>
                                <span className="font-semibold text-slate-900">{Math.round(llmMetrics.response_time_avg_ms)}ms</span>
                            </div>
                        )}
                        {llmMetrics.implementation_time_avg_ms && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Avg Implementation Time</span>
                                <span className="font-semibold text-slate-900">{Math.round(llmMetrics.implementation_time_avg_ms)}ms</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Streaming Operations</span>
                            <span className="font-semibold text-slate-900">
                                {llmMetrics.streaming_operations} ({llmMetrics.streaming_percentage.toFixed(1)}%)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operations by Action */}
            {Object.keys(llmMetrics.operations_by_action).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Activity size={18} />
                        Operations by Action
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(llmMetrics.operations_by_action).map(([action, count]) => (
                            <div key={action} className="bg-slate-50 p-4 rounded-lg">
                                <div className="text-sm text-slate-500 mb-1">{action}</div>
                                <div className="text-2xl font-bold text-slate-900">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Operations by Model */}
            {Object.keys(llmMetrics.operations_by_model).length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Brain size={18} />
                        Operations by Model
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(llmMetrics.operations_by_model).map(([model, count]) => (
                            <div key={model} className="bg-slate-50 p-4 rounded-lg">
                                <div className="text-sm text-slate-500 mb-1">{model}</div>
                                <div className="text-2xl font-bold text-slate-900">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Operations */}
            {llmMetrics.recent_operations && llmMetrics.recent_operations.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Clock size={18} />
                        Recent Operations
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-slate-600 font-semibold">Action</th>
                                    <th className="px-4 py-2 text-left text-slate-600 font-semibold">Model</th>
                                    <th className="px-4 py-2 text-left text-slate-600 font-semibold">Tokens (In/Out)</th>
                                    <th className="px-4 py-2 text-left text-slate-600 font-semibold">Latency</th>
                                    <th className="px-4 py-2 text-left text-slate-600 font-semibold">Streaming</th>
                                    <th className="px-4 py-2 text-left text-slate-600 font-semibold">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {llmMetrics.recent_operations.map((op) => (
                                    <tr key={op.id} className="border-b border-slate-100">
                                        <td className="px-4 py-2 text-slate-700">{op.action}</td>
                                        <td className="px-4 py-2 text-slate-600">{op.model}</td>
                                        <td className="px-4 py-2 text-slate-600">
                                            {op.tokens_input || op.tokens_output ?
                                                `${op.tokens_input || 0}/${op.tokens_output || 0}` :
                                                op.tokens_used || 0
                                            }
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">{op.latency_ms}ms</td>
                                        <td className="px-4 py-2">
                                            {op.streaming ? (
                                                <span className="text-emerald-600">Yes</span>
                                            ) : (
                                                <span className="text-slate-400">No</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-slate-500 text-xs">
                                            {formatDate ? formatDate(new Date(op.created_at)) : new Date(op.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminLogsDashboard

