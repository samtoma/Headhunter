import { useState, useEffect } from 'react';
import { useHeadhunter } from '../context/HeadhunterContext';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Search, Filter, MoreVertical, Check, X, Building2, Plus, Trash2, UserPlus } from 'lucide-react';
import axios from 'axios';

const DEPARTMENTS = [
    "Engineering",
    "Product",
    "Design",
    "Marketing",
    "Sales",
    "HR",
    "Finance",
    "Operations",
    "Legal",
    "Executive"
];

const Team = ({ onOpenMobileSidebar }) => {
    const { user } = useAuth();
    const role = user?.role;
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [stats, setStats] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ email: "", password: "", role: "interviewer", department: "" });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/users/stats');
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/users/');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user) => {
        setEditingUser(user.id);
        setEditForm({ role: user.role, department: user.department || "" });
    };

    const handleUpdateUser = async (userId) => {
        try {
            await axios.patch(`/api/users/${userId}/role`, editForm);
            await fetchUsers(); // Fetch fresh data
            await fetchStats(); // Update stats too
            setEditingUser(null);
            alert("User updated successfully");
        } catch (err) {
            console.error("Failed to update user", err);
            alert(err.response?.data?.detail || "Failed to update user");
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await axios.post('/api/users/', newUser);
            await fetchUsers();
            await fetchStats();
            setShowCreateModal(false);
            setNewUser({ email: "", password: "", role: "interviewer", department: "" });
            alert("User invited successfully");
        } catch (err) {
            console.error("Failed to create user", err);
            alert(err.response?.data?.detail || "Failed to create user");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm("Are you sure you want to remove this user? This action cannot be undone.")) return;
        try {
            await axios.delete(`/api/users/${userId}`);
            setUsers(prev => prev.filter(u => u.id !== userId));
            fetchStats();
        } catch (err) {
            console.error("Failed to delete user", err);
            alert(err.response?.data?.detail || "Failed to delete user");
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(search.toLowerCase()))
    );

    const getRoleColor = (r) => {
        switch (r) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'recruiter': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'interviewer': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'super_admin': return 'bg-slate-800 text-white border-slate-700';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onOpenMobileSidebar} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <Users size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            Team Management
                        </h1>
                        <p className="text-xs text-slate-500 hidden md:block">Manage your organization's members and permissions</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-500/20"
                >
                    <UserPlus size={18} /> <span className="hidden md:inline">Invite Member</span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4 md:p-8">
                <div className="max-w-6xl mx-auto h-full flex flex-col gap-6">

                    {/* Stats Cards */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Users</div>
                                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active</div>
                                <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Interviewers</div>
                                <div className="text-2xl font-bold text-indigo-600">{stats.roles.interviewer}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recruiters</div>
                                <div className="text-2xl font-bold text-blue-600">{stats.roles.recruiter}</div>
                            </div>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, email, role or department..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Filter size={16} />
                            <span>Showing {filteredUsers.length} members</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">User</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Role</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Department</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">Logins</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading team...</td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan="6" className="p-8 text-center text-slate-400">No users found.</td></tr>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50/50 transition group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                                                            {user.email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900">{user.email}</div>
                                                            <div className="text-xs text-slate-500">ID: {user.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {editingUser === user.id ? (
                                                        <select
                                                            value={editForm.role}
                                                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                            className="text-xs p-1.5 rounded border border-indigo-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                                                        >
                                                            <option value="interviewer">Interviewer</option>
                                                            <option value="recruiter">Recruiter</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${getRoleColor(user.role)}`}>
                                                            {user.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {editingUser === user.id ? (
                                                        <select
                                                            value={editForm.department}
                                                            onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                                                            className="text-xs p-1.5 rounded border border-indigo-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                                                        >
                                                            <option value="">Select...</option>
                                                            {DEPARTMENTS.map(dept => (
                                                                <option key={dept} value={dept}>{dept}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-sm text-slate-600">{user.department || "-"}</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{user.login_count || 0}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {editingUser === user.id ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleUpdateUser(user.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition" title="Save"><Check size={16} /></button>
                                                            <button onClick={() => setEditingUser(null)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition" title="Cancel"><X size={16} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-2">
                                                            {(role === 'admin' || role === 'super_admin') && (
                                                                <button
                                                                    onClick={() => startEdit(user)}
                                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                            {(role === 'admin' || role === 'super_admin') && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                                                                    title="Remove User"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>


            {/* Create User Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Invite Team Member</h3>
                                    <p className="text-xs text-slate-500">Send an invitation to join your workspace.</p>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                            placeholder="colleague@company.com"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                        <Shield size={12} /> Must match your company domain.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        >
                                            <option value="interviewer">Interviewer</option>
                                            <option value="recruiter">Recruiter</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                                        <select
                                            value={newUser.department}
                                            onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        >
                                            <option value="">Select Department...</option>
                                            {DEPARTMENTS.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Temporary Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20 disabled:opacity-70 flex items-center justify-center gap-2"
                                    >
                                        {creating ? "Sending..." : <><UserPlus size={18} /> Send Invite</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Team;
