import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { Users, Briefcase as BriefcaseIcon, Check, Award, TrendingUp } from 'lucide-react'
import { useHeadhunter } from '../../context/HeadhunterContext'
import KPICard from './KPICard'
import JobInsightCard from './JobInsightCard'
import CandidateList from './CandidateList'
import CandidateDrawer from '../pipeline/CandidateDrawer'

const DepartmentOverview = () => {
    const [deptStats, setDeptStats] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('/api/v1/stats/departments')
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
    const { jobs, profiles, setSelectedJobId, updateApp, updateProfile, assignJob, removeJob, stats } = useHeadhunter()
    const navigate = useNavigate()
    const [selectedCv, setSelectedCv] = useState(null)

    // Stats are now fetched from the backend via useHeadhunter hook
    // const stats = useMemo(...) - REMOVED

    const handleNavigate = (job) => {
        setSelectedJobId(job.id)
        navigate('/pipeline')
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 relative">
            <div className="flex items-center gap-3">
                <button
                    onClick={onOpenMobileSidebar}
                    className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Active Jobs" value={stats?.activeJobs || 0} icon={<BriefcaseIcon className="text-white" size={24} />} color="bg-indigo-500" />
                <KPICard title="Total Candidates" value={stats?.totalCandidates || 0} icon={<Users className="text-white" size={24} />} color="bg-slate-500" />
                <KPICard title="Hired" value={stats?.hired || 0} icon={<Check className="text-white" size={24} />} color="bg-emerald-500" />
                <KPICard title="Silver Medalists" value={stats?.silver || 0} icon={<Award className="text-white" size={24} />} color="bg-purple-500" />
            </div>

            <DepartmentOverview />
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={20} /> Pipeline Insights</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {(jobs || []).filter(j => j.is_active).map(job => (
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
    )
}

export default DashboardView
