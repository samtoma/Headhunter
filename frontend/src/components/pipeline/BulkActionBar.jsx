
import { Layers, PlayCircle, Trash2, X } from 'lucide-react'

const BulkActionBar = ({ selectedIds, setShowBulkAssignModal, performBulkReprocess, performBulkDelete, clearSelection }) => {
    if (selectedIds.length === 0) return null

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-2xl border border-slate-200 rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in z-40">
            <span className="font-bold text-sm text-slate-800">{selectedIds.length} Selected</span>
            <div className="h-4 w-px bg-slate-300"></div>
            <button onClick={() => setShowBulkAssignModal(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Layers size={16} /> Assign to Pipeline</button>
            <button onClick={performBulkReprocess} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><PlayCircle size={16} /> Reprocess</button>
            <button onClick={performBulkDelete} className="text-sm font-bold text-red-600 hover:text-red-800 flex items-center gap-1"><Trash2 size={16} /> Delete</button>
            <button onClick={clearSelection} className="ml-2 p-1 hover:bg-slate-100 rounded-full"><X size={16} className="text-slate-400" /></button>
        </div>
    )
}

export default BulkActionBar
