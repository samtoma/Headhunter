import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Upload, FileText, RefreshCw, CheckCircle, BrainCircuit, 
  Search, Briefcase, GraduationCap, Linkedin, Github, ExternalLink, X, 
  Mail, Phone, File, Trash2, RotateCw, Building2, MapPin, User, Flag, Heart
} from 'lucide-react'

function App() {
  const [profiles, setProfiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCv, setSelectedCv] = useState(null)

  const fetchProfiles = async () => {
    try {
      const res = await axios.get('/api/profiles/')
      setProfiles(res.data)
    } catch (err) { console.error(err) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    setStatus("Uploading...")
    try {
      await axios.post('/api/cv/upload', formData)
      fetchProfiles()
      setStatus("Processing...")
      setTimeout(() => { setStatus("Done!"); setTimeout(() => setStatus(""), 2000) }, 2000) 
    } catch (err) { alert("Upload failed"); setStatus("Error") } finally { setUploading(false) }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Delete this CV?")) return
    try {
      await axios.delete(`/api/cv/${id}`)
      setProfiles(prev => prev.filter(cv => cv.id !== id))
      if (selectedCv?.id === id) setSelectedCv(null)
    } catch (err) { alert("Delete failed") }
  }

  const handleReprocess = async (e, id) => {
    e.stopPropagation()
    try { await axios.post(`/api/cv/${id}/reprocess`); fetchProfiles() } catch (err) { alert("Reprocess failed") }
  }

  useEffect(() => { fetchProfiles(); const i = setInterval(fetchProfiles, 5000); return () => clearInterval(i) }, [])

  const filteredProfiles = profiles.filter(cv => {
    const term = searchTerm.toLowerCase()
    const name = (cv.parsed_data?.name || "").toLowerCase()
    const job = (cv.parsed_data?.last_job_title || "").toLowerCase()
    const skills = (cv.parsed_data?.skills || []).join(" ").toLowerCase()
    return name.includes(term) || job.includes(term) || skills.includes(term)
  })

  const renderContact = (data, icon) => {
    if (!data || data.length === 0) return null
    const list = Array.isArray(data) ? data : [data]
    return list.map((item, i) => (
      <div key={i} className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {i === 0 && icon} <span className={i > 0 ? "ml-6" : ""}>{item}</span>
      </div>
    ))
  }

  // --- 🧠 NEW: Smart Sorting Helper ---
  const getSortedHistory = (history) => {
    if (!history || !Array.isArray(history)) return []
    
    return [...history].sort((a, b) => {
      const getYear = (str) => {
        if (!str) return 0
        const s = str.toString().toLowerCase()
        // "Present" is always the newest
        if (s.includes('present') || s.includes('current') || s.includes('now')) return 9999
        // Extract the first 4-digit number (Year)
        const match = s.match(/(\d{4})/)
        return match ? parseInt(match[0]) : 0
      }
      
      const dateA = getYear(a.duration || a.year_range || a.start_date || "")
      const dateB = getYear(b.duration || b.year_range || b.start_date || "")
      
      // Sort Descending (Newest First)
      return dateB - dateA
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-600 flex items-center gap-3"><BrainCircuit className="w-10 h-10" /> Headhunter AI</h1>
            <p className="text-sm text-slate-500 mt-1 ml-1 font-medium">v4.1 • Timeline Sorted</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
                {status && <span className="text-xs font-bold text-indigo-600 animate-pulse">{status}</span>}
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95">
                <Upload size={18} /> <span className="font-semibold">{uploading ? "Busy..." : "Add CV"}</span>
                <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.docx" disabled={uploading} />
                </label>
            </div>
          </div>
        </header>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((cv) => (
            <div key={cv.id} onClick={() => setSelectedCv(cv)} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={(e) => handleReprocess(e, cv.id)} className="p-1.5 bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">{cv.is_parsed ? <RotateCw size={16} /> : <RefreshCw size={16} className="animate-spin text-amber-500" />}</button>
                <button onClick={(e) => handleDelete(e, cv.id)} className="p-1.5 bg-slate-100 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
              </div>
              <div className="mb-4 pr-16">
                <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{cv.parsed_data?.name || "Processing..."}</h2>
                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-600"><Briefcase size={14} /><span className="truncate">{cv.parsed_data?.last_job_title || "Role Unknown"}</span></div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Building2 size={14} /><span className="truncate">{cv.parsed_data?.last_company || "Company Unknown"}</span></div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg">
                <div className="flex-1">
                  <span className="block text-xs text-slate-400 uppercase tracking-wider font-bold">Experience</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-slate-800">{cv.projected_experience || 0} Years</span>
                    {cv.years_since_upload > 1 && <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-md">(+{Math.floor(cv.years_since_upload)}y)</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {cv.parsed_data?.social_links?.some(l => l.includes('linkedin')) && <Linkedin size={18} className="text-[#0077b5]" />}
                  {cv.parsed_data?.social_links?.some(l => l.includes('github')) && <Github size={18} className="text-slate-800" />}
                </div>
              </div>
              <div className="space-y-2"><div className="flex flex-wrap gap-2 h-20 content-start overflow-hidden relative">{cv.parsed_data?.skills?.slice(0, 8).map((skill, i) => (<span key={i} className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md text-[11px] font-medium">{skill}</span>))}<div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white to-transparent"></div></div></div>
            </div>
          ))}
        </div>

        {selectedCv && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedCv(null)}>
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-start z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedCv.parsed_data?.name}</h2>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm">
                        <span className="text-indigo-600 font-medium flex items-center gap-1"><Briefcase size={16} /> {selectedCv.parsed_data?.last_job_title}</span>
                        {selectedCv.parsed_data?.address && <span className="text-slate-500 flex items-center gap-1"><MapPin size={16} /> {selectedCv.parsed_data.address}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`/api/files/${selectedCv.filename}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-lg font-medium transition-colors"><File size={18} /> View PDF</a>
                  <button onClick={() => setSelectedCv(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
              </div>
              
              <div className="p-8 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-8">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Briefcase className="text-indigo-500" /> Work History</h3>
                        <div className="space-y-6 border-l-2 border-slate-100 pl-4 ml-2 relative">
                            {/* 🌟 USING THE SORT HELPER HERE 🌟 */}
                            {getSortedHistory(selectedCv.parsed_data?.job_history).length > 0 ? (
                                getSortedHistory(selectedCv.parsed_data.job_history).map((job, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[21px] top-1.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white ring-2 ring-indigo-100"></div>
                                    <div className="font-bold text-slate-800 text-base">{job.title}</div>
                                    <div className="text-sm text-indigo-600 font-medium">{job.company}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{job.duration || job.year_range || job.start_date}</div>
                                </div>
                            ))) : <p className="text-slate-400 italic">No history found.</p>}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><GraduationCap className="text-indigo-500" /> Education</h3>
                        <div className="space-y-3">
                            {selectedCv.parsed_data?.education?.length > 0 ? (selectedCv.parsed_data.education.map((edu, i) => (
                                <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="font-bold text-slate-800">{edu.school}</div>
                                    <div className="text-sm text-slate-600">{edu.degree} {edu.year ? `(${edu.year})` : ""}</div>
                                </div>
                            ))) : <p className="text-slate-400 italic">No education found.</p>}
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-80 space-y-6">
                    <div className="bg-slate-50 p-5 rounded-xl space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personal Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500 flex gap-2"><User size={16}/> Age</span>
                                <span className="font-medium text-slate-800">{selectedCv.parsed_data?.age || "N/A"}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500 flex gap-2"><Heart size={16}/> Status</span>
                                <span className="font-medium text-slate-800">{selectedCv.parsed_data?.marital_status || "N/A"}</span>
                            </div>
                            <div className="flex justify-between pb-2">
                                <span className="text-slate-500 flex gap-2"><Flag size={16}/> Military</span>
                                <span className="font-medium text-slate-800">{selectedCv.parsed_data?.military_status || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</h3>
                        <div className="space-y-2">
                            {renderContact(selectedCv.parsed_data?.email, <Mail size={14} className="text-slate-400" />)}
                            {renderContact(selectedCv.parsed_data?.phone, <Phone size={14} className="text-slate-400" />)}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {selectedCv.parsed_data?.skills?.map((skill, i) => (
                                <span key={i} className="bg-white border border-slate-200 px-2 py-1 rounded-md text-xs font-medium text-slate-700">{skill}</span>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App