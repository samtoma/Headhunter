import React from 'react'
import { ChevronRight } from 'lucide-react'

const CandidateList = ({ title, status, profiles, onViewProfile }) => {
    const candidates = profiles.filter(p => p.applications?.some(a => a.status === status))
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1">
            <h3 className="text-sm font-bold text-slate-900 uppercase mb-4 flex items-center justify-between">{title} <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{candidates.length}</span></h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {candidates.map(c => (
                    <div key={c.id} onClick={() => onViewProfile(c)} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition border border-transparent hover:border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{c.parsed_data?.name?.charAt(0)}</div>
                        <div className="flex-1 min-w-0"><div className="text-sm font-bold text-slate-900 truncate">{c.parsed_data?.name}</div><div className="text-xs text-slate-500 truncate">{c.parsed_data?.last_job_title}</div></div>
                        <ChevronRight size={14} className="text-slate-300" />
                    </div>
                ))}
                {candidates.length === 0 && <div className="text-xs text-slate-400 italic">No candidates found.</div>}
            </div>
        </div>
    )
}

export default CandidateList
