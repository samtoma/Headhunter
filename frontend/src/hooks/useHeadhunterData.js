import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

export const useHeadhunterData = () => {
    const [jobs, setJobs] = useState([])
    const [profiles, setProfiles] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchJobs = useCallback(async () => {
        try {
            const res = await axios.get('/api/jobs/')
            setJobs(res.data)
        } catch (err) { console.error(err) }
    }, [])

    const fetchProfiles = useCallback(async () => {
        try {
            const res = await axios.get('/api/profiles/')
            setProfiles(res.data)
        } catch (err) { console.error(err) }
    }, [])

    useEffect(() => {
        const init = async () => {
            setLoading(true)
            await Promise.all([fetchJobs(), fetchProfiles()])
            setLoading(false)
        }
        init()
    }, [fetchJobs, fetchProfiles])

    useEffect(() => {
        const i = setInterval(() => { fetchJobs(); fetchProfiles() }, 5000)
        return () => clearInterval(i)
    }, [fetchJobs, fetchProfiles])

    return { jobs, setJobs, profiles, setProfiles, fetchJobs, fetchProfiles, loading }
}
