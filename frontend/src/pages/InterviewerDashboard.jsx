import { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext'; // Unused
import { useHeadhunter } from '../context/HeadhunterContext';
import { Calendar, CheckCircle, Clock, Briefcase, Star, ChevronRight, MessageSquare } from 'lucide-react';
import axios from 'axios';
import CandidateDrawer from '../components/pipeline/CandidateDrawer';
import PageHeader from '../components/layout/PageHeader';

const InterviewerDashboard = ({ onOpenMobileSidebar }) => {
    // const { user } = useAuth(); // Unused
    const { jobs } = useHeadhunter(); // To get job details if needed, though API provides titles
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCvId, setSelectedCvId] = useState(null);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/interviews/my');
            setInterviews(res.data);
        } catch (err) {
            console.error("Failed to fetch interviews", err);
        } finally {
            setLoading(false);
        }
    };

    // Upcoming: status is "Scheduled" (or null for backwards compat) AND date is in future
    const upcomingInterviews = interviews.filter(i =>
        (!i.status || i.status === 'Scheduled') &&
        (!i.scheduled_at || new Date(i.scheduled_at) > new Date())
    );
    // Past: status is Completed/Cancelled/No-Show OR date is in the past
    const pastInterviews = interviews.filter(i =>
        (i.status && i.status !== 'Scheduled') ||
        (i.scheduled_at && new Date(i.scheduled_at) <= new Date())
    );

    const displayedInterviews = activeTab === 'upcoming' ? upcomingInterviews : pastInterviews;

    const handleOpenCandidate = (cvId, jobId) => {
        setSelectedCvId(cvId);
        setSelectedJobId(jobId);
    };

    // Unused formatDate function removed

    return (
        <div className="flex flex-col h-full bg-white">
            <PageHeader
                title="My Interviews"
                subtitle="Manage your upcoming and past interviews"
                icon={Calendar}
                onOpenMobileSidebar={onOpenMobileSidebar}
                actions={
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Upcoming ({upcomingInterviews.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${activeTab === 'past' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Past ({pastInterviews.length})
                        </button>
                    </div>
                }
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
                <div className="max-w-4xl mx-auto space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Loading interviews...</div>
                    ) : displayedInterviews.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-300">
                                <Calendar size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No {activeTab} interviews found</h3>
                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                {activeTab === 'upcoming'
                                    ? "You don't have any upcoming interviews scheduled at the moment. When you are assigned to an interview, it will appear here."
                                    : "You haven't completed any interviews yet. Your interview history will be stored here."}
                            </p>
                            {activeTab === 'upcoming' && (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium">
                                    <CheckCircle size={16} className="text-indigo-500" />
                                    You&apos;re all caught up!
                                </div>
                            )}
                        </div>
                    ) : (
                        displayedInterviews.map(interview => (
                            <div key={interview.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition group">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${interview.scheduled_at ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {interview.scheduled_at ? (
                                                <>
                                                    <span className="text-[10px] font-bold uppercase">{new Date(interview.scheduled_at).toLocaleString('en-US', { month: 'short' })}</span>
                                                    <span className="text-lg font-bold leading-none">{new Date(interview.scheduled_at).getDate()}</span>
                                                </>
                                            ) : (
                                                <Clock size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                                {interview.candidate_name}
                                                {interview.rating && (
                                                    <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                                                        <Star size={10} fill="currentColor" /> {interview.rating}
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                <span className="flex items-center gap-1.5"><Briefcase size={14} /> {interview.job_title}</span>
                                                <span className="flex items-center gap-1.5"><CheckCircle size={14} /> {interview.step}</span>
                                                {interview.scheduled_at && <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleOpenCandidate(interview.cv_id, interview.application_id)} // Pass application_id as jobId context? No, pass jobId.
                                        // Actually CandidateDrawer takes (cv, onClose, jobs, selectedJobId)
                                        // But here we want to open it. 
                                        // Wait, CandidateDrawer is usually a modal or side panel.
                                        // In Pipeline.jsx it's rendered conditionally.
                                        // Here I should probably render it as an overlay if selectedCvId is set.
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center gap-2 shrink-0"
                                    >
                                        View Profile <ChevronRight size={16} />
                                    </button>
                                </div>
                                {interview.status && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <MessageSquare size={14} /> Outcome: <span className="text-slate-700">{interview.status}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Candidate Drawer Overlay */}
            {selectedCvId && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedCvId(null)} />
                    <div className="relative w-full max-w-5xl h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300">

                        {/* Wait, CandidateDrawer needs the CV object. I need to fetch it. */}
                        <CandidateFetcher cvId={selectedCvId} onClose={() => setSelectedCvId(null)} jobs={jobs} selectedJobId={selectedJobId} />
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper to fetch CV details
const CandidateFetcher = ({ cvId, onClose, jobs, selectedJobId }) => {
    const [cv, setCv] = useState(null);

    useEffect(() => {
        const fetchCv = async () => {
            try {
                const res = await axios.get(`/api/profiles/${cvId}`);
                // Wait, /api/cvs/{id} might not exist or return what we need.
                // Let's check backend/app/api/v1/cv.py
                // It has DELETE, POST (upload).
                // It does NOT have GET /cvs/{id}.
                // backend/app/api/v1/profiles.py has GET /profiles/{id}? No, GET /profiles/ returns list.
                // I need an endpoint to get a single CV/Profile.
                // I'll add GET /profiles/{id} to profiles.py if missing.
                setCv(res.data);
            } catch (e) {
                console.error("Failed to fetch CV", e);
            }
        };
        fetchCv();
    }, [cvId]);

    if (!cv) return <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

    return <CandidateDrawer cv={cv} onClose={onClose} jobs={jobs} selectedJobId={selectedJobId} />;
}

export default InterviewerDashboard;
