import { useUpload } from '../../context/UploadContext'
import { Loader2, CheckCircle, XCircle, FileText, X } from 'lucide-react'

const UploadProgressWidget = () => {
    const { uploading, progress, status, fileCount, error, closeWidget } = useUpload()

    if (!uploading) return null

    return (
        <div className="fixed bottom-6 right-6 z-[100] w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm font-bold">
                    {status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                    {status === "processing" && <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />}
                    {status === "complete" && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {status === "error" && <XCircle className="w-4 h-4 text-red-400" />}

                    {status === "uploading" && "Uploading Files..."}
                    {status === "processing" && "Processing..."}
                    {status === "complete" && "Upload Complete"}
                    {status === "error" && "Upload Failed"}
                </div>
                <button onClick={closeWidget} className="text-slate-400 hover:text-white transition">
                    <X size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <FileText size={20} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-700">{fileCount} Files</div>
                        <div className="text-xs text-slate-500">
                            {status === "uploading" && `${progress}% uploaded`}
                            {status === "processing" && "Parsing CVs..."}
                            {status === "complete" && "All files processed"}
                            {status === "error" && "Error occurred"}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {(status === "uploading" || status === "processing") && (
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${status === "processing" ? "bg-yellow-500 w-full animate-pulse" : "bg-indigo-600"}`}
                            style={{ width: status === "processing" ? "100%" : `${progress}%` }}
                        />
                    </div>
                )}

                {/* Warning Message */}
                {(status === "uploading" || status === "processing") && (
                    <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Do not close this tab
                    </div>
                )}

                {error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 mt-2">
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}

export default UploadProgressWidget
