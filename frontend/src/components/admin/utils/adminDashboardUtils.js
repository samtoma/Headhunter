// Helper function to identify AI/LLM endpoints
export const isAiEndpoint = (path) => {
    return (
        path.includes('/company/regenerate') ||
        path.includes('/departments/generate') ||
        path.includes('/jobs/analyze') ||
        path.includes('/interviews/') && (path.includes('generate-feedback') || path.includes('stream-feedback'))
    )
}

// Format date for display
export const formatDate = (dateString) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleString()
}

// Get color class for log levels
export const getLevelColor = (level) => {
    const colors = {
        DEBUG: "bg-slate-100 text-slate-700",
        INFO: "bg-blue-100 text-blue-700",
        WARNING: "bg-yellow-100 text-yellow-700",
        ERROR: "bg-red-100 text-red-700",
        CRITICAL: "bg-purple-100 text-purple-700"
    }
    return colors[level] || "bg-slate-100 text-slate-700"
}

// Get color class for invitation status
export const getStatusColor = (status) => {
    const colors = {
        pending: "bg-yellow-100 text-yellow-700",
        sent: "bg-blue-100 text-blue-700",
        accepted: "bg-green-100 text-green-700",
        expired: "bg-red-100 text-red-700",
        cancelled: "bg-slate-100 text-slate-500"
    }
    return colors[status] || "bg-slate-100 text-slate-500"
}

// Get color class for health status
export const getHealthColor = (status) => {
    switch (status) {
        case 'healthy': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
        case 'degraded': return 'bg-amber-100 text-amber-700 border-amber-200'
        case 'unhealthy': return 'bg-red-100 text-red-700 border-red-200'
        default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
}

// Get status value for health history charts (2=healthy, 1=degraded, 0=unhealthy)
export const getStatusValue = (status) => {
    switch (status) {
        case 'healthy': return 2
        case 'degraded': return 1
        case 'unhealthy': return 0
        default: return 0
    }
}

// Get color for service status in charts
export const getServiceStatusColor = (serviceName) => {
    const colors = {
        'Database': '#3b82f6',
        'Redis': '#ef4444',
        'Celery': '#10b981',
        'ChromaDB': '#8b5cf6'
    }
    return colors[serviceName] || '#6b7280'
}
