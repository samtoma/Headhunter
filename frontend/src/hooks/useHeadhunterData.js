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

    // WebSocket State
    const processingIdsRef = useRef(new Set())
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)

    const fetchJobs = useCallback(async () => {
        if (!token) {
            setJobsLoading(false)
            return
        }
        try {
            // Add cache-busting timestamp to ensure fresh data after status updates
            const res = await axios.get('/api/jobs/', {
                params: { _t: Date.now() }
            })
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

    // Company Settings
    const [company, setCompany] = useState(null)
    const [pipelineStages, setPipelineStages] = useState(["Screening", "Technical", "Culture", "Final"]) // Default Fallback (Names)
    const [companyStages, setCompanyStages] = useState([]) // Full objects

    const fetchSettings = useCallback(async () => {
        if (!token) return
        try {
            const res = await axios.get('/api/companies/me')
            // Super admin users may have null company data
            if (!res.data) {
                setCompany(null)
                return
            }
            setCompany(res.data)
            if (res.data.interview_stages) {
                try {
                    const parsed = JSON.parse(res.data.interview_stages)
                    setCompanyStages(parsed)
                    // Extract just the names
                    const stageNames = parsed.map(s => s.name)
                    if (stageNames.length > 0) setPipelineStages(stageNames)
                } catch (e) {
                    console.error("Failed to parse stages", e)
                }
            }
        } catch (err) {
            console.error("Failed to fetch settings", err)
        }
    }, [token])

    // Initial Jobs, Stats & Settings Load
    useEffect(() => {
        fetchJobs()
        fetchStats()
        fetchSettings()
    }, [fetchJobs, fetchStats, fetchSettings])

    // WebSocket-based Real-time Sync (replaces polling)
    useEffect(() => {
        if (!token) return

        // Determine WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = window.location.host
        const isDev = import.meta.env.DEV
        const wsPath = isDev
            ? '/api/sync/ws/sync'  // Vite proxy will rewrite /api to empty
            : '/api/sync/ws/sync'       // Direct path in production
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}?token=${token}`

        try {
            wsRef.current = new WebSocket(wsUrl)

            wsRef.current.onopen = () => {
                console.log('✅ Sync WebSocket connected')
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    if (data.type === 'initial_state') {
                        // Set initial state
                        if (data.data_version) {
                            localStorage.setItem('data_version', data.data_version)
                        }
                        if (data.processing_ids) {
                            processingIdsRef.current = new Set(data.processing_ids)
                        }
                        if (data.app_version) {
                            const localAppVersion = localStorage.getItem('app_version')
                            if (localAppVersion && localAppVersion !== data.app_version) {
                                // App version changed, force reload
                                console.log('App version changed, reloading...')
                                localStorage.clear()
                                sessionStorage.clear()
                                window.location.reload()
                            }
                        }
                    } else if (data.type === 'update') {
                        // Handle data version change
                        if (data.data_version) {
                            const localVersion = localStorage.getItem('data_version')
                            if (data.data_version !== localVersion) {
                                console.log("Data version changed, refreshing...", data.data_version)
                                localStorage.setItem('data_version', data.data_version)
                                fetchProfiles(page, false)
                                fetchJobs()
                                fetchStats()
                                fetchSettings()
                            }
                        }

                        // Handle CV processing status changes
                        if (data.processing_ids !== undefined) {
                            const currentIds = new Set(data.processing_ids)
                            const prevIds = processingIdsRef.current

                            // Check if any CV finished processing
                            const finishedIds = Array.from(prevIds).filter(id => !currentIds.has(id))
                            if (finishedIds.length > 0) {
                                console.log("CVs finished processing:", finishedIds)
                                fetchProfiles(1, false)
                                fetchJobs()
                            }

                            processingIdsRef.current = currentIds
                        }

                        // Handle CV finished notifications
                        if (data.cv_finished && data.cv_finished.length > 0) {
                            console.log("CVs finished processing:", data.cv_finished)
                            fetchProfiles(1, false)
                            fetchJobs()
                        }

                        // Handle app version change
                        if (data.app_version) {
                            const localAppVersion = localStorage.getItem('app_version')
                            if (localAppVersion && localAppVersion !== data.app_version) {
                                console.log('App version changed, reloading...')
                                localStorage.clear()
                                sessionStorage.clear()
                                window.location.reload()
                            }
                        }
                    } else if (data.type === 'error') {
                        console.error('Sync WebSocket error:', data.message)
                    }
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e)
                }
            }

            wsRef.current.onerror = (error) => {
                console.error('❌ Sync WebSocket error:', error)
            }

            wsRef.current.onclose = (event) => {
                console.log('Sync WebSocket disconnected. Code:', event.code)
                // Attempt to reconnect after 5 seconds if it wasn't a normal closure
                if (event.code !== 1000) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('Attempting to reconnect sync WebSocket...')
                        // Trigger reconnection by clearing wsRef
                        wsRef.current = null
                        // Force re-render by updating a dependency
                        // This will be handled by the useEffect re-running
                    }, 5000)
                }
            }
        } catch (error) {
            console.error('Failed to create sync WebSocket:', error)
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [token, fetchProfiles, fetchJobs, fetchStats, fetchSettings, page])

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
        fetchJobs() // Update job counts
    }, [fetchProfiles, fetchJobs, page])

    const removeJob = useCallback(async (appId) => {
        await axios.delete(`/api/applications/${appId}`)
        fetchProfiles(page, false)
        fetchJobs() // Update job counts
    }, [fetchProfiles, fetchJobs, page])

    return {
        jobs, setJobs,
        profiles, setProfiles,
        loading, jobsLoading, isFetchingMore, hasMore,
        fetchJobs, fetchProfiles, loadMoreProfiles, fetchSettings,
        search, setSearch,
        sortBy, setSortBy,
        selectedJobId, setSelectedJobId,
        total, stats,
        company, pipelineStages, companyStages,
        updateApp, updateProfile, assignJob, removeJob
    }
}
