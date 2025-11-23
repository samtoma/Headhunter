import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { 
  Upload, FileText, RefreshCw, BrainCircuit, Search, Briefcase, 
  GraduationCap, X, File, Trash2, RotateCw, MapPin, User, 
  LayoutGrid, Kanban, Star, DollarSign, Plus, Layers, 
  ChevronRight, Save, AlertCircle, Check, ChevronDown, Archive,
  Briefcase as BriefcaseIcon, Lock, Unlock, Flag, Heart
} from 'lucide-react'

// --- Utility: Safe JSON Parse ---
const safeList = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  try { return JSON.parse(data) } catch (e) { return [] }
}

function App() {
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null) 
  const [profiles, setProfiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCv, setSelectedCv] = useState(null)
  const [viewMode, setViewMode] = useState("list")
  const [showNewJobInput, setShowNewJobInput] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState("")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  
  // Toggle for Archived Jobs
  const [showArchived, setShowArchived] = useState(false)

  // --- API Calls ---
  const fetchJobs = useCallback(async () => {
    try { const res = await axios.get('/api/jobs/'); setJobs(res.data) } catch (err) { console.error(err) }
  }, [])

  const fetchProfiles = useCallback(async (jobIdOverride) => {
    try {
      const activeJobId = jobIdOverride !== undefined ? jobIdOverride : selectedJob?.id
      const url = activeJobId ? `/api/profiles/?job_id=${activeJobId}` : '/api/profiles/'
      const res = await axios.get(url)
      setProfiles(res.data)
    } catch (err) { console.error(err) }
  }, [selectedJob])

  useEffect(() => { fetchJobs() }, [fetchJobs])
  useEffect(() => { fetchProfiles(); const i = setInterval(() => fetchProfiles(), 5000); return () => clearInterval(i) }, [fetchProfiles])
  useEffect(() => { setViewMode(selectedJob ? "board" : "list") }, [selectedJob])

  // --- Actions ---
  const handleCreateJob = async (e) => {
    e.preventDefault(); if (!newJobTitle.trim()) return
    try { const res = await axios.post('/api/jobs/', { title: newJobTitle }); setJobs([...jobs, res.data]); setNewJobTitle(""); setShowNewJobInput(false); setSelectedJob(res.data) } catch (err) { alert("Failed") }
  }
  
  const handleToggleArchive = async (job) => {
      try {
          const res = await axios.patch(`/api/jobs/${job.id}`, { is_active: !job.is_active })
          setJobs(prev => prev.map(j => j.id === job.id ? res.data : j))
          if (selectedJob?.id === job.id) setSelectedJob(res.data)
      } catch (e) { alert("Failed to update status") }
  }

  const performUpload = async (file, jobId) => {
    const formData = new FormData(); formData.append('file', file); if (jobId) formData.append('job_id', jobId)
    setUploading(true); setShowUploadModal(false); setStatus("Uploading...")
    try { await axios.post('/api/cv/upload', formData); fetchProfiles(selectedJob?.id); fetchJobs(); setStatus("AI Parsing..."); setTimeout(() => { fetchProfiles(selectedJob?.id); fetchJobs(); setStatus("Done!"); setTimeout(() => setStatus(""), 2000) }, 3000) } catch (err) { alert("Upload failed"); setStatus("Error") } finally { setUploading(false); setUploadFile(null) }
  }

  const handleDeleteCV = async (e, id) => {
    e.stopPropagation(); if (!confirm("Delete candidate?")) return
    try { await axios.delete(`/api/cv/${id}`); setProfiles(prev => prev.filter(p => p.id !== id)); if (selectedCv?.id === id) setSelectedCv(null); fetchJobs() } catch (err) { alert("Failed") }
  }

  const handleReprocess = async (e, id) => {
    e.stopPropagation(); try { await axios.post(`/api/cv/${id}/reprocess`); setProfiles(prev => prev.map(p => p.id === id ? {...p, is_parsed: false} : p)) } catch (err) { alert("Failed") }
  }

  const handleUpdateProfile = async (id, data) => {
    try { setProfiles(prev => prev.map(p => p.id === id ? { ...p, parsed_data: { ...p.parsed_data, ...data } } : p)); await axios.patch(`/api/profiles/${id}`, data) } catch (err) { fetchProfiles(selectedJob?.id) }
  }

  const handleUpdateApp = async (appId, data) => {
      try { await axios.patch(`/api/applications/${appId}`, data); fetchProfiles() } catch(e) {}
  }

  const handleAssignJob = async (cvId, jobId) => {
      try { await axios.post('/api/applications/', { cv_id: cvId, job_id: jobId }); fetchProfiles(); fetchJobs() } catch(e) { alert("Failed") }
  }

  const handleRemoveJob = async (cvId, jobId) => {
      if(!confirm("Remove from pipeline?")) return
      const cv = profiles.find(p => p.id === cvId)
      const app = cv.applications.find(a => a.job_id === jobId)
      if(app) { await axios.delete(`/api/applications/${app.id}`); fetchProfiles(); fetchJobs(); setSelectedCv(null) }
  }

  // --- Filter Logic ---
  const filteredProfiles = profiles.filter(cv => {
    const term = searchTerm.toLowerCase()
    const d = cv.parsed_data || {}
    const matches = (d.name||"").toLowerCase().includes(term) || (d.last_job_title||"").toLowerCase().includes(term) || safeList(d.skills).join(" ").toLowerCase().includes(term)
    if (!selectedJob) return matches
    return matches && cv.applications?.some(a => a.job_id === selectedJob.id)
  })

  const displayedJobs = jobs.filter(j => showArchived ? !j.is_active : j.is_active)

  const getStatus = (cv) => { if (!selectedJob) return "New"; const app = cv.applications?.find(a => a.job_id === selectedJob.id); return app ? app.status : "New" }
  
  const COLUMNS = ["New", "Screening", "Interview", "Offer", "Hired", "Silver Medalist", "Rejected"]
  
  const onDragStart = (e, id) => e.dataTransfer.setData("cvId", id)
  const onDrop = async (e, newStatus) => { const id = parseInt(e.dataTransfer.getData("cvId")); const cv = profiles.find(p => p.id === id); const app = cv?.applications.find(a => a.job_id === selectedJob.id); if (app) { setProfiles(prev => prev.map(p => { if (p.id !== id) return p; const newApps = p.applications.map(a => a.id === app.id ? {...a, status: newStatus} : a); return {...p, applications: newApps} })); await axios.patch(`/api/applications/${app.id}`, { status: newStatus }) } }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-100"><h1 className="text-xl font-extrabold text-indigo-600 flex items-center gap-2"><BrainCircuit className="w-7 h-7" /> Headhunter</h1></div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <button onClick={() => setSelectedJob(null)} className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${!selectedJob ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Layers size={18}/> All Candidates</button>
            
            <div className="mt-6 px-3 flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{showArchived ? "Archived" : "Pipelines"}</span>
                <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full transition">
                    {showArchived ? <><BriefcaseIcon size={10}/> Show Active</> : <><Archive size={10}/> Archived</>}
                </button>
            </div>

            {displayedJobs.length === 0 && <div className="px-3 text-xs text-slate-400 italic">No {showArchived ? "archived" : "active"} pipelines.</div>}

            {displayedJobs.map(job => (
                <button key={job.id} onClick={() => setSelectedJob(job)} className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition ${selectedJob?.id === job.id ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <span className={`truncate flex items-center gap-2 ${!job.is_active ? 'line-through opacity-70' : ''}`}>
                        {!job.is_active && <Lock size={12}/>} {job.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedJob?.id === job.id ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{job.candidate_count}</span>
                </button>
            ))}
            
            {!showArchived && (showNewJobInput ? <form onSubmit={handleCreateJob} className="mt-2 px-1"><input autoFocus className="w-full p-2 text-sm border rounded" placeholder="Job Title..." value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} onBlur={() => setShowNewJobInput(false)}/></form> : <button onClick={() => setShowNewJobInput(true)} className="w-full flex items-center gap-2 p-2 text-sm text-slate-400 hover:text-indigo-600 mt-2"><Plus size={16} /> New Pipeline</button>)}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 z-10">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {selectedJob ? selectedJob.title : "All Candidates"}
                    {selectedJob && !selectedJob.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">ARCHIVED</span>}
                </h2>
                
                {selectedJob && (
                    <button onClick={() => handleToggleArchive(selectedJob)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${selectedJob.is_active ? "text-red-600 border-red-100 bg-red-50 hover:bg-red-100" : "text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100"}`}>
                        {selectedJob.is_active ? <><Lock size={12}/> Close Position</> : <><Unlock size={12}/> Re-open Position</>}
                    </button>
                )}
            </div>

            <div className="flex gap-4">
                <div className="relative w-64"><Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" /><input className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <div className="bg-slate-100 p-1 rounded-lg flex"><button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition ${viewMode === "list" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><LayoutGrid size={18} /></button>{selectedJob && <button onClick={() => setViewMode("board")} className={`p-1.5 rounded transition ${viewMode === "board" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><Kanban size={18} /></button>}</div>
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition shadow-md active:scale-95"><Upload size={16} /> <span className="font-bold text-sm">{uploading ? "..." : "Add"}</span><input type="file" className="hidden" onChange={(e) => {if(e.target.files[0]) selectedJob ? performUpload(e.target.files[0], selectedJob.id) : (setUploadFile(e.target.files[0]), setShowUploadModal(true))}} disabled={uploading} /></label>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
            {viewMode === "list" ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filteredProfiles.map(cv => <Card key={cv.id} cv={cv} onClick={() => setSelectedCv(cv)} onDelete={handleDeleteCV} onReprocess={handleReprocess} status={selectedJob ? getStatus(cv) : null} jobs={jobs} />)}</div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 h-full">{COLUMNS.map(col => (<div key={col} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, col)} className="min-w-[320px] bg-slate-100 rounded-xl flex flex-col h-full border border-slate-200/60"><div className="p-3 border-b border-slate-200/50 bg-slate-50/50 rounded-t-xl flex justify-between font-bold text-xs text-slate-600 uppercase"><span>{col}</span><span className="bg-white px-2 py-0.5 rounded">{filteredProfiles.filter(p => getStatus(p) === col).length}</span></div><div className="flex-1 overflow-y-auto p-3 space-y-2">{filteredProfiles.filter(p => getStatus(p) === col).map(cv => <div key={cv.id} draggable onDragStart={e => onDragStart(e, cv.id)}><Card cv={cv} onClick={() => setSelectedCv(cv)} onDelete={handleDeleteCV} onReprocess={handleReprocess} compact jobs={jobs} /></div>)}</div></div>))}</div>
            )}
        </div>

        {selectedCv && <Drawer cv={selectedCv} onClose={() => setSelectedCv(null)} jobs={jobs} updateApp={handleUpdateApp} updateProfile={handleUpdateProfile} selectedJobId={selectedJob?.id} assignJob={handleAssignJob} removeJob={handleRemoveJob} />}
        
        {showUploadModal && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full"><h3 className="text-lg font-bold text-slate-900 mb-4">Select Pipeline</h3><div className="space-y-2 mb-6 max-h-60 overflow-y-auto">{jobs.map(j => <button key={j.id} onClick={() => performUpload(uploadFile, j.id)} className="w-full flex justify-between items-center p-3 rounded-lg border hover:bg-indigo-50 transition text-left text-sm font-medium text-slate-700">{j.title} <ChevronRight size={14} className="text-slate-400"/></button>)}<button onClick={() => performUpload(uploadFile, null)} className="w-full p-3 rounded-lg border hover:bg-slate-50 transition text-left text-sm text-slate-500">General Pool</button></div><button onClick={() => setShowUploadModal(false)} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button></div></div>}
      </div>
    </div>
  )
}

const getStatusColor = (status) => {
    switch(status) {
        case "Hired": return "bg-emerald-100 text-emerald-700 border-emerald-200"
        case "Rejected": return "bg-red-100 text-red-700 border-red-200"
        case "Silver Medalist": return "bg-indigo-100 text-indigo-700 border-indigo-200"
        default: return "bg-slate-100 text-slate-500 border-slate-200"
    }
}

const Card = ({ cv, onClick, onDelete, onReprocess, status, compact, jobs }) => {
  const d = cv.parsed_data || {}
  const skills = safeList(d.skills).slice(0, 3)
  return (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-indigo-200 transition-all cursor-pointer group relative ${compact ? 'mb-0' : ''}`}>
       <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 backdrop-blur rounded-md p-0.5">
          <button onClick={(e) => onReprocess(e, cv.id)} className="p-1 text-slate-400 hover:text-indigo-600"><RotateCw size={14} /></button>
          <button onClick={(e) => onDelete(e, cv.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
       </div>
       {!cv.is_parsed && <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20"><RefreshCw className="animate-spin text-indigo-500" /></div>}
       <div className="mb-3 pr-8">
          <h3 className="text-[15px] font-bold text-slate-900 leading-tight line-clamp-1">{d.name || "Candidate"}</h3>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Briefcase size={12} className="text-indigo-400" /><span className="truncate">{d.last_job_title || "Unknown Role"}</span></div>
       </div>
       {!compact && skills.length > 0 && (
         <div className="flex flex-wrap gap-1.5 mb-3">
            {skills.map((s,i) => <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium border border-slate-200">{s}</span>)}
         </div>
       )}
       <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-slate-700">{cv.projected_experience || 0}y</span>
            {cv.years_since_upload > 1 && <span className="text-[10px] text-amber-600 font-medium" title="Projected">(+{Math.floor(cv.years_since_upload)})</span>}
          </div>
          {status && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(status)}`}>{status}</span>}
       </div>
    </div>
  )
}

const Drawer = ({ cv, onClose, updateApp, updateProfile, jobs, selectedJobId, assignJob, removeJob }) => {
  const [view, setView] = useState("parsed")
  const d = cv.parsed_data || {}
  const app = selectedJobId ? cv.applications?.find(a => a.job_id === selectedJobId) : null
  
  const [notes, setNotes] = useState(app ? app.notes : "")
  const [rating, setRating] = useState(app ? app.rating : 0)
  const [status, setStatus] = useState(app ? app.status : "New")
  const [curr, setCurr] = useState(app ? app.current_salary : d.current_salary || "")
  const [exp, setExp] = useState(app ? app.expected_salary : d.expected_salary || "")
  const [saved, setSaved] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const history = safeList(d.job_history).sort((a, b) => {
     const y = s => { const m = (s||"").match(/(\d{4})/); return m ? parseInt(m[0]) : 0 }
     return y(b.duration) - y(a.duration)
  })
  const education = safeList(d.education)
  const skills = safeList(d.skills)

  const save = async () => {
    setSaved(false)
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
             <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{d.name || "Candidate Profile"}</h2>
                <p className="text-indigo-600 font-medium text-base mt-0.5 flex items-center gap-2">
                    {d.last_job_title || "No Title"} 
                    {d.last_company && <span className="text-slate-400 font-normal">@ {d.last_company}</span>}
                </p>
                <div className="flex gap-4 mt-3 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5"><MapPin size={14}/> {d.address || "Remote"}</div>
                    <div className="flex items-center gap-1.5"><User size={14}/> {d.age ? `${d.age} yrs` : "N/A"}</div>
                    <div className="flex items-center gap-1.5"><Briefcase size={14}/> {cv.projected_experience || 0}y Exp</div>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                    <button onClick={() => setView("parsed")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "parsed" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Profile</button>
                    <button onClick={() => setView("pdf")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "pdf" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Original CV</button>
                </div>
                <button onClick={onClose} className="p-2.5 bg-white hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 border border-slate-200 transition"><X size={20}/></button>
             </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
             
             <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {view === "pdf" ? (
                    <iframe src={`/api/files/${cv.filename}`} className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white min-h-[800px]" title="PDF"></iframe>
                ) : (
                    <>
                        {/* Requirement #5: PERSONAL DETAILS (Restored) */}
                        {(d.marital_status || d.military_status) && (
                            <section>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><User size={14}/> Personal Details</h3>
                                <div className="flex gap-4">
                                    {d.marital_status && <div className="px-4 py-2 bg-pink-50 text-pink-700 border border-pink-100 rounded-lg text-sm font-medium flex items-center gap-2"><Heart size={14}/> {d.marital_status}</div>}
                                    {d.military_status && <div className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-medium flex items-center gap-2"><Flag size={14}/> {d.military_status}</div>}
                                </div>
                            </section>
                        )}

                        {d.summary && (
                            <section>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14}/> Professional Summary</h3>
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-700 leading-relaxed text-base">{d.summary}</div>
                            </section>
                        )}

                        {skills.length > 0 && (
                            <section>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><BrainCircuit size={14}/> Key Skills</h3>
                                <div className="flex flex-wrap gap-2">{skills.map((skill, i) => <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-semibold shadow-sm">{skill}</span>)}</div>
                            </section>
                        )}

                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase size={14}/> Work History</h3>
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                                {history.map((job, i) => (
                                    <div key={i} className="relative pl-8">
                                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-indigo-500"></div>
                                        <div className="relative">
                                            <h4 className="font-bold text-lg text-slate-900 leading-tight">{job.title}</h4>
                                            <div className="text-indigo-600 font-medium text-sm mt-0.5">{job.company}</div>
                                            <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-mono rounded">{job.duration}</span>
                                            {job.description && <p className="mt-3 text-slate-600 text-sm leading-relaxed border-l-2 border-slate-100 pl-3">{job.description}</p>}
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && <div className="pl-8 text-slate-400 italic">No experience detected.</div>}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><GraduationCap size={14}/> Education</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {education.map((edu, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                                        <div className="mt-0.5"><GraduationCap className="text-slate-300" size={20}/></div>
                                        <div>
                                            <div className="font-bold text-slate-900">{edu.school || "University"}</div>
                                            <div className="text-sm text-indigo-600">{edu.degree}</div>
                                            <div className="text-xs text-slate-400 mt-1">{edu.year}</div>
                                        </div>
                                    </div>
                                ))}
                                {education.length === 0 && <div className="text-slate-400 italic">No education detected.</div>}
                            </div>
                        </section>
                    </>
                )}
             </div>

             <div className="w-[22rem] bg-white border-l border-slate-200 p-6 flex flex-col overflow-y-auto shadow-[rgba(0,0,0,0.05)_0px_0px_20px]">
                 
                 <div className={`p-4 rounded-xl mb-6 ${selectedJobId ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
                     <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active Pipeline</div>
                     <div className="font-bold text-slate-900 flex items-center gap-2">
                        {selectedJobId ? <><Layers size={16} className="text-indigo-600"/> {jobs.find(j=>j.id===selectedJobId)?.title}</> : <><LayoutGrid size={16}/> General Pool</>}
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

                 {!selectedJobId && cv.applications.length > 0 && (
                     <div className="mb-6">
                        <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Track Status</h4>
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
                        <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><DollarSign size={14}/> Compensation</h4>
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
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><Star size={14}/> Rating</h4>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                    <input type="range" min="0" max="10" value={rating || 0} onChange={e => setRating(e.target.value)} className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                                    <span className="font-bold text-indigo-600 w-8 text-center bg-white py-0.5 rounded border border-slate-200 text-xs">{rating || "-"}</span>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2"><FileText size={14}/> Notes</h4>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex-1 w-full p-3 bg-yellow-50/50 border border-yellow-200/60 rounded-xl text-sm text-slate-700 resize-none focus:bg-yellow-50 focus:border-yellow-300 outline-none transition" placeholder="Interviewer feedback..."></textarea>
                            </div>
                         </>
                     ) : (
                         <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                             <AlertCircle className="mx-auto text-slate-300 mb-2" size={24}/>
                             <p className="text-xs text-slate-500 font-medium">Assign to a Pipeline to add ratings & notes.</p>
                         </div>
                     )}
                 </div>

                 <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                    <button onClick={save} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]">
                        {saved ? <Check size={18}/> : <Save size={18}/>} {saved ? "Saved!" : "Save Changes"}
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

export default App