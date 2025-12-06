import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Users, Briefcase as BriefcaseIcon, Check, Award, TrendingUp, LayoutDashboard, RefreshCw } from 'lucide-react'
import { useHeadhunter } from '../../context/HeadhunterContext'
import { useAuth } from '../../context/AuthContext'
import KPICard from './KPICard'
import JobInsightCard from './JobInsightCard'
import CandidateList from './CandidateList'
import CandidateDrawer from '../pipeline/CandidateDrawer'
import PageHeader from '../layout/PageHeader'
import MyInterviewsWidget from '../widgets/MyInterviewsWidget'

const DepartmentOverview = () => {
    const [deptStats, setDeptStats] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('/api/stats/departments')
            .then(res => setDeptStats(res.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div>
    if (!deptStats.length) return null

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Users size={20} /> Department Overview</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Department</th>
                            <th className="px-4 py-3 text-center">Active Jobs</th>
                            <th className="px-4 py-3 text-center">On Hold</th>
                            <th className="px-4 py-3 text-center">Total Candidates</th>
                            <th className="px-4 py-3 text-center rounded-tr-lg">Hired</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deptStats.map((dept, idx) => (
                            <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                <td className="px-4 py-3 font-bold text-slate-700">{dept.department}</td>
                                <td className="px-4 py-3 text-center font-medium text-indigo-600">{dept.active_jobs}</td>
                                <td className="px-4 py-3 text-center text-amber-600">{dept.on_hold_jobs}</td>
                                <td className="px-4 py-3 text-center text-slate-600">{dept.total_candidates}</td>
                                <td className="px-4 py-3 text-center font-bold text-emerald-600">{dept.hired_candidates}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const DashboardView = ({ onOpenMobileSidebar }) => {
    const { jobs, profiles, setSelectedJobId, updateApp, updateProfile, assignJob, removeJob, stats, jobsLoading } = useHeadhunter()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [selectedCv, setSelectedCv] = useState(null)
    const [pendingCount, setPendingCount] = useState(0)
    const [resuming, setResuming] = useState(false)

    // Fetch pending CV count
    useEffect(() => {
        const fetchPending = async () => {
            try {
                const res = await axios.get('/api/cv/status')
                setPendingCount(res.data.processing_ids?.length || 0)
            } catch (e) {
                console.error("Failed to fetch pending CVs", e)
            }
        }
        fetchPending()
        const interval = setInterval(fetchPending, 5000) // Poll every 5s
        return () => clearInterval(interval)
    }, [])

    // Handle resume all processing
    const handleResumeProcessing = async () => {
        setResuming(true)
        try {
            const res = await axios.post('/api/cv/resume-all')
            alert(`Resumed processing for ${res.data.queued_count} CVs`)
        } catch (e) {
            console.error("Failed to resume processing", e)
            alert("Failed to resume processing")
        } finally {
            setResuming(false)
        }
    }

    const handleNavigate = (job) => {
        setSelectedJobId(job.id)
        navigate('/pipeline')
    }

    if (jobsLoading) {
        return (
            <div className="p-4 md:p-8 space-y-8 animate-pulse">
                <div className="h-8 w-48 bg-slate-200 rounded mb-8"></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-100 rounded-xl"></div>
                    ))}
                </div>
                <div className="h-64 bg-slate-100 rounded-xl"></div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="h-64 bg-slate-100 rounded-xl"></div>
                    <div className="h-64 bg-slate-100 rounded-xl"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <PageHeader
                title="Dashboard Overview"
                subtitle="Overview of your recruitment KPIs and active pipelines"
                icon={LayoutDashboard}
                onOpenMobileSidebar={onOpenMobileSidebar}
                actions={
                    pendingCount > 0 && (user?.role === 'admin' || user?.role === 'recruiter' || user?.role === 'hiring_manager') && (
                        <button
                            onClick={handleResumeProcessing}
                            disabled={resuming}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-medium disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={resuming ? 'animate-spin' : ''} />
                            Resume Processing ({pendingCount})
                        </button>
                    )
                }
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 relative">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard title="Active Jobs" value={stats?.activeJobs || 0} icon={<BriefcaseIcon className="text-white" size={24} />} color="bg-indigo-500" />
                    <KPICard title="Total Candidates" value={stats?.totalCandidates || 0} icon={<Users className="text-white" size={24} />} color="bg-slate-500" />
                    <KPICard title="Hired" value={stats?.hired || 0} icon={<Check className="text-white" size={24} />} color="bg-emerald-500" />
                    <KPICard title="Silver Medalists" value={stats?.silver || 0} icon={<Award className="text-white" size={24} />} color="bg-purple-500" />
                </div>

                {/* My Upcoming Interviews - visible to all users */}
                <MyInterviewsWidget limit={3} onViewCandidate={(interview) => {
                    // Navigate to dedicated Interview Mode page
                    navigate(`/interview/${interview.id}`);
                }} />

                <DepartmentOverview />
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={20} /> Pipeline Insights</h2>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {(Array.isArray(jobs) ? jobs : []).filter(j => j.is_active).map(job => (
                            <JobInsightCard key={job.id} job={job} profiles={profiles} onEdit={() => { }} onNavigate={() => handleNavigate(job)} />
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <CandidateList title="Recent Hires" status="Hired" profiles={profiles} onViewProfile={setSelectedCv} />
                    <CandidateList title="Silver Medalists" status="Silver Medalist" profiles={profiles} onViewProfile={setSelectedCv} />
                </div>

                {selectedCv && (
                    <CandidateDrawer
                        cv={selectedCv}
                        onClose={() => setSelectedCv(null)}
                        jobs={jobs}
                        updateApp={updateApp}
                        updateProfile={updateProfile}
                        selectedJobId={null}
                        assignJob={assignJob}
                        removeJob={removeJob}
                    />
                )}
            </div>
        </div>
    )
}

export default DashboardView
