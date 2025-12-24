import React from 'react'
import { RefreshCw, Activity } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from 'recharts'

const HealthHistoryTab = ({ healthHistory, historyHours, setHistoryHours, historyInterval, setHistoryInterval, fetchHealthHistory, thresholds, getStatusValue, getServiceStatusColor }) => {

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
                second: '2-digit'
            })
        }
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Transform data for health history chart
    const chartData = healthHistory.map(point => ({
        timestamp: point.timestamp,
        time: formatTimestamp(point.timestamp),
        Database: getStatusValue(point.services?.find(s => s.name === 'Database')?.status),
        Redis: getStatusValue(point.services?.find(s => s.name === 'Redis')?.status),
        Celery: getStatusValue(point.services?.find(s => s.name === 'Celery')?.status),
        ChromaDB: getStatusValue(point.services?.find(s => s.name === 'ChromaDB')?.status),
        overall: getStatusValue(point.overall_status)
    }))

    // Calculate uptime percentages
    const totalPoints = chartData.length
    const healthyPoints = chartData.filter(p => p.overall === 2).length
    const degradedPoints = chartData.filter(p => p.overall === 1).length
    const unhealthyPoints = chartData.filter(p => p.overall === 0).length

    const uptimePercent = totalPoints > 0 ? ((healthyPoints + degradedPoints) * 100 / totalPoints).toFixed(1) : '0.0'
    const healthyPercent = totalPoints > 0 ? (healthyPoints * 100 / totalPoints).toFixed(1) : '0.0'

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Hours:</label>
                        <select
                            value={historyHours}
                            onChange={(e) => setHistoryHours(parseInt(e.target.value))}
                            className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
                        >
                            <option value={1}>1h</option>
                            <option value={6}>6h</option>
                            <option value={12}>12h</option>
                            <option value={24}>24h</option>
                            <option value={48}>48h</option>
                            <option value={72}>72h</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Interval:</label>
                        <select
                            value={historyInterval}
                            onChange={(e) => setHistoryInterval(parseInt(e.target.value))}
                            className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
                        >
                            <option value={1}>1 min</option>
                            <option value={5}>5 min</option>
                            <option value={15}>15 min</option>
                            <option value={30}>30 min</option>
                            <option value={60}>1 hour</option>
                        </select>
                    </div>
                    <button
                        onClick={fetchHealthHistory}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Uptime Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Activity className="text-green-600" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-green-600">{healthyPercent}%</div>
                            <div className="text-sm text-slate-500">Healthy Uptime</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Activity className="text-blue-600" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{uptimePercent}%</div>
                            <div className="text-sm text-slate-500">Total Uptime</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Activity className="text-red-600" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-red-600">{unhealthyPoints}</div>
                            <div className="text-sm text-slate-500">Unhealthy Points</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health History Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4">Service Health History</h3>
                <div className="mb-4 text-sm text-slate-600">
                    <div className="flex items-center gap-4">
                        <span>Status: 2=Healthy, 1=Degraded, 0=Unhealthy</span>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 10 }} 
                            interval="preserveStartEnd"
                        />
                        <YAxis 
                            domain={[0, 2]} 
                            ticks={[0, 1, 2]} 
                            tick={{ fontSize: 10 }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line 
                            type="stepAfter" 
                            dataKey="Database" 
                            stroke={getServiceStatusColor('Database')} 
                            strokeWidth={2} 
                            dot={false}
                            name="Database"
                        />
                        <Line 
                            type="stepAfter" 
                            dataKey="Redis" 
                            stroke={getServiceStatusColor('Redis')} 
                            strokeWidth={2} 
                            dot={false}
                            name="Redis"
                        />
                        <Line 
                            type="stepAfter" 
                            dataKey="Celery" 
                            stroke={getServiceStatusColor('Celery')} 
                            strokeWidth={2} 
                            dot={false}
                            name="Celery"
                        />
                        <Line 
                            type="stepAfter" 
                            dataKey="ChromaDB" 
                            stroke={getServiceStatusColor('ChromaDB')} 
                            strokeWidth={2} 
                            dot={false}
                            name="ChromaDB"
                        />
                        <Line 
                            type="stepAfter" 
                            dataKey="overall" 
                            stroke="#6b7280" 
                            strokeWidth={3} 
                            strokeDasharray="5 5"
                            dot={false}
                            name="Overall"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Service Response Times */}
            {healthHistory.some(point => point.services?.some(s => s.response_time_ms)) && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4">Service Response Times (ms)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={healthHistory.map(point => ({
                            time: formatTimestamp(point.timestamp),
                            Database: point.services?.find(s => s.name === 'Database')?.response_time_ms || 0,
                            Redis: point.services?.find(s => s.name === 'Redis')?.response_time_ms || 0,
                            Celery: point.services?.find(s => s.name === 'Celery')?.response_time_ms || 0,
                            ChromaDB: point.services?.find(s => s.name === 'ChromaDB')?.response_time_ms || 0
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="time" 
                                tick={{ fontSize: 10 }} 
                                interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="Database" 
                                stackId="1" 
                                stroke={getServiceStatusColor('Database')} 
                                fill={getServiceStatusColor('Database')} 
                                fillOpacity={0.3}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="Redis" 
                                stackId="1" 
                                stroke={getServiceStatusColor('Redis')} 
                                fill={getServiceStatusColor('Redis')} 
                                fillOpacity={0.3}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="Celery" 
                                stackId="1" 
                                stroke={getServiceStatusColor('Celery')} 
                                fill={getServiceStatusColor('Celery')} 
                                fillOpacity={0.3}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="ChromaDB" 
                                stackId="1" 
                                stroke={getServiceStatusColor('ChromaDB')} 
                                fill={getServiceStatusColor('ChromaDB')} 
                                fillOpacity={0.3}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

export default HealthHistoryTab
