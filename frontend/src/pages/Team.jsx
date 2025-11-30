import { useState, useEffect } from 'react';
import { useHeadhunter } from '../context/HeadhunterContext';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Search, Filter, MoreVertical, Check, X, Building2 } from 'lucide-react';
import axios from 'axios';

const Team = ({ onOpenMobileSidebar }) => {
    const { role } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingUser, setEditingUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

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

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await axios.patch(`/api/users/${userId}/role`, { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setEditingUser(null);
        } catch (err) {
            console.error("Failed to update role", err);
            alert("Failed to update role");
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
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
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onOpenMobileSidebar} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <Users size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-indigo-600" /> Team Management
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4 md:p-8">
                <div className="max-w-5xl mx-auto h-full flex flex-col">

                    {/* Toolbar */}
                    <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by email or role..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-500">{filteredUsers.length} Members</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">User</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Role</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-slate-400">Loading team...</td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan="4" className="p-8 text-center text-slate-400">No users found.</td></tr>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50/50 transition group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
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
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={selectedRole}
                                                                onChange={e => setSelectedRole(e.target.value)}
                                                                className="text-xs p-1.5 rounded border border-indigo-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                                            >
                                                                <option value="interviewer">Interviewer</option>
                                                                <option value="recruiter">Recruiter</option>
                                                                <option value="admin">Admin</option>
                                                            </select>
                                                            <button onClick={() => handleUpdateRole(user.id, selectedRole)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button>
                                                            <button onClick={() => setEditingUser(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide ${getRoleColor(user.role)}`}>
                                                            {user.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {(role === 'admin' || role === 'super_admin') && editingUser !== user.id && (
                                                        <button
                                                            onClick={() => { setEditingUser(user.id); setSelectedRole(user.role); }}
                                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition opacity-0 group-hover:opacity-100"
                                                        >
                                                            Edit Role
                                                        </button>
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
        </div>
    );
};

export default Team;
