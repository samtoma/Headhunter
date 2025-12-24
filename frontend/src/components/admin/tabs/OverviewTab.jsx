import React from 'react'
import { Activity, AlertCircle, Server, TrendingUp, Zap, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import MetricCard from '../shared/MetricCard'
import TabHelpSection from '../shared/TabHelpSection'
import { getHealthColor } from '../utils/adminDashboardUtils'

// KPI explanations for this tab
const overviewKpis = [
    { term: 'Total Logs', description: 'Total number of log entries recorded in the system.' },
    { term: 'Error Rate', description: 'Percentage of requests that resulted in errors (4xx/5xx) in the last 24 hours.' },
    { term: 'Response p95', description: '95th percentile response time - 95% of requests complete faster than this.' },
    { term: 'API Requests', description: 'Total number of API calls processed in the last 24 hours.' },
    { term: 'System Health', description: 'Real-time status of core services: Database, Redis, Celery, and ChromaDB.' },
    { term: 'Healthy', description: 'Service is operating normally with optimal response times.' },
    { term: 'Degraded', description: 'Service is responding but with higher latency or minor issues.' },
    { term: 'Unhealthy', description: 'Service is down or experiencing critical failures.' }
]

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
            {/* Help Section */}
            <TabHelpSection
                title="Understanding Overview Metrics"
                storageKey="overview"
                items={overviewKpis}
            />
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

            {/* Logs by Level - Modern Horizontal Bar Design */}
            {logsByLevelData.length > 0 && (() => {
                const totalLogs = logsByLevelData.reduce((sum, item) => sum + item.value, 0)
                const sortedData = [...logsByLevelData].sort((a, b) =>
                    ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'].indexOf(a.name) -
                    ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'].indexOf(b.name)
                )

                return (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Activity size={18} />
                                Log Distribution (Last 24h)
                            </h3>
                            <span className="text-sm text-slate-500">
                                {totalLogs.toLocaleString()} total entries
                            </span>
                        </div>

                        {/* Stacked Horizontal Bar */}
                        <div className="mb-6">
                            <div className="h-8 rounded-lg overflow-hidden flex shadow-inner bg-slate-100">
                                {sortedData.map((item, i) => {
                                    const percentage = totalLogs > 0 ? (item.value / totalLogs) * 100 : 0
                                    if (percentage === 0) return null
                                    return (
                                        <div
                                            key={i}
                                            className="h-full transition-all hover:opacity-80"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: item.color,
                                                minWidth: percentage > 0 ? '2px' : '0'
                                            }}
                                            title={`${item.name}: ${item.value.toLocaleString()} (${percentage.toFixed(1)}%)`}
                                        />
                                    )
                                })}
                            </div>
                        </div>

                        {/* Level Cards Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'].map(level => {
                                const levelData = logsByLevelData.find(d => d.name === level) || { value: 0 }
                                const percentage = totalLogs > 0 ? ((levelData.value / totalLogs) * 100).toFixed(1) : '0'
                                const color = levelColors[level]
                                const bgColor = {
                                    CRITICAL: 'bg-purple-50 border-purple-200',
                                    ERROR: 'bg-red-50 border-red-200',
                                    WARNING: 'bg-amber-50 border-amber-200',
                                    INFO: 'bg-blue-50 border-blue-200',
                                    DEBUG: 'bg-slate-50 border-slate-200'
                                }[level]
                                const textColor = {
                                    CRITICAL: 'text-purple-700',
                                    ERROR: 'text-red-700',
                                    WARNING: 'text-amber-700',
                                    INFO: 'text-blue-700',
                                    DEBUG: 'text-slate-600'
                                }[level]

                                return (
                                    <div key={level} className={`p-3 rounded-lg border ${bgColor} transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-default group`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className={`text-xs font-bold uppercase tracking-wide ${textColor}`}>
                                                {level}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline justify-between">
                                            <span className={`text-lg font-bold ${textColor}`}>
                                                {levelData.value.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {percentage}%
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })()}

            {/* Database Statistics - Side by Side */}
            {dbStats && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Server size={18} />
                        Database Statistics
                    </h3>

                    {/* Two databases side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Production Database */}
                        {dbStats.production && (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl overflow-hidden">
                                {/* Header */}
                                <div className="bg-indigo-100 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                        <h4 className="font-bold text-indigo-800">Production DB</h4>
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full">
                                        {dbStats.production.total_db_size_mb} MB
                                    </span>
                                </div>

                                <div className="p-4">
                                    {/* Pool Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-white p-3 rounded-lg border border-indigo-100 text-center shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">Pool Size</div>
                                            <div className="text-lg font-bold text-slate-800">{dbStats.production.connection_pool_size}</div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">Available</div>
                                            <div className="text-lg font-bold text-emerald-600">{dbStats.production.connections_available}</div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-blue-100 text-center shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">In Use</div>
                                            <div className="text-lg font-bold text-blue-600">{dbStats.production.connections_in_use}</div>
                                        </div>
                                    </div>

                                    {/* Table Sizes */}
                                    {dbStats.production.table_sizes?.length > 0 && (
                                        <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                                                    <tr>
                                                        <th className="text-left p-2 font-bold">Table</th>
                                                        <th className="text-right p-2 font-bold">Size</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-indigo-50">
                                                    {dbStats.production.table_sizes.slice(0, 5).map((t, i) => (
                                                        <tr key={i} className="hover:bg-indigo-50/50 transition">
                                                            <td className="p-2 font-mono text-slate-700">{t.table}</td>
                                                            <td className="p-2 text-right font-semibold text-slate-600">{t.size}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Logs Database */}
                        {dbStats.logs && (
                            <div className="bg-amber-50/50 border border-amber-100 rounded-xl overflow-hidden">
                                {/* Header */}
                                <div className="bg-amber-100 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                        <h4 className="font-bold text-amber-800">Logs DB</h4>
                                    </div>
                                    <span className="text-sm font-bold text-amber-600 bg-white px-2 py-0.5 rounded-full">
                                        {dbStats.logs.total_db_size_mb} MB
                                    </span>
                                </div>

                                <div className="p-4">
                                    {/* Pool Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-white p-3 rounded-lg border border-amber-100 text-center shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">Pool Size</div>
                                            <div className="text-lg font-bold text-slate-800">{dbStats.logs.connection_pool_size}</div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">Available</div>
                                            <div className="text-lg font-bold text-emerald-600">{dbStats.logs.connections_available}</div>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-blue-100 text-center shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">In Use</div>
                                            <div className="text-lg font-bold text-blue-600">{dbStats.logs.connections_in_use}</div>
                                        </div>
                                    </div>

                                    {/* Table Sizes */}
                                    {dbStats.logs.table_sizes?.length > 0 && (
                                        <div className="bg-white rounded-lg border border-amber-100 overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-amber-50 text-amber-700 uppercase tracking-wider">
                                                    <tr>
                                                        <th className="text-left p-2 font-bold">Table</th>
                                                        <th className="text-right p-2 font-bold">Size</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-amber-50">
                                                    {dbStats.logs.table_sizes.slice(0, 5).map((t, i) => (
                                                        <tr key={i} className="hover:bg-amber-50/50 transition">
                                                            <td className="p-2 font-mono text-slate-700">{t.table}</td>
                                                            <td className="p-2 text-right font-semibold text-slate-600">{t.size}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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
