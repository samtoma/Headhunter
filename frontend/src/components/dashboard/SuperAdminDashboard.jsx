import { useState, useEffect } from 'react'
import axios from 'axios'
import { Building2, Users, TrendingUp, Search, Edit2, Check, X, ArrowLeft } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SuperAdminDashboard = () => {
    const [companies, setCompanies] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editForm, setEditForm] = useState({})

    // Management View State
    const [managedCompany, setManagedCompany] = useState(null)
    const [activeTab, setActiveTab] = useState("overview")
    const [companyUsers, setCompanyUsers] = useState([])
    const [companyJobs, setCompanyJobs] = useState([])
    const [companyLogs, setCompanyLogs] = useState([])

    useEffect(() => {
        fetchCompanies()
    }, [])

    const fetchCompanies = async () => {
        try {
            const res = await axios.get('/api/companies/')
            // Filter out Headhunter AI (ID 1)
            setCompanies(res.data.filter(c => c.id !== 1))
        } catch (err) {
            console.error("Failed to fetch companies", err)
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (company) => {
        setEditingId(company.id)
        setEditForm({ ...company })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditForm({})
    }

    const saveEdit = async () => {
        try {
            await axios.patch(`/api/companies/${editingId}`, editForm)
            setCompanies(prev => prev.map(c => c.id === editingId ? { ...c, ...editForm } : c))
            setEditingId(null)
        } catch (err) {
            console.error("Failed to update company", err)
            alert("Failed to update company")
        }
    }

    const handleManage = async (company) => {
        setManagedCompany(company)
        setActiveTab("overview")
        try {
            const [usersRes, jobsRes, logsRes] = await Promise.all([
                axios.get(`/api/companies/${company.id}/users`),
                axios.get(`/api/companies/${company.id}/jobs`),
                axios.get(`/api/logs/company/${company.id}`)
            ])
            setCompanyUsers(usersRes.data)
            setCompanyJobs(jobsRes.data)
            setCompanyLogs(logsRes.data)
        } catch (err) {
            console.error("Failed to fetch company details", err)
        }
    }

    const handleRoleChange = async (userId, newRole) => {
        try {
            await axios.patch(`/api/users/${userId}`, { role: newRole })
            setCompanyUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
        } catch (err) {
            console.error("Failed to update role", err)
            alert("Failed to update role")
        }
    }

    // --- RENDER HELPERS ---

    const renderOverview = () => {
        // Mock data for charts since we don't have historical data yet
        const loginData = [
            { name: 'Mon', logins: 4 },
            { name: 'Tue', logins: 7 },
            { name: 'Wed', logins: 5 },
            { name: 'Thu', logins: 12 },
            { name: 'Fri', logins: 9 },
            { name: 'Sat', logins: 2 },
            { name: 'Sun', logins: 1 },
        ]

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500 mb-1">Total Users</div>
                        <div className="text-2xl font-bold">{companyUsers.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500 mb-1">Active Jobs</div>
                        <div className="text-2xl font-bold">{companyJobs.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-500 mb-1">Recent Activities</div>
                        <div className="text-2xl font-bold">{companyLogs.length}</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-4">Login Activity (Last 7 Days)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={loginData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip />
                                <Line type="monotone" dataKey="logins" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )
    }

    const renderUsers = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                        <th className="p-4">Email</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Role</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {companyUsers.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-medium text-slate-900">{user.email}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="p-4">
                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="recruiter">Recruiter</option>
                                </select>
                            </td>
                            <td className="p-4 text-right text-slate-400">
                                {/* Future: Reset Password, Deactivate */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    const renderJobs = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                        <th className="p-4">Title</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Candidates</th>
                        <th className="p-4">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {companyJobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-medium text-slate-900">{job.title}</td>
                            <td className="p-4 text-slate-500">{job.department || "-"}</td>
                            <td className="p-4 text-slate-500">{job.candidate_count}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${job.is_active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {job.is_active ? 'Active' : 'Archived'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    const renderLogs = () => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                        <th className="p-4">Time</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {companyLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="p-4 font-medium text-slate-900">{log.user_email}</td>
                            <td className="p-4">
                                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600">{log.action}</span>
                            </td>
                            <td className="p-4 text-slate-500 truncate max-w-xs">{log.details}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    if (loading) return <div className="p-8 text-center text-slate-500">Loading companies...</div>

    // --- DETAILED VIEW ---
    if (managedCompany) {
        return (
            <div className="h-full flex flex-col bg-slate-50">
                <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4">
                    <button onClick={() => setManagedCompany(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{managedCompany.name}</h1>
                        <div className="text-sm text-slate-500">{managedCompany.domain}</div>
                    </div>
                </div>

                <div className="px-8 py-4 border-b border-slate-200 bg-white flex gap-6">
                    <button onClick={() => setActiveTab("overview")} className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "overview" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Overview</button>
                    <button onClick={() => setActiveTab("users")} className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "users" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Users</button>
                    <button onClick={() => setActiveTab("jobs")} className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "jobs" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Jobs</button>
                    <button onClick={() => setActiveTab("logs")} className={`pb-4 text-sm font-medium border-b-2 transition ${activeTab === "logs" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Activity Logs</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === "overview" && renderOverview()}
                    {activeTab === "users" && renderUsers()}
                    {activeTab === "jobs" && renderJobs()}
                    {activeTab === "logs" && renderLogs()}
                </div>
            </div>
        )
    }

    // --- MAIN DASHBOARD ---
    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Global Dashboard</h1>
                <p className="text-slate-500">Manage all registered companies and view platform metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{companies.length}</div>
                            <div className="text-sm text-slate-500">Total Companies</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">
                                {companies.reduce((acc, c) => acc + (c.user_count || 0), 0)}
                            </div>
                            <div className="text-sm text-slate-500">Total Users</div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">
                                {companies.reduce((acc, c) => acc + (c.job_count || 0), 0)}
                            </div>
                            <div className="text-sm text-slate-500">Active Jobs</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-700">Registered Companies</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                        <input
                            placeholder="Search companies..."
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Domain</th>
                            <th className="p-4">Users</th>
                            <th className="p-4">Jobs</th>
                            <th className="p-4">Industry</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {companies.map(company => (
                            <tr key={company.id} className="hover:bg-slate-50/50 transition">
                                <td className="p-4 text-slate-400">#{company.id}</td>
                                <td className="p-4 font-medium text-slate-900">
                                    {editingId === company.id ? (
                                        <input
                                            value={editForm.name || ""}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full p-1 border rounded"
                                        />
                                    ) : company.name}
                                </td>
                                <td className="p-4 text-slate-600">
                                    {editingId === company.id ? (
                                        <input
                                            value={editForm.domain || ""}
                                            onChange={e => setEditForm({ ...editForm, domain: e.target.value })}
                                            className="w-full p-1 border rounded"
                                        />
                                    ) : company.domain}
                                </td>
                                <td className="p-4 text-slate-600 font-bold">{company.user_count || 0}</td>
                                <td className="p-4 text-slate-600 font-bold">{company.job_count || 0}</td>
                                <td className="p-4 text-slate-600">
                                    {editingId === company.id ? (
                                        <input
                                            value={editForm.industry || ""}
                                            onChange={e => setEditForm({ ...editForm, industry: e.target.value })}
                                            className="w-full p-1 border rounded"
                                        />
                                    ) : company.industry || "-"}
                                </td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {editingId === company.id ? (
                                        <>
                                            <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                                            <button onClick={cancelEdit} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={16} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleManage(company)} className="px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition">
                                                Manage
                                            </button>
                                            <button onClick={() => startEdit(company)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">
                                                <Edit2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default SuperAdminDashboard
