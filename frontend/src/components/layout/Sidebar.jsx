import { BrainCircuit, LayoutDashboard, Briefcase as BriefcaseIcon, Archive, Layers, Lock, Plus, Settings, LogOut, Building2, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useHeadhunter } from '../../context/HeadhunterContext'
import { useState } from 'react'
import CompanyProfileModal from '../modals/CompanyProfileModal'
import CreateJobModal from '../modals/CreateJobModal'
import axios from 'axios'

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
    const { logout } = useAuth()
    const { jobs, selectedJobId, setSelectedJobId, fetchJobs, jobsLoading } = useHeadhunter()
    const location = useLocation()
    const navigate = useNavigate()

    const [showArchived, setShowArchived] = useState(false)
    const [showCompanyProfile, setShowCompanyProfile] = useState(false)
    const [showCreateJobModal, setShowCreateJobModal] = useState(false)

    const role = localStorage.getItem('role')
    const companyName = localStorage.getItem('company_name')

    const closeMobileSidebar = () => {
        setIsMobileOpen(false)
    }

    const currentPath = location.pathname
    const [selectedDepartment, setSelectedDepartment] = useState("All")
    const [expandedDepts, setExpandedDepts] = useState({});

    const toggleDept = (dept) => {
        setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
    };

    const departments = ["All", ...new Set((jobs || []).map(j => j.department).filter(Boolean))]

    const displayedJobs = (jobs || []).filter(j => {
        const matchesArchive = showArchived ? !j.is_active : j.is_active
        const matchesDept = selectedDepartment === "All" || j.department === selectedDepartment
        return matchesArchive && matchesDept
    })

    const handleNavigation = (path, jobId = null) => {
        if (jobId !== undefined) setSelectedJobId(jobId)
        navigate(path)
        closeMobileSidebar()
    }

    const handleCreateJob = async (jobData, selectedMatches) => {
        try {
            const res = await axios.post('/api/jobs/', jobData)
            const newJob = res.data

            if (selectedMatches && selectedMatches.length > 0) {
                await Promise.all(selectedMatches.map(cvId =>
                    axios.post('/api/applications/', { cv_id: cvId, job_id: newJob.id })
                ))
            }

            await fetchJobs()
            setShowCreateJobModal(false)
            handleNavigation("/pipeline", newJob.id)
        } catch (e) {
            console.error("Failed to create job", e)
            alert("Failed to create job")
        }
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-slate-900/50 z-40 transition-opacity"
                    onClick={closeMobileSidebar}
                />
            )}

            {/* Sidebar */}
            <div className={`
                w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-50
                fixed md:static inset-y-0 left-0
                transform transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Mobile Close Button */}
                <button
                    onClick={closeMobileSidebar}
                    className="md:hidden absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition"
                    aria-label="Close menu"
                >
                    <X size={20} className="text-slate-600" />
                </button>

                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-extrabold text-indigo-600 flex items-center gap-2"><BrainCircuit className="w-7 h-7" /> Headhunter</h1>
                    {companyName && <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{companyName}</div>}
                    {role && <div className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full w-fit mt-2 capitalize">{role}</div>}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {role !== 'super_admin' && (
                        <>
                            <button onClick={() => handleNavigation("/")}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${currentPath === "/" ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                                <LayoutDashboard size={18} /> Dashboard
                            </button>

                            <div className="mt-6 px-3 flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{showArchived ? "Archived" : "Pipelines"}</span>
                                <button onClick={() => setShowArchived(!showArchived)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full transition">
                                    {showArchived ? <><BriefcaseIcon size={10} /> Show Active</> : <><Archive size={10} /> Archived</>}
                                </button>
                            </div>



                            <button onClick={() => handleNavigation("/pipeline", null)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${currentPath === "/pipeline" && !selectedJobId ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                                <Layers size={18} /> General Pool
                            </button>

                            {/* SIDEBAR JOB LIST */}
                            {(() => {
                                const groupedJobs = displayedJobs.reduce((acc, job) => {
                                    const dept = job.department || "Uncategorized";
                                    if (!acc[dept]) acc[dept] = [];
                                    acc[dept].push(job);
                                    return acc;
                                }, {});

                                return Object.entries(groupedJobs).map(([dept, deptJobs]) => {
                                    const isExpanded = expandedDepts[dept] !== false; // Default to true

                                    return (
                                        <div key={dept} className="mb-2">
                                            <button
                                                onClick={() => toggleDept(dept)}
                                                className="w-full px-2 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between hover:bg-slate-50 rounded transition group"
                                            >
                                                <span className="flex items-center gap-1">
                                                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    {dept}
                                                </span>
                                                <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded text-[9px] group-hover:bg-slate-200 transition">{deptJobs.length}</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="pl-2 space-y-0.5 mt-0.5 border-l border-slate-100 ml-1.5">
                                                    {deptJobs.map(job => (
                                                        <div
                                                            key={job.id}
                                                            onClick={() => handleNavigation("/pipeline", job.id)}
                                                            className={`w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium transition cursor-pointer border border-transparent ${currentPath === "/pipeline" && selectedJobId === job.id ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50 hover:border-slate-200'}`}
                                                        >
                                                            <span className={`truncate flex items-center gap-2 ${!job.is_active ? 'line-through opacity-70' : ''}`}>
                                                                {!job.is_active && <Lock size={12} />} {job.title}
                                                            </span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedJobId === job.id ? 'bg-white text-indigo-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>{job.candidate_count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}

                            {jobsLoading && (
                                <div className="space-y-2 px-2 mt-2">
                                    <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                                    <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div>
                                    <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse"></div>
                                </div>
                            )}

                            {/* New Pipeline Button */}
                            {!showArchived && <button onClick={() => setShowCreateJobModal(true)} className="w-full flex items-center gap-2 p-2.5 text-sm text-slate-500 hover:text-indigo-600 mt-2 hover:bg-indigo-50 rounded-lg transition font-medium"><Plus size={16} /> New Pipeline</button>}
                        </>
                    )}

                    {role === 'super_admin' && (
                        <button onClick={() => handleNavigation("/super-admin")}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition ${currentPath === "/super-admin" ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <Building2 size={18} /> Global Dashboard
                        </button>
                    )}
                </div >
                <div className="p-4 border-t border-slate-100">
                    {role === 'admin' && (
                        <>
                            <button onClick={() => setShowCompanyProfile(true)} className="w-full flex items-center gap-2 p-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition mb-1">
                                <Building2 size={16} /> Company Profile
                            </button>
                            <button onClick={() => handleNavigation("/settings")} className={`w-full flex items-center gap-2 p-2.5 text-sm transition rounded-lg ${currentPath === "/settings" ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 font-medium' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                <Settings size={16} /> Workflow Settings
                            </button>
                        </>
                    )}
                    <button onClick={logout} className="w-full flex items-center gap-2 p-2.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition mt-1"><LogOut size={16} /> Sign Out</button>

                    {/* Version & Attribution */}
                    <div className="mt-4 pt-4 border-t border-slate-100 text-center space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">v1.5.0</div>
                        <div className="text-[9px] text-slate-400">Powered by ChatGPT 5.1</div>
                    </div>
                </div>
            </div >

            {/* Modals */}
            {showCompanyProfile && <CompanyProfileModal onClose={() => setShowCompanyProfile(false)} />}
            {showCreateJobModal && <CreateJobModal onClose={() => setShowCreateJobModal(false)} onCreate={handleCreateJob} />}
        </>
    )
}

export default Sidebar
