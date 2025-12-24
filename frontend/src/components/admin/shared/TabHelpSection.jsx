import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

/**
 * Collapsible help section for Admin Dashboard tabs
 * Matches the "Master Control Center" design from Overview tab
 * @param {string} title - Section title
 * @param {string} storageKey - LocalStorage key for persistence
 * @param {Array} items - Array of {term, description} objects
 */
const TabHelpSection = ({ title, storageKey, items }) => {
    // Check localStorage for visibility preference
    const [isVisible, setIsVisible] = useState(() => {
        const stored = localStorage.getItem(`admin_help_${storageKey}_visible`)
        return stored !== 'false'
    })

    const [isExpanded, setIsExpanded] = useState(() => {
        const stored = localStorage.getItem(`admin_help_${storageKey}_expanded`)
        return stored !== 'false'
    })

    // Persist visibility to localStorage
    useEffect(() => {
        localStorage.setItem(`admin_help_${storageKey}_visible`, isVisible.toString())
    }, [isVisible, storageKey])

    // Persist expanded state to localStorage
    useEffect(() => {
        localStorage.setItem(`admin_help_${storageKey}_expanded`, isExpanded.toString())
    }, [isExpanded, storageKey])

    if (!isVisible) return null

    return (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-6 py-4 relative animate-in fade-in duration-300 mb-6">
            {/* Control buttons */}
            <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-full transition"
                    title={isExpanded ? "Minimize" : "Expand"}
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-white rounded-full transition"
                    title="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold text-indigo-900 mb-2 pr-16">{title}</h2>

            {/* Expandable content */}
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    {items.map((item, index) => (
                        <div key={index}>
                            <h3 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                {item.term}
                            </h3>
                            <p className="text-indigo-700/80">{item.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default TabHelpSection
