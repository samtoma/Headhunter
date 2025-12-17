import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    GanttChart, Calendar, CheckCircle, XCircle, Clock, AlertCircle,
    Plus, Star, ChevronRight, X, User, MessageSquare
} from 'lucide-react';

/**
 * TimelineView - Minimalistic timeline visualization for interview progress
 * Clean, aesthetic design with smooth interactions
 */
const TimelineView = ({ jobId, onSelectCandidate, onScheduleInterview }) => {
    const [timelineData, setTimelineData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCell, setSelectedCell] = useState(null); // { candidate, stage, interviews }

    useEffect(() => {
        if (jobId) {
            setLoading(true);
            setError(null);
            axios.get(`/api/interviews/timeline/${jobId}`)
                .then(res => setTimelineData(res.data))
                .catch(() => setError("Failed to load timeline"))
                .finally(() => setLoading(false));
        } else {
            setTimelineData(null);
        }
    }, [jobId]);

    const isUpcoming = (dateString, status) => {
        if (!dateString || status !== 'Scheduled') return false;
        const d = new Date(dateString);
        const now = new Date();
        return d >= now && d <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    };

    const isToday = (dateString) => {
        if (!dateString) return false;
        return new Date(dateString).toDateString() === new Date().toDateString();
    };

    // Empty states
    if (!jobId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <GanttChart size={40} strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium">Select a job to view timeline</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !timelineData) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertCircle size={32} strokeWidth={1.5} />
                <p className="mt-2 text-sm">{error || "No data available"}</p>
            </div>
        );
    }

    const { stages, candidates } = timelineData;

    return (
        <div className="h-full p-6 overflow-auto bg-gradient-to-br from-slate-50 to-white">
            {/* Minimal Stats */}
            <div className="flex gap-6 mb-6 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-bold text-slate-900 text-lg">{candidates.length}</span>
                    candidates
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-bold text-emerald-600 text-lg">
                        {candidates.filter(c => c.interviews.some(i => i.outcome === 'Passed')).length}
                    </span>
                    passed
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-bold text-indigo-600 text-lg">
                        {candidates.filter(c => c.interviews.some(i => isUpcoming(i.scheduled_at, i.status))).length}
                    </span>
                    upcoming
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `220px repeat(${stages.length}, 1fr)` }}>
                    <div className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Candidate
                    </div>
                    {stages.map(stage => (
                        <div key={stage} className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center border-l border-slate-50">
                            {stage}
                        </div>
                    ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                    {candidates.length === 0 ? (
                        <div className="p-12 text-center text-slate-300 text-sm">
                            No candidates in pipeline
                        </div>
                    ) : (
                        candidates.map(candidate => {
                            const hasToday = candidate.interviews.some(i => isToday(i.scheduled_at) && i.status === 'Scheduled');

                            return (
                                <div
                                    key={candidate.application_id}
                                    className={`grid transition-colors ${hasToday ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'}`}
                                    style={{ gridTemplateColumns: `220px repeat(${stages.length}, 1fr)` }}
                                >
                                    {/* Candidate Cell */}
                                    <div
                                        className="p-4 flex items-center gap-3 cursor-pointer group"
                                        onClick={() => onSelectCandidate?.(candidate)}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                                            {candidate.candidate_name?.charAt(0) || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-800 text-sm truncate flex items-center gap-2">
                                                {candidate.candidate_name}
                                                {hasToday && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500 text-white rounded">
                                                        TODAY
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">
                                                {candidate.current_stage || "New"}
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors" />
                                    </div>

                                    {/* Stage Cells */}
                                    {stages.map(stage => {
                                        const interviews = candidate.interviews.filter(i => i.stage === stage);
                                        if (interviews.length === 0) {
                                            return (
                                                <div key={stage} className="p-4 flex items-center justify-center border-l border-slate-50">
                                                    <button
                                                        onClick={() => onScheduleInterview?.({ candidate, stage, jobId })}
                                                        className="w-8 h-8 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-indigo-400 hover:text-indigo-400 hover:bg-indigo-50/50 transition-all"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            );
                                        }
                                        // Render clickable cell with interview count
                                        return (
                                            <div
                                                key={stage}
                                                className="p-4 flex items-center justify-center border-l border-slate-50 cursor-pointer hover:bg-indigo-50/30 transition-colors group"
                                                onClick={() => setSelectedCell({ candidate, stage, interviews })}
                                            >
                                                <div className="relative">
                                                    {/* Primary status icon */}
                                                    {(() => {
                                                        const latestInterview = interviews[interviews.length - 1];
                                                        const isPassed = latestInterview.status === 'Completed' && latestInterview.outcome === 'Passed';
                                                        const isFailed = latestInterview.status === 'Completed' && latestInterview.outcome === 'Failed';
                                                        const isScheduled = latestInterview.status === 'Scheduled';
                                                        const isPending = latestInterview.status === 'Pending Review';
                                                        const icon = isPassed ? <CheckCircle size={16} /> : isFailed ? <XCircle size={16} /> : isScheduled ? <Calendar size={16} /> : isPending ? <Clock size={16} /> : null;
                                                        const bg = isPassed ? 'bg-emerald-100' : isFailed ? 'bg-red-100' : isScheduled ? 'bg-indigo-100' : isPending ? 'bg-amber-100' : 'bg-slate-100';
                                                        const text = isPassed ? 'text-emerald-600' : isFailed ? 'text-red-600' : isScheduled ? 'text-indigo-600' : isPending ? 'text-amber-600' : 'text-gray-600';
                                                        return (
                                                            <div className={`w-8 h-8 rounded-lg ${bg} ${text} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                                {icon}
                                                            </div>
                                                        );
                                                    })()}
                                                    {/* Count badge for multiple interviews */}
                                                    {interviews.length > 1 && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                                            {interviews.length}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div >
            </div >

            {/* Interview Details Popover */}
            {selectedCell && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                    onClick={() => setSelectedCell(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Ultra-Minimalistic Clean Design */}
                        <div className="bg-gradient-to-r from-indigo-50/80 to-indigo-50/40 p-6 border-b border-indigo-100">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-bold mb-1 text-slate-900">{selectedCell.stage}</h3>
                                    <p className="text-slate-500 text-sm flex items-center gap-2">
                                        <User size={14} className="text-indigo-400" />
                                        {selectedCell.candidate.candidate_name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedCell(null)}
                                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-2 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Interview Cards */}
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)] space-y-4">
                            {selectedCell.interviews.map((interview, idx) => {
                                const isPassed = interview.status === 'Completed' && interview.outcome === 'Passed';
                                const isFailed = interview.status === 'Completed' && interview.outcome === 'Failed';
                                const isScheduled = interview.status === 'Scheduled';
                                const isPending = interview.status === 'Pending Review';

                                return (
                                    <div
                                        key={idx}
                                        className="border border-slate-200 rounded-xl p-5 bg-white hover:shadow-lg transition-all hover:border-slate-300"
                                    >
                                        {/* Interview Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        isFailed ? 'bg-red-50 text-red-700 border border-red-200' :
                                                            isScheduled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                                                isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                    'bg-slate-50 text-slate-700 border border-slate-200'
                                                        }`}>
                                                        {interview.status}
                                                    </span>
                                                    {interview.outcome && (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPassed ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                                            }`}>
                                                            {interview.outcome}
                                                        </span>
                                                    )}
                                                </div>
                                                {interview.scheduled_at && (
                                                    <div className="text-sm text-slate-600 flex items-center gap-2">
                                                        <Calendar size={14} />
                                                        {new Date(interview.scheduled_at).toLocaleString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rating */}
                                            {interview.rating && (
                                                <div className="flex items-center gap-1 bg-white rounded-lg px-3 py-2 shadow-sm">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            size={14}
                                                            className={i < interview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                                                        />
                                                    ))}
                                                    <span className="ml-1 text-sm font-semibold text-slate-700">{interview.rating}/5</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Interviewer */}
                                        {interview.interviewer && (
                                            <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                                                <User size={14} className="text-slate-400" />
                                                <span className="font-medium">Interviewer:</span>
                                                <span>{interview.interviewer}</span>
                                            </div>
                                        )}

                                        {/* Feedback */}
                                        {interview.feedback && (
                                            <div className="bg-white rounded-lg p-4 border border-slate-100">
                                                <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                                                    <MessageSquare size={14} className="text-slate-400" />
                                                    Feedback
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                    {interview.feedback}
                                                </p>
                                            </div>
                                        )}

                                        {/* No feedback message */}
                                        {!interview.feedback && interview.status === 'Completed' && (
                                            <div className="text-sm text-slate-400 italic">
                                                No feedback provided
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Actions */}
                        <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    onSelectCandidate?.(selectedCell.candidate);
                                    setSelectedCell(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                View Candidate
                            </button>
                            <button
                                onClick={() => {
                                    onScheduleInterview?.({
                                        candidate: selectedCell.candidate,
                                        stage: selectedCell.stage,
                                        jobId
                                    });
                                    setSelectedCell(null);
                                }}
                                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Schedule New Interview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Minimal Legend */}
            < div className="mt-4 flex items-center gap-6 text-[10px] text-slate-400" >
                <div className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-emerald-500" /> Passed
                </div>
                <div className="flex items-center gap-1.5">
                    <XCircle size={12} className="text-red-400" /> Failed
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-indigo-500" /> Scheduled
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-500" /> Pending
                </div>
            </div >
        </div >
    );
};

export default TimelineView;
