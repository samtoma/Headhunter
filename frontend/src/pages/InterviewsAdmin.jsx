import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Calendar, Search, ChevronRight, User, Users
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';

/**
 * InterviewsAdmin - Admin page to view and manage all interviews
 * Accessible to admins and recruiters
 */
const InterviewsAdmin = ({ onOpenMobileSidebar }) => {
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active, all, scheduled, completed, cancelled
    const [viewScope, setViewScope] = useState('mine'); // mine, all
    const [search, setSearch] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchAllInterviews();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await axios.get('/api/auth/me');
            setCurrentUserId(res.data.id);
        } catch (err) {
            console.error("Failed to fetch user", err);
        }
    };

    /**
     * Fetch all interviews from the backend
     */
    const fetchAllInterviews = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/interviews/all');
            setInterviews(res.data || []);
        } catch (err) {
            console.error("Failed to fetch interviews", err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Filter interviews based on status and search term
     */
    const filteredInterviews = interviews.filter(i => {
        // Scope Filter
        if (viewScope === 'mine' && currentUserId) {
            if (i.interviewer_id !== currentUserId) return false;
        }

        // Status filter
        if (filter === 'active') {
            // Active includes Scheduled, Pending Review, or anything not terminal
            if (['Completed', 'Cancelled', 'No-Show', 'Hired', 'Rejected'].includes(i.status)) return false;
        }
        else if (filter === 'scheduled' && i.status !== 'Scheduled') return false;
        else if (filter === 'completed' && i.status !== 'Completed') return false;
        else if (filter === 'cancelled' && i.status !== 'Cancelled') return false;
        else if (filter === 'noshow' && i.status !== 'No-Show') return false;

        // Search filter
        if (search) {
            const term = search.toLowerCase();
            const matchName = (i.candidate_name || '').toLowerCase().includes(term);
            const matchJob = (i.job_title || '').toLowerCase().includes(term);
            const matchStage = (i.step || '').toLowerCase().includes(term);
            if (!matchName && !matchJob && !matchStage) return false;
        }

        return true;
    });

    /**
     * Format date for display
     */
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /**
     * Get status badge styling
     */
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Scheduled':
                return 'bg-blue-100 text-blue-700';
            case 'Pending Review':
                return 'bg-purple-100 text-purple-700';
            case 'Completed':
                return 'bg-emerald-100 text-emerald-700';
            case 'Cancelled':
                return 'bg-red-100 text-red-700';
            case 'No-Show':
                return 'bg-orange-100 text-orange-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <PageHeader
                title="My Interviews"
                subtitle="Manage your assignments and team interviews"
                icon={Calendar}
                onOpenMobileSidebar={onOpenMobileSidebar}
                actions={
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewScope('mine')}
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition ${viewScope === 'mine' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <User size={14} /> My Assignments
                        </button>
                        <button
                            onClick={() => setViewScope('all')}
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-md transition ${viewScope === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={14} /> All Company
                        </button>
                    </div>
                }
            />

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by candidate, job, or stage..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 overflow-x-auto max-w-full no-scrollbar shadow-sm">
                        {[
                            { key: 'active', label: 'Active Tasks' },
                            { key: 'all', label: 'All History' },
                            { key: 'scheduled', label: 'Scheduled' },
                            { key: 'completed', label: 'Completed' },
                            { key: 'cancelled', label: 'Cancelled' },
                            { key: 'noshow', label: 'No-Show' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${filter === tab.key
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Interviews Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-500">Loading interviews...</p>
                        </div>
                    ) : filteredInterviews.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium">No interviews found</p>
                            <p className="text-sm text-slate-400 mt-1">
                                {filter !== 'all' ? 'Try changing your filters' : 'Schedule interviews from the pipeline view'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Position</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stage</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Interviewer</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Outcome</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInterviews.map(interview => (
                                    <tr
                                        key={interview.id}
                                        className="hover:bg-slate-50 transition cursor-pointer"
                                        onClick={() => navigate(`/interview/${interview.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {(interview.candidate_name || 'C').charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-800 truncate max-w-[150px]">{interview.candidate_name || 'Unknown'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-700 truncate block max-w-[150px]">{interview.job_title || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-indigo-600">{interview.step}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{interview.interviewer_name || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600">{formatDate(interview.scheduled_at)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadge(interview.status)}`}>
                                                {interview.status || 'Scheduled'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {interview.outcome ? (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${interview.outcome === 'Passed' ? 'bg-emerald-100 text-emerald-700' :
                                                    interview.outcome === 'Failed' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    } `}>
                                                    {interview.outcome}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <ChevronRight size={18} className="text-slate-400" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Stats Summary */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-indigo-600">{interviews.filter(i => i.status === 'Scheduled').length}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase">Scheduled</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-purple-600">{interviews.filter(i => i.status === 'Pending Review').length}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase">Pending Review</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-emerald-600">{interviews.filter(i => i.status === 'Completed').length}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase">Completed</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-red-600">{interviews.filter(i => i.status === 'Cancelled').length}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase">Cancelled</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewsAdmin;