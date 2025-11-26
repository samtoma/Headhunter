import { useState, useMemo } from 'react'
import axios from 'axios'
import { RefreshCw } from 'lucide-react'
import { useHeadhunterData } from './hooks/useHeadhunterData'
import { safeList } from './utils/helpers'

// Components
import Sidebar from './components/layout/Sidebar'
import DashboardView from './components/dashboard/DashboardView'
import PipelineHeader from './components/pipeline/PipelineHeader'
import CandidateCard from './components/pipeline/CandidateCard'
import CandidateDrawer from './components/pipeline/CandidateDrawer'
import BulkActionBar from './components/pipeline/BulkActionBar'
import CreateJobModal from './components/modals/CreateJobModal'
import CompanyProfileModal from './components/modals/CompanyProfileModal'
import UploadModal from './components/modals/UploadModal'
import BulkAssignModal from './components/modals/BulkAssignModal'

function App() {
    const { jobs, setJobs, profiles, setProfiles, fetchJobs, fetchProfiles } = useHeadhunterData()

    // UI State
    const [currentView, setCurrentView] = useState("dashboard")
    const [selectedJob, setSelectedJob] = useState(null)
    const [selectedCv, setSelectedCv] = useState(null)
    const [viewMode, setViewMode] = useState("list")
    const [showArchived, setShowArchived] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Modal State
    const [showNewJobModal, setShowNewJobModal] = useState(false)
    const [showCompanyModal, setShowCompanyModal] = useState(false)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)

    // Upload State
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState("")
    const [uploadFiles, setUploadFiles] = useState(null)

    // Selection State
    const [selectedIds, setSelectedIds] = useState([])

    // --- Computed Data ---
    const displayedJobs = jobs.filter(j => showArchived ? !j.is_active : j.is_active)

    const filteredProfiles = useMemo(() => {
        if (currentView === "dashboard") return []
        return profiles.filter(cv => {
            const term = searchTerm.toLowerCase()
            const d = cv.parsed_data || {}
            const matches = (d.name || "").toLowerCase().includes(term) || (d.last_job_title || "").toLowerCase().includes(term) || safeList(d.skills).join(" ").toLowerCase().includes(term)
            if (!selectedJob) return matches
            return matches && cv.applications?.some(a => a.job_id === selectedJob.id)
        })
    }, [profiles, searchTerm, selectedJob, currentView])

    // --- Actions ---

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
        fetchProfiles()
        fetchJobs()
    }

    const handleDeleteCV = async (e, id) => {
        e.stopPropagation(); if (!confirm("Delete candidate?")) return
        try { await axios.delete(`/api/cv/${id}`); setProfiles(prev => prev.filter(p => p.id !== id)); if (selectedCv?.id === id) setSelectedCv(null); fetchJobs() } catch (err) { alert("Failed") }
    }

    const handleReprocess = async (e, id) => {
        e.stopPropagation(); try { await axios.post(`/api/cv/${id}/reprocess`); setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_parsed: false } : p)) } catch (err) { alert("Failed") }
    }

    const handleUpdateProfile = async (id, data) => {
        try { setProfiles(prev => prev.map(p => p.id === id ? { ...p, parsed_data: { ...p.parsed_data, ...data } } : p)); await axios.patch(`/api/profiles/${id}`, data) } catch (err) { fetchProfiles() }
    }

    const handleUpdateApp = async (appId, data) => {
        try { await axios.patch(`/api/applications/${appId}`, data); fetchProfiles() } catch (e) { console.error(e) }
    }

    const handleAssignJob = async (cvId, jobId) => {
        try { await axios.post('/api/applications/', { cv_id: cvId, job_id: jobId }); fetchProfiles(); fetchJobs() } catch (e) { alert("Failed") }
    }

    const handleRemoveJob = async (cvId, jobId) => {
        if (!confirm("Remove from pipeline?")) return
        const cv = profiles.find(p => p.id === cvId)
        const app = cv.applications.find(a => a.job_id === jobId)
        if (app) { await axios.delete(`/api/applications/${app.id}`); fetchProfiles(); fetchJobs(); setSelectedCv(null) }
    }

    // Kanban Logic
    const getStatus = (cv) => { if (!selectedJob) return "New"; const app = cv.applications?.find(a => a.job_id === selectedJob.id); return app ? app.status : "New" }
    const COLUMNS = ["New", "Screening", "Interview", "Offer", "Hired", "Silver Medalist", "Rejected"]
    const onDragStart = (e, id) => e.dataTransfer.setData("cvId", id)
    const onDrop = async (e, newStatus) => { const id = parseInt(e.dataTransfer.getData("cvId")); const cv = profiles.find(p => p.id === id); const app = cv?.applications.find(a => a.job_id === selectedJob.id); if (app) { setProfiles(prev => prev.map(p => { if (p.id !== id) return p; const newApps = p.applications.map(a => a.id === app.id ? { ...a, status: newStatus } : a); return { ...p, applications: newApps } })); await axios.patch(`/api/applications/${app.id}`, { status: newStatus }) } }

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                setSelectedJob={setSelectedJob}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                displayedJobs={displayedJobs}
                selectedJob={selectedJob}
                handleSidebarDrop={handleSidebarDrop}
                setShowNewJobModal={setShowNewJobModal}
                setShowCompanyModal={setShowCompanyModal}
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">

                {currentView === "dashboard" && (
                    <DashboardView
                        jobs={jobs}
                        profiles={profiles}
                        onEditJob={handleUpdateJobDetails}
                        onNavigate={(job) => { setCurrentView("pipeline"); setSelectedJob(job); }}
                        onViewProfile={(cv) => setSelectedCv(cv)}
                    />
                )}

                {currentView === "pipeline" && (
                    <>
                        <PipelineHeader
                            selectedJob={selectedJob}
                            handleToggleArchive={handleToggleArchive}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            handleSelectAll={handleSelectAll}
                            selectedIds={selectedIds}
                            filteredProfiles={filteredProfiles}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            uploading={uploading}
                            performUpload={performUpload}
                            setUploadFiles={setUploadFiles}
                            setShowUploadModal={setShowUploadModal}
                        />

                        <div className="flex-1 overflow-y-auto p-8">
                            {(viewMode === "list" || !selectedJob) ? (
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 pb-20">
                                    {filteredProfiles.map(cv =>
                                        <CandidateCard
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
                                <div className="flex gap-6 overflow-x-auto pb-4 h-full">{COLUMNS.map(col => (<div key={col} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, col)} className="min-w-[320px] bg-slate-100 rounded-xl flex flex-col h-full border border-slate-200/60"><div className="p-3 border-b border-slate-200/50 bg-slate-50/50 rounded-t-xl flex justify-between font-bold text-xs text-slate-600 uppercase"><span>{col}</span><span className="bg-white px-2 py-0.5 rounded">{filteredProfiles.filter(p => getStatus(p) === col).length}</span></div><div className="flex-1 overflow-y-auto p-3 space-y-2">{filteredProfiles.filter(p => getStatus(p) === col).map(cv => <div key={cv.id} draggable onDragStart={e => onDragStart(e, cv.id)}><CandidateCard cv={cv} onClick={() => setSelectedCv(cv)} onDelete={handleDeleteCV} onReprocess={handleReprocess} compact jobs={jobs} /></div>)}</div></div>))}</div>
                            )}
                        </div>

                        <BulkActionBar
                            selectedIds={selectedIds}
                            setShowBulkAssignModal={setShowBulkAssignModal}
                            performBulkReprocess={performBulkReprocess}
                            performBulkDelete={performBulkDelete}
                            clearSelection={() => setSelectedIds([])}
                        />
                    </>
                )}

                {selectedCv && (
                    <CandidateDrawer
                        cv={selectedCv}
                        onClose={() => setSelectedCv(null)}
                        jobs={jobs}
                        updateApp={handleUpdateApp}
                        updateProfile={handleUpdateProfile}
                        selectedJobId={selectedJob?.id}
                        assignJob={handleAssignJob}
                        removeJob={handleRemoveJob}
                    />
                )}

                {showNewJobModal && <CreateJobModal onClose={() => setShowNewJobModal(false)} onCreate={handleCreateJob} />}
                {showCompanyModal && <CompanyProfileModal onClose={() => setShowCompanyModal(false)} />}
                {showUploadModal && <UploadModal jobs={jobs} uploadFiles={uploadFiles} performUpload={performUpload} onClose={() => setShowUploadModal(false)} />}
                {showBulkAssignModal && <BulkAssignModal jobs={jobs} selectedCount={selectedIds.length} performBulkAssign={performBulkAssign} onClose={() => setShowBulkAssignModal(false)} />}

                {uploading && (
                    <div className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-4">
                        <RefreshCw className="animate-spin text-indigo-400" />
                        <div className="text-sm font-bold">{uploadProgress || "Uploading..."}</div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App