
import { BrainCircuit, LayoutDashboard, Briefcase as BriefcaseIcon, Archive, Layers, Lock, Plus, Settings } from 'lucide-react'

const Sidebar = ({
    currentView,
    setCurrentView,
    setSelectedJob,
    showArchived,
    setShowArchived,
    displayedJobs,
    selectedJob,
    handleSidebarDrop,
    setShowNewJobModal,
    setShowCompanyModal
}) => {
    return (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
            <div className="p-6 border-b border-slate-100"><h1 className="text-xl font-extrabold text-indigo-600 flex items-center gap-2"><BrainCircuit className="w-7 h-7" /> Headhunter</h1></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <button onClick={() => {
                    setCurrentView("dashboard")
                    setSelectedJob(null)
                }} className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${currentView === "dashboard" ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <LayoutDashboard size={18} /> Dashboard
                </button>

                <div className="mt-6 px-3 flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{showArchived ? "Archived" : "Pipelines"}</span>
                    <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full transition">
                        {showArchived ? <><BriefcaseIcon size={10} /> Show Active</> : <><Archive size={10} /> Archived</>}
                    </button>
                </div>

                <button onClick={() => {
                    setCurrentView("pipeline")
                    setSelectedJob(null)
                }} className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${currentView === "pipeline" && !selectedJob ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Layers size={18} /> General Pool
                </button>

                {/* SIDEBAR JOB LIST - DROP TARGETS */}
                {displayedJobs.map(job => (
                    <div
                        key={job.id}
                        onClick={() => {
                            setCurrentView("pipeline")
                            setSelectedJob(job)
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleSidebarDrop(e, job.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm font-medium transition cursor-pointer border border-transparent ${currentView === "pipeline" && selectedJob?.id === job.id ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}
                    >
                        <span className={`truncate flex items-center gap-2 ${!job.is_active ? 'line-through opacity-70' : ''}`}>
                            {!job.is_active && <Lock size={12} />} {job.title}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedJob?.id === job.id ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{job.candidate_count}</span>
                    </div>
                ))}

                {!showArchived && <button onClick={() => setShowNewJobModal(true)} className="w-full flex items-center gap-2 p-2.5 text-sm text-slate-500 hover:text-indigo-600 mt-2 hover:bg-indigo-50 rounded-lg transition font-medium"><Plus size={16} /> New Pipeline</button>}
            </div>
            <div className="p-4 border-t border-slate-100">
                <button onClick={() => setShowCompanyModal(true)} className="w-full flex items-center gap-2 p-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"><Settings size={16} /> Settings & Company</button>
            </div>
        </div>
    )
}

export default Sidebar
