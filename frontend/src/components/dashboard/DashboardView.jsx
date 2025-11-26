
import { Briefcase as BriefcaseIcon, Users, Check, Award, TrendingUp } from 'lucide-react'
import KPICard from './KPICard'
import JobInsightCard from './JobInsightCard'
import CandidateList from './CandidateList'

const DashboardView = ({ jobs, profiles, onEditJob, onNavigate, onViewProfile }) => {
    const stats = useMemo(() => {
        const totalCandidates = profiles.length
        let hired = 0
        let silver = 0
        const activeJobs = jobs.filter(j => j.is_active).length

        profiles.forEach(p => {
            p.applications?.forEach(a => {
                if (a.status === "Hired") hired++
                if (a.status === "Silver Medalist") silver++
            })
        })
        return { totalCandidates, hired, silver, activeJobs }
    }, [profiles, jobs])

    return (
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Active Jobs" value={stats.activeJobs} icon={<BriefcaseIcon className="text-white" size={24} />} color="bg-indigo-500" />
                <KPICard title="Total Candidates" value={stats.totalCandidates} icon={<Users className="text-white" size={24} />} color="bg-slate-500" />
                <KPICard title="Hired" value={stats.hired} icon={<Check className="text-white" size={24} />} color="bg-emerald-500" />
                <KPICard title="Silver Medalists" value={stats.silver} icon={<Award className="text-white" size={24} />} color="bg-purple-500" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={20} /> Pipeline Insights</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {jobs.filter(j => j.is_active).map(job => (
                        <JobInsightCard key={job.id} job={job} profiles={profiles} onEdit={onEditJob} onNavigate={onNavigate} />
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CandidateList title="Recent Hires" status="Hired" profiles={profiles} onViewProfile={onViewProfile} />
                <CandidateList title="Silver Medalists" status="Silver Medalist" profiles={profiles} onViewProfile={onViewProfile} />
            </div>
        </div>
    )
}

export default DashboardView
