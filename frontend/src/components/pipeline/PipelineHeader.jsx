
import { Search, LayoutGrid, Kanban, Upload } from 'lucide-react'

const PipelineHeader = ({
    selectedJob,
    handleToggleArchive,
    viewMode,
    setViewMode,
    handleSelectAll,
    selectedIds,
    filteredProfiles,
    searchTerm,
    setSearchTerm,
    uploading,
    performUpload,
    setUploadFiles,
    setShowUploadModal,
    sortBy,
    setSortBy,
    onOpenMobileSidebar,
    selectedDepartment,
    setSelectedDepartment,
    departments,
    onEditJob,
    user
}) => {
    return (
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 shrink-0 z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4">
                {/* Title Section */}
                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <button
                        onClick={onOpenMobileSidebar}
                        className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                        {selectedJob ? selectedJob.title : "General Pool"}
                        {selectedJob?.department && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">{selectedJob.department}</span>}
                        {selectedJob && !selectedJob.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">ARCHIVED</span>}
                    </h2>
                    {selectedJob && (
                        <div className="flex items-center gap-2">
                            <select
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition outline-none appearance-none cursor-pointer ${selectedJob.status === 'Open' ? "text-emerald-700 border-emerald-200 bg-emerald-50" :
                                    selectedJob.status === 'On Hold' ? "text-amber-700 border-amber-200 bg-amber-50" :
                                        "text-slate-600 border-slate-200 bg-slate-50"
                                    }`}
                                value={selectedJob.status || (selectedJob.is_active ? 'Open' : 'Closed')}
                                onChange={(e) => handleToggleArchive(selectedJob, e.target.value)}
                            >
                                <option value="Open">● Open</option>
                                <option value="On Hold">● On Hold</option>
                                <option value="Closed">● Closed</option>
                            </select>
                            {user && (user.role === 'admin' || user.role === 'recruiter') && (
                                <button onClick={onEditJob} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition">
                                    Edit
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Controls Section */}
                <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                    {!selectedJob && (viewMode === "list") && (
                        <button onClick={handleSelectAll} className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded transition">
                            {selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? "Deselect All" : "Select All"}
                        </button>
                    )}

                    <div className="relative flex-1 md:flex-initial md:w-48 lg:w-64"><Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" /><input className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>

                    <select
                        className="pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="experience">Experience (High-Low)</option>
                        {selectedJob && <option value="score">Match Score</option>}
                        <option value="name">Name (A-Z)</option>
                    </select>

                    {!selectedJob && departments && departments.length > 1 && (
                        <select
                            className="pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}

                    {selectedJob && (
                        <div className="bg-slate-100 p-1 rounded-lg flex">
                            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition ${viewMode === "list" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><LayoutGrid size={18} /></button>
                            <button onClick={() => setViewMode("board")} className={`p-1.5 rounded transition ${viewMode === "board" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><Kanban size={18} /></button>
                        </div>
                    )}

                    <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition shadow-md active:scale-95">
                        <Upload size={16} />
                        <span className="font-bold text-sm hidden sm:inline">{uploading ? "..." : "Add"}</span>
                        <input type="file" multiple className="hidden" onChange={(e) => {
                            if (e.target.files.length > 0) {
                                if (selectedJob) {
                                    performUpload(e.target.files, selectedJob.id)
                                } else {
                                    setUploadFiles(e.target.files)
                                    setShowUploadModal(true)
                                }
                            }
                        }} disabled={uploading} />
                    </label>
                </div>
            </div>
        </header>
    )
}

export default PipelineHeader
