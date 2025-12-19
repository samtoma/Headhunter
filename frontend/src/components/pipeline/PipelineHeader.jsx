
import { Search, LayoutGrid, Kanban, Upload, Layers, Briefcase, Calendar, GanttChart, Plus } from 'lucide-react'

import PageHeader from '../layout/PageHeader'

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
    const titleContent = (
        <>
            {selectedJob ? selectedJob.title : "General Pool"}
            {selectedJob?.department && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">{selectedJob.department}</span>}
            {selectedJob && !selectedJob.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">ARCHIVED</span>}
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
        </>
    )

    const actionsContent = (
        <>
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

            {/* View Switcher Tabs - Contextual to Job */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "list" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                    title="List View"
                >
                    <LayoutGrid size={16} />
                    <span className="hidden xl:inline">List</span>
                </button>
                {selectedJob && (
                    <button
                        onClick={() => setViewMode("kanban")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "kanban" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                        title="Kanban Board"
                    >
                        <Kanban size={16} />
                        <span className="hidden xl:inline">Board</span>
                    </button>
                )}
                {selectedJob && (
                    <button
                        onClick={() => setViewMode("calendar")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "calendar" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                        title="Calendar"
                    >
                        <Calendar size={16} />
                        <span className="hidden xl:inline">Calendar</span>
                    </button>
                )}
                <button
                    onClick={() => setViewMode("timeline")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === "timeline" ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                    title="Timeline"
                >
                    <GanttChart size={16} />
                    <span className="hidden xl:inline">Timeline</span>
                </button>
            </div>

            {selectedJob ? (
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition shadow-md active:scale-95"
                >
                    <Plus size={16} />
                    <span className="font-bold text-sm hidden sm:inline">Add Candidate</span>
                </button>
            ) : (
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition shadow-md active:scale-95">
                    <Upload size={16} />
                    <span className="font-bold text-sm hidden sm:inline">{uploading ? "..." : "Upload CV"}</span>
                    <input type="file" multiple className="hidden" onChange={(e) => {
                        if (e.target.files.length > 0) {
                            setUploadFiles(e.target.files)
                            setShowUploadModal(true)
                        }
                    }} disabled={uploading} />
                </label>
            )}
        </>
    )

    return (
        <PageHeader
            title={titleContent}
            subtitle={selectedJob ? "Manage candidates and track progress for this role" : "View all candidates across all jobs"}
            icon={selectedJob ? Briefcase : Layers}
            onOpenMobileSidebar={onOpenMobileSidebar}
            actions={actionsContent}
        />
    )
}

export default PipelineHeader
