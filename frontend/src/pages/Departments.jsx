/**
 * Departments Page
 * 
 * Displays departments from company profile (single source of truth).
 * Uses company.departments JSON field for names, with optional rich profiles
 * from the Department table for enhanced AI context.
 */
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Search, Building2, Trash2, Edit2 } from 'lucide-react'
import DepartmentModal from '../components/modals/DepartmentModal'
import PageHeader from '../components/layout/PageHeader'

const Departments = ({ onOpenMobileSidebar }) => {
    // Department names from company profile (source of truth)
    const [departmentNames, setDepartmentNames] = useState([])
    // Rich department profiles (optional, for AI context)
    const [departmentProfiles, setDepartmentProfiles] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDept, setSelectedDept] = useState(null)

    useEffect(() => {
        fetchDepartments()
    }, [])

    const fetchDepartments = async () => {
        setLoading(true)
        try {
            // Fetch from company profile (single source of truth)
            const companyRes = await axios.get('/api/company/profile')
            let names = []
            if (companyRes.data.departments) {
                try {
                    names = JSON.parse(companyRes.data.departments)
                    if (!Array.isArray(names)) names = []
                } catch {
                    names = []
                }
            }
            setDepartmentNames(names)

            // Also fetch rich profiles if they exist (for display)
            try {
                const profilesRes = await axios.get('/api/departments/')
                const profileMap = {}
                profilesRes.data.forEach(p => {
                    profileMap[p.name] = p
                })
                setDepartmentProfiles(profileMap)
            } catch {
                // Rich profiles are optional
                setDepartmentProfiles({})
            }
        } catch (err) {
            console.error("Failed to fetch departments", err)
            setDepartmentNames([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (deptName) => {
        if (!confirm(`Are you sure you want to remove "${deptName}" department?`)) return
        try {
            // Remove from company profile
            const companyRes = await axios.get('/api/company/profile')
            let currentDepts = []
            if (companyRes.data.departments) {
                try {
                    currentDepts = JSON.parse(companyRes.data.departments)
                } catch {
                    currentDepts = []
                }
            }
            const updatedDepts = currentDepts.filter(d => d !== deptName)
            await axios.put('/api/company/profile', {
                departments: JSON.stringify(updatedDepts)
            })

            // Also delete rich profile if exists
            const profile = departmentProfiles[deptName]
            if (profile?.id) {
                await axios.delete(`/api/departments/${profile.id}`).catch(() => { })
            }

            fetchDepartments()
        } catch (err) {
            alert("Failed to delete department")
            console.error(err)
        }
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        setSelectedDept(null)
        fetchDepartments()
    }

    const filtered = departmentNames.filter(d =>
        d.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <PageHeader
                title="Departments"
                subtitle="Manage team profiles and AI context"
                icon={Building2}
                onOpenMobileSidebar={onOpenMobileSidebar}
                actions={
                    <button
                        onClick={() => { setSelectedDept(null); setIsModalOpen(true) }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition shadow-sm"
                    >
                        <Plus size={20} /> <span className="hidden md:inline">Add Department</span>
                    </button>
                }
            />

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                        <input
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm"
                            placeholder="Search departments..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                            <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
                            <h3 className="text-lg font-bold text-slate-900">No departments found</h3>
                            <p className="text-slate-500 mb-4">Add departments via Company Profile to organize your jobs.</p>
                            <button
                                onClick={() => { setSelectedDept(null); setIsModalOpen(true) }}
                                className="text-indigo-600 font-bold hover:underline"
                            >
                                Create Department
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map(deptName => {
                                const profile = departmentProfiles[deptName]
                                return (
                                    <div key={deptName} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{deptName}</h3>
                                                    {profile?.description ? (
                                                        <span className="text-xs text-emerald-600">Enhanced Profile</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Basic</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => { setSelectedDept(profile || { name: deptName }); setIsModalOpen(true) }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(deptName)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {profile?.description && (
                                            <p className="text-sm text-slate-600 line-clamp-2">{profile.description}</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <DepartmentModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    department={selectedDept}
                    onSave={fetchDepartments}
                />
            )}
        </div>
    )
}

export default Departments
