import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Search, Building2, Trash2, Edit2, Code2, FileText } from 'lucide-react'
import DepartmentModal from '../components/modals/DepartmentModal'

const Departments = () => {
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDept, setSelectedDept] = useState(null)

    useEffect(() => {
        fetchDepartments()
    }, [])

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/departments/')
            setDepartments(res.data)
        } catch (err) {
            console.error("Failed to fetch departments", err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this department?")) return
        try {
            await axios.delete(`/api/departments/${id}`)
            fetchDepartments()
        } catch (err) {
            alert("Failed to delete department")
        }
    }

    const filtered = departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Departments</h1>
                    <p className="text-slate-500 mt-1">Manage team profiles and AI context</p>
                </div>
                <button
                    onClick={() => { setSelectedDept(null); setIsModalOpen(true) }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition shadow-sm"
                >
                    <Plus size={20} /> Add Department
                </button>
            </div>

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
                            <p className="text-slate-500 mb-4">Create your first department profile to enhance AI job generation.</p>
                            <button
                                onClick={() => { setSelectedDept(null); setIsModalOpen(true) }}
                                className="text-indigo-600 font-bold hover:underline"
                            >
                                Create Department
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filtered.map(dept => (
                                <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900">{dept.name}</h3>
                                                    <span className="text-xs text-slate-400">Updated {new Date(dept.updated_at || dept.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <button
                                                    onClick={() => { setSelectedDept(dept); setIsModalOpen(true) }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dept.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {dept.description && (
                                            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{dept.description}</p>
                                        )}

                                        <div className="space-y-3">
                                            {dept.technologies && (
                                                <div className="flex items-start gap-2">
                                                    <Code2 size={14} className="text-slate-400 mt-1" />
                                                    <div className="flex flex-wrap gap-1">
                                                        {JSON.parse(dept.technologies).slice(0, 5).map((tech, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{tech}</span>
                                                        ))}
                                                        {JSON.parse(dept.technologies).length > 5 && (
                                                            <span className="px-2 py-0.5 text-slate-400 text-xs font-medium">+{JSON.parse(dept.technologies).length - 5} more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {dept.job_templates && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <FileText size={14} className="text-slate-400" />
                                                    <span>{JSON.parse(dept.job_templates).length} Job Templates</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <DepartmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    department={selectedDept}
                    onSave={fetchDepartments}
                />
            )}
        </div>
    )
}

export default Departments
