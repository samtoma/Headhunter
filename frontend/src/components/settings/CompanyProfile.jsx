import { useState, useEffect } from 'react'
import axios from 'axios'
import { Building2, Sparkles, Users, Target, Share2, Save, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import SettingsTabs from '../common/SettingsTabs'
import CompanyProfileGenerator from '../ai/CompanyProfileGenerator'

import PageHeader from '../layout/PageHeader'

// Helper functions to handle JSON arrays
const parseJsonArray = (jsonString) => {
    if (!jsonString) return ""
    try {
        const parsed = JSON.parse(jsonString)
        return Array.isArray(parsed) ? parsed.join(", ") : jsonString
    } catch {
        return jsonString
    }
}

const toJsonArray = (commaString) => {
    if (!commaString) return ""
    const items = commaString.split(',').map(s => s.trim()).filter(s => s)
    return JSON.stringify(items)
}

const CompanyProfile = ({ onOpenMobileSidebar }) => {
    const [activeTab, setActiveTab] = useState("basic")
    const [loading, setLoading] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [showGenerator, setShowGenerator] = useState(false)
    const [data, setData] = useState({
        name: "",
        tagline: "",
        industry: "",
        description: "",
        culture: "",
        mission: "",
        vision: "",
        values: "",
        founded_year: null,
        company_size: "",
        headquarters: "",
        company_type: "",
        specialties: "",
        products_services: "",
        target_market: "",
        competitive_advantage: "",
        social_linkedin: "",
        social_twitter: "",
        social_facebook: "",
        logo_url: "",
        website: ""
    })

    const [newDept, setNewDept] = useState("")

    useEffect(() => {
        axios.get('/api/company/profile').then(res => {
            const loadedData = res.data
            if (loadedData.values) loadedData.values = parseJsonArray(loadedData.values)
            if (loadedData.specialties) loadedData.specialties = parseJsonArray(loadedData.specialties)
            if (loadedData.departments) loadedData.departments = parseJsonArray(loadedData.departments)
            setData(loadedData)
        }).catch(err => console.error("Failed to load company profile", err))
    }, [])

    const { updateUser, user } = useAuth()
    const canEdit = user?.role === 'admin' || user?.role === 'super_admin';

    const save = async () => {
        setLoading(true)
        try {
            const saveData = {
                ...data,
                values: data.values ? toJsonArray(data.values) : "",
                specialties: data.specialties ? toJsonArray(data.specialties) : "",
                departments: data.departments ? toJsonArray(data.departments) : ""
            }
            await axios.put('/api/company/profile', saveData)

            // Immediate update for UI
            updateUser({ company_name: data.name })
            alert('Profile saved successfully');
        } catch (err) {
            console.error(err)
            alert("Failed to save company profile. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleAddDept = () => {
        if (!newDept.trim()) return
        const currentDepts = data.departments ? data.departments.split(',').map(s => s.trim()) : []
        if (!currentDepts.includes(newDept.trim())) {
            const updated = [...currentDepts, newDept.trim()].join(', ')
            setData({ ...data, departments: updated })
        }
        setNewDept("")
    }

    const handleRemoveDept = (dept) => {
        const currentDepts = data.departments ? data.departments.split(',').map(s => s.trim()) : []
        const updated = currentDepts.filter(d => d !== dept).join(', ')
        setData({ ...data, departments: updated })
    }

    const handleRegenerate = () => {
        if (!data.website) return
        setShowGenerator(true)
    }

    // Handle generation completion
    const handleGenerationComplete = (generatedData) => {
        const loadedData = generatedData
        if (loadedData.values) loadedData.values = parseJsonArray(loadedData.values)
        if (loadedData.specialties) loadedData.specialties = parseJsonArray(loadedData.specialties)
        if (loadedData.departments) loadedData.departments = parseJsonArray(loadedData.departments)
        setData(loadedData)
        setShowGenerator(false)
    }

    // Handle generation cancellation
    const handleGenerationCancel = () => {
        setShowGenerator(false)
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <PageHeader
                title="Company Profile"
                subtitle="Manage your company branding and details."
                icon={Building2}
                onOpenMobileSidebar={onOpenMobileSidebar}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-5xl mx-auto space-y-6">

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                        {/* Tab Navigation */}
                        <SettingsTabs
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            tabs={[
                                { id: "basic", label: "Basic Info", icon: Building2 },
                                { id: "departments", label: "Departments", icon: Users },
                                { id: "about", label: "About", icon: Target },
                                { id: "business", label: "Business", icon: Target },
                                { id: "social", label: "Social", icon: Share2 }
                            ]}
                        />

                        {/* Tab Content */}
                        <div className="p-6">
                            {activeTab === "basic" && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Name</label>
                                            <input className="w-full p-2 border rounded-lg text-sm" value={data.name || ""} onChange={e => setData({ ...data, name: e.target.value })} disabled={!canEdit} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Website URL</label>
                                            <input className="w-full p-2 border rounded-lg text-sm" value={data.website || ""} onChange={e => setData({ ...data, website: e.target.value })} placeholder="https://example.com" disabled={!canEdit} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tagline</label>
                                            <input className="w-full p-2 border rounded-lg text-sm" value={data.tagline || ""} onChange={e => setData({ ...data, tagline: e.target.value })} placeholder="Short company tagline" disabled={!canEdit} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Industry</label>
                                            <input className="w-full p-2 border rounded-lg text-sm" value={data.industry || ""} onChange={e => setData({ ...data, industry: e.target.value })} disabled={!canEdit} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Founded Year</label>
                                            <input type="number" className="w-full p-2 border rounded-lg text-sm" value={data.founded_year || ""} onChange={e => setData({ ...data, founded_year: parseInt(e.target.value) || null })} disabled={!canEdit} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Size</label>
                                            <select className="w-full p-2 border rounded-lg text-sm bg-white" value={data.company_size || ""} onChange={e => setData({ ...data, company_size: e.target.value })} disabled={!canEdit}>
                                                <option value="">Select size</option>
                                                <option value="1-10">1-10 employees</option>
                                                <option value="11-50">11-50 employees</option>
                                                <option value="51-200">51-200 employees</option>
                                                <option value="201-500">201-500 employees</option>
                                                <option value="501-1000">501-1000 employees</option>
                                                <option value="1000+">1000+ employees</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Headquarters</label>
                                            <input className="w-full p-2 border rounded-lg text-sm" value={data.headquarters || ""} onChange={e => setData({ ...data, headquarters: e.target.value })} placeholder="City, Country" disabled={!canEdit} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Type</label>
                                            <select className="w-full p-2 border rounded-lg text-sm bg-white" value={data.company_type || ""} onChange={e => setData({ ...data, company_type: e.target.value })} disabled={!canEdit}>
                                                <option value="">Select type</option>
                                                <option value="Private">Private</option>
                                                <option value="Public">Public</option>
                                                <option value="Startup">Startup</option>
                                                <option value="Non-profit">Non-profit</option>
                                                <option value="Government">Government</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "departments" && (
                                <div className="space-y-6">
                                    {canEdit && (
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <h3 className="text-sm font-bold text-slate-800 mb-2">Manage Departments</h3>
                                            <p className="text-xs text-slate-500 mb-4">Add departments to organize your jobs and pipelines.</p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 p-2 border rounded-lg text-sm"
                                                    placeholder="e.g. Engineering, Sales, Marketing"
                                                    value={newDept}
                                                    onChange={e => setNewDept(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddDept()}
                                                />
                                                <button
                                                    onClick={handleAddDept}
                                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 text-sm"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">Current Departments</label>
                                        <div className="flex flex-wrap gap-2">
                                            {data.departments && data.departments.split(',').map(dept => dept.trim()).filter(d => d).map((dept, idx) => (
                                                <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
                                                    <span>{dept}</span>
                                                    {canEdit && (
                                                        <button onClick={() => handleRemoveDept(dept)} className="text-slate-400 hover:text-red-500">
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {(!data.departments || !data.departments.trim()) && (
                                                <span className="text-sm text-slate-400 italic">No departments added yet.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "about" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                                        <textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.description || ""} onChange={e => setData({ ...data, description: e.target.value })} placeholder="What does your company do?" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mission Statement</label>
                                        <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.mission || ""} onChange={e => setData({ ...data, mission: e.target.value })} placeholder="What do you aim to achieve?" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Vision Statement</label>
                                        <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.vision || ""} onChange={e => setData({ ...data, vision: e.target.value })} placeholder="Where do you want to be?" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Culture & Work Environment</label>
                                        <textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.culture || ""} onChange={e => setData({ ...data, culture: e.target.value })} placeholder="Describe your company culture" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Core Values (comma-separated)</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={data.values || ""} onChange={e => setData({ ...data, values: e.target.value })} placeholder="Innovation, Integrity, Teamwork" disabled={!canEdit} />
                                    </div>
                                </div>
                            )}

                            {activeTab === "business" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Products & Services</label>
                                        <textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.products_services || ""} onChange={e => setData({ ...data, products_services: e.target.value })} placeholder="Describe your main products and services" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Target Market</label>
                                        <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.target_market || ""} onChange={e => setData({ ...data, target_market: e.target.value })} placeholder="Who are your target customers?" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Competitive Advantage</label>
                                        <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.competitive_advantage || ""} onChange={e => setData({ ...data, competitive_advantage: e.target.value })} placeholder="What makes you unique?" disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Specialties (comma-separated)</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={data.specialties || ""} onChange={e => setData({ ...data, specialties: e.target.value })} placeholder="AI, Machine Learning, Cloud Computing" disabled={!canEdit} />
                                    </div>
                                </div>
                            )}

                            {activeTab === "social" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">LinkedIn URL</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={data.social_linkedin || ""} onChange={e => setData({ ...data, social_linkedin: e.target.value })} placeholder="https://linkedin.com/company/..." disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Twitter/X URL</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={data.social_twitter || ""} onChange={e => setData({ ...data, social_twitter: e.target.value })} placeholder="https://twitter.com/..." disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Facebook URL</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={data.social_facebook || ""} onChange={e => setData({ ...data, social_facebook: e.target.value })} placeholder="https://facebook.com/..." disabled={!canEdit} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Logo URL</label>
                                        <input className="w-full p-2 border rounded-lg text-sm" value={data.logo_url || ""} onChange={e => setData({ ...data, logo_url: e.target.value })} placeholder="https://..." disabled={!canEdit} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Company Profile Generator */}
                        {showGenerator && (
                            <div className="p-6 border-t border-slate-200">
                                <CompanyProfileGenerator
                                    url={data.website}
                                    onComplete={handleGenerationComplete}
                                    onCancel={handleGenerationCancel}
                                />
                            </div>
                        )}

                        {/* Footer */}
                        {canEdit && (
                            <div className="p-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="w-full md:w-auto">
                                    {!showGenerator && (
                                        <button
                                            onClick={handleRegenerate}
                                            disabled={regenerating || !data.website}
                                            className="w-full md:w-auto justify-center text-sm flex items-center gap-1.5 text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-2 rounded-lg transition disabled:opacity-50"
                                        >
                                            <Sparkles className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                                            <span>Regenerate with AI</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button
                                        onClick={save}
                                        disabled={loading}
                                        className="flex-1 md:flex-none px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-center flex items-center gap-2"
                                    >
                                        {loading ? "Saving..." : <><Save size={16} /> Save Profile</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CompanyProfile
