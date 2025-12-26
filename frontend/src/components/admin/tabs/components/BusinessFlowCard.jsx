import { ArrowUp, ArrowDown, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

const BusinessFlowCard = ({ flow }) => {
    const isPositive = flow.trend_percent >= 0
    const isHealthy = flow.status === 'healthy'

    const formatLastEvent = (dateString) => {
        if (!dateString) return 'No recent activity'
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        return date.toLocaleDateString()
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isHealthy ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 text-sm">{flow.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Clock size={10} />
                            <span>Last: {formatLastEvent(flow.last_event_at)}</span>
                        </div>
                    </div>
                </div>
                <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {Math.abs(flow.trend_percent)}%
                </div>
            </div>

            <div className="flex items-end justify-between mt-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">24h Volume</p>
                    <p className="text-2xl font-bold text-slate-900">{flow.volume_24h.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">Prev 24h</p>
                    <p className="text-sm font-semibold text-slate-600">{flow.volume_prev_24h.toLocaleString()}</p>
                </div>
            </div>

            {/* Simple Volume Bar Visualization */}
            <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min((flow.volume_24h / (Math.max(flow.volume_24h, flow.volume_prev_24h) || 1)) * 100, 100)}%` }}
                />
            </div>
        </div>
    )
}

export default BusinessFlowCard
