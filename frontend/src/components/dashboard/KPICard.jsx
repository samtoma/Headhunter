import React from 'react'

const KPICard = ({ title, value, icon, color }) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
        <div className={`p-3 rounded-xl shadow-md ${color}`}>{icon}</div>
        <div><div className="text-sm font-bold text-slate-400 uppercase">{title}</div><div className="text-2xl font-extrabold text-slate-900">{value}</div></div>
    </div>
)

export default KPICard
