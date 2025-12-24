import React from 'react'
import { AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { formatDate } from '../utils/adminDashboardUtils'
import TabHelpSection from '../shared/TabHelpSection'

// Error analysis explanations
const errorKpis = [
    { term: 'Error Type', description: 'Python exception class name (e.g., ValueError, HTTPException).' },
    { term: 'Stack Trace', description: 'Full call stack showing where the error occurred in code.' },
    { term: 'Component', description: 'Service that generated the error (api, celery, llm).' },
    { term: 'HTTP Path', description: 'API endpoint that was called when the error occurred.' },
    { term: 'Metadata', description: 'Additional context (request data, user info, parameters).' }
]

const ErrorsTab = ({ errors, expandedLogs, toggleLogExpand }) => {
    return (
        <div className="space-y-4">
            {/* Help Section */}
            <TabHelpSection
                title="Understanding Error Details"
                storageKey="errors"
                items={errorKpis}
            />
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

            {/* Empty State */}
            {(!errors || errors.length === 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-emerald-600" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Errors Found</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        Great news! There are no recent error logs in the system.
                        Errors will appear here when they occur.
                    </p>
                </div>
            )}
        </div>
    )
}

export default ErrorsTab
