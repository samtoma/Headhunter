import React from 'react'
import { Activity, AlertCircle, Server, TrendingUp, Zap, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import MetricCard from '../shared/MetricCard'
import { getHealthColor } from '../utils/adminDashboardUtils'

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

    const logsByLevelData = Object.entries(metrics?.logs_by_level || {}).map(([level, count]) => ({
        name: level,
        value: count,
        color: levelColors[level] || "#94a3b8"
    }))

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Logs"
                    value={metrics?.total_logs?.toLocaleString() || "0"}
                    icon={Activity}
                    color="indigo"
                />
                <MetricCard
                    title="Error Rate (24h)"
                    value={`${uxAnalytics?.error_rate_percent?.toFixed(1) || metrics?.error_rate_24h?.toFixed(1) || 0}%`}
                    icon={AlertCircle}
                    color="red"
                />
                <MetricCard
                    title="Response p95"
                    value={`${uxAnalytics?.response_time_p95_ms?.toFixed(0) || 0}ms`}
                    icon={Zap}
                    color="blue"
                />
                <MetricCard
                    title="API Requests (24h)"
                    value={uxAnalytics?.total_requests?.toLocaleString() || metrics?.api_requests_24h?.toLocaleString() || "0"}
                    icon={TrendingUp}
                    color="green"
                />
            </div>

            {/* Logs by Level Chart */}
            {logsByLevelData.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Activity size={18} />
                        Logs by Level (Last 24h)
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={logsByLevelData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {logsByLevelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Data Cleanup Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Data Cleanup Management
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="font-medium text-slate-700">Cleanup logs older than:</label>
                        <select
                            value={cleanupDays}
                            onChange={(e) => setCleanupDays(parseInt(e.target.value))}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value={7}>7 days</option>
                            <option value={30}>30 days</option>
                            <option value={90}>90 days</option>
                            <option value={180}>180 days</option>
                            <option value={365}>1 year</option>
                        </select>
                        <button
                            onClick={previewCleanup}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                        >
                            Preview
                        </button>
                    </div>

                    {cleanupPreview && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="text-amber-600" size={16} />
                                <span className="font-medium text-amber-800">Cleanup Preview</span>
                            </div>
                            <div className="text-sm text-amber-700 mb-2">
                                This will permanently delete {cleanupPreview.total_logs_to_delete?.toLocaleString() || 0} log entries older than {cleanupDays} days.
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={executeCleanup}
                            disabled={isCleaningUp || !cleanupPreview}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                            {isCleaningUp ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Cleaning up...
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={16} />
                                    Execute Cleanup
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OverviewTab
