import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const UploadContext = createContext()

// eslint-disable-next-line react-refresh/only-export-components
export const useUpload = () => useContext(UploadContext)

export const UploadProvider = ({ children }) => {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState("") // "uploading", "processing", "complete", "error"
    const [fileCount, setFileCount] = useState(0)
    const [error, setError] = useState(null)

    const uploadFiles = useCallback(async (files, jobId = null, onSuccess = () => { }) => {
        if (!files || files.length === 0) return

        setUploading(true)
        setStatus("uploading")
        setFileCount(files.length)
        setProgress(0)
        setError(null)

        const formData = new FormData()
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i])
        }
        if (jobId) formData.append('job_id', jobId)

        try {
            // Warn user before closing tab
            window.onbeforeunload = () => "Upload in progress. Are you sure you want to leave?"

            await axios.post('/api/cv/upload_bulk', formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    setProgress(percentCompleted)
                    if (percentCompleted === 100) {
                        setStatus("processing")
                    }
                }
            })

            setStatus("complete")
            onSuccess()

            // Auto-hide after 3 seconds
            setTimeout(() => {
                setUploading(false)
                setStatus("")
                setFileCount(0)
            }, 3000)

        } catch (err) {
            console.error("Upload failed", err)
            setStatus("error")
            setError("Failed to upload files. Please try again.")
        } finally {
            window.onbeforeunload = null
        }
    }, [])

    const closeWidget = () => {
        if (status === "uploading" || status === "processing") {
            if (!confirm("Upload in progress. Cancel?")) return
        }
        setUploading(false)
        setStatus("")
        setFileCount(0)
        setError(null)
    }

    return (
        <UploadContext.Provider value={{
            uploading,
            progress,
            status,
            fileCount,
            error,
            uploadFiles,
            closeWidget
        }}>
            {children}
        </UploadContext.Provider>
    )
}
