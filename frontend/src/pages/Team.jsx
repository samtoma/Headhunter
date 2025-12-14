import { useState, useEffect } from 'react';
// import { useHeadhunter } from '../context/HeadhunterContext'; // Unused
import { useAuth } from '../context/AuthContext';
import { Users, Search, Filter, Check, X, Trash2, UserPlus } from 'lucide-react';
import axios from 'axios';

import PageHeader from '../components/layout/PageHeader';
import InviteUserModal from '../components/users/InviteUserModal';

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
    // Departments fetched from company profile (single source of truth)
    const [departments, setDepartments] = useState([]);

    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'

    useEffect(() => {
        fetchUsers();
        fetchStats();
        fetchDepartments();
    }, [activeTab]); // Refetch when tab changes

    // Fetch departments for editing
    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/departments/');
            setDepartments(res.data);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    // Fetch user stats
    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/users/stats');
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
            // Stats are optional - don't break the page
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const statusParams = activeTab === 'archived' ? 'archived' : 'active';
            const res = await axios.get(`/api/users/?status=${statusParams}`);
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user) => {
        setEditingUser(user.id);
        setEditForm({
            role: user.role,
            department: user.department || "",
            permissions: user.permissions || "{}"
        });
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
            case 'hiring_manager': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'interviewer': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'super_admin': return 'bg-slate-800 text-white border-slate-700';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <PageHeader
                title="Team Management"
                subtitle="Manage users, roles, and access permissions"
                icon={Users}
                onOpenMobileSidebar={onOpenMobileSidebar}
                actions={
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-500/20"
                    >
                        <UserPlus size={18} /> <span className="hidden md:inline">Invite Member</span>
                    </button>
                }
            />

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
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hiring Managers</div>
                                <div className="text-2xl font-bold text-orange-600">{stats.roles.hiring_manager || 0}</div>
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
                    <div className="flex flex-col gap-4">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Active Members
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'archived' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Archived
                            </button>
                        </div>

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
                                                            <option value="hiring_manager">Hiring Manager</option>
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
                                                            className="text-xs p-1.5 rounded border border-indigo-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 w-full mb-1"
                                                        >
                                                            <option value="">Select...</option>
                                                            {departments.map(dept => (
                                                                <option key={dept} value={dept}>{dept}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="text-sm text-slate-600">{user.department || "-"}</div>
                                                    )}

                                                    {/* Permissions Section */}
                                                    {(role === 'admin' || role === 'super_admin') && (
                                                        <div className="mt-1">
                                                            {editingUser === user.id ? (
                                                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={JSON.parse(editForm.permissions || '{}').can_view_salary || false}
                                                                        onChange={e => {
                                                                            const perms = JSON.parse(editForm.permissions || '{}');
                                                                            perms.can_view_salary = e.target.checked;
                                                                            setEditForm({ ...editForm, permissions: JSON.stringify(perms) });
                                                                        }}
                                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    View Salaries
                                                                </label>
                                                            ) : (
                                                                // Show indicator if they have permission
                                                                (JSON.parse(user.permissions || '{}').can_view_salary) && (
                                                                    <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1 w-fit mt-1">
                                                                        $ Salary Access
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{user.login_count || 0}</span>
                                                </td>
                                                <td className="p-4">
                                                    {user.status === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Pending
                                                        </span>
                                                    ) : user.status === 'deactivated' || !user.is_active ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                                            Deactivated
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            Active
                                                        </span>
                                                    )}
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


            {/* Invite User Modal */}
            <InviteUserModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchUsers();
                    fetchStats();
                    alert("Invite sent successfully!");
                }}
            />
        </div>
    );
};

export default Team;
