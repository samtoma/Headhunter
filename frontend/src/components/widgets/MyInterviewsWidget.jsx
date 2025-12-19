import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react';

/**
 * MyInterviewsWidget - Shows upcoming interviews assigned to the current user.
 * Can be embedded in any dashboard/page for any role.
 */
const MyInterviewsWidget = ({ limit = 5, onViewCandidate }) => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetchMyInterviews();
    }, []);

    const fetchMyInterviews = async () => {
        try {
            const res = await axios.get('/api/interviews/my');
            // Sort by scheduled_at, show upcoming first
            const sorted = res.data.sort((a, b) => {
                if (!a.scheduled_at) return 1;
                if (!b.scheduled_at) return -1;
                return new Date(a.scheduled_at) - new Date(b.scheduled_at);
            });
            setInterviews(sorted);
        } catch (err) {
            console.error("Failed to fetch interviews", err);
        } finally {
            setLoading(false);
        }
    };

    // Filter to upcoming only - exclude completed, cancelled, and no-show interviews
    const upcoming = interviews.filter(i => {
        if (!i.scheduled_at) return false;
        // Only show if date is in future AND status is Scheduled (or null for backwards compat)
        const isFutureDate = new Date(i.scheduled_at) >= new Date();
        const isActiveStatus = !i.status || i.status === 'Scheduled';
        return isFutureDate && isActiveStatus;
    });

    const displayList = expanded ? upcoming : upcoming.slice(0, limit);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
                <div className="h-12 bg-slate-100 rounded"></div>
            </div>
        );
    }

    if (upcoming.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-600 font-semibold mb-2">
                    <Calendar size={18} className="text-indigo-600" />
                    My Upcoming Interviews
                </div>
                <div className="text-sm text-slate-400 flex items-center gap-2">
                    <AlertCircle size={14} />
                    No upcoming interviews scheduled.
                </div>
            </div>
        );
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Calendar size={18} className="text-indigo-600" />
                    My Upcoming Interviews
                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                        {upcoming.length}
                    </span>
                </div>
            </div>
            <div className="divide-y divide-slate-100">
                {displayList.map(interview => (
                    <div
                        key={interview.id}
                        className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group"
                        onClick={() => onViewCandidate?.(interview)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                {interview.candidate_name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 text-sm">
                                    {interview.candidate_name}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{interview.step}</span>
                                    <span>{interview.job_title}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm font-semibold text-slate-700">
                                    {formatDate(interview.scheduled_at)}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                                    <Clock size={12} />
                                    {formatTime(interview.scheduled_at)}
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition" />
                        </div>
                    </div>
                ))}
            </div>
            {upcoming.length > limit && (
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        {expanded ? 'Show Less' : `View All ${upcoming.length} Interviews`}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MyInterviewsWidget;
