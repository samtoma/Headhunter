import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    CheckCircle, Calendar, ChevronRight,
    Clock, AlertCircle, Sparkles,
    ChevronDown, UserPlus, Search, Filter,
    Briefcase
} from 'lucide-react';

/**
 * Flow Timeline - A Stage-Centric Pipeline Visualization
 * Organized by company workflow steps with Done, Scheduled, and Next lanes.
 */
/**
 * Flow Timeline - A Stage-Centric Pipeline Visualization
 * Organized by company workflow steps with Done, Scheduled, and Next lanes.
 */
const TimelineView = ({ jobId, onSelectCandidate, onScheduleInterview, refreshTrigger, selectedDepartment }) => {
    const [timelineData, setTimelineData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedStages, setExpandedStages] = useState({}); // { stageName: boolean }
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setLoading(true);
        setError(null);

        const url = jobId
            ? `/api/interviews/timeline/${jobId}`
            : `/api/interviews/timeline/global${selectedDepartment ? `?department=${selectedDepartment}` : ''}`;

        axios.get(url)
            .then(res => {
                setTimelineData(res.data);
                // Expand the first stage by default
                if (res.data.stages && res.data.stages.length > 0) {
                    setExpandedStages({ [res.data.stages[0]]: true });
                }
            })
            .catch(() => setError("Failed to load flow timeline"))
            .finally(() => setLoading(false));
    }, [jobId, refreshTrigger, selectedDepartment]);

    const toggleStage = (stage) => {
        setExpandedStages(prev => ({
            ...prev,
            [stage]: !prev[stage]
        }));
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-sm font-bold text-slate-400 animate-pulse">Building Timeline...</span>
                </div>
            </div>
        );
    }

    if (error || !timelineData) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertCircle size={40} strokeWidth={1.5} className="text-red-300" />
                <p className="mt-4 font-bold">{error || "No dynamic data available"}</p>
            </div>
        );
    }

    const { stages, candidates, job_title } = timelineData;
    const isGlobal = !jobId;

    // Filter candidates by search
    const filteredCandidates = candidates.filter(c =>
        c.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-slate-50/30">
            {/* Top Bar / Stats */}
            <div className="p-6 pb-0 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Briefcase size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">Hiring Pipeline</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isGlobal ? (selectedDepartment && selectedDepartment !== "All" ? `${selectedDepartment} Board` : "Global Interview Schedule") : job_title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search candidates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
                            />
                        </div>
                        <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 mb-4">
                    <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Candidates</span>
                        <span className="text-xl font-bold text-slate-900">{candidates.length}</span>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Stages Active</span>
                        <span className="text-xl font-bold text-indigo-600">{stages.length}</span>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Upcoming Today</span>
                        <span className="text-xl font-bold text-emerald-600">
                            {candidates.reduce((count, c) => count + c.interviews.filter(i => {
                                const d = new Date(i.scheduled_at);
                                return d.toDateString() === new Date().toDateString() && i.status === 'Scheduled';
                            }).length, 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stage List */}
            <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-6">
                {stages.map((stage, sIdx) => {
                    const isExpanded = expandedStages[stage];

                    // Categorize candidates for this stage
                    const stageCandidates = filteredCandidates.filter(c =>
                        c.interviews.some(i => i.stage === stage) || c.current_stage === stage
                    );

                    const done = [];
                    const scheduled = [];
                    const next = [];

                    stageCandidates.forEach(c => {
                        const interviewsForStage = c.interviews.filter(i => i.stage === stage);
                        if (interviewsForStage.length > 0) {
                            const latest = interviewsForStage[interviewsForStage.length - 1];
                            if (latest.status === 'Completed') {
                                done.push({ candidate: c, interview: latest });
                            } else if (latest.status === 'Scheduled') {
                                scheduled.push({ candidate: c, interview: latest });
                            } else {
                                next.push(c);
                            }
                        } else if (c.current_stage === stage) {
                            next.push(c);
                        }
                    });

                    return (
                        <div key={stage} className={`bg-white rounded-[2rem] border transition-all duration-300 ${isExpanded ? 'border-indigo-100 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500/10' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
                            {/* Stage Header */}
                            <div
                                className="px-8 py-5 flex items-center justify-between cursor-pointer"
                                onClick={() => toggleStage(stage)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500'}`}>
                                        <span className="font-bold">{sIdx + 1}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{stage}</h3>
                                        <div className="flex items-center gap-4 mt-0.5">
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold border border-emerald-100">
                                                <CheckCircle size={10} /> {done.length} DONE
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">
                                                <Calendar size={10} /> {scheduled.length} SCHEDULED
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-100">
                                                <UserPlus size={10} /> {next.length} NEXT
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-slate-50 text-slate-800 rotate-180' : 'text-slate-400 hover:bg-slate-50'}`}>
                                    <ChevronDown size={20} />
                                </button>
                            </div>

                            {/* Stage Body */}
                            {isExpanded && (
                                <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* DONE LANE */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Done ({done.length})</span>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-2xl p-4 space-y-3 min-h-[120px]">
                                                {done.length === 0 ? (
                                                    <div className="h-20 flex items-center justify-center text-slate-300 italic text-xs">No completed reviews</div>
                                                ) : done.map(({ candidate, interview }) => (
                                                    <CandidateMiniCard
                                                        key={candidate.application_id}
                                                        candidate={candidate}
                                                        interview={interview}
                                                        variant="done"
                                                        onClick={() => onSelectCandidate?.(candidate)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* SCHEDULED LANE */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scheduled ({scheduled.length})</span>
                                            </div>
                                            <div className="bg-indigo-50/30 rounded-2xl p-4 space-y-3 min-h-[120px]">
                                                {scheduled.length === 0 ? (
                                                    <div className="h-20 flex items-center justify-center text-slate-300 italic text-xs">No upcoming interviews</div>
                                                ) : scheduled.map(({ candidate, interview }) => (
                                                    <CandidateMiniCard
                                                        key={candidate.application_id}
                                                        candidate={candidate}
                                                        interview={interview}
                                                        variant="scheduled"
                                                        onClick={() => onSelectCandidate?.(candidate)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* NEXT LANE */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-amber-600/70">Next Step ({next.length})</span>
                                            </div>
                                            <div className="bg-amber-50/30 rounded-2xl p-4 space-y-3 min-h-[120px] border border-dashed border-amber-200">
                                                {next.length === 0 ? (
                                                    <div className="h-20 flex items-center justify-center text-slate-300 italic text-xs">All candidates scheduled</div>
                                                ) : next.map((candidate) => (
                                                    <CandidateMiniCard
                                                        key={candidate.application_id}
                                                        candidate={candidate}
                                                        variant="next"
                                                        onAction={() => onScheduleInterview?.({ candidate, stage, jobId })}
                                                        onClick={() => onSelectCandidate?.(candidate)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend / Info */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-8">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Passed Review
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Properly Scheduled
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Awaiting Action
                </div>
                <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase">
                    <Sparkles size={12} /> AI-Powered Flow
                </div>
            </div>
        </div>
    );
};

const CandidateMiniCard = ({ candidate, interview, variant, onClick, onAction }) => {
    return (
        <div
            onClick={onClick}
            className={`group bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between`}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${variant === 'done' ? 'bg-emerald-50 text-emerald-600' :
                    variant === 'scheduled' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                    {candidate.candidate_name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{candidate.candidate_name}</h4>
                    {candidate.job_title && (
                        <p className="text-[10px] text-slate-500 truncate">{candidate.job_title}</p>
                    )}
                    {variant === 'scheduled' && interview?.scheduled_at && (
                        <p className="text-[10px] font-medium text-indigo-500 flex items-center gap-1">
                            <Clock size={10} /> {new Date(interview.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                    {variant === 'done' && interview?.outcome && (
                        <p className={`text-[10px] font-bold flex items-center gap-1 ${interview.outcome === 'Passed' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {interview.outcome === 'Passed' ? <CheckCircle size={10} /> : <AlertCircle size={10} />} {interview.outcome}
                        </p>
                    )}
                    {variant === 'next' && (
                        <p className="text-[10px] text-amber-600/70 font-medium">Needs Attention</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1">
                {variant === 'next' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction?.(); }}
                        className="p-1 px-2.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition"
                    >
                        Schedule
                    </button>
                )}
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </div>
        </div>
    );
};

export default TimelineView;
