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

import { useAuth } from '../context/AuthContext'

export const useHeadhunterData = () => {
    const { token } = useAuth()
    const [jobs, setJobs] = useState([])
    const [profiles, setProfiles] = useState([])
    const [loading, setLoading] = useState(true)

    const [jobsLoading, setJobsLoading] = useState(true)

    // Pagination State
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [total, setTotal] = useState(0)
    const [stats, setStats] = useState({ totalCandidates: 0, hired: 0, silver: 0, activeJobs: 0 })
    const [isFetchingMore, setIsFetchingMore] = useState(false)

    // Filters
    const [search, setSearch] = useState("")
    const [sortBy, setSortBy] = useState("newest")
    const [selectedJobId, setSelectedJobId] = useState(null)

    // Polling State
    const processingIdsRef = useRef(new Set())

    const fetchJobs = useCallback(async () => {
        if (!token) {
            setJobsLoading(false)
            return
        }
        try {
            const res = await axios.get('/api/jobs/')
            setJobs(res.data)
        } catch (err) {
            console.error(err)
        } finally {
            setJobsLoading(false)
        }
    }, [token])

    const fetchStats = useCallback(async () => {
        if (!token) return
        try {
            const res = await axios.get('/api/profiles/stats/overview')
            setStats(res.data)
        } catch (err) {
            console.error(err)
        }
    }, [token])

    // Reset list when filters change
    const resetList = useCallback(() => {
        setPage(1)
        setProfiles([])
        setHasMore(true)
        setLoading(true)
    }, [])

    const fetchProfiles = useCallback(async (pageNum = 1, append = false) => {
        if (!token) {
            setLoading(false)
            return
        }

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
            console.error('Error fetching profiles:', err)
        } finally {
            setLoading(false)
            setIsFetchingMore(false)
        }
    }, [search, sortBy, selectedJobId, token])

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

    // Initial Jobs & Stats Load
    useEffect(() => {
        fetchJobs()
        fetchStats()
    }, [fetchJobs, fetchStats])

    // Smart Polling with Versioning
    useEffect(() => {
        const pollStatus = async () => {
            if (!token) return
            try {
                // Check version
                const versionRes = await axios.get('/api/sync/version')
                const serverVersion = versionRes.data.version
                const localVersion = localStorage.getItem('data_version')

                if (serverVersion !== localVersion) {
                    console.log("New version detected, refreshing...", serverVersion)
                    localStorage.setItem('data_version', serverVersion)
                    fetchProfiles(page, false)
                    fetchJobs()
                    fetchStats()
                }

                // Also check processing status for specific CVs
                const res = await axios.get('/api/cv/status')
                const currentIds = new Set(res.data.processing_ids)
                const prevIds = processingIdsRef.current

                // Check if any ID finished processing
                let somethingFinished = false
                for (let id of prevIds) {
                    if (!currentIds.has(id)) {
                        somethingFinished = true
                        break
                    }
                }

                if (somethingFinished) {
                    fetchProfiles(1, false)
                    fetchJobs()
                }

                processingIdsRef.current = currentIds
            } catch (e) {
                console.error("Polling error", e)
            }
        }

        const i = setInterval(pollStatus, 4000) // Poll every 4s
        return () => clearInterval(i)
    }, [fetchProfiles, fetchJobs, fetchStats, page, token])

    // Actions
    const updateApp = useCallback(async (appId, data) => {
        await axios.patch(`/api/applications/${appId}`, data)
        fetchProfiles(page, false) // Refresh current page
    }, [fetchProfiles, page])

    const updateProfile = useCallback(async (cvId, data) => {
        await axios.patch(`/api/profiles/${cvId}`, data)
        fetchProfiles(page, false)
    }, [fetchProfiles, page])

    const assignJob = useCallback(async (cvId, jobId) => {
        await axios.post('/api/applications/', { cv_id: cvId, job_id: jobId })
        fetchProfiles(page, false)
    }, [fetchProfiles, page])

    const removeJob = useCallback(async (appId) => {
        await axios.delete(`/api/applications/${appId}`)
        fetchProfiles(page, false)
    }, [fetchProfiles, page])

    return {
        jobs, setJobs,
        profiles, setProfiles,
        loading, jobsLoading, isFetchingMore, hasMore,
        fetchJobs, fetchProfiles, loadMoreProfiles,
        search, setSearch,
        sortBy, setSortBy,
        selectedJobId, setSelectedJobId,
        total, stats,
        updateApp, updateProfile, assignJob, removeJob
    }
}
