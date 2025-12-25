
import {
    Briefcase, GraduationCap, Heart, Flag, CheckSquare, Square, RotateCw, Trash2, RefreshCw, Download, Globe
} from 'lucide-react'
import { safeList, getStatusColor } from '../../utils/helpers'

import { useAuth } from '../../context/AuthContext'

const CandidateCard = ({ cv, onClick, onDelete, onReprocess, status, compact, selectable, selected, onSelect }) => {
    const { token } = useAuth()
    const d = cv.parsed_data || {}
    const skills = safeList(d.skills).slice(0, 3)
    const edu = safeList(d.education)[0]


    return (
        <div
            data-cy-cv-id={cv.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("cvId", cv.id)}
            onClick={onClick}
            className={`bg-white p-3 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-indigo-200 transition-all cursor-pointer group relative flex flex-col h-full ${compact ? 'mb-0' : ''} ${selected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-100'}`}
        >
            {selectable && (
                <div
                    className={`absolute top-3 left-3 z-30 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}`}
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                >
                    {selected ? <CheckSquare className="text-indigo-600 bg-white rounded" size={20} /> : <Square className="text-slate-300 hover:text-indigo-400 bg-white rounded" size={20} />}
                </div>
            )}

            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30 bg-white/80 backdrop-blur rounded-md p-0.5">
                <a
                    href={`/api/cv/${cv.id}/download?token=${token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Download CV"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Download size={14} />
                </a>
                <button onClick={(e) => onReprocess(e, cv.id)} className="p-1 text-slate-400 hover:text-indigo-600"><RotateCw size={14} /></button>
                <button onClick={(e) => onDelete(e, cv.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>

            {!cv.is_parsed && <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20"><RefreshCw className="animate-spin text-indigo-500" /></div>}

            <div className={`mb-1 pr-8 ${selectable ? 'pl-6' : ''}`}>
                <h3 className="text-[15px] font-bold text-slate-900 leading-tight line-clamp-1" title={d.name}>{d.name || "Candidate"}</h3>

                {/* JOB & COMPANY (NEW LAYOUT) */}
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Briefcase size={12} className="text-indigo-400 shrink-0" />
                    <span className="truncate" title={`${d.last_job_title || ""} ${d.last_company ? "@ " + d.last_company : ""}`}>
                        {d.last_job_title || "Unknown Role"}
                        {d.last_company && <span className="text-slate-400 font-medium"> @ {d.last_company}</span>}
                    </span>
                </div>

                {/* EDUCATION (NEW LAYOUT) */}
                {edu && (edu.school || edu.institution) && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <GraduationCap size={12} className="text-indigo-400 shrink-0" />
                        <span className="truncate" title={edu.school || edu.institution}>{edu.school || edu.institution}</span>
                    </div>
                )}
            </div>

            {/* BADGES (Micro-Indicators) */}
            {!compact && (
                <div className="flex flex-wrap gap-1 mb-auto items-center">
                    {(d.marital_status && d.marital_status.toLowerCase() !== "n/a" && d.marital_status.toLowerCase() !== "not disclosed") && (
                        <span className="px-1.5 py-0.5 bg-pink-50 text-pink-600 text-[10px] rounded border border-pink-100 flex items-center gap-1" title={`Marital: ${d.marital_status}`}>
                            <Heart size={10} /> {d.marital_status}
                        </span>
                    )}
                    {(d.military_status && d.military_status.toLowerCase() !== "n/a" && d.military_status.toLowerCase() !== "not disclosed") && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded border border-blue-100 flex items-center gap-1" title={`Military: ${d.military_status}`}>
                            <Flag size={10} /> {d.military_status}
                        </span>
                    )}

                    {skills.map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium border border-slate-200">{s}</span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-50">
                <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-bold ${cv.projected_experience < 0 ? "text-red-500" : "text-slate-700"}`}>
                        {cv.projected_experience || 0}y
                    </span>
                    <span className="text-[10px] text-slate-400">exp</span>
                    {cv.projected_experience < 0 && <span className="text-[9px] bg-red-50 text-red-600 px-1 rounded ml-1 border border-red-100">Student</span>}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(cv.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {/* Show unified origin attribution */}
                        {cv.original_source === 'landing_page' ? (
                            <><span className="mx-1">·</span> <Globe size={10} className="text-indigo-500 inline mr-0.5" /> <span className="text-indigo-500 font-medium">Landing Page</span></>
                        ) : cv.uploaded_by_name && (
                            <> · by {cv.uploaded_by_name}</>
                        )}
                    </span>
                    {status && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(status)}`}>{status}</span>}
                </div>
            </div>
        </div>
    )
}

export default CandidateCard
