import React from 'react'
import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { formatDate } from '../utils/adminDashboardUtils'

const ErrorsTab = ({ errors, expandedLogs, toggleLogExpand }) => {
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

export default ErrorsTab
