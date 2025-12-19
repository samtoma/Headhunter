import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Settings, Building2, Users, GitBranch, Calendar, LayoutGrid, Sliders } from 'lucide-react';

const SettingsLayout = ({ onOpenMobileSidebar }) => {
    const location = useLocation();

    const navItems = [
        { path: '/settings/general', label: 'General Options', icon: Sliders },
        { path: '/settings/profile', label: 'Company Profile', icon: Building2 },
        { path: '/settings/workflow', label: 'Workflow & Pipeline', icon: GitBranch },
        { path: '/settings/team', label: 'Team Management', icon: Users },
        { path: '/settings/departments', label: 'Departments', icon: LayoutGrid },
        { path: '/settings/calendar', label: 'Calendar', icon: Calendar },
    ];

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-50">
            {/* Settings Sidebar */}
            <div className="w-full md:w-64 bg-white border-r border-slate-200 overflow-y-auto flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="text-indigo-600" size={24} />
                        Settings
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Manage workspace preferences</p>
                </div>

                <div className="p-3 space-y-1 flex-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${isActive
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <item.icon size={18} />
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                {/* Mobile Header for Sidebar Toggle */}
                <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-3">
                    <button onClick={onOpenMobileSidebar} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <LayoutGrid size={20} />
                    </button>
                    <span className="font-bold text-slate-900">Settings</span>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default SettingsLayout;
