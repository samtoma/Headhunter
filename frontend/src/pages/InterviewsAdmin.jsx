import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Calendar, Search, ChevronRight
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
    const [filter, setFilter] = useState('all'); // all, scheduled, completed, cancelled
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchAllInterviews();
    }, []);

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
        // Status filter
        if (filter === 'scheduled' && i.status !== 'Scheduled') return false;
        if (filter === 'completed' && i.status !== 'Completed') return false;
        if (filter === 'cancelled' && i.status !== 'Cancelled') return false;
        if (filter === 'noshow' && i.status !== 'No-Show') return false;

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
        <div className="flex flex-col h-full overflow-hidden">
            <PageHeader
                title="Interviews"
                subtitle="Manage all scheduled interviews"
                icon={Calendar}
                onOpenMobileSidebar={onOpenMobileSidebar}
            />

            <div className="flex-1 overflow-y-auto p-6">
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
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 overflow-x-auto max-w-full no-scrollbar">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'scheduled', label: 'Scheduled' },
                            { key: 'completed', label: 'Completed' },
                            { key: 'cancelled', label: 'Cancelled' },
                            { key: 'noshow', label: 'No-Show' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition whitespace-nowrap ${filter === tab.key
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-800'
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
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
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
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                                    {(interview.candidate_name || 'C').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{interview.candidate_name || 'Unknown'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-700">{interview.job_title || '-'}</span>
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
                                            <span className={`px - 2.5 py - 1 rounded - full text - xs font - semibold ${getStatusBadge(interview.status)} `}>
                                                {interview.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {interview.outcome ? (
                                                <span className={`px - 2.5 py - 1 rounded - full text - xs font - semibold ${interview.outcome === 'Passed' ? 'bg-emerald-100 text-emerald-700' :
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
                            <div className="text-2xl font-bold text-emerald-600">{interviews.filter(i => i.status === 'Completed').length}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase">Completed</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-red-600">{interviews.filter(i => i.status === 'Cancelled').length}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase">Cancelled</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-2xl font-bold text-orange-600">{interviews.filter(i => i.status === 'No-Show').length}</div>
                            <div className="text-xs font-medium text-slate-500 uppercase">No-Show</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewsAdmin;
