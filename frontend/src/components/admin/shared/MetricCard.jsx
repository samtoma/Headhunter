import React from 'react'

/**
 * MetricCard component for displaying key performance indicators in the Admin Dashboard.
 * 
 * @param {Object} props
 * @param {string} props.title - The label for the metric
 * @param {string|number} props.value - The value to display
 * @param {React.ElementType} props.icon - Lucide icon component
 * @param {string} props.color - Color theme for the icon background (indigo, red, blue, green, amber, slate)
 */
const MetricCard = ({ title, value, icon: Icon, color = 'indigo' }) => {
    // Map color prop to Tailwind classes for icon container
    const colorClasses = {
        indigo: "bg-indigo-100 text-indigo-600",
        red: "bg-red-100 text-red-600",
        blue: "bg-blue-100 text-blue-600",
        green: "bg-emerald-100 text-emerald-600",
        amber: "bg-amber-100 text-amber-600",
        slate: "bg-slate-100 text-slate-600"
    }

    const selectedColorClass = colorClasses[color] || colorClasses.indigo

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${selectedColorClass}`}>
                {Icon && <Icon size={24} />}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{value}</h3>
            </div>
        </div>
    )
}

export default MetricCard
