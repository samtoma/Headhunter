import React from 'react'
import { RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getLevelColor, formatDate } from '../utils/adminDashboardUtils'

const LogsTab = ({
    logs,
    filters,
    setFilters,
    pagination,
    setPagination,
    expandedLogs,
    toggleLogExpand,
    fetchLogs,
    loading,
    error
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
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

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
                            {loading && (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500">
                                        <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                                        Loading logs...
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500">
                                        No logs found matching your filters.
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr className="hover:bg-slate-50/50">
                                        <td className="p-4 font-mono text-xs text-slate-500">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getLevelColor(log.level)}`}>
                                                {log.level}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-slate-900">{log.component}</td>
                                        <td className="p-4 text-slate-600">{log.action}</td>
                                        <td className="p-4 max-w-xs">
                                            <div className="truncate text-slate-900">{log.message}</div>
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">
                                            {log.user_email || (log.user_id ? `ID: ${log.user_id}` : "-")}
                                        </td>
                                        <td className="p-4">
                                            {log.http_status && (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${log.http_status >= 200 && log.http_status < 300 ? 'bg-green-100 text-green-700' :
                                                        log.http_status >= 300 && log.http_status < 400 ? 'bg-blue-100 text-blue-700' :
                                                            log.http_status >= 400 && log.http_status < 500 ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                    }`}>
                                                    {log.http_status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">
                                            {log.response_time_ms || "-"}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleLogExpand(log.id)}
                                                className="text-indigo-600 hover:text-indigo-700"
                                            >
                                                {expandedLogs.has(log.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedLogs.has(log.id) && (
                                        <tr>
                                            <td colSpan="9" className="bg-slate-50 p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <strong className="text-slate-700">Full Message:</strong>
                                                            <pre className="mt-1 p-2 bg-white rounded text-sm text-slate-900 overflow-x-auto whitespace-pre-wrap">
                                                                {log.message}
                                                            </pre>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 text-xs">
                                                            <div>
                                                                <strong className="text-slate-700">Request ID:</strong>
                                                                <span className="ml-1 font-mono text-slate-500">{log.request_id || "-"}</span>
                                                            </div>
                                                            <div>
                                                                <strong className="text-slate-700">IP Address:</strong>
                                                                <span className="ml-1 font-mono text-slate-500">{log.ip_address || "-"}</span>
                                                            </div>
                                                            {log.http_method && (
                                                                <div>
                                                                    <strong className="text-slate-700">Method:</strong>
                                                                    <span className="ml-1 font-bold text-indigo-600">{log.http_method}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {log.error_type && (
                                                            <div>
                                                                <strong className="text-slate-700">Error Type:</strong>
                                                                <span className="ml-2 text-red-600 font-bold">{log.error_type}</span>
                                                            </div>
                                                        )}
                                                        {log.error_message && (
                                                            <div>
                                                                <strong className="text-slate-700">Error Message:</strong>
                                                                <pre className="mt-1 p-2 bg-white rounded text-sm text-red-700 overflow-x-auto">
                                                                    {log.error_message}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {log.stack_trace && (
                                                            <div>
                                                                <strong className="text-slate-700">Stack Trace:</strong>
                                                                <pre className="mt-1 p-2 bg-white rounded text-xs text-slate-700 overflow-x-auto max-h-96">
                                                                    {log.stack_trace}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                        <div>
                                                            <strong className="text-slate-700">Additional Metadata:</strong>
                                                            <pre className="mt-1 p-2 bg-slate-100 rounded text-xs text-slate-600 overflow-x-auto">
                                                                {JSON.stringify(log.metadata, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.total > 0 && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Showing {((pagination.offset || 0) + 1)} to {Math.min((pagination.offset || 0) + (pagination.limit || 100), pagination.total)} of {pagination.total} logs
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination({ ...pagination, offset: Math.max(0, (pagination.offset || 0) - (pagination.limit || 100)) })}
                                disabled={(pagination.offset || 0) === 0}
                                className="px-3 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPagination({ ...pagination, offset: (pagination.offset || 0) + (pagination.limit || 100) })}
                                disabled={(pagination.offset || 0) + (pagination.limit || 100) >= pagination.total}
                                className="px-3 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LogsTab
