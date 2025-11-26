import React from 'react'
import { ChevronRight } from 'lucide-react'

const UploadModal = ({ jobs, uploadFiles, performUpload, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Select Pipeline</h3>
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                    {jobs.filter(j => j.is_active).map(j => (
                        <button key={j.id} onClick={() => performUpload(uploadFiles, j.id)} className="w-full flex justify-between items-center p-3 rounded-lg border hover:bg-indigo-50 transition text-left text-sm font-medium text-slate-700">
                            {j.title} <ChevronRight size={14} className="text-slate-400" />
                        </button>
                    ))}
                    <button onClick={() => performUpload(uploadFiles, null)} className="w-full p-3 rounded-lg border hover:bg-slate-50 transition text-left text-sm text-slate-500">
                        General Pool
                    </button>
                </div>
                <button onClick={onClose} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
        </div>
    )
}

export default UploadModal
