import React from 'react'
import { RefreshCw, Brain, TrendingUp, Clock, AlertCircle, Sparkles, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '../utils/adminDashboardUtils'

const LLMMonitoringTab = ({ llmMetrics, llmCompanyFilter, setLlmCompanyFilter, fetchLlmMetrics }) => {
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

            {/* Operations by Model */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4">Operations by Model</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {llmMetrics.operations_by_model?.map((model) => (
                        <div key={model.model} className="p-4 bg-slate-50 rounded-lg">
                            <div className="font-bold text-slate-700 mb-2">{model.model}</div>
                            <div className="text-2xl font-bold text-slate-900 mb-1">{model.count}</div>
                            <div className="text-sm text-slate-500">
                                {Math.round(model.avg_latency_ms)}ms avg latency
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {model.total_tokens.toLocaleString()} tokens
                            </div>
                        </div>
                    )) || []}
                </div>
            </div>

            {/* Recent Operations Table */}
            {llmMetrics.recent_operations && llmMetrics.recent_operations.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-700">Recent Operations</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Action</th>
                                    <th className="p-4">Model</th>
                                    <th className="p-4">Tokens</th>
                                    <th className="p-4">Latency</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">User</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {llmMetrics.recent_operations.map((op) => (
                                    <tr key={op.id} className="hover:bg-slate-50/50">
                                        <td className="p-4 font-mono text-xs text-slate-500">
                                            {formatDate(new Date(op.created_at))}
                                        </td>
                                        <td className="p-4 font-medium text-slate-900">{op.action}</td>
                                        <td className="p-4 text-slate-600">{op.model}</td>
                                        <td className="p-4 text-slate-600">
                                            {op.tokens_used ? op.tokens_used.toLocaleString() : '-'}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {op.latency_ms ? `${op.latency_ms}ms` : '-'}
                                        </td>
                                        <td className="p-4">
                                            {op.error_type ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                                                    <XCircle size={12} />
                                                    Error
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1">
                                                    <CheckCircle size={12} />
                                                    Success
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">
                                            {op.user_email || (op.user_id ? `ID: ${op.user_id}` : "-")}
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

export default LLMMonitoringTab