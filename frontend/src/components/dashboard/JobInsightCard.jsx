import { useState, useMemo } from 'react'
import { Save, Pencil } from 'lucide-react'
import { safeList, parseSalary, formatCurrency } from '../../utils/helpers'

import { useAuth } from '../../context/AuthContext'

const JobInsightCard = ({ job, profiles, onEdit, onNavigate }) => {
    const { user } = useAuth()
    const [editing, setEditing] = useState(false)
    const [desc, setDesc] = useState(job.description || "")
    const [reqExp, setReqExp] = useState(job.required_experience || 0)
    const [skills, setSkills] = useState(safeList(job.skills_required).join(", "))

    const canViewSalary = useMemo(() => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'super_admin') return true;
        try {
            const perms = JSON.parse(user.permissions || '{}');
            return !!perms.can_view_salary;
        } catch (e) {
            return false;
        }
    }, [user]);

    const jobStats = useMemo(() => {
        const candidates = profiles.filter(p => p.applications?.some(a => a.job_id === job.id));
        let activeInterviews = 0;
        let offers = 0;
        let upcomingInterviews = [];

        // Salary Stats
        let totalExp = 0, totalCurr = 0, totalExpSal = 0;
        let countExp = 0, countSal = 0;

        candidates.forEach(c => {
            const app = c.applications.find(a => a.job_id === job.id);

            // Salary Calculation (if permitted or just calculate anyway, cheap)
            if (c.parsed_data?.experience_years) { totalExp += c.parsed_data.experience_years; countExp++; }
            const curr = parseSalary(c.parsed_data?.current_salary);
            const expect = parseSalary(c.parsed_data?.expected_salary);
            if (curr) { totalCurr += curr; countSal++; }
            if (expect) { totalExpSal += expect; }

            if (!app) return;

            // Count Active Pipeline Stages (Excluding New/Rejected/Hired)
            if (!["New", "Rejected", "Hired", "Silver Medalist", "Offer"].includes(app.status)) {
                activeInterviews++;
            }
            if (app.status === "Offer") {
                offers++;
            }

            // Find next interview
            if (app.interviews && Array.isArray(app.interviews)) {
                app.interviews.forEach(int => {
                    if (int.status === 'Scheduled' && new Date(int.scheduled_at) > new Date()) {
                        upcomingInterviews.push({
                            date: int.scheduled_at,
                            candidateName: c.name || c.parsed_data?.name || "Candidate",
                            type: int.step
                        });
                    }
                });
            }
        });

        // Sort upcoming interviews by date
        upcomingInterviews.sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            activeCandidates: candidates.filter(c => c.applications.some(a => a.job_id === job.id && a.status !== 'Rejected')).length,
            activeInterviews,
            offers,
            nextInterview: upcomingInterviews[0] || null,
            avgExp: countExp ? (totalExp / countExp).toFixed(1) : 0,
            avgCurr: countSal ? (totalCurr / countSal) : 0,
            avgExpSal: countSal ? (totalExpSal / countSal) : 0
        };
    }, [profiles, job]);

    const save = () => {
        onEdit(job.id, { description: desc, required_experience: parseInt(reqExp), skills_required: skills.split(",").map(s => s.trim()).filter(s => s) })
        setEditing(false)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h3 onClick={() => onNavigate(job)} className="text-lg font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition">{job.title}</h3>
                    <div className="text-xs text-slate-400 font-medium uppercase mt-1">{jobStats.activeCandidates} Candidates</div>
                </div>
                <button onClick={() => editing ? save() : setEditing(true)} className={`p-2 rounded-lg transition ${editing ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}>
                    {editing ? <Save size={16} /> : <Pencil size={16} />}
                </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description</label>{editing ? <textarea className="w-full text-sm border rounded p-2" rows="2" value={desc} onChange={e => setDesc(e.target.value)} /> : <p className="text-sm text-slate-600 line-clamp-2">{job.description || "No description set."}</p>}</div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Req. Experience (Years)</label>{editing ? <input type="number" className="w-full text-sm border rounded p-1" value={reqExp} onChange={e => setReqExp(e.target.value)} /> : <div className="text-sm font-bold text-slate-800">{job.required_experience || 0} Years</div>}</div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Skills</label>{editing ? <input className="w-full text-sm border rounded p-1" value={skills} onChange={e => setSkills(e.target.value)} /> : <div className="flex flex-wrap gap-1">{safeList(job.skills_required).map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">{s}</span>)}</div>}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 flex flex-col justify-between h-full">

                    {/* Permission-based View */}
                    {canViewSalary ? (
                        <div className="space-y-3 mb-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Market Stats</h4>
                            <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-medium">Avg Experience</span><span className="text-sm font-bold text-slate-800">{jobStats.avgExp}y</span></div>
                            <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-medium">Avg Current</span><span className="text-sm font-bold text-slate-800">{formatCurrency(jobStats.avgCurr)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-medium">Avg Expected</span><span className="text-sm font-bold text-emerald-600">{formatCurrency(jobStats.avgExpSal)}</span></div>
                        </div>
                    ) : (
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Pipeline Snapshot</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">Active Candidates</span>
                                    <span className="text-sm font-bold text-slate-800">{jobStats.activeCandidates}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">Live Interviews</span>
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{jobStats.activeInterviews}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">Offers Sent</span>
                                    <span className="text-sm font-bold text-emerald-600">{jobStats.offers}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {jobStats.nextInterview ? (
                        <div className="mt-auto pt-3 border-t border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Next Interview</div>
                            <div className="text-sm font-bold text-slate-800 truncate">{jobStats.nextInterview.candidateName}</div>
                            <div className="text-xs text-indigo-600 font-medium">
                                {new Date(jobStats.nextInterview.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-auto pt-3 border-t border-slate-200 text-xs text-slate-400 italic">
                            No upcoming interviews
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default JobInsightCard
