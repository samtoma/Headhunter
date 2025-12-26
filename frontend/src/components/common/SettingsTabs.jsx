

const SettingsTabs = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="border-b border-slate-200 bg-white px-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-6 min-w-max">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                                ${isActive
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }
                            `}
                        >
                            {Icon && <Icon size={16} className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"} />}
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SettingsTabs;
