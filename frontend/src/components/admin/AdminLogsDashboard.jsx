import { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Activity, AlertCircle, Users, Mail, Search, Filter, Download,
    RefreshCw, Calendar, Clock, Server, TrendingUp, AlertTriangle,
    CheckCircle, XCircle, Eye, ChevronDown, ChevronUp
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const AdminLogsDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview")
    const [metrics, setMetrics] = useState(null)
    const [logs, setLogs] = useState([])
    const [invitations, setInvitations] = useState([])
    const [errors, setErrors] = useState([])
    const [loading, setLoading] = useState(true)

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

    useEffect(() => {
        fetchMetrics()
        if (activeTab === "logs") {
            fetchLogs()
        } else if (activeTab === "invitations") {
            fetchInvitations()
        } else if (activeTab === "errors") {
            fetchErrors()
        }
    }, [activeTab, filters, pagination.offset])

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
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">System monitoring, logs, and analytics</p>
            </div>

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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === "overview" && metrics && (
                    <OverviewTab metrics={metrics} />
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
            </div>
        </div>
    )
}

// Overview Tab Component
const OverviewTab = ({ metrics }) => {
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

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Logs"
                    value={metrics.total_logs?.toLocaleString() || "0"}
                    icon={Activity}
                    color="indigo"
                />
                <MetricCard
                    title="Errors (24h)"
                    value={`${metrics.error_rate_24h?.toFixed(1) || 0}%`}
                    icon={AlertCircle}
                    color="red"
                />
                <MetricCard
                    title="Avg Response Time"
                    value={`${metrics.avg_response_time_ms?.toFixed(0) || 0}ms`}
                    icon={Clock}
                    color="blue"
                />
                <MetricCard
                    title="Total Invitations"
                    value={metrics.total_invitations?.toLocaleString() || "0"}
                    icon={Mail}
                    color="green"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4">Logs by Level</h3>
                    <ResponsiveContainer width="100%" height={300}>
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

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4">Logs by Component</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={Object.entries(metrics.logs_by_component || {}).map(([name, value]) => ({ name, value }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#6366f1" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Invitation Status */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4">Invitations by Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(metrics.invitations_by_status || {}).map(([status, count]) => (
                        <div key={status} className="text-center">
                            <div className="text-2xl font-bold text-slate-900">{count}</div>
                            <div className="text-sm text-slate-500 capitalize">{status}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Deployment Info */}
            {metrics.deployment_version && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-2">Deployment Information</h3>
                    <div className="text-sm text-slate-600">
                        <strong>Version:</strong> {metrics.deployment_version}
                    </div>
                </div>
            )}
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
                                <tr key={log.id} className="hover:bg-slate-50/50">
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

export default AdminLogsDashboard

