import React from 'react';
import { Menu } from 'lucide-react';

const PageHeader = ({ title, subtitle, actions, onOpenMobileSidebar, children, icon: Icon }) => {
    return (
        <div className="min-h-[4rem] bg-white border-b border-slate-200 px-4 md:px-6 flex flex-wrap items-center justify-between shrink-0 sticky top-0 z-20 gap-4 py-3">
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    onClick={onOpenMobileSidebar}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                >
                    <Menu size={20} />
                </button>
                <div>
                    <div className="text-lg font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
                        {Icon && <Icon size={20} className="text-indigo-600" />}
                        {title}
                    </div>
                    {subtitle && <p className="text-xs text-slate-500 hidden md:block">{subtitle}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {actions}
                {children}
            </div>
        </div>
    );
};

export default PageHeader;
