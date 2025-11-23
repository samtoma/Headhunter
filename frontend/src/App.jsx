import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { 
  Upload, FileText, RefreshCw, BrainCircuit, Search, Briefcase, 
  GraduationCap, X, File, Trash2, RotateCw, MapPin, User, 
  LayoutGrid, Kanban, Star, DollarSign, Plus, Layers, 
  ChevronRight, Save, AlertCircle, Check, ChevronDown, Archive,
  Briefcase as BriefcaseIcon, Lock, Unlock, Flag, Heart,
  LayoutDashboard, TrendingUp, Users, Award, Pencil, Sparkles, Linkedin, ExternalLink,
  CheckSquare, Square, Settings, Building2, Calendar, PlayCircle, Bug,
  Github // <--- ADDED GITHUB ICON IMPORT
} from 'lucide-react'

// --- Utility: Safe JSON Parse ---
const safeList = (data) => {
  if (data === undefined || data === null) return []
  if (Array.isArray(data)) return data
  try { 
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : [parsed]
  } catch (e) { return [data] }
}

const parseSalary = (str) => {
    if (!str) return 0
    const match = str.toLowerCase().match(/(\d+(\.\d+)?)\s*k?/)
    if (!match) return 0
    let val = parseFloat(match[1])
    if (str.toLowerCase().includes('k')) val *= 1000
    return val
}

const formatCurrency = (val) => {
  if (!val) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val).replace('USD', '$')
}

function App() {
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null) 
  const [profiles, setProfiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [status, setStatus] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCv, setSelectedCv] = useState(null)
  const [viewMode, setViewMode] = useState("list")
  const [showNewJobModal, setShowNewJobModal] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [uploadFiles, setUploadFiles] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  
  const [selectedIds, setSelectedIds] = useState([])
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)

  const [currentView, setCurrentView] = useState("dashboard")
  const [showArchived, setShowArchived] = useState(false)

  const fetchJobs = useCallback(async () => {
    try { const res = await axios.get('/api/jobs/'); setJobs(res.data) } catch (err) { console.error(err) }
  }, [])

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await axios.get('/api/profiles/')
      setProfiles(res.data)
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchJobs(); fetchProfiles() }, [fetchJobs, fetchProfiles])
  useEffect(() => { const i = setInterval(() => { fetchJobs(); fetchProfiles() }, 5000); return () => clearInterval(i) }, [fetchJobs, fetchProfiles])

  // --- Bulk Actions ---
  const toggleSelect = (id) => {
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id))
      else setSelectedIds([...selectedIds, id])
  }

  const handleSelectAll = () => {
      if (selectedIds.length === filteredProfiles.length) setSelectedIds([])
      else setSelectedIds(filteredProfiles.map(p => p.id))
  }

  const performBulkAssign = async (targetJobId) => {
      if (!targetJobId) return
      try {
          await Promise.all(selectedIds.map(cvId => 
              axios.post('/api/applications/', { cv_id: cvId, job_id: targetJobId })
          ))
          alert(`Assigned ${selectedIds.length} candidates!`)
          setSelectedIds([])
          setShowBulkAssignModal(false)
          fetchProfiles()
          fetchJobs()
      } catch (e) { alert("Bulk assign failed") }
  }

  const performBulkDelete = async () => {
      if (!confirm(`Delete ${selectedIds.length} candidates permanently?`)) return
      try {
          await Promise.all(selectedIds.map(id => axios.delete(`/api/cv/${id}`)))
          setProfiles(prev => prev.filter(p => !selectedIds.includes(p.id)))
          setSelectedIds([])
          fetchJobs()
      } catch (e) { alert("Bulk delete failed") }
  }

  const performBulkReprocess = async () => {
      if (!confirm(`Re-analyze ${selectedIds.length} candidates with AI? This may take a while.`)) return
      try {
          setProfiles(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, is_parsed: false } : p))
          await Promise.all(selectedIds.map(id => axios.post(`/api/cv/${id}/reprocess`)))
          alert("Reprocessing started! Updates will appear as they finish.")
          setSelectedIds([])
      } catch (e) { alert("Bulk reprocess failed") }
  }

  const handleSidebarDrop = async (e, targetJobId) => {
      e.preventDefault()
      const cvId = e.dataTransfer.getData("cvId")
      if (!cvId) return
      
      const cv = profiles.find(p => p.id == cvId)
      if (cv && cv.applications.some(a => a.job_id === targetJobId)) {
          alert("Candidate already in this pipeline.")
          return
      }

      try {
          await axios.post('/api/applications/', { cv_id: parseInt(cvId), job_id: targetJobId })
          fetchProfiles()
          fetchJobs()
      } catch (e) { alert("Failed to assign candidate") }
  }

  const handleCreateJob = async (jobData, selectedCandidateIds) => {
    try { 
        const res = await axios.post('/api/jobs/', jobData); 
        const newJob = res.data
        if (selectedCandidateIds && selectedCandidateIds.length > 0) {
            await Promise.all(selectedCandidateIds.map(cvId => 
                axios.post('/api/applications/', { cv_id: cvId, job_id: newJob.id })
            ))
        }
        setJobs([...jobs, newJob]); 
        setShowNewJobModal(false);
        setCurrentView("pipeline");
        setSelectedJob(newJob);
        fetchProfiles();
    } catch (err) { alert("Failed to create job pipeline") }
  }
  
  const handleToggleArchive = async (job) => {
      try {
          const res = await axios.patch(`/api/jobs/${job.id}`, { is_active: !job.is_active })
          setJobs(prev => prev.map(j => j.id === job.id ? res.data : j))
      } catch (e) { alert("Failed to update status") }
  }
  
  const handleUpdateJobDetails = async (id, data) => {
      try {
          const res = await axios.patch(`/api/jobs/${id}`, data)
          setJobs(prev => prev.map(j => j.id === id ? res.data : j))
      } catch (e) { alert("Failed to save job details") }
  }

  const performUpload = async (files, jobId) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setShowUploadModal(false)
    let successCount = 0
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}...`)
        const formData = new FormData()
        formData.append('file', file)
        if (jobId) formData.append('job_id', jobId)
        try {
            await axios.post('/api/cv/upload', formData)
            successCount++
        } catch (err) { console.error(`Failed to upload ${file.name}`, err) }
    }
    setUploadProgress("")
    setUploading(false)
    setUploadFiles(null)
    setStatus(`Uploaded ${successCount} files! Parsing in background...`)
    setTimeout(() => setStatus(""), 3000)
    fetchProfiles()
    fetchJobs()
  }

  const handleDeleteCV = async (e, id) => {
    e.stopPropagation(); if (!confirm("Delete candidate?")) return
    try { await axios.delete(`/api/cv/${id}`); setProfiles(prev => prev.filter(p => p.id !== id)); if (selectedCv?.id === id) setSelectedCv(null); fetchJobs() } catch (err) { alert("Failed") }
  }

  const handleReprocess = async (e, id) => {
    e.stopPropagation(); try { await axios.post(`/api/cv/${id}/reprocess`); setProfiles(prev => prev.map(p => p.id === id ? {...p, is_parsed: false} : p)) } catch (err) { alert("Failed") }
  }

  const handleUpdateProfile = async (id, data) => {
    try { setProfiles(prev => prev.map(p => p.id === id ? { ...p, parsed_data: { ...p.parsed_data, ...data } } : p)); await axios.patch(`/api/profiles/${id}`, data) } catch (err) { fetchProfiles() }
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

  const displayedJobs = jobs.filter(j => showArchived ? !j.is_active : j.is_active)
  
  const filteredProfiles = useMemo(() => {
      if (currentView === "dashboard") return []
      return profiles.filter(cv => {
        const term = searchTerm.toLowerCase()
        const d = cv.parsed_data || {}
        const matches = (d.name||"").toLowerCase().includes(term) || (d.last_job_title||"").toLowerCase().includes(term) || safeList(d.skills).join(" ").toLowerCase().includes(term)
        if (!selectedJob) return matches
        return matches && cv.applications?.some(a => a.job_id === selectedJob.id)
      })
  }, [profiles, searchTerm, selectedJob, currentView])

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
            <button onClick={() => { setCurrentView("dashboard"); setSelectedJob(null); }} className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${currentView === "dashboard" ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                <LayoutDashboard size={18}/> Dashboard
            </button>
            
            <div className="mt-6 px-3 flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{showArchived ? "Archived" : "Pipelines"}</span>
                <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full transition">
                    {showArchived ? <><BriefcaseIcon size={10}/> Show Active</> : <><Archive size={10}/> Archived</>}
                </button>
            </div>
            
            <button onClick={() => { setCurrentView("pipeline"); setSelectedJob(null); }} className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${currentView === "pipeline" && !selectedJob ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Layers size={18}/> General Pool
            </button>

            {displayedJobs.map(job => (
                <div 
                    key={job.id} 
                    onClick={() => { setCurrentView("pipeline"); setSelectedJob(job); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleSidebarDrop(e, job.id)} 
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition cursor-pointer border border-transparent ${currentView === "pipeline" && selectedJob?.id === job.id ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}
                >
                    <span className={`truncate flex items-center gap-2 ${!job.is_active ? 'line-through opacity-70' : ''}`}>
                        {!job.is_active && <Lock size={12}/>} {job.title}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedJob?.id === job.id ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{job.candidate_count}</span>
                </div>
            ))}
            
            {!showArchived && <button onClick={() => setShowNewJobModal(true)} className="w-full flex items-center gap-2 p-2.5 text-sm text-slate-500 hover:text-indigo-600 mt-2 hover:bg-indigo-50 rounded-lg transition font-medium"><Plus size={16} /> New Pipeline</button>}
        </div>
        <div className="p-4 border-t border-slate-100">
            <button onClick={() => setShowCompanyModal(true)} className="w-full flex items-center gap-2 p-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"><Settings size={16}/> Settings & Company</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
        
        {currentView === "dashboard" && (
            <Dashboard 
                jobs={jobs} 
                profiles={profiles} 
                onEditJob={handleUpdateJobDetails} 
                onNavigate={(job) => { setCurrentView("pipeline"); setSelectedJob(job); }} 
                onViewProfile={(cv) => setSelectedCv(cv)}
            />
        )}

        {currentView === "pipeline" && (
            <>
                <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            {selectedJob ? selectedJob.title : "General Pool"}
                            {selectedJob && !selectedJob.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">ARCHIVED</span>}
                        </h2>
                        {selectedJob && (
                            <button onClick={() => handleToggleArchive(selectedJob)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${selectedJob.is_active ? "text-red-600 border-red-100 bg-red-50 hover:bg-red-100" : "text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100"}`}>
                                {selectedJob.is_active ? <><Lock size={12}/> Close Position</> : <><Unlock size={12}/> Re-open Position</>}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-4 items-center">
                        {!selectedJob && (viewMode === "list") && (
                            <button onClick={handleSelectAll} className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded transition">
                                {selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? "Deselect All" : "Select All"}
                            </button>
                        )}

                        <div className="relative w-64"><Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" /><input className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        
                        {selectedJob && (
                            <div className="bg-slate-100 p-1 rounded-lg flex">
                                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition ${viewMode === "list" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><LayoutGrid size={18} /></button>
                                <button onClick={() => setViewMode("board")} className={`p-1.5 rounded transition ${viewMode === "board" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><Kanban size={18} /></button>
                            </div>
                        )}
                        
                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition shadow-md active:scale-95">
                            <Upload size={16} /> 
                            <span className="font-bold text-sm">{uploading ? "..." : "Add"}</span>
                            <input type="file" multiple className="hidden" onChange={(e) => {if(e.target.files.length > 0) selectedJob ? performUpload(e.target.files, selectedJob.id) : (setUploadFiles(e.target.files), setShowUploadModal(true))}} disabled={uploading} />
                        </label>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    {(viewMode === "list" || !selectedJob) ? (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-20">
                            {filteredProfiles.map(cv => 
                                <Card 
                                    key={cv.id} 
                                    cv={cv} 
                                    onClick={() => setSelectedCv(cv)} 
                                    onDelete={handleDeleteCV} 
                                    onReprocess={handleReprocess} 
                                    status={selectedJob ? getStatus(cv) : null} 
                                    jobs={jobs}
                                    selectable={!selectedJob}
                                    selected={selectedIds.includes(cv.id)}
                                    onSelect={() => toggleSelect(cv.id)}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="flex gap-6 overflow-x-auto pb-4 h-full">{COLUMNS.map(col => (<div key={col} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, col)} className="min-w-[320px] bg-slate-100 rounded-xl flex flex-col h-full border border-slate-200/60"><div className="p-3 border-b border-slate-200/50 bg-slate-50/50 rounded-t-xl flex justify-between font-bold text-xs text-slate-600 uppercase"><span>{col}</span><span className="bg-white px-2 py-0.5 rounded">{filteredProfiles.filter(p => getStatus(p) === col).length}</span></div><div className="flex-1 overflow-y-auto p-3 space-y-2">{filteredProfiles.filter(p => getStatus(p) === col).map(cv => <div key={cv.id} draggable onDragStart={e => onDragStart(e, cv.id)}><Card cv={cv} onClick={() => setSelectedCv(cv)} onDelete={handleDeleteCV} onReprocess={handleReprocess} compact jobs={jobs} /></div>)}</div></div>))}</div>
                    )}
                </div>

                {selectedIds.length > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-2xl border border-slate-200 rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in z-40">
                        <span className="font-bold text-sm text-slate-800">{selectedIds.length} Selected</span>
                        <div className="h-4 w-px bg-slate-300"></div>
                        <button onClick={() => setShowBulkAssignModal(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Layers size={16}/> Assign to Pipeline</button>
                        <button onClick={performBulkReprocess} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><PlayCircle size={16}/> Reprocess</button>
                        <button onClick={performBulkDelete} className="text-sm font-bold text-red-600 hover:text-red-800 flex items-center gap-1"><Trash2 size={16}/> Delete</button>
                        <button onClick={() => setSelectedIds([])} className="ml-2 p-1 hover:bg-slate-100 rounded-full"><X size={16} className="text-slate-400"/></button>
                    </div>
                )}
            </>
        )}

        {selectedCv && <Drawer cv={selectedCv} onClose={() => setSelectedCv(null)} jobs={jobs} updateApp={handleUpdateApp} updateProfile={handleUpdateProfile} selectedJobId={selectedJob?.id} assignJob={handleAssignJob} removeJob={handleRemoveJob} />}
        
        {showNewJobModal && <CreateJobModal onClose={() => setShowNewJobModal(false)} onCreate={handleCreateJob} />}
        {showCompanyModal && <CompanyProfileModal onClose={() => setShowCompanyModal(false)} />}
        
        {showUploadModal && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full"><h3 className="text-lg font-bold text-slate-900 mb-4">Select Pipeline</h3><div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
            {jobs.filter(j => j.is_active).map(j => <button key={j.id} onClick={() => performUpload(uploadFiles, j.id)} className="w-full flex justify-between items-center p-3 rounded-lg border hover:bg-indigo-50 transition text-left text-sm font-medium text-slate-700">{j.title} <ChevronRight size={14} className="text-slate-400"/></button>)}
            <button onClick={() => performUpload(uploadFiles, null)} className="w-full p-3 rounded-lg border hover:bg-slate-50 transition text-left text-sm text-slate-500">General Pool</button></div><button onClick={() => setShowUploadModal(false)} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button></div></div>}

        {showBulkAssignModal && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full"><h3 className="text-lg font-bold text-slate-900 mb-4">Bulk Assign {selectedIds.length} Candidates</h3><div className="space-y-2 mb-6 max-h-60 overflow-y-auto">{jobs.filter(j => j.is_active).map(j => <button key={j.id} onClick={() => performBulkAssign(j.id)} className="w-full flex justify-between items-center p-3 rounded-lg border hover:bg-indigo-50 transition text-left text-sm font-medium text-slate-700">{j.title} <ChevronRight size={14} className="text-slate-400"/></button>)}</div><button onClick={() => setShowBulkAssignModal(false)} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button></div></div>}
        
        {uploading && (
            <div className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-4">
                <RefreshCw className="animate-spin text-indigo-400"/>
                <div className="text-sm font-bold">{uploadProgress || "Uploading..."}</div>
            </div>
        )}
      </div>
    </div>
  )
}

const CompanyProfileModal = ({ onClose }) => {
    const [data, setData] = useState({ name: "", industry: "", description: "", culture: "" })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('/api/jobs/company').then(res => { setData(res.data); setLoading(false) })
    }, [])

    const save = async () => {
        await axios.post('/api/jobs/company', data)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Building2 className="text-indigo-500"/> Company Profile</h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Name</label><input className="w-full p-2 border rounded-lg text-sm" value={data.name} onChange={e=>setData({...data, name: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Industry</label><input className="w-full p-2 border rounded-lg text-sm" value={data.industry} onChange={e=>setData({...data, industry: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">About (Description)</label><textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.description} onChange={e=>setData({...data, description: e.target.value})} placeholder="What do you do?"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Culture & Values</label><textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.culture} onChange={e=>setData({...data, culture: e.target.value})} placeholder="e.g. Performance driven, remote friendly..."/></div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold">Cancel</button>
                    <button onClick={save} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg">Save Profile</button>
                </div>
            </div>
        </div>
    )
}

const CreateJobModal = ({ onClose, onCreate }) => {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({ title: "", department: "", description: "", required_experience: 0, skills_required: [] })
    const [matches, setMatches] = useState([])
    const [selectedMatches, setSelectedMatches] = useState([])

    const runInitialAnalysis = async () => {
        if (!data.title) return
        setLoading(true)
        try {
            const res = await axios.post('/api/jobs/analyze', { title: data.title })
            setData(prev => ({ ...prev, ...res.data }))
            
            await refreshCandidates({ ...data, ...res.data })
            
            setStep(2)
        } catch (e) { alert("AI Analysis Failed") }
        setLoading(false)
    }

    const refreshCandidates = async (jobData) => {
        setLoading(true)
        try {
            const matchRes = await axios.post('/api/jobs/matches', { 
                required_experience: jobData.required_experience || 0,
                skills_required: jobData.skills_required || []
            })
            setMatches(matchRes.data)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const toggleMatch = (id) => {
        if (selectedMatches.includes(id)) {
            setSelectedMatches(selectedMatches.filter(i => i !== id))
        } else {
            setSelectedMatches([...selectedMatches, id])
        }
    }

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Sparkles className="text-indigo-500"/> New Job Pipeline</h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        {step === 1 && (
                            <div className="animate-in fade-in">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                                <div className="flex gap-2">
                                    <input className="flex-1 text-lg font-bold p-3 border border-slate-200 rounded-xl focus:ring-2 ring-indigo-500 outline-none" placeholder="e.g. Senior Product Designer" value={data.title} onChange={e => setData({...data, title: e.target.value})} autoFocus onKeyDown={e => e.key === 'Enter' && runInitialAnalysis()}/>
                                    <button onClick={runInitialAnalysis} disabled={loading || !data.title} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50">
                                        {loading ? <RefreshCw className="animate-spin"/> : <Sparkles size={18}/>} {loading ? "Analyze" : "Analyze"}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 ml-1">AI will generate a description, required skills, and find matching candidates from your pool.</p>
                            </div>
                        )}

                        {(step === 2) && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                                <div className="flex justify-end">
                                    <button onClick={() => refreshCandidates(data)} disabled={loading} className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded transition">
                                        <RefreshCw size={12} className={loading ? "animate-spin" : ""}/> Refresh Candidates
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                                        <input className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={data.department} onChange={e => setData({...data, department: e.target.value})} placeholder="Engineering" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exp (Years)</label>
                                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={data.required_experience} onChange={e => setData({...data, required_experience: parseInt(e.target.value)})} />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Skills Required</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {safeList(data.skills_required).map((s, i) => (
                                            <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">{s} <button onClick={() => setData({...data, skills_required: data.skills_required.filter((_,idx)=>idx!==i)})}>×</button></span>
                                        ))}
                                    </div>
                                    <input className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="Type & Enter to add skill..." onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const newSkill = e.target.value.trim();
                                            if(newSkill) {
                                                setData({...data, skills_required: [...(data.skills_required||[]), newSkill]});
                                                e.target.value = "";
                                            }
                                        }
                                    }} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Description (LinkedIn Ready)</label>
                                    <textarea className="w-full p-4 border border-slate-200 rounded-xl text-sm leading-relaxed h-40 resize-none focus:ring-2 ring-indigo-500 outline-none" value={data.description} onChange={e => setData({...data, description: e.target.value})} />
                                </div>

                                {matches.length > 0 ? (
                                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                                        <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><Users size={16}/> Smart Candidate Match</span>
                                            <span className="text-xs font-normal text-indigo-600">{selectedMatches.length} selected</span>
                                        </h3>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {matches.map(m => (
                                                <div key={m.id} onClick={() => toggleMatch(m.id)} className={`p-2 rounded-lg border flex justify-between items-center cursor-pointer transition ${selectedMatches.includes(m.id) ? "bg-indigo-100 border-indigo-200" : "bg-white border-slate-100 hover:border-indigo-200"}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`text-indigo-600 ${selectedMatches.includes(m.id) ? "opacity-100" : "opacity-40"}`}>
                                                            {selectedMatches.includes(m.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">{m.name}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-emerald-600">{m.score}% Match</span>
                                                                {m.status === "Silver Medalist" && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Award size={10}/> Silver Medalist</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-slate-400 text-sm italic border border-dashed border-slate-200 rounded-xl">No matching candidates found in your pool.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition">Cancel</button>
                    {step === 2 && <button onClick={() => onCreate(data, selectedMatches)} disabled={!data.title} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2">Create & Assign {selectedMatches.length > 0 && `(${selectedMatches.length})`}</button>}
                </div>
            </div>
        </div>
    )
}

const Dashboard = ({ jobs, profiles, onEditJob, onNavigate, onViewProfile }) => {
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
                <KPICard title="Active Jobs" value={stats.activeJobs} icon={<BriefcaseIcon className="text-white" size={24}/>} color="bg-indigo-500" />
                <KPICard title="Total Candidates" value={stats.totalCandidates} icon={<Users className="text-white" size={24}/>} color="bg-slate-500" />
                <KPICard title="Hired" value={stats.hired} icon={<Check className="text-white" size={24}/>} color="bg-emerald-500" />
                <KPICard title="Silver Medalists" value={stats.silver} icon={<Award className="text-white" size={24}/>} color="bg-purple-500" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={20}/> Pipeline Insights</h2>
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

const KPICard = ({ title, value, icon, color }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
        <div className={`p-3 rounded-xl shadow-md ${color}`}>{icon}</div>
        <div><div className="text-sm font-bold text-slate-400 uppercase">{title}</div><div className="text-2xl font-extrabold text-slate-900">{value}</div></div>
    </div>
)

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
        onEdit(job.id, { description: desc, required_experience: parseInt(reqExp), skills_required: skills.split(",").map(s=>s.trim()).filter(s=>s) })
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
                    {editing ? <Save size={16}/> : <Pencil size={16}/>}
                </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description</label>{editing ? <textarea className="w-full text-sm border rounded p-2" rows="2" value={desc} onChange={e=>setDesc(e.target.value)}/> : <p className="text-sm text-slate-600 line-clamp-2">{job.description || "No description set."}</p>}</div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Req. Experience (Years)</label>{editing ? <input type="number" className="w-full text-sm border rounded p-1" value={reqExp} onChange={e=>setReqExp(e.target.value)}/> : <div className="text-sm font-bold text-slate-800">{job.required_experience || 0} Years</div>}</div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Skills</label>{editing ? <input className="w-full text-sm border rounded p-1" value={skills} onChange={e=>setSkills(e.target.value)}/> : <div className="flex flex-wrap gap-1">{safeList(job.skills_required).map((s,i)=><span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200">{s}</span>)}</div>}</div>
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
                        <ChevronRight size={14} className="text-slate-300"/>
                    </div>
                ))}
                {candidates.length === 0 && <div className="text-xs text-slate-400 italic">No candidates found.</div>}
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

const Card = ({ cv, onClick, onDelete, onReprocess, status, compact, jobs, selectable, selected, onSelect }) => {
  const d = cv.parsed_data || {}
  const skills = safeList(d.skills).slice(0, 3)
  return (
    <div 
        draggable
        onDragStart={(e) => e.dataTransfer.setData("cvId", cv.id)}
        onClick={onClick} 
        className={`bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-indigo-200 transition-all cursor-pointer group relative ${compact ? 'mb-0' : ''} ${selected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-100'}`}
    >
       
       {selectable && (
           <div 
                className={`absolute top-3 left-3 z-20 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}`}
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
           >
               {selected ? <CheckSquare className="text-indigo-600 bg-white rounded" size={20}/> : <Square className="text-slate-300 hover:text-indigo-400 bg-white rounded" size={20}/>}
           </div>
       )}

       <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 backdrop-blur rounded-md p-0.5">
          <button onClick={(e) => onReprocess(e, cv.id)} className="p-1 text-slate-400 hover:text-indigo-600"><RotateCw size={14} /></button>
          <button onClick={(e) => onDelete(e, cv.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
       </div>
       {!cv.is_parsed && <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20"><RefreshCw className="animate-spin text-indigo-500" /></div>}
       <div className={`mb-3 pr-8 ${selectable ? 'pl-6' : ''}`}>
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

  const history = safeList(d.job_history).sort((a, b) => {
     const y = s => { const m = (s||"").match(/(\d{4})/); return m ? parseInt(m[0]) : 0 }
     return y(b.duration) - y(a.duration)
  })
  const education = safeList(d.education)
  const skills = safeList(d.skills)

  const groupedHistory = useMemo(() => {
      const sorted = safeList(d.job_history).sort((a, b) => {
         const getYear = (s) => {
             if(!s) return 0
             const match = s.match(/(\d{4})/)
             return match ? parseInt(match[0]) : 0
         }
         return getYear(b.duration) - getYear(a.duration)
      })
      const groups = []
      sorted.forEach(job => {
          const last = groups[groups.length - 1]
          if (last && last.company === job.company) {
              last.roles.push(job)
          } else {
              groups.push({ company: job.company, roles: [job] })
          }
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
            skills: editData.skills.split(",").map(s=>s.trim()).filter(s=>s),
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
                    <input className="text-2xl font-extrabold text-slate-900 border-b border-slate-300 focus:border-indigo-500 outline-none w-full" value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})}/>
                ) : (
                    <h2 className="text-2xl font-extrabold text-slate-900">{d.name || "Candidate Profile"}</h2>
                )}
                <p className="text-indigo-600 font-medium text-base mt-0.5 flex items-center gap-2">
                    {d.last_job_title || "No Title"} 
                    {d.last_company && <span className="text-slate-400 font-normal">@ {d.last_company}</span>}
                </p>
                <div className="flex gap-4 mt-3 text-sm text-slate-500">
                    {isEditing ? <input className="border rounded p-1 text-xs" value={editData.address} onChange={e=>setEditData({...editData, address: e.target.value})}/> : <div className="flex items-center gap-1.5"><MapPin size={14}/> {d.address || "Remote"}</div>}
                    
                    <div className="flex items-center gap-1.5">
                        <User size={14}/> 
                        {isEditing ? <input type="number" className="w-12 border rounded p-1 text-xs" value={editData.age} onChange={e=>setEditData({...editData, age: e.target.value})}/> : <>{d.age ? `${d.age} yrs` : "N/A"}</>}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                        <Briefcase size={14}/> 
                        {isEditing ? <input type="number" className="w-12 border rounded p-1 text-xs" value={editData.experience_years} onChange={e=>setEditData({...editData, experience_years: e.target.value})}/> : <>{cv.projected_experience || 0}y Exp</>}
                    </div>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                    <button onClick={() => setView("parsed")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "parsed" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Profile</button>
                    <button onClick={() => setView("pdf")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "pdf" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Original CV</button>
                    <button onClick={() => setView("debug")} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${view === "debug" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}><Bug size={16}/></button>
                </div>
                <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-lg border transition ${isEditing ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 hover:text-indigo-600 border-slate-200'}`}>
                    <Pencil size={20}/>
                </button>
                <button onClick={onClose} className="p-2.5 bg-white hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 border border-slate-200 transition"><X size={20}/></button>
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
                    <iframe src={`/api/files/${cv.filename}`} className="w-full h-full rounded-xl border border-slate-200 shadow-sm bg-white min-h-[800px]" title="PDF"></iframe>
                )}

                {view === "parsed" && (
                    <>
                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><User size={14}/> Contact & Personal</h3>
                            {isEditing ? (
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div><label className="text-xs font-bold block mb-1">Email</label><input className="w-full p-2 rounded border" value={editData.email} onChange={e=>setEditData({...editData, email: e.target.value})}/></div>
                                    <div><label className="text-xs font-bold block mb-1">Phone</label><input className="w-full p-2 rounded border" value={editData.phone} onChange={e=>setEditData({...editData, phone: e.target.value})}/></div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    {/* LINK EXTRACTION & SMART ICONS */}
                                    <div className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium">{safeList(d.email)[0] || "No Email"}</div>
                                    <div className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium">{safeList(d.phone)[0] || "No Phone"}</div>
                                    
                                    {safeList(d.social_links).map((link, i) => {
                                        let Icon = ExternalLink
                                        let label = "Link"
                                        let style = "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"

                                        const lower = link.toLowerCase()
                                        if (lower.includes("linkedin.com")) {
                                            Icon = Linkedin
                                            label = "LinkedIn"
                                            style = "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
                                        } else if (lower.includes("github.com")) {
                                            Icon = Github
                                            label = "GitHub"
                                            style = "bg-slate-800 text-white border-slate-900 hover:bg-slate-700"
                                        }

                                        return (
                                            <a key={i} href={link} target="_blank" rel="noreferrer" className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition border ${style}`}>
                                                <Icon size={14}/> {label}
                                            </a>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        {d.summary && (
                            <section>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14}/> Professional Summary</h3>
                                {isEditing ? (
                                    <textarea className="w-full p-4 border rounded-xl text-sm h-32" value={editData.summary} onChange={e=>setEditData({...editData, summary: e.target.value})}/>
                                ) : (
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-700 leading-relaxed text-base">{d.summary}</div>
                                )}
                            </section>
                        )}

                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><BrainCircuit size={14}/> Key Skills</h3>
                            {isEditing ? (
                                <textarea className="w-full p-4 border rounded-xl text-sm" value={editData.skills} onChange={e=>setEditData({...editData, skills: e.target.value})}/>
                            ) : (
                                <div className="flex flex-wrap gap-2">{skills.map((skill, i) => <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-semibold shadow-sm">{skill}</span>)}</div>
                            )}
                        </section>

                        {education.length > 0 && (
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
                                </div>
                            </section>
                        )}

                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase size={14}/> Work History</h3>
                            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                                {groupedHistory.map((group, i) => (
                                    <div key={i} className="relative pl-8">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-500"></div>
                                        <div className="mb-4">
                                            <h4 className="text-lg font-bold text-indigo-900">{group.company}</h4>
                                        </div>
                                        <div className="space-y-6 relative">
                                            {group.roles.map((job, j) => (
                                                <div key={j} className="relative">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <h5 className="font-bold text-slate-800">{job.title}</h5>
                                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{job.duration}</span>
                                                    </div>
                                                    {job.description && <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-100 pl-3">{job.description}</p>}
                                                </div>
                                            ))}
                                        </div>
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

                 {!selectedJobId && cv.applications?.length > 0 && (
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