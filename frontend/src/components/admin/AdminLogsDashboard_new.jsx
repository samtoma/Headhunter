import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
    Activity, AlertCircle, RefreshCw, Clock, Server, TrendingUp, AlertTriangle,
    CheckCircle, XCircle, Database, Trash2, Zap, Gauge, Wifi, WifiOff
} from 'lucide-react'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend, ReferenceLine } from 'recharts'

import { isAiEndpoint, formatDate, getLevelColor, getStatusColor, getHealthColor } from './utils/adminDashboardUtils'
import MetricCard from './shared/MetricCard'
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

    // Mock data loading for now - will be replaced with actual API calls
    useEffect(() => {
        // Simulate loading
        setTimeout(() => {
            setLoading(false)
        }, 1000)
    }, [])

    // Mock WebSocket connection
    useEffect(() => {
        setWsConnected(true)
        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
    }, [reconnectTrigger])

    const toggleLogExpand = (logId) => {
        const newExpanded = new Set(expandedLogs)
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId)
        } else {
            newExpanded.add(logId)
        }
        setExpandedLogs(newExpanded)
    }

    // Mock API functions
    const fetchLogs = async () => {
        // Mock implementation
        console.log('Fetching logs...')
    }

    const fetchHealthHistory = async () => {
        // Mock implementation
        console.log('Fetching health history...')
    }

    const fetchLlmMetrics = async () => {
        // Mock implementation
        console.log('Fetching LLM metrics...')
    }

    const previewCleanup = async () => {
        // Mock implementation
        console.log('Previewing cleanup...')
    }

    const executeCleanup = async () => {
        // Mock implementation
        console.log('Executing cleanup...')
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
                        className="absolute top-4 right-4 text-indigo-600 hover:text-indigo-700"
                    >
                        ×
                    </button>
                    <div className="max-w-4xl">
                        <h2 className="text-lg font-bold text-indigo-900 mb-2">System Administration Dashboard</h2>
                        <p className="text-indigo-800 mb-4">
                            Monitor your application's health, performance, and usage patterns in real-time.
                            Track API performance, error rates, database statistics, and AI/LLM operations.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <h3 className="font-bold text-indigo-900 mb-1">Real-time Monitoring</h3>
                                <p className="text-indigo-700">Live WebSocket updates for instant alerts and status changes.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900 mb-1">Performance Analytics</h3>
                                <p className="text-indigo-700">Response times, error rates, and throughput metrics.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white border-b border-slate-200 px-8">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={`pb-4 text-sm font-medium border-b-2 transition ${
                            activeTab === "overview"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`pb-4 text-sm font-medium border-b-2 transition ${
                            activeTab === "logs"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        System Logs
                    </button>
                    <button
                        onClick={() => setActiveTab("invitations")}
                        className={`pb-4 text-sm font-medium border-b-2 transition ${
                            activeTab === "invitations"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        Invitations
                    </button>
                    <button
                        onClick={() => setActiveTab("errors")}
                        className={`pb-4 text-sm font-medium border-b-2 transition ${
                            activeTab === "errors"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        Errors
                    </button>
                    <button
                        onClick={() => setActiveTab("health-history")}
                        className={`pb-4 text-sm font-medium border-b-2 transition ${
                            activeTab === "health-history"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        Health History
                    </button>
                    <button
                        onClick={() => setActiveTab("llm")}
                        className={`pb-4 text-sm font-medium border-b-2 transition ${
                            activeTab === "llm"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
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
