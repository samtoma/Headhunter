import { useState, useEffect, useCallback } from 'react'
import { X, Search, User, Check, Plus, Upload, Loader2 } from 'lucide-react'
import axios from 'axios'
import { safeList } from '../../utils/helpers'

const AddCandidateModal = ({ isOpen, onClose, job, onAddCandidates, onUpload }) => {
    const [search, setSearch] = useState("")
    const [candidates, setCandidates] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState([])
    const [adding, setAdding] = useState(false)

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (isOpen) {
                fetchCandidates()
            }
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [search, isOpen, fetchCandidates])

    const fetchCandidates = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch profiles. We handle pagination simply for now (limit 50)
            const res = await axios.get('/api/profiles/', {
                params: {
                    search: search || undefined,
                    limit: 50,
                    sort_by: 'newest'
                }
            })

            // Filter out candidates who are already in the current job
            const available = (res.data.items || []).filter(p => {
                const apps = safeList(p.applications)
                return !apps.some(a => a.job_id === job.id)
            })

            setCandidates(available)
        } catch (err) {
            console.error("Failed to fetch candidates", err)
        } finally {
            setLoading(false)
        }
    }, [search, job?.id])

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const handleAdd = async () => {
        if (selectedIds.length === 0) return
        setAdding(true)
        try {
            await onAddCandidates(selectedIds)
            onClose()
            setSelectedIds([])
            setSearch("")
        } catch (err) {
            console.error("Failed to add", err)
        } finally {
            setAdding(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center isolate">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900">Add Candidates to Pipeline</h2>
                        <p className="text-sm text-slate-500 font-medium">Add to <span className="text-indigo-600">{job?.title}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                            placeholder="Search candidates by name, skill, or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                            <Loader2 size={24} className="animate-spin text-indigo-600" />
                            <span className="text-sm font-medium">Searching candidates...</span>
                        </div>
                    ) : candidates.length > 0 ? (
                        <div className="space-y-2">
                            {candidates.map(candidate => {
                                const isSelected = selectedIds.includes(candidate.id)
                                const parsed = candidate.parsed_data || {}
                                return (
                                    <div
                                        key={candidate.id}
                                        onClick={() => toggleSelect(candidate.id)}
                                        className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition group ${isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-indigo-400'}`}>
                                            <Check size={12} strokeWidth={4} />
                                        </div>

                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                                            {(parsed.name || "?").charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-900 truncate">{parsed.name || "Unknown Candidate"}</div>
                                            <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                                                {parsed.last_job_title || "No Title"}
                                                {parsed.last_company && <span className="text-slate-400">@ {parsed.last_company}</span>}
                                            </div>
                                        </div>

                                        {/* Shows skill tags if space permits */}
                                        <div className="hidden sm:flex gap-1 max-w-[30%] overflow-hidden">
                                            {safeList(parsed.skills).slice(0, 2).map((skill, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold whitespace-nowrap">{skill}</span>
                                            ))}
                                            {safeList(parsed.skills).length > 2 && <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] lowercase">+{safeList(parsed.skills).length - 2}</span>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <User size={24} className="opacity-50" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">No matching candidates found</p>
                            <p className="text-xs mt-1">Try a different search or upload a new CV.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex flex-col gap-3">
                    <button
                        onClick={handleAdd}
                        disabled={selectedIds.length === 0 || adding}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        {selectedIds.length > 0 ? `Add ${selectedIds.length} Candidate${selectedIds.length > 1 ? 's' : ''}` : "Select Candidates to Add"}
                    </button>

                    <label
                        className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Upload size={18} /> Upload New CVs
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files.length > 0) {
                                    onUpload(e.target.files)
                                }
                            }}
                        />
                    </label>
                </div>
            </div>
        </div>
    )
}

export default AddCandidateModal
