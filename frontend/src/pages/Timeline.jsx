import { useState, useEffect } from 'react';
import axios from 'axios';
import PageHeader from '../components/layout/PageHeader';
import { GanttChart, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useHeadhunter } from '../context/HeadhunterContext';

const Timeline = ({ onOpenMobileSidebar }) => {
    const { jobs, fetchJobs } = useHeadhunter();
    const [selectedJobId, setSelectedJobId] = useState("");
    const [timelineData, setTimelineData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!jobs || jobs.length === 0) fetchJobs();
    }, [jobs, fetchJobs]);

    useEffect(() => {
        if (selectedJobId) {
            setLoading(true);
            axios.get(`/api/interviews/timeline/${selectedJobId}`)
                .then(res => setTimelineData(res.data))
                .catch(err => {
                    console.error("Failed to fetch timeline", err);
                    setTimelineData(null);
                })
                .finally(() => setLoading(false));
        } else {
            setTimelineData(null);
        }
    }, [selectedJobId]);

    // Format dates safely
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const getStatusIcon = (status, outcome) => {
        if (status === "Completed") {
            if (outcome === "Passed") return <CheckCircle size={16} className="text-emerald-500" />;
            if (outcome === "Failed") return <XCircle size={16} className="text-red-500" />;
            return <CheckCircle size={16} className="text-slate-400" />; // Completed but no outcome
        }
        if (status === "Scheduled") return <Calendar size={16} className="text-indigo-500" />;
        if (status === "Cancelled") return <XCircle size={16} className="text-slate-300" />;
        if (status === "No Show") return <AlertCircle size={16} className="text-amber-500" />;
        return <Clock size={16} className="text-slate-300" />;
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <PageHeader
                title="Interview Timeline"
                subtitle="Track candidate progress across interview stages"
                icon={GanttChart}
                onOpenMobileSidebar={onOpenMobileSidebar}
                actions={
                    <select
                        className="pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64"
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                    >
                        <option value="">Select a Job Plan...</option>
                        {(jobs || []).filter(j => j.is_active).map(j => (
                            <option key={j.id} value={j.id}>{j.title}</option>
                        ))}
                    </select>
                }
            />

            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 bg-slate-50/50">
                {!selectedJobId ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <GanttChart size={48} className="mb-4 opacity-20" />
                        <div className="text-lg font-medium">Select a job to view timeline</div>
                    </div>
                ) : loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : timelineData ? (
                    <div className="min-w-[800px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Header Row */}
                        <div className="grid grid-cols-[250px_1fr] border-b border-slate-200 bg-slate-50">
                            <div className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wide">Candidate</div>
                            <div className="grid" style={{ gridTemplateColumns: `repeat(${timelineData.stages.length}, 1fr)` }}>
                                {timelineData.stages.map(stage => (
                                    <div key={stage} className="p-4 font-bold text-slate-700 text-sm uppercase tracking-wide border-l border-slate-200 text-center">
                                        {stage}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Candidate Rows */}
                        <div className="divide-y divide-slate-100">
                            {timelineData.candidates.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">No candidates found in pipeline</div>
                            ) : (
                                timelineData.candidates.map(candidate => (
                                    <div key={candidate.application_id} className="grid grid-cols-[250px_1fr] hover:bg-slate-50/50 transition group">
                                        <div className="p-4 flex items-center gap-3 border-r border-slate-100 relative">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {candidate.candidate_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{candidate.candidate_name}</div>
                                                <div className="text-xs text-slate-500">{candidate.current_stage || "New"}</div>
                                            </div>
                                            {/* Connector Line Logic attempt - simplifed just cells for now */}
                                        </div>

                                        <div className="grid" style={{ gridTemplateColumns: `repeat(${timelineData.stages.length}, 1fr)` }}>
                                            {timelineData.stages.map((stage, idx) => {
                                                const interview = candidate.interviews.find(i => i.stage === stage);
                                                // Check for "Review" items too if they are mapped to stages?
                                                // Assuming backend maps all steps.

                                                return (
                                                    <div key={stage} className="p-4 border-l border-slate-100 flex items-center justify-center relative">
                                                        {interview ? (
                                                            <div className="flex flex-col items-center gap-1 group/item cursor-pointer" title={`${interview.status} - ${interview.scheduled_at ? formatDate(interview.scheduled_at) : 'No Date'}`}>
                                                                <div className={`
                                                                    w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition transform hover:scale-110
                                                                    ${interview.status === 'Completed' ? (interview.outcome === 'Passed' ? 'bg-emerald-100 text-emerald-600' : interview.outcome === 'Failed' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600') :
                                                                        interview.status === 'Scheduled' ? 'bg-indigo-100 text-indigo-600' :
                                                                            'bg-slate-50 text-slate-400'}
                                                                `}>
                                                                    {getStatusIcon(interview.status, interview.outcome)}
                                                                </div>
                                                                <span className="text-[10px] font-medium text-slate-500">
                                                                    {interview.scheduled_at ? formatDate(interview.scheduled_at) : (interview.status === "Pending Review" ? "Review" : "")}
                                                                </span>

                                                                {/* Hover details */}
                                                                <div className="absolute top-full mt-2 z-10 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-3 hidden group-hover/item:block animate-in fade-in zoom-in-95 duration-150">
                                                                    <div className="text-xs font-bold text-slate-800 mb-1">{stage}</div>
                                                                    <div className="text-xs text-slate-500 mb-2">{interview.interviewer || "Unassigned"}</div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${interview.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                                                            }`}>
                                                                            {interview.status}
                                                                        </span>
                                                                        {interview.rating && <span className="text-amber-500 text-xs">★ {interview.rating}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full bg-slate-100"></div>
                                                        )}

                                                        {/* Connection Line */}
                                                        {calculateConnection(candidate.interviews, idx, timelineData.stages) && (
                                                            <div className="absolute top-1/2 left-full w-full h-0.5 bg-indigo-100 -z-10 -ml-[50%]"></div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-red-500">Failed to load data</div>
                )}
            </div>
        </div>
    );
};

// Helper to determine if we should draw a line to the next stage
const calculateConnection = (interviews, currentStageIdx, stages) => {
    // If there is an interview in the NEXT stage, draw a line
    // Simplified logic
    if (currentStageIdx >= stages.length - 1) return false;
    // const currentHas = interviews.some(i => i.stage === stages[currentStageIdx]);
    // const nextHas = interviews.some(i => i.stage === stages[currentStageIdx + 1]);
    // return currentHas && nextHas;
    return false; // Disabled for now to keep it clean, CSS lines are tricky in grid
};

export default Timeline;
