import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import PageHeader from '../components/layout/PageHeader';
import { LayoutDashboard, Users, Briefcase, Trophy, TrendingUp, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6'];

const DepartmentDashboard = ({ onOpenMobileSidebar, isEmbedded = false }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState("All");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await axios.get('/api/profiles/stats/department');
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch department stats", err);
            setLoading(false);
        }
    };

    // Aggregate Data for "All" view
    const aggregated = useMemo(() => {
        if (data.length === 0) return null;

        return data.reduce((acc, curr) => ({
            totalCandidates: acc.totalCandidates + curr.totalCandidates,
            activeJobs: acc.activeJobs + curr.activeJobs,
            hired: acc.hired + curr.hired,
            offered: acc.offered + curr.offered,
            rejected: acc.rejected + curr.rejected
        }), { totalCandidates: 0, activeJobs: 0, hired: 0, offered: 0, rejected: 0 });
    }, [data]);

    // Current View Data
    const currentStats = useMemo(() => {
        if (selectedDept === "All") return aggregated;
        return data.find(d => d.name === selectedDept) || aggregated;
    }, [selectedDept, data, aggregated]);

    // Pipeline Data for Chart
    const pipelineData = useMemo(() => {
        if (selectedDept === "All") {
            // Aggregate pipeline counts across all departments
            const stageCounts = {};
            data.forEach(d => {
                Object.entries(d.pipeline).forEach(([stage, count]) => {
                    stageCounts[stage] = (stageCounts[stage] || 0) + count;
                });
            });
            // Prioritize standard stages order if possible, or just sort
            const standardOrder = ["New", "Screening", "Technical", "Culture", "Final", "Offer", "Hired", "Rejected"];
            return Object.entries(stageCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => {
                    const idxA = standardOrder.indexOf(a.name);
                    const idxB = standardOrder.indexOf(b.name);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    return 0;
                });
        } else {
            const dept = data.find(d => d.name === selectedDept);
            if (!dept) return [];
            const standardOrder = ["New", "Screening", "Technical", "Culture", "Final", "Offer", "Hired", "Rejected"];
            return Object.entries(dept.pipeline)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => {
                    const idxA = standardOrder.indexOf(a.name);
                    const idxB = standardOrder.indexOf(b.name);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    return 0;
                });
        }
    }, [selectedDept, data]);

    // Departments List for Chart comparison
    const deptComparisonData = useMemo(() => {
        return data.map(d => ({
            name: d.name,
            Candidates: d.totalCandidates,
            Hires: d.hired,
            ActiveJobs: d.activeJobs
        }));
    }, [data]);

    if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
    if (!currentStats) return <div className="p-8 text-center text-slate-500">No data available</div>;

    const offerRate = currentStats.offered > 0 ? Math.round((currentStats.offered / (currentStats.totalCandidates || 1)) * 100) : 0;

    // Chart Data Preparation (
    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50">
            {!isEmbedded && (
                <PageHeader
                    title="Department Dashboard"
                    subtitle="Analytics and metrics overview"
                    icon={LayoutDashboard}
                    onOpenMobileSidebar={onOpenMobileSidebar}
                />
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-bold text-slate-700">Department:</label>
                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]"
                        >
                            <option value="All">All Departments</option>
                            {data.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard title="Total Candidates" value={currentStats.totalCandidates} icon={Users} color="bg-blue-500" />
                    <KPICard title="Active Jobs" value={currentStats.activeJobs} icon={Briefcase} color="bg-indigo-500" />
                    <KPICard title="Hired" value={currentStats.hired} icon={Trophy} color="bg-emerald-500" />
                    <KPICard title="Offer Rate" value={`${offerRate}%`} icon={Target} color="bg-rose-500" subtext={`${currentStats.offered} Offers Extended`} />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pipeline Funnel / Distribution */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px]">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Pipeline Distribution</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={pipelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={40}>
                                    {pipelineData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Department Comparison (Only show if All is selected) */}
                    {selectedDept === "All" ? (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px]">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Department Comparison</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={deptComparisonData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="Candidates" stackId="a" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20} />
                                    <Bar dataKey="Hires" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] flex items-center justify-center">
                            <div className="text-center">
                                <TrendingUp size={48} className="text-indigo-100 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">Select &quot;All Departments&quot; to see comparison charts</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Detailed Metrics</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Department</th>
                                    <th className="px-6 py-4">Active Jobs</th>
                                    <th className="px-6 py-4">Total Candidates</th>
                                    <th className="px-6 py-4">Hired</th>
                                    <th className="px-6 py-4">Offers</th>
                                    <th className="px-6 py-4">Rejected</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((d, i) => (
                                    <tr key={i} className={`hover:bg-slate-50 transition ${selectedDept !== "All" && selectedDept !== d.name ? 'opacity-40' : ''}`}>
                                        <td className="px-6 py-4 font-bold text-slate-800">{d.name}</td>
                                        <td className="px-6 py-4">{d.activeJobs}</td>
                                        <td className="px-6 py-4">{d.totalCandidates}</td>
                                        <td className="px-6 py-4 text-emerald-600 font-bold">{d.hired}</td>
                                        <td className="px-6 py-4 text-indigo-600 font-bold">{d.offered}</td>
                                        <td className="px-6 py-4 text-slate-400">{d.rejected}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

const KPICard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
        <div className="flex items-start justify-between mb-4">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.replace('bg-', '')} group-hover:scale-110 transition`}>
                <Icon size={24} className={`text-${color.replace('bg-', '')}-600`} style={{ color: 'inherit' }} />
            </div>
        </div>
        {subtext && <p className="text-xs font-medium text-slate-400">{subtext}</p>}
    </div>
);

export default DepartmentDashboard;
