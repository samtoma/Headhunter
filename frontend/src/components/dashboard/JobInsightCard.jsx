
import { useState, useMemo } from 'react'
import { Save, Pencil } from 'lucide-react'
import { safeList, parseSalary, formatCurrency } from '../../utils/helpers'

const JobInsightCard = ({ job, profiles, onEdit, onNavigate }) => {
    const [editing, setEditing] = useState(false)
    const [desc, setDesc] = useState(job.description || "")
    const [reqExp, setReqExp] = useState(job.required_experience || 0)
    const [skills, setSkills] = useState(safeList(job.skills_required).join(", "))

    const jobStats = useMemo(() => {
        const candidates = profiles.filter(p => p.applications?.some(a => a.job_id === job.id))
        let totalExp = 0, totalCurr = 0, totalExpSal = 0
        let countExp = 0, countSal = 0
        candidates.forEach(c => {
            if (c.parsed_data?.experience_years) { totalExp += c.parsed_data.experience_years; countExp++ }
            const curr = parseSalary(c.parsed_data?.current_salary)
            const expect = parseSalary(c.parsed_data?.expected_salary)
            if (curr) { totalCurr += curr; countSal++ }
            if (expect) { totalExpSal += expect }
        })
        return {
            count: candidates.length,
            avgExp: countExp ? (totalExp / countExp).toFixed(1) : 0,
            avgCurr: countSal ? (totalCurr / countSal) : 0,
            avgExpSal: countSal ? (totalExpSal / countSal) : 0
        }
    }, [profiles, job])

    const save = () => {
        onEdit(job.id, { description: desc, required_experience: parseInt(reqExp), skills_required: skills.split(",").map(s => s.trim()).filter(s => s) })
        setEditing(false)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h3 onClick={() => onNavigate(job)} className="text-lg font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition">{job.title}</h3>
                    <div className="text-xs text-slate-400 font-medium uppercase mt-1">{jobStats.count} Candidates</div>
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
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-medium">Avg Experience</span><span className="text-sm font-bold text-slate-800">{jobStats.avgExp}y</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-medium">Avg Curr. Salary</span><span className="text-sm font-bold text-slate-800">{formatCurrency(jobStats.avgCurr)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500 font-medium">Avg Exp. Salary</span><span className="text-sm font-bold text-emerald-600">{formatCurrency(jobStats.avgExpSal)}</span></div>
                </div>
            </div>
        </div>
    )
}

export default JobInsightCard
