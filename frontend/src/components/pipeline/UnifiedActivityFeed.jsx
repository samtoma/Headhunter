import { useState, useMemo } from 'react';
import {
    Calendar, Clock, User, ChevronDown, ChevronUp, MessageSquare,
    Star, Plus, RefreshCw, ArrowRight
} from 'lucide-react';

/**
 * UnifiedActivityFeed - Merges Timeline and Interviews into a single chronological feed.
 * Interviews are shown as prominent expandable cards. Other activities are compact.
 */
const UnifiedActivityFeed = ({
    interviews = [],
    timeline = [],
    onAddInterview
}) => {
    const [expandedId, setExpandedId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Merge interviews and timeline into a single chronological list
    const mergedFeed = useMemo(() => {
        const items = [];

        // Add interviews with a special type
        interviews.forEach(interview => {
            items.push({
                id: `interview-${interview.id}`,
                type: 'interview',
                data: interview,
                timestamp: new Date(interview.scheduled_at || interview.created_at),
                priority: 1 // highest
            });
        });

        // Add timeline items (excluding interview-related ones to avoid duplication)
        timeline.forEach(item => {
            if (item.action !== 'interview_scheduled' && item.action !== 'interview_updated') {
                items.push({
                    id: `activity-${item.id}`,
                    type: 'activity',
                    data: item,
                    timestamp: new Date(item.created_at),
                    priority: 2
                });
            }
        });

        // Sort by timestamp (newest first), then by priority
        return items.sort((a, b) => {
            const timeDiff = b.timestamp - a.timestamp;
            if (timeDiff !== 0) return timeDiff;
            return a.priority - b.priority;
        });
    }, [interviews, timeline]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'No date';
        const d = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getOutcomeColor = (outcome) => {
        switch (outcome?.toLowerCase()) {
            case 'passed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'failed': return 'text-red-600 bg-red-50 border-red-200';
            case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'cancelled': return 'text-slate-500 bg-slate-50 border-slate-200';
            default: return 'text-indigo-600 bg-indigo-50 border-indigo-200';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'scheduled': return 'bg-blue-500';
            case 'completed': return 'bg-emerald-500';
            case 'cancelled': return 'bg-slate-400';
            case 'no show': return 'bg-red-500';
            default: return 'bg-indigo-500';
        }
    };

    const getActivityIcon = (action) => {
        switch (action) {
            case 'status_change': return <ArrowRight size={12} />;
            case 'note_added': return <MessageSquare size={12} />;
            case 'rating_change': return <Star size={12} />;
            default: return <RefreshCw size={12} />;
        }
    };

    return (
        <div className="space-y-3">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-900 uppercase flex items-center gap-2">
                    <Calendar size={14} /> Activity & Interviews
                </h4>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                    <Plus size={14} /> Log Interview
                </button>
            </div>

            {/* Add Interview Form (collapsible) */}
            {showAddForm && onAddInterview && (
                <div className="bg-white p-4 rounded-xl border-2 border-indigo-200 shadow-lg animate-in fade-in slide-in-from-top-2">
                    {/* The form will be passed in as a render prop or handled externally */}
                    <div className="text-sm text-slate-600">
                        Use the form below to log a new interview.
                    </div>
                    {onAddInterview(setShowAddForm)}
                </div>
            )}

            {/* No activity state */}
            {mergedFeed.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                    <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                    <div className="text-sm font-medium">No activity yet</div>
                    <div className="text-xs">Schedule an interview to get started</div>
                </div>
            )}

            {/* Unified Feed */}
            <div className="space-y-2">
                {mergedFeed.map((item) => (
                    item.type === 'interview' ? (
                        // INTERVIEW CARD - Prominent & Expandable
                        <div
                            key={item.id}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Interview Header - Always Visible */}
                            <div
                                className="p-3 cursor-pointer flex items-center justify-between hover:bg-slate-50/50 transition"
                                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Status Indicator */}
                                    <div className={`w-2 h-10 rounded-full ${getStatusColor(item.data.status)}`}></div>

                                    {/* Main Info */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800">{item.data.step}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getOutcomeColor(item.data.outcome)}`}>
                                                {item.data.outcome || 'Pending'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={10} />
                                                {formatDate(item.data.scheduled_at)}
                                            </span>
                                            {item.data.scheduled_at && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {formatTime(item.data.scheduled_at)}
                                                </span>
                                            )}
                                            {item.data.interviewer_name && (
                                                <span className="flex items-center gap-1">
                                                    <User size={10} />
                                                    {item.data.interviewer_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Rating & Expand */}
                                <div className="flex items-center gap-2">
                                    {item.data.rating && (
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <Star size={14} fill="currentColor" />
                                            <span className="text-sm font-bold">{item.data.rating}</span>
                                        </div>
                                    )}
                                    {expandedId === item.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === item.id && (
                                <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/30 animate-in fade-in slide-in-from-top-1">
                                    {item.data.feedback ? (
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Feedback</div>
                                            <div className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-100">
                                                {item.data.feedback}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-400 italic">
                                            No feedback recorded yet.
                                        </div>
                                    )}

                                    {/* Custom Data */}
                                    {item.data.custom_data && (() => {
                                        try {
                                            const custom = typeof item.data.custom_data === 'string'
                                                ? JSON.parse(item.data.custom_data)
                                                : item.data.custom_data;
                                            if (Object.keys(custom).length > 0) {
                                                return (
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        {Object.entries(custom).map(([key, value]) => (
                                                            <div key={key} className="bg-white px-2 py-1.5 rounded border border-slate-100">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase">{key}</div>
                                                                <div className="text-sm text-slate-700">{value}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        } catch {
                                            // JSON parse error - ignore invalid custom_data
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                        </div>
                    ) : (
                        // ACTIVITY ITEM - Compact
                        <div
                            key={item.id}
                            className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-white transition"
                        >
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                {getActivityIcon(item.data.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-slate-700">
                                    <span className="font-semibold capitalize">{item.data.action?.replace(/_/g, ' ')}</span>
                                    {/* Added to pipeline source */}
                                    {item.data.action === 'added_to_pipeline' && item.data.details?.source === 'landing_page' && (
                                        <span className="text-indigo-500 font-medium"> via Landing Page</span>
                                    )}
                                    {item.data.action === 'added_to_pipeline' && item.data.details?.job_title && (
                                        <span className="text-slate-500"> · {item.data.details.job_title}</span>
                                    )}
                                    {/* Status transition */}
                                    {item.data.details?.old_status && item.data.details?.new_status && (
                                        <span className="text-slate-500">
                                            {' '}· {item.data.details.old_status} → {item.data.details.new_status}
                                        </span>
                                    )}
                                    {/* Rating change */}
                                    {item.data.details?.new_rating && (
                                        <span className="text-amber-500">
                                            {' '}· Rating: {item.data.details.old_rating || '–'} → {item.data.details.new_rating}
                                        </span>
                                    )}
                                </div>
                                {/* Notes if present */}
                                {item.data.details?.notes && (
                                    <div className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1 mt-1 line-clamp-2 italic">
                                        &quot;{item.data.details.notes}&quot;
                                    </div>
                                )}
                                <div className="text-xs text-slate-400 mt-0.5">
                                    {new Date(item.data.created_at).toLocaleString()}
                                    {item.data.user_name && <> · by <span className="text-slate-500">{item.data.user_name}</span></>}
                                </div>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

export default UnifiedActivityFeed;
