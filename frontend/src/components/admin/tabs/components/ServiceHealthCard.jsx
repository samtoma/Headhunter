import { Activity, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'

const ServiceHealthCard = ({ name, status, responseTime, history }) => {
    // Generate mini sparkline data from history
    const sparklineData = history.map(point => {
        const service = point.services?.find(s => s.name === name)
        return {
            time: point.timestamp,
            value: service?.response_time_ms || 0
        }
    }).slice(-20) // Last 20 points

    const getStatusIcon = () => {
        switch (status) {
            case 'healthy': return <CheckCircle size={18} className="text-emerald-500" />
            case 'degraded': return <AlertTriangle size={18} className="text-amber-500" />
            case 'unhealthy': return <XCircle size={18} className="text-red-500" />
            default: return <Activity size={18} className="text-slate-400" />
        }
    }

    const getStatusColor = () => {
        switch (status) {
            case 'healthy': return 'bg-emerald-50 border-emerald-100'
            case 'degraded': return 'bg-amber-50 border-amber-100'
            case 'unhealthy': return 'bg-red-50 border-red-100'
            default: return 'bg-slate-50 border-slate-100'
        }
    }

    const getStrokeColor = () => {
        switch (status) {
            case 'healthy': return '#10b981'
            case 'degraded': return '#f59e0b'
            case 'unhealthy': return '#ef4444'
            default: return '#94a3b8'
        }
    }

    return (
        <div className={`p-4 rounded-xl border ${getStatusColor()} relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="font-bold text-slate-700">{name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono bg-white/50 px-2 py-1 rounded">
                    <Clock size={12} className="text-slate-400" />
                    <span className={status === 'healthy' ? 'text-emerald-700' : 'text-slate-700'}>
                        {responseTime ? `${Math.round(responseTime)}ms` : '-'}
                    </span>
                </div>
            </div>

            <div className="h-12 -mx-2 -mb-2 opacity-50 relative z-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={getStrokeColor()}
                            fill={getStrokeColor()}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default ServiceHealthCard
