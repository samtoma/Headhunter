import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, User, Briefcase, Star, Check,
    Save, MapPin, FileText, GraduationCap, Award,
    Linkedin, Github, ExternalLink, FileCode, Eye, MoreVertical,
    X, UserPlus, CalendarClock, XCircle, AlertTriangle, History,
    ChevronDown, ChevronRight
} from 'lucide-react';

/**
 * InterviewMode - Dedicated page for conducting interviews.
 * Split-screen: Candidate profile (left) + Interview form (right)
 */
const InterviewMode = () => {
    const { interviewId } = useParams();
    const navigate = useNavigate();

    const [interview, setInterview] = useState(null);
    const [candidate, setCandidate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [view, setView] = useState('parsed'); // 'parsed' or 'pdf'
    const [showProfileSidebar, setShowProfileSidebar] = useState(false); // Mobile sidebar toggle

    // Actions dropdown & modals
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [showChangeInterviewerModal, setShowChangeInterviewerModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [newScheduledAt, setNewScheduledAt] = useState('');
    const [newInterviewerId, setNewInterviewerId] = useState(null);

    // Interview feedback form
    const [feedback, setFeedback] = useState('');
    const [outcome, setOutcome] = useState('Pending');
    const [rating, setRating] = useState(5);
    const [notes, setNotes] = useState('');
    const [expandedHistoryIds, setExpandedHistoryIds] = useState([]);

    const toggleHistoryItem = (id) => {
        setExpandedHistoryIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const fetchInterview = useCallback(async () => {
        try {
            const res = await axios.get(`/api/interviews/${interviewId}`);
            setInterview(res.data);
            setFeedback(res.data.feedback || '');
            setOutcome(res.data.outcome || 'Pending');
            setRating(res.data.rating || 5);

            // Fetch candidate data from profiles endpoint (which includes parsed_data)
            if (res.data.cv_id) {
                const profileRes = await axios.get(`/api/profiles/${res.data.cv_id}`);
                setCandidate(profileRes.data);
            }
        } catch (err) {
            console.error("Failed to fetch interview", err);
        } finally {
            setLoading(false);
        }
    }, [interviewId]);

    useEffect(() => {
        fetchInterview();
    }, [fetchInterview]);


    // Re-adding state to avoid breaking other parts, but initialization logic removed as it was unused/broken
    // Actually, I should check if companyStages is used.
    // I grep searched and found it used in a comment.
    // But I should probably just clean it up completely if not used.
    // The previous edit removed the state definition.
    // So I only need to remove the fetchCompanySettings function here.


    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.patch(`/api/interviews/${interviewId}`, {
                feedback,
                outcome,
                rating,
                status: outcome === 'Pending' ? 'Scheduled' : 'Completed'
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error("Failed to save interview", err);
            alert("Failed to save interview feedback");
        } finally {
            setSaving(false);
        }
    };

    // Fetch team members for interviewer selection
    const fetchTeamMembers = async () => {
        try {
            const res = await axios.get('/api/users/team');
            setTeamMembers(res.data || []);
        } catch (err) {
            console.error("Failed to fetch team", err);
        }
    };

    // Handle Reschedule
    const handleReschedule = async () => {
        if (!newScheduledAt) {
            alert("Please select a new date/time");
            return;
        }
        try {
            await axios.patch(`/api/interviews/${interviewId}`, {
                scheduled_at: newScheduledAt
            });
            setInterview({ ...interview, scheduled_at: newScheduledAt });
            setShowRescheduleModal(false);
            setNewScheduledAt('');
        } catch (err) {
            console.error("Failed to reschedule", err);
            alert("Failed to reschedule interview");
        }
    };

    // Handle Change Interviewer
    const handleChangeInterviewer = async () => {
        if (!newInterviewerId) {
            alert("Please select an interviewer");
            return;
        }
        try {
            await axios.patch(`/api/interviews/${interviewId}`, {
                interviewer_id: newInterviewerId
            });
            setInterview({ ...interview, interviewer_id: newInterviewerId });
            setShowChangeInterviewerModal(false);
            setNewInterviewerId(null);
        } catch (err) {
            console.error("Failed to change interviewer", err);
            alert("Failed to change interviewer");
        }
    };

    // Handle Cancel
    const handleCancel = async () => {
        try {
            await axios.patch(`/api/interviews/${interviewId}`, {
                status: 'Cancelled'
            });
            setShowCancelModal(false);
            navigate(-1);
        } catch (err) {
            console.error("Failed to cancel", err);
            alert("Failed to cancel interview");
        }
    };

    // Handle Mark No-Show
    const handleMarkNoShow = async () => {
        try {
            await axios.patch(`/api/interviews/${interviewId}`, {
                status: 'No-Show',
                outcome: 'Failed'
            });
            setOutcome('Failed');
            setInterview({ ...interview, status: 'No-Show' });
            setShowActionsMenu(false);
        } catch (err) {
            console.error("Failed to mark no-show", err);
            alert("Failed to mark as no-show");
        }
    };

    const d = useMemo(() => candidate?.parsed_data || {}, [candidate]);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not scheduled';
        return new Date(dateStr).toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!interview) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <div className="text-slate-400 text-lg">Interview not found</div>
                <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <User className="text-indigo-600" size={22} />
                                {interview.candidate_name}
                                <span className="text-slate-400 font-normal mx-2">|</span>
                                <span className="text-slate-600 text-lg">{interview.job_title}</span>
                            </h1>
                            <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                <span className="font-medium text-indigo-600">{interview.step}</span>
                                <span>·</span>
                                <span>{formatDate(interview.scheduled_at)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${interview.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            interview.status === 'No-Show' ? 'bg-orange-100 text-orange-700' :
                                outcome === 'Passed' ? 'bg-emerald-100 text-emerald-700' :
                                    outcome === 'Failed' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                            }`}>
                            {interview.status === 'Cancelled' ? 'Cancelled' :
                                interview.status === 'No-Show' ? 'No-Show' : outcome}
                        </span>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={saving || interview.status === 'Cancelled'}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
                        >
                            {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> :
                                saved ? <Check size={18} /> : <Save size={18} />}
                            {saved ? 'Saved!' : 'Save Feedback'}
                        </button>

                        {/* Actions Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowActionsMenu(!showActionsMenu); fetchTeamMembers(); }}
                                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg transition text-slate-600"
                            >
                                <MoreVertical size={20} />
                            </button>

                            {showActionsMenu && (
                                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2">
                                    <button
                                        onClick={() => { setShowRescheduleModal(true); setShowActionsMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                                    >
                                        <CalendarClock size={16} className="text-indigo-600" /> Reschedule
                                    </button>
                                    <button
                                        onClick={() => { setShowChangeInterviewerModal(true); setShowActionsMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                                    >
                                        <UserPlus size={16} className="text-indigo-600" /> Change Interviewer
                                    </button>
                                    <button
                                        onClick={handleMarkNoShow}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                                    >
                                        <XCircle size={16} className="text-orange-600" /> Mark No-Show
                                    </button>
                                    <div className="border-t border-slate-100 my-1"></div>
                                    <button
                                        onClick={() => { setShowCancelModal(true); setShowActionsMenu(false); }}
                                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
                                    >
                                        <AlertTriangle size={16} /> Cancel Interview
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Screen Content */}
            {/* Split Screen Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile: Toggle Profile Button */}
                <div className="md:hidden absolute bottom-4 right-4 z-50">
                    <button
                        onClick={() => setShowProfileSidebar(true)}
                        className="bg-indigo-600 text-white p-4 rounded-full shadow-xl flex items-center gap-2 font-bold"
                    >
                        <User size={20} /> View CV
                    </button>
                </div>

                {/* LEFT: Candidate Profile (Slidable on Mobile) */}
                <div className={`
                    fixed inset-0 z-40 bg-white transition-transform duration-300 transform 
                    ${showProfileSidebar ? 'translate-x-0' : '-translate-x-full'}
                    md:relative md:translate-x-0 md:w-1/2 md:border-r md:border-slate-200 md:flex md:flex-col
                    flex flex-col
                `}>
                    <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900">Candidate Profile</h3>
                        <button onClick={() => setShowProfileSidebar(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                    </div>
                    {/* Content Wrapper to ensure scrolling works */}
                    <div className="flex-1 overflow-y-auto flex flex-col h-full bg-white">
                        {/* View Toggle Header */}
                        <div className="flex border-b border-slate-100 bg-slate-50/50">
                            <button
                                onClick={() => setView('parsed')}
                                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${view === 'parsed' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <FileCode size={14} /> Parsed CV
                            </button>
                            <button
                                onClick={() => setView('pdf')}
                                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${view === 'pdf' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Eye size={14} /> Original PDF
                            </button>
                            <button
                                onClick={() => setView('history')}
                                className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 ${view === 'history' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <History size={14} /> History
                            </button>
                        </div>

                        {/* PDF View */}
                        {view === 'pdf' && candidate?.id && (
                            <iframe
                                src={`/api/cv/${candidate.id}/download?token=${localStorage.getItem('token')}`}
                                className="flex-1 w-full min-h-[600px] bg-white"
                                title="CV PDF"
                            />
                        )}

                        {/* Parsed View */}
                        {view === 'parsed' && (
                            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                                {/* Contact & Personal */}
                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><User size={14} /> Contact & Personal</h3>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium">{d.email || "No Email"}</div>
                                        <div className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium">{d.phone || "No Phone"}</div>
                                        {d.address && <div className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium flex items-center gap-2"><MapPin size={14} /> {d.address}</div>}
                                        {/* Social Links */}
                                        {(Array.isArray(d.social_links) ? d.social_links : []).map((link, i) => {
                                            let Icon = ExternalLink;
                                            let label = "Link";
                                            let style = "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
                                            let hostname = "";
                                            try {
                                                hostname = (new URL(link)).hostname.toLowerCase();
                                            } catch {
                                                hostname = "";
                                            }
                                            // Strict hostname matching
                                            if (hostname === "linkedin.com" || hostname === "www.linkedin.com") {
                                                Icon = Linkedin;
                                                label = "LinkedIn";
                                                style = "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100";
                                            } else if (hostname === "github.com" || hostname === "www.github.com") {
                                                Icon = Github;
                                                label = "GitHub";
                                                style = "bg-slate-800 text-white border-slate-900 hover:bg-slate-700";
                                            }
                                            return (
                                                <a key={i} href={link} target="_blank" rel="noreferrer" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition border ${style}`}>
                                                    <Icon size={14} /> {label}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Professional Summary */}
                                {d.summary && (
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14} /> Professional Summary</h3>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-700 leading-relaxed text-base">{d.summary}</div>
                                    </section>
                                )}

                                {/* Key Skills */}
                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Award size={14} /> Key Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {(Array.isArray(d.skills) ? d.skills : (d.skills || "").split(",").filter(Boolean)).map((skill, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-semibold shadow-sm">{typeof skill === 'string' ? skill.trim() : skill}</span>
                                        ))}
                                        {(!d.skills || (Array.isArray(d.skills) && d.skills.length === 0)) && <span className="text-slate-400 italic">No skills detected</span>}
                                    </div>
                                </section>

                                {/* Education */}
                                {(d.education || []).length > 0 && (
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><GraduationCap size={14} /> Education</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(d.education || []).map((edu, i) => (
                                                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                                    <div className="mt-0.5"><GraduationCap className="text-slate-300" size={20} /></div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{edu.school || edu.institution || "University"}</div>
                                                        <div className="text-sm text-indigo-600">{edu.degree}</div>
                                                        <div className="text-xs text-slate-400 mt-1">{edu.year || (edu.start_date && edu.end_date ? edu.start_date + ' - ' + edu.end_date : '')}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Work History */}
                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase size={14} /> Work History</h3>
                                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                                        {(d.job_history || []).map((job, i) => (
                                            <div key={i} className="relative pl-8">
                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-500"></div>
                                                <div className="mb-1">
                                                    <h4 className="text-lg font-bold text-slate-900">{job.title}</h4>
                                                    <div className="flex items-center gap-2 text-sm font-medium mt-0.5">
                                                        <span className="text-indigo-600">{job.company}</span>
                                                        {job.duration && <span className="text-xs text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded">{job.duration}</span>}
                                                    </div>
                                                </div>
                                                {job.description && <p className="text-sm text-slate-600 leading-relaxed mt-3 border-l-2 border-slate-100 pl-3">{job.description}</p>}
                                            </div>
                                        ))}
                                        {(!d.job_history || d.job_history.length === 0) && <div className="pl-8 text-slate-400 italic">No experience detected.</div>}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* History View */}
                        {view === 'history' && (
                            <div className="flex-1 p-8 space-y-6 overflow-y-auto bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <History size={14} /> Application History
                                </h3>

                                {(!candidate?.applications || candidate.applications.length === 0) ? (
                                    <div className="text-center py-12 text-slate-400 italic">No history found.</div>
                                ) : (
                                    (candidate.applications || []).map(app => {
                                        const isExpanded = expandedHistoryIds.includes(app.id);
                                        return (
                                            <div key={app.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
                                                {/* Header */}
                                                <div
                                                    onClick={() => toggleHistoryItem(app.id)}
                                                    className={`p-4 border-b border-slate-100 flex justify-between items-start cursor-pointer hover:bg-slate-50 transition ${isExpanded ? 'bg-slate-50/80' : 'bg-white'}`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="pt-1 text-slate-400">
                                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 text-base">{app.job_title || "Unknown Position"}</div>
                                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                                <span className="font-medium text-indigo-600">{app.status}</span>
                                                                <span>•</span>
                                                                <span>{new Date(app.applied_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Source Badge */}
                                                    <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">
                                                        {app.source === 'landing_page' ? 'Applied Online' : (app.assigned_by_name ? `Added by ${app.assigned_by_name}` : 'Manually Added')}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                        {/* Notes */}
                                                        {app.notes && (
                                                            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-sm text-slate-700">
                                                                <div className="text-[10px] font-bold text-yellow-700 uppercase mb-1 flex items-center gap-1"><FileText size={10} /> Notes</div>
                                                                {app.notes}
                                                            </div>
                                                        )}

                                                        {/* Interviews */}
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Interviews</div>
                                                            {(app.interviews && app.interviews.length > 0) ? (
                                                                <div className="space-y-2">
                                                                    {app.interviews.map(int => (
                                                                        <div key={int.id} className="text-sm border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition">
                                                                            <div className="flex justify-between items-center mb-1">
                                                                                <span className="font-bold text-slate-700">{int.step}</span>
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${int.outcome === 'Passed' ? 'bg-emerald-100 text-emerald-700' : int.outcome === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                                    {int.outcome || int.status}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                                                                <span>{new Date(int.created_at).toLocaleDateString()}</span>
                                                                                {int.rating && <span>• Rating: {int.rating}/10</span>}
                                                                                {int.interviewer_name && <span>• by {int.interviewer_name}</span>}
                                                                            </div>
                                                                            {int.feedback && (
                                                                                <div className="text-slate-600 text-xs italic bg-slate-50 p-2 rounded">
                                                                                    &quot;{int.feedback}&quot;
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-slate-400 italic">No interviews logged.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Interview Feedback Form */}
                <div className="w-full md:w-1/2 bg-slate-50 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="text-indigo-600" size={20} />
                                Interview Feedback
                            </h3>

                            {/* Outcome */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Outcome</label>
                                <div className="flex gap-2">
                                    {['Pending', 'Passed', 'Failed', 'Rescheduled'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setOutcome(opt)}
                                            className={`flex-1 py-3 rounded-xl font-semibold transition ${outcome === opt
                                                ? opt === 'Passed' ? 'bg-emerald-600 text-white' :
                                                    opt === 'Failed' ? 'bg-red-600 text-white' :
                                                        opt === 'Rescheduled' ? 'bg-orange-600 text-white' :
                                                            'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rating */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rating (1-10)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={rating}
                                        onChange={e => setRating(parseInt(e.target.value))}
                                        className="flex-1"
                                    />
                                    <div className="flex items-center gap-1 bg-amber-100 px-3 py-1 rounded-lg">
                                        <Star size={16} className="text-amber-500" fill="currentColor" />
                                        <span className="font-bold text-amber-700">{rating}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Feedback Text */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Detailed Feedback</label>
                                <textarea
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    placeholder="Write your interview feedback here... Include technical assessment, communication skills, cultural fit, etc."
                                    className="w-full h-64 p-4 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                />
                            </div>

                            {/* Quick Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quick Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Any additional notes..."
                                    className="w-full h-24 p-4 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-yellow-50 border-yellow-200"
                                />
                            </div>
                        </div>

                        {/* Stage-specific fields would go here based on companyStages */}
                    </div>
                </div>
            </div>

            {/* Reschedule Modal */}
            {showRescheduleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <CalendarClock className="text-indigo-600" size={20} />
                                Reschedule Interview
                            </h3>
                            <button onClick={() => setShowRescheduleModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">New Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={newScheduledAt}
                                    onChange={e => setNewScheduledAt(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <p className="text-sm text-slate-500">
                                The interviewer will receive an updated calendar invite.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowRescheduleModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReschedule}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                            >
                                Reschedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Interviewer Modal */}
            {showChangeInterviewerModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <UserPlus className="text-indigo-600" size={20} />
                                Change Interviewer
                            </h3>
                            <button onClick={() => setShowChangeInterviewerModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Select New Interviewer</label>
                                <select
                                    value={newInterviewerId || ''}
                                    onChange={e => setNewInterviewerId(parseInt(e.target.value))}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Choose interviewer...</option>
                                    {teamMembers.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.full_name || member.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-sm text-slate-500">
                                The new interviewer will receive a calendar invite.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowChangeInterviewerModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangeInterviewer}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                            >
                                Confirm Change
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Interview Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                                <AlertTriangle size={20} />
                                Cancel Interview
                            </h3>
                            <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm text-red-700">
                                    Are you sure you want to cancel this interview? This action cannot be undone.
                                </p>
                            </div>
                            <div className="text-sm text-slate-600">
                                <div><strong>Candidate:</strong> {d.name || 'Unknown'}</div>
                                <div><strong>Stage:</strong> {interview?.step}</div>
                                <div><strong>Scheduled:</strong> {interview?.scheduled_at ? formatDate(interview.scheduled_at) : 'N/A'}</div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                            >
                                Keep Interview
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                            >
                                Cancel Interview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewMode;
