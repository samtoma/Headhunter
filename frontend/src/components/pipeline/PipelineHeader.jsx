
import { Search, LayoutGrid, Kanban, Upload, Lock, Unlock } from 'lucide-react'

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
    setSortBy
}) => {
    return (
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 z-10">
            <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {selectedJob ? selectedJob.title : "General Pool"}
                    {selectedJob && !selectedJob.is_active && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">ARCHIVED</span>}
                </h2>
                {selectedJob && (
                    <button onClick={() => handleToggleArchive(selectedJob)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${selectedJob.is_active ? "text-red-600 border-red-100 bg-red-50 hover:bg-red-100" : "text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100"}`}>
                        {selectedJob.is_active ? <><Lock size={12} /> Close Position</> : <><Unlock size={12} /> Re-open Position</>}
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

                {selectedJob && (
                    <div className="bg-slate-100 p-1 rounded-lg flex">
                        <button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition ${viewMode === "list" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><LayoutGrid size={18} /></button>
                        <button onClick={() => setViewMode("board")} className={`p-1.5 rounded transition ${viewMode === "board" ? "bg-white shadow text-indigo-600" : "text-slate-400"}`}><Kanban size={18} /></button>
                    </div>
                )}

                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition shadow-md active:scale-95">
                    <Upload size={16} />
                    <span className="font-bold text-sm">{uploading ? "..." : "Add"}</span>
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
        </header>
    )
}

export default PipelineHeader
