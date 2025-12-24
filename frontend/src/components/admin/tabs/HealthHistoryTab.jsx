import React, { useMemo } from 'react'
import { RefreshCw, LayoutGrid, Calendar, AlertOctagon, CheckCircle2, XCircle } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'
import ServiceHealthCard from './components/ServiceHealthCard'
import BusinessFlowCard from './components/BusinessFlowCard'
import TabHelpSection from '../shared/TabHelpSection'

// Health history metrics explanations
const healthKpis = [
    { term: 'P50 Latency', description: 'Median response time - half of all requests are faster than this.' },
    { term: 'P95 Latency', description: '95th percentile - only 5% of requests take longer than this.' },
    { term: 'P99 Latency', description: '99th percentile - worst-case performance excluding outliers.' },
    { term: 'Database', description: 'PostgreSQL connection pool health and query performance.' },
    { term: 'Redis', description: 'In-memory cache and message broker status.' },
    { term: 'Celery', description: 'Background task worker queue health and throughput.' },
    { term: 'ChromaDB', description: 'Vector database for AI embeddings and semantic search.' },
    { term: 'Recent Incidents', description: 'Click any incident to view related logs with details.' }
]

const HealthHistoryTab = ({ healthHistory, historyHours, setHistoryHours, historyInterval, setHistoryInterval, fetchHealthHistory, thresholds, businessMetrics, onIncidentClick }) => {

    // Memoize the chart data transformation
    const chartData = useMemo(() => {
        if (!healthHistory) return []
        return healthHistory.map(point => {
            const date = new Date(point.timestamp)
            return {
                ...point,
                timeStr: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                timestamp: date.getTime(),
                response_time_max: Math.max(point.response_time_p99_ms || 0, 500) // Ensure scale
            }
        })
    }, [healthHistory])

    // Derive alerts from history
    const alerts = useMemo(() => {
        if (!healthHistory) return []
        const detectedAlerts = []
        healthHistory.forEach(point => {
            if (point.overall_status === 'unhealthy') {
                point.services.forEach(s => {
                    if (s.status === 'unhealthy') {
                        detectedAlerts.push({
                            id: `${point.timestamp}-${s.name}`,
                            timestamp: point.timestamp,
                            service: s.name,
                            type: 'critical',
                            message: s.message || 'Service unreachable'
                        })
                    }
                })
            } else if (point.response_time_p95_ms > 1000) {
                detectedAlerts.push({
                    id: `${point.timestamp}-latency`,
                    timestamp: point.timestamp,
                    service: 'API',
                    type: 'warning',
                    message: `High P95 Latency: ${point.response_time_p95_ms}ms`
                })
            }
        })
        return detectedAlerts.reverse().slice(0, 5) // Last 5 alerts
    }, [healthHistory])

    if (!healthHistory) {
        return (
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4 text-indigo-600" size={32} />
                    <p className="text-slate-500 font-medium">Loading system telemetry...</p>
                </div>
            </div>
        )
    }

    const currentData = healthHistory[healthHistory.length - 1] || {}
    const services = ['Database', 'Redis', 'Celery', 'ChromaDB']

    return (
        <div className="space-y-6">
            {/* Help Section */}
            <TabHelpSection
                title="Understanding Health Metrics"
                storageKey="health_history"
                items={healthKpis}
            />
            {/* Top Bar: Controls & Summary */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <LayoutGrid size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">System Monitor</h2>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {healthHistory.filter(h => h.overall_status === 'healthy').length} Healthy</span>
                            <span className="flex items-center gap-1"><AlertOctagon size={12} className="text-amber-500" /> {healthHistory.filter(h => h.overall_status === 'degraded').length} Degraded</span>
                            <span className="flex items-center gap-1"><XCircle size={12} className="text-red-500" /> {healthHistory.filter(h => h.overall_status === 'unhealthy').length} Critical</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <select
                        value={historyHours}
                        onChange={(e) => setHistoryHours(parseInt(e.target.value))}
                        className="bg-transparent text-sm font-medium text-slate-700 px-3 py-1.5 rounded hover:bg-white outline-none transition cursor-pointer"
                    >
                        <option value={1}>Last 1 Hour</option>
                        <option value={6}>Last 6 Hours</option>
                        <option value={12}>Last 12 Hours</option>
                        <option value={24}>Last 24 Hours</option>
                    </select>
                    <div className="w-px h-4 bg-slate-300"></div>
                    <select
                        value={historyInterval}
                        onChange={(e) => setHistoryInterval(parseInt(e.target.value))}
                        className="bg-transparent text-sm font-medium text-slate-700 px-3 py-1.5 rounded hover:bg-white outline-none transition cursor-pointer"
                    >
                        <option value={1}>1m Interval</option>
                        <option value={5}>5m Interval</option>
                        <option value={15}>15m Interval</option>
                    </select>
                    <button
                        onClick={fetchHealthHistory}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition tool-tip"
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Service Health Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map(serviceName => {
                    const status = currentData.services?.find(s => s.name === serviceName)
                    return (
                        <ServiceHealthCard
                            key={serviceName}
                            name={serviceName}
                            status={status?.status || 'unknown'}
                            responseTime={status?.response_time_ms}
                            history={healthHistory}
                            targetMetric="response_time_ms" // Could vary per service
                        />
                    )
                })}
            </div>

            {/* Business Process Health Section */}
            {businessMetrics && businessMetrics.flows && (
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <LayoutGrid size={20} className="text-indigo-600" />
                        Business Process Health
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {businessMetrics.flows.map((flow, i) => (
                            <BusinessFlowCard key={i} flow={flow} />
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Latency Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800">System Latency & Jitter</h3>
                            <p className="text-xs text-slate-500">P50 vs P95 vs P99 Percentiles</p>
                        </div>
                    </div>

                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorP99" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="timeStr"
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${v}ms`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <ReferenceLine y={1000} label="Critical" stroke="#ef4444" strokeDasharray="3 3" fontSize={10} />
                                <Area
                                    type="monotone"
                                    dataKey="response_time_p99_ms"
                                    stroke="#6366f1"
                                    fillOpacity={1}
                                    fill="url(#colorP99)"
                                    name="P99 Latency"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="response_time_p95_ms"
                                    stroke="#818cf8"
                                    fill="none"
                                    name="P95 Latency"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="response_time_p50_ms"
                                    stroke="#cbd5e1"
                                    fill="none"
                                    name="Median"
                                    strokeWidth={2}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Alerts & Anomalies Panel */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertOctagon size={18} className="text-slate-400" />
                        Recent Incidents
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
                        {alerts.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-100" />
                                No anomalies detected
                            </div>
                        ) : (
                            alerts.map((alert, i) => (
                                <div
                                    key={i}
                                    onClick={() => onIncidentClick && onIncidentClick(alert.timestamp, alert.type)}
                                    className={`p-3 rounded-lg border text-sm flex gap-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${alert.type === 'critical' ? 'bg-red-50 border-red-100 hover:border-red-300' : 'bg-amber-50 border-amber-100 hover:border-amber-300'
                                        }`}
                                >
                                    <div className={`mt-0.5 ${alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>
                                        <AlertOctagon size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-semibold ${alert.type === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
                                            {alert.type === 'critical' ? 'Critical Failure' : 'Warning'}
                                        </div>
                                        <div className="text-slate-600 mb-1">{alert.message}</div>
                                        <div className="text-xs text-slate-400 flex items-center justify-between">
                                            <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                            <span className="text-indigo-500 font-medium">Click to view logs →</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Uptime Strip Visualization */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider text-slate-500">System Availability Timeline</h3>
                {healthHistory.length === 0 ? (
                    <div className="h-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
                        No health data available for this period
                    </div>
                ) : (
                    <>
                        <div className="flex h-12 gap-0.5 w-full rounded-md overflow-hidden bg-slate-100">
                            {healthHistory.map((point, i) => {
                                let color = 'bg-emerald-400'
                                if (point?.overall_status === 'degraded') color = 'bg-amber-400'
                                if (point?.overall_status === 'unhealthy') color = 'bg-red-500'

                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 ${color} hover:opacity-80 transition cursor-help group relative min-w-[2px]`}
                                        style={{ flexBasis: `${100 / healthHistory.length}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded whitespace-nowrap z-50">
                                            {new Date(point?.timestamp).toLocaleTimeString()}: {(point?.overall_status || 'unknown').toUpperCase()}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex justify-between items-center mt-2 text-xs text-slate-400 font-mono">
                            <span>{new Date(healthHistory[0]?.timestamp).toLocaleString()}</span>
                            <span>{new Date(healthHistory[healthHistory.length - 1]?.timestamp).toLocaleString()}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default HealthHistoryTab
