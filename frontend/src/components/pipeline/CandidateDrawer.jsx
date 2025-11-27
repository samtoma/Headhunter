
import { useState, useMemo } from 'react'
import {
    MapPin, User, Briefcase, Bug, Pencil, X, ExternalLink, Linkedin, Github,
    FileText, BrainCircuit, GraduationCap, Layers, LayoutGrid, DollarSign, Star,
    AlertCircle, Check, Save, ChevronDown
} from 'lucide-react'
import { safeList, getStatusColor } from '../../utils/helpers'

const CandidateDrawer = ({ cv, onClose, updateApp, updateProfile, jobs, selectedJobId, assignJob, removeJob }) => {
    const [view, setView] = useState("parsed")
    const [isEditing, setIsEditing] = useState(false)
    const d = cv.parsed_data || {}
    const app = selectedJobId ? cv.applications?.find(a => a.job_id === selectedJobId) : null

    const [editData, setEditData] = useState({
        name: d.name,
        email: safeList(d.email)[0] || "",
        phone: safeList(d.phone)[0] || "",
        address: d.address,
        summary: d.summary,
        skills: safeList(d.skills).join(", "),
        age: d.age || "",
        experience_years: cv.parsed_data?.experience_years || 0
    })

    const [notes, setNotes] = useState(app ? app.notes : "")
    const [rating, setRating] = useState(app ? app.rating : 0)
    const [status, setStatus] = useState(app ? app.status : "New")
    const [curr, setCurr] = useState(app ? app.current_salary : d.current_salary || "")
    const [exp, setExp] = useState(app ? app.expected_salary : d.expected_salary || "")
    const [saved, setSaved] = useState(false)
    const [assignOpen, setAssignOpen] = useState(false)

    const education = safeList(d.education)
    const skills = safeList(d.skills)

    const groupedHistory = useMemo(() => {
        const sorted = safeList(d.job_history).sort((a, b) => {
            const getYear = (j) => {
                if (j.duration) {
                    const match = j.duration.match(/(\d{4})/)
                    return match ? parseInt(match[0]) : 0
                }
                return 0
            }
            return getYear(b) - getYear(a)
        })
        const groups = []
        sorted.forEach(job => {
            const duration = job.duration || (job.start_date ? `${job.start_date} - ${job.end_date || 'Present'}` : "")
            let description = job.description || ""
            if (!description && job.highlights) {
                if (Array.isArray(job.highlights)) description = job.highlights.join(". ")
                else description = job.highlights
            }
            const displayJob = { ...job, duration, description }
            groups.push(displayJob)
        })
        return groups
    }, [d.job_history])

    const save = async () => {
        setSaved(false)
        if (isEditing) {
            await updateProfile(cv.id, {
                name: editData.name,
                address: editData.address,
                summary: editData.summary,
                skills: editData.skills.split(",").map(s => s.trim()).filter(s => s),
                email: JSON.stringify([editData.email]),
                phone: JSON.stringify([editData.phone]),
                age: editData.age ? parseInt(editData.age) : null,
                experience_years: editData.experience_years ? parseInt(editData.experience_years) : 0
            })
            setIsEditing(false)
        }

        if (selectedJobId && app) {
            await updateApp(app.id, { notes, rating: parseInt(rating), status, current_salary: curr, expected_salary: exp })
        } else {
            await updateProfile(cv.id, { current_salary: curr, expected_salary: exp })
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end isolate">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity" onClick={onClose}></div>

            <div className="relative w-full max-w-[90rem] bg-[#F8FAFC] h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden border-l border-slate-200">

                <div className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-start shrink-0">
                    <div className="flex-1">
                        {isEditing ? (
                            <input className="text-2xl font-extrabold text-slate-900 border-b border-slate-300 focus:border-indigo-500 outline-none w-full" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                        ) : (
                            <h2 className="text-2xl font-extrabold text-slate-900">{d.name || "Candidate Profile"}</h2>
                        )}
                        <p className="text-indigo-600 font-medium text-base mt-0.5 flex items-center gap-2">
                            {d.last_job_title || "No Title"}
                            {d.last_company && <span className="text-slate-400 font-normal">@ {d.last_company}</span>}
                        </p>
                        <div className="flex gap-4 mt-3 text-sm text-slate-500">
                            {isEditing ? <input className="border rounded p-1 text-xs" value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} /> : <div className="flex items-center gap-1.5"><MapPin size={14} /> {d.address || "Remote"}</div>}

                            <div className="flex items-center gap-1.5">
                                <User size={14} />
                                {isEditing ? <input type="number" className="w-12 border rounded p-1 text-xs" value={editData.age} onChange={e => setEditData({ ...editData, age: e.target.value })} /> : <>{d.age ? `${d.age} yrs` : "N/A"}</>}
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Briefcase size={14} />
                                {isEditing ? <input type="number" className="w-12 border rounded p-1 text-xs" value={editData.experience_years} onChange={e => setEditData({ ...editData, experience_years: e.target.value })} /> : <>{cv.projected_experience || 0}y Exp</>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                            <button onClick={() => setView("parsed")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "parsed" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Profile</button>
                            <button onClick={() => setView("pdf")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "pdf" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Original CV</button>
                            <button onClick={() => setView("debug")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "debug" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}><Bug size={16} /></button>
                        </div>
                        <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-lg border transition ${isEditing ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 hover:text-indigo-600 border-slate-200'}`}>
                            <Pencil size={20} />
                        </button>
                        <button onClick={onClose} className="p-2.5 bg-white hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 border border-slate-200 transition"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {view === "debug" && (
                            <div className="bg-slate-900 text-slate-300 p-6 rounded-xl font-mono text-xs overflow-auto h-full">
                                <pre>{JSON.stringify(d, null, 2)}</pre>
                            </div>
                        )}

                        {view === "pdf" && (
                            <iframe src={`/api/files/${cv.filepath ? cv.filepath.split(/[/\\]/).pop() : cv.filename}`} className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white min-h-[800px]" title="PDF"></iframe>
                        )}

                        {view === "parsed" && (
                            <>
                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><User size={14} /> Contact & Personal</h3>
                                    {isEditing ? (
                                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div><label className="text-xs font-bold block mb-1">Email</label><input className="w-full p-2 rounded border" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} /></div>
                                            <div><label className="text-xs font-bold block mb-1">Phone</label><input className="w-full p-2 rounded border" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} /></div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-4">
                                            <div className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium">{safeList(d.email)[0] || "No Email"}</div>
                                            <div className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium">{safeList(d.phone)[0] || "No Phone"}</div>
                                            {safeList(d.social_links).map((link, i) => {
                                                let Icon = ExternalLink
                                                let label = "Link"
                                                let style = "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                                const lower = link.toLowerCase()
                                                if (lower.includes("linkedin.com")) { Icon = Linkedin; label = "LinkedIn"; style = "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" }
                                                else if (lower.includes("github.com")) { Icon = Github; label = "GitHub"; style = "bg-slate-800 text-white border-slate-900 hover:bg-slate-700" }
                                                return (
                                                    <a key={i} href={link} target="_blank" rel="noreferrer" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition border ${style}`}>
                                                        <Icon size={14} /> {label}
                                                    </a>
                                                )
                                            })}
                                        </div>
                                    )}
                                </section>

                                {d.summary && (
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14} /> Professional Summary</h3>
                                        {isEditing ? (
                                            <textarea className="w-full p-4 border rounded-xl text-sm h-32" value={editData.summary} onChange={e => setEditData({ ...editData, summary: e.target.value })} />
                                        ) : (
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-700 leading-relaxed text-base">{d.summary}</div>
                                        )}
                                    </section>
                                )}

                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><BrainCircuit size={14} /> Key Skills</h3>
                                    {isEditing ? (
                                        <textarea className="w-full p-4 border rounded-xl text-sm" value={editData.skills} onChange={e => setEditData({ ...editData, skills: e.target.value })} />
                                    ) : (
                                        <div className="flex flex-wrap gap-2">{skills.map((skill, i) => <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-semibold shadow-sm">{skill}</span>)}</div>
                                    )}
                                </section>

                                {education.length > 0 && (
                                    <section>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><GraduationCap size={14} /> Education</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {education.map((edu, i) => (
                                                <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                                    <div className="mt-0.5"><GraduationCap className="text-slate-300" size={20} /></div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{edu.school || edu.institution || "University"}</div>
                                                        <div className="text-sm text-indigo-600">{edu.degree}</div>
                                                        <div className="text-xs text-slate-400 mt-1">{edu.year || (edu.start_date + ' - ' + edu.end_date)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <section>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase size={14} /> Work History</h3>
                                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                                        {groupedHistory.map((job, i) => (
                                            <div key={i} className="relative pl-8">
                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-500"></div>
                                                <div className="mb-1">
                                                    <h4 className="text-lg font-bold text-slate-900">{job.title}</h4>
                                                    <div className="flex items-center gap-2 text-sm font-medium mt-0.5">
                                                        <span className="text-indigo-600">{job.company}</span>
                                                        {job.duration && <span className="text-xs text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded">{job.duration}</span>}
                                                    </div>
                                                </div>
                                                {job.description && <p className="text-sm text-slate-600 leading-relaxed mt-3 border-l-2 border-slate-100 pl-3">{job.description}</p>}
                                            </div>
                                        ))}
                                        {groupedHistory.length === 0 && <div className="pl-8 text-slate-400 italic">No experience detected.</div>}
                                    </div>
                                </section>
                            </>
                        )}
                    </div>

                    <div className="w-[22rem] bg-white border-l border-slate-200 p-6 flex flex-col overflow-y-auto shadow-[rgba(0,0,0,0.05)_0px_0px_20px]">
                        {/* Action Panel */}
                        <div className={`p-4 rounded-xl mb-6 ${selectedJobId ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active Pipeline</div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                {selectedJobId ? <><Layers size={16} className="text-indigo-600" /> {jobs.find(j => j.id === selectedJobId)?.title}</> : <><LayoutGrid size={16} /> General Pool</>}
                            </div>
                            {selectedJobId && (
                                <div className="mt-3 pt-3 border-t border-indigo-200/50">
                                    <label className="text-[10px] font-bold uppercase text-indigo-400">Current Stage</label>
                                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full mt-1 bg-white border border-indigo-200 text-indigo-900 text-sm rounded-lg p-2 font-medium focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {["New", "Screening", "Interview", "Offer", "Hired", "Silver Medalist", "Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {!selectedJobId && cv.applications?.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><Layers size={14} /> Track Status</h4>
                                <div className="space-y-2">
                                    {cv.applications.map(app => {
                                        const job = jobs.find(j => j.id === app.job_id)
                                        return (
                                            <div key={app.id} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                                                <div className="text-xs text-slate-500 font-medium mb-1">{job?.title}</div>
                                                <div className={`text-xs font-bold px-2 py-1 rounded inline-block border ${getStatusColor(app.status)}`}>{app.status}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6 flex-1">
                            <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><DollarSign size={14} /> Compensation</h4>
                                <div className="grid gap-3">
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">Curr</span>
                                        <input value={curr} onChange={e => setCurr(e.target.value)} className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:border-indigo-500 outline-none" placeholder="-" />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-emerald-600 text-xs font-bold">Exp</span>
                                        <input value={exp} onChange={e => setExp(e.target.value)} className="w-full pl-12 pr-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-sm font-mono focus:border-emerald-500 outline-none font-bold" placeholder="-" />
                                    </div>
                                </div>
                            </div>

                            {selectedJobId ? (
                                <>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><Star size={14} /> Rating</h4>
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                            <input type="range" min="0" max="10" value={rating || 0} onChange={e => setRating(e.target.value)} className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                            <span className="font-bold text-indigo-600 w-8 text-center bg-white py-0.5 rounded border border-slate-200 text-xs">{rating || "-"}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><FileText size={14} /> Notes</h4>
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex-1 w-full p-3 bg-yellow-50/50 border border-yellow-200/60 rounded-xl text-sm text-slate-700 resize-none focus:bg-yellow-50 focus:border-yellow-300 outline-none transition" placeholder="Interviewer feedback..."></textarea>
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                    <AlertCircle className="mx-auto text-slate-300 mb-2" size={24} />
                                    <p className="text-xs text-slate-500 font-medium">Assign to a Pipeline to add ratings & notes.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                            <button onClick={save} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]">
                                {saved ? <Check size={18} /> : <Save size={18} />} {saved ? "Saved!" : "Save Changes"}
                            </button>

                            {!selectedJobId && (
                                <div className="relative">
                                    <button onClick={() => setAssignOpen(!assignOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold text-sm transition">
                                        <span>Assign to Job...</span>
                                        <ChevronDown size={14} className={`transition-transform ${assignOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {assignOpen && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                                            {jobs.filter(j => j.is_active).map(j => {
                                                const isAssigned = cv.applications?.some(a => a.job_id === j.id)
                                                return <button key={j.id} onClick={() => { !isAssigned && assignJob(cv.id, j.id); setAssignOpen(false) }} disabled={isAssigned} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg text-slate-700 truncate disabled:opacity-50">{j.title} {isAssigned && "✓"}</button>
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedJobId && (
                                <button onClick={() => removeJob(cv.id, selectedJobId)} className="w-full py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold transition">
                                    Remove from Pipeline
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CandidateDrawer
