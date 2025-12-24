import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { Wifi, WifiOff } from 'lucide-react'

import { getStatusValue, getServiceStatusColor } from './utils/adminDashboardUtils'
import OverviewTab from './tabs/OverviewTab'
import LogsTab from './tabs/LogsTab'
import InvitationsTab from './tabs/InvitationsTab'
import ErrorsTab from './tabs/ErrorsTab'
import HealthHistoryTab from './tabs/HealthHistoryTab'
import LLMMonitoringTab from './tabs/LLMMonitoringTab'

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
    const [historyInterval, setHistoryInterval] = useState(1)
    const [refreshRate, setRefreshRate] = useState(5)
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
    const [showAboutSection, setShowAboutSection] = useState(() => {
        return localStorage.getItem('admin_dashboard_show_about') !== 'false'
    })
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

    // Real API functions
    const fetchMetrics = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/metrics')
            setMetrics(res.data)
        } catch (err) {
            console.error('Failed to fetch metrics', err)
        }
    }, [])

    const fetchHealth = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/health')
            setHealth(res.data)
        } catch (err) {
            console.error('Failed to fetch health', err)
        }
    }, [])

    const fetchUxAnalytics = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/ux-analytics')
            setUxAnalytics(res.data)
        } catch (err) {
            console.error('Failed to fetch UX analytics', err)
        }
    }, [])

    const fetchDbStats = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/database/stats')
            setDbStats(res.data)
        } catch (err) {
            console.error('Failed to fetch DB stats', err)
        }
    }, [])

    const fetchLogs = useCallback(async () => {
        try {
            const params = {
                limit: pagination.limit,
                offset: pagination.offset,
                ...filters
            }
            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === "" || params[key] === null) delete params[key]
            })

            const res = await axios.get('/api/admin/logs', { params })
            setLogs(res.data)
            // Note: Currently backend doesn't return total count in a wrapper,
            // so we set total based on returned length if it's less than limit
            setPagination(prev => ({
                ...prev,
                total: res.data.length < prev.limit ? prev.offset + res.data.length : prev.offset + prev.limit + 1
            }))

            // Update error list for errors tab
            setErrors(res.data.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL' || log.error_type))
        } catch (err) {
            console.error('Failed to fetch logs', err)
        }
    }, [pagination.limit, pagination.offset, filters])

    const fetchInvitations = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/invitations')
            setInvitations(res.data)
        } catch (err) {
            console.error('Failed to fetch invitations', err)
        }
    }, [])

    const fetchHealthHistory = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/health/history', {
                params: {
                    hours: historyHours,
                    interval_minutes: historyInterval
                }
            })
            setHealthHistory(res.data.time_series)
        } catch (err) {
            console.error('Failed to fetch health history', err)
        }
    }, [historyHours, historyInterval])

    const fetchLlmMetrics = useCallback(async () => {
        try {
            const params = {}
            if (llmCompanyFilter) params.company_id = llmCompanyFilter
            const res = await axios.get('/api/admin/llm/metrics', { params })
            setLlmMetrics(res.data)
        } catch (err) {
            console.error('Failed to fetch LLM metrics', err)
        }
    }, [llmCompanyFilter])

    // Real data loading
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true)
            try {
                // Fetch statics and things that don't depend on complex filters
                await Promise.all([
                    fetchMetrics(),
                    fetchHealth(),
                    fetchUxAnalytics(),
                    fetchDbStats(),
                    fetchInvitations(),
                    fetchLlmMetrics(), // Add LLM Metrics to initial load
                    fetchHealthHistory() // Add Health History to initial load
                ])
            } catch (err) {
                console.error("Failed to fetch initial admin data", err)
            } finally {
                setLoading(false)
            }
        }

        fetchInitialData()
    }, [fetchMetrics, fetchHealth, fetchUxAnalytics, fetchDbStats, fetchInvitations, fetchLlmMetrics, fetchHealthHistory])

    // Re-fetch logs when filters or pagination change
    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    // Re-fetch LLM metrics when company filter changes
    useEffect(() => {
        if (llmCompanyFilter) {
            fetchLlmMetrics()
        }
    }, [fetchLlmMetrics, llmCompanyFilter])

    // Re-fetch health history when period or interval changes
    useEffect(() => {
        fetchHealthHistory()
    }, [fetchHealthHistory])

    // WebSocket connection for live updates
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        const wsUrl = `${protocol}//${host}/api/admin/ws/monitoring?token=${token}`

        const connect = () => {
            console.log('Connecting to monitoring WebSocket...')
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws

            ws.onopen = () => {
                console.log('Monitoring WebSocket connected')
                setWsConnected(true)
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (data.type === 'monitoring_update') {
                        setMetrics(prev => ({ ...prev, ...data.metrics }))
                        setHealth(data.health)
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message', err)
                }
            }

            ws.onclose = () => {
                console.log('Monitoring WebSocket disconnected')
                setWsConnected(false)
                // Attempt to reconnect after a delay
                reconnectTimeoutRef.current = setTimeout(() => {
                    setReconnectTrigger(prev => prev + 1)
                }, 5000)
            }

            ws.onerror = (err) => {
                console.error('Monitoring WebSocket error', err)
                ws.close()
            }
        }

        connect()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [reconnectTrigger])

    // Update refresh rate via WebSocket if connected
    useEffect(() => {
        if (wsConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'set_refresh_rate',
                refresh_interval: refreshRate
            }))
        }
    }, [refreshRate, wsConnected])

    const toggleLogExpand = (logId) => {
        const newExpanded = new Set(expandedLogs)
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId)
        } else {
            newExpanded.add(logId)
        }
        setExpandedLogs(newExpanded)
    }

    // Real API functions - already defined above with useCallback

    const previewCleanup = async () => {
        try {
            const res = await axios.delete('/api/admin/logs/cleanup', {
                params: { older_than_days: cleanupDays, confirm: false }
            })
            setCleanupPreview(res.data)
        } catch (err) {
            console.error('Failed to preview cleanup', err)
        }
    }

    const executeCleanup = async () => {
        if (!window.confirm(`Are you sure you want to delete logs older than ${cleanupDays} days?`)) return
        setIsCleaningUp(true)
        try {
            await axios.delete('/api/admin/logs/cleanup', {
                params: { older_than_days: cleanupDays, confirm: true }
            })
            setCleanupPreview(null)
            fetchMetrics()
            fetchLogs()
            alert('Cleanup executed successfully')
        } catch (err) {
            console.error('Failed to execute cleanup', err)
            alert('Cleanup failed')
        } finally {
            setIsCleaningUp(false)
        }
    }

    if (loading && !metrics) {
        return <div className="p-8 text-center text-slate-500">Loading admin dashboard...</div>
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Admin Dashboard</h1>
                        <p className="text-sm text-slate-500 mt-1">Real-time system health, logs, and diagnostic analytics</p>
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
                <div className="bg-indigo-50 border-b border-indigo-100 px-8 py-6 relative animate-in fade-in duration-300">
                    <button
                        onClick={() => {
                            setShowAboutSection(false);
                            localStorage.setItem('admin_dashboard_show_about', 'false');
                        }}
                        className="absolute top-6 right-8 p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-full transition"
                        title="Dismiss"
                    >
                        <span className="text-xl leading-none">×</span>
                    </button>
                    <div className="max-w-4xl">
                        <h2 className="text-lg font-bold text-indigo-900 mb-2">Master Control Center</h2>
                        <p className="text-indigo-800/80 leading-relaxed mb-6">
                            This workspace provides administrative oversight of the Headhunter engine.
                            Monitor service health via high-frequency WebSockets, analyze API throughput,
                            and perform deep-dive diagnostic logging to ensure peak system reliability.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h3 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                    Real-time Observability
                                </h3>
                                <p className="text-indigo-700/80">Low-latency WebSocket infrastructure for immediate alerts and state synchronization.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                    Unified Orchestration
                                </h3>
                                <p className="text-indigo-700/80">Integrated diagnostics for LLM operations, database clusters, and distributed worker queues.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white border-b border-slate-200 px-8 flex items-end">
                <nav className="flex space-x-10 h-14">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`px-1 h-full text-sm font-bold border-b-2 transition-all duration-200 outline-none flex items-center ${activeTab === "overview"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`px-1 h-full text-sm font-bold border-b-2 transition-all duration-200 outline-none flex items-center ${activeTab === "logs"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                            }`}
                    >
                        System Logs
                    </button>
                    <button
                        onClick={() => setActiveTab("invitations")}
                        className={`px-1 h-full text-sm font-bold border-b-2 transition-all duration-200 outline-none flex items-center ${activeTab === "invitations"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                            }`}
                    >
                        Invitations
                    </button>
                    <button
                        onClick={() => setActiveTab("errors")}
                        className={`px-1 h-full text-sm font-bold border-b-2 transition-all duration-200 outline-none flex items-center ${activeTab === "errors"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                            }`}
                    >
                        Errors
                    </button>
                    <button
                        onClick={() => setActiveTab("health-history")}
                        className={`px-1 h-full text-sm font-bold border-b-2 transition-all duration-200 outline-none flex items-center ${activeTab === "health-history"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                            }`}
                    >
                        Health History
                    </button>
                    <button
                        onClick={() => setActiveTab("llm")}
                        className={`px-1 h-full text-sm font-bold border-b-2 transition-all duration-200 outline-none flex items-center ${activeTab === "llm"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                            }`}
                    >
                        LLM Monitoring
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-8">
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
                        fetchLogs={fetchLogs}
                        loading={loading}
                        error={null}
                    />
                )}

                {activeTab === "invitations" && (
                    <InvitationsTab
                        invitations={invitations}
                    />
                )}

                {activeTab === "errors" && (
                    <ErrorsTab
                        errors={errors}
                        expandedLogs={expandedLogs}
                        toggleLogExpand={toggleLogExpand}
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
                        getStatusValue={getStatusValue}
                        getServiceStatusColor={getServiceStatusColor}
                    />
                )}

                {activeTab === "llm" && (
                    <LLMMonitoringTab
                        llmMetrics={llmMetrics}
                        llmCompanyFilter={llmCompanyFilter}
                        setLlmCompanyFilter={setLlmCompanyFilter}
                        fetchLlmMetrics={fetchLlmMetrics}
                    />
                )}
            </div>
        </div>
    )
}

export default AdminLogsDashboard
