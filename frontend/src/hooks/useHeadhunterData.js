import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

// Add Auth Interceptor
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token')
            window.location.reload()
        }
        return Promise.reject(error)
    }
)

export const useHeadhunterData = () => {
    const [jobs, setJobs] = useState([])
    const [profiles, setProfiles] = useState([])
    const [loading, setLoading] = useState(true)

    // Pagination State
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [total, setTotal] = useState(0)
    const [isFetchingMore, setIsFetchingMore] = useState(false)

    // Filters
    const [search, setSearch] = useState("")
    const [sortBy, setSortBy] = useState("newest")
    const [selectedJobId, setSelectedJobId] = useState(null)

    // Polling State
    const processingIdsRef = useRef(new Set())

    const fetchJobs = useCallback(async () => {
        if (!localStorage.getItem('token')) return
        try {
            const res = await axios.get('/api/jobs/')
            setJobs(res.data)
        } catch (err) {
            console.error(err)
        }
    }, [])

    // Reset list when filters change
    const resetList = useCallback(() => {
        setPage(1)
        setProfiles([])
        setHasMore(true)
        setLoading(true)
    }, [])

    const fetchProfiles = useCallback(async (pageNum = 1, append = false) => {
        if (!localStorage.getItem('token')) return

        try {
            if (pageNum === 1) setLoading(true)
            else setIsFetchingMore(true)

            const params = {
                page: pageNum,
                limit: 50,
                search: search || undefined,
                sort_by: sortBy,
                job_id: selectedJobId || undefined
            }

            const res = await axios.get('/api/profiles/', { params })
            const { items, total, pages } = res.data

            if (append) {
                setProfiles(prev => {
                    // Avoid duplicates if any
                    const existingIds = new Set(prev.map(p => p.id))
                    const newItems = items.filter(p => !existingIds.has(p.id))
                    return [...prev, ...newItems]
                })
            } else {
                setProfiles(items)
            }

            setTotal(total)
            setHasMore(pageNum < pages)
            setPage(pageNum)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
            setIsFetchingMore(false)
        }
    }, [search, sortBy, selectedJobId])

    // Load More function for Infinite Scroll
    const loadMoreProfiles = useCallback(() => {
        if (!hasMore || isFetchingMore || loading) return
        fetchProfiles(page + 1, true)
    }, [page, hasMore, isFetchingMore, loading, fetchProfiles])

    // Initial Load & Filter Changes
    useEffect(() => {
        resetList()
        fetchProfiles(1, false)
    }, [search, sortBy, selectedJobId, resetList, fetchProfiles])

    // Initial Jobs Load
    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    // Smart Polling
    useEffect(() => {
        const pollStatus = async () => {
            if (!localStorage.getItem('token')) return
            try {
                const res = await axios.get('/api/cv/status')
                const currentIds = new Set(res.data.processing_ids)
                const prevIds = processingIdsRef.current

                // Check if any ID finished processing (was in prev but not in current)
                let somethingFinished = false
                for (let id of prevIds) {
                    if (!currentIds.has(id)) {
                        somethingFinished = true
                        break
                    }
                }

                // Or if we have new processing items (e.g. just uploaded)
                // We might want to refresh to show the "Processing..." cards if they aren't there yet
                // But usually we add them optimistically. 
                // The critical part is refreshing when they FINISH.

                if (somethingFinished) {
                    // Refresh current view without resetting scroll if possible, 
                    // but for simplicity we just re-fetch the first page or current set.
                    // For now, let's just re-fetch page 1 to update status.
                    // Ideally we'd update specific items, but that's complex.
                    // Let's just re-fetch the current page range? 
                    // Simpler: Just re-fetch page 1.
                    fetchProfiles(1, false)
                    fetchJobs() // Also refresh jobs in case stats changed
                }

                processingIdsRef.current = currentIds
            } catch (e) {
                console.error("Polling error", e)
            }
        }

        const i = setInterval(pollStatus, 5000)
        return () => clearInterval(i)
    }, [fetchProfiles, fetchJobs])

    return {
        jobs, setJobs,
        profiles, setProfiles,
        loading, isFetchingMore, hasMore,
        fetchJobs, fetchProfiles, loadMoreProfiles,
        search, setSearch,
        sortBy, setSortBy,
        selectedJobId, setSelectedJobId,
        total
    }
}
