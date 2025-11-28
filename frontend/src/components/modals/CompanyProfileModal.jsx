import { useState, useEffect } from 'react'
import axios from 'axios'
import { Building2, X, Sparkles, Loader2, Users, Target, Share2 } from 'lucide-react'

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

const CompanyProfileModal = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState("basic")
    const [loading, setLoading] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
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

    useEffect(() => {
        axios.get('/api/company/profile').then(res => {
            const loadedData = res.data
            // Parse JSON arrays to comma-separated strings for display
            if (loadedData.values) {
                loadedData.values = parseJsonArray(loadedData.values)
            }
            if (loadedData.specialties) {
                loadedData.specialties = parseJsonArray(loadedData.specialties)
            }
            setData(loadedData)
        })
    }, [])

    const save = async () => {
        setLoading(true)
        try {
            // Convert comma-separated strings to JSON arrays for backend
            const saveData = {
                ...data,
                values: data.values ? toJsonArray(data.values) : "",
                specialties: data.specialties ? toJsonArray(data.specialties) : ""
            }
            await axios.put('/api/company/profile', saveData)
            onClose()
        } catch (err) {
            console.error(err)
            alert("Failed to save company profile. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleRegenerate = async () => {
        if (!data.website) {
            alert("Please enter a website URL first")
            return
        }

        setRegenerating(true)
        try {
            const res = await axios.post('/api/company/regenerate', { url: data.website })
            // Parse arrays for display
            const newData = res.data
            if (newData.values) newData.values = parseJsonArray(newData.values)
            if (newData.specialties) newData.specialties = parseJsonArray(newData.specialties)
            setData(prev => ({ ...prev, ...newData }))
            alert("Company profile regenerated successfully!")
        } catch (err) {
            console.error(err)
            alert("Failed to regenerate profile. Please try again.")
        } finally {
            setRegenerating(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="text-indigo-500" /> Company Profile
                    </h2>
                    <button onClick={onClose}>
                        <X className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-slate-200 px-6">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab("basic")}
                            className={`pb-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === "basic" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Building2 size={16} /> Basic Info
                        </button>
                        <button
                            onClick={() => setActiveTab("about")}
                            className={`pb-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === "about" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Users size={16} /> About
                        </button>
                        <button
                            onClick={() => setActiveTab("business")}
                            className={`pb-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === "business" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Target size={16} /> Business
                        </button>
                        <button
                            onClick={() => setActiveTab("social")}
                            className={`pb-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === "social" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Share2 size={16} /> Social
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "basic" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Name</label>
                                    <input className="w-full p-2 border rounded-lg text-sm" value={data.name || ""} onChange={e => setData({ ...data, name: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Website URL</label>
                                    <input className="w-full p-2 border rounded-lg text-sm" value={data.website || ""} onChange={e => setData({ ...data, website: e.target.value })} placeholder="https://example.com" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tagline</label>
                                    <input className="w-full p-2 border rounded-lg text-sm" value={data.tagline || ""} onChange={e => setData({ ...data, tagline: e.target.value })} placeholder="Short company tagline" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Industry</label>
                                    <input className="w-full p-2 border rounded-lg text-sm" value={data.industry || ""} onChange={e => setData({ ...data, industry: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Founded Year</label>
                                    <input type="number" className="w-full p-2 border rounded-lg text-sm" value={data.founded_year || ""} onChange={e => setData({ ...data, founded_year: parseInt(e.target.value) || null })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Size</label>
                                    <select className="w-full p-2 border rounded-lg text-sm bg-white" value={data.company_size || ""} onChange={e => setData({ ...data, company_size: e.target.value })}>
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
                                    <input className="w-full p-2 border rounded-lg text-sm" value={data.headquarters || ""} onChange={e => setData({ ...data, headquarters: e.target.value })} placeholder="City, Country" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Type</label>
                                    <select className="w-full p-2 border rounded-lg text-sm bg-white" value={data.company_type || ""} onChange={e => setData({ ...data, company_type: e.target.value })}>
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

                    {activeTab === "about" && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Description</label>
                                <textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.description || ""} onChange={e => setData({ ...data, description: e.target.value })} placeholder="What does your company do?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mission Statement</label>
                                <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.mission || ""} onChange={e => setData({ ...data, mission: e.target.value })} placeholder="What do you aim to achieve?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Vision Statement</label>
                                <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.vision || ""} onChange={e => setData({ ...data, vision: e.target.value })} placeholder="Where do you want to be?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Culture & Work Environment</label>
                                <textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.culture || ""} onChange={e => setData({ ...data, culture: e.target.value })} placeholder="Describe your company culture" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Core Values (comma-separated)</label>
                                <input className="w-full p-2 border rounded-lg text-sm" value={data.values || ""} onChange={e => setData({ ...data, values: e.target.value })} placeholder="Innovation, Integrity, Teamwork" />
                            </div>
                        </div>
                    )}

                    {activeTab === "business" && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Products & Services</label>
                                <textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.products_services || ""} onChange={e => setData({ ...data, products_services: e.target.value })} placeholder="Describe your main products and services" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Target Market</label>
                                <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.target_market || ""} onChange={e => setData({ ...data, target_market: e.target.value })} placeholder="Who are your target customers?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Competitive Advantage</label>
                                <textarea className="w-full p-2 border rounded-lg text-sm h-20" value={data.competitive_advantage || ""} onChange={e => setData({ ...data, competitive_advantage: e.target.value })} placeholder="What makes you unique?" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Specialties (comma-separated)</label>
                                <input className="w-full p-2 border rounded-lg text-sm" value={data.specialties || ""} onChange={e => setData({ ...data, specialties: e.target.value })} placeholder="AI, Machine Learning, Cloud Computing" />
                            </div>
                        </div>
                    )}

                    {activeTab === "social" && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">LinkedIn URL</label>
                                <input className="w-full p-2 border rounded-lg text-sm" value={data.social_linkedin || ""} onChange={e => setData({ ...data, social_linkedin: e.target.value })} placeholder="https://linkedin.com/company/..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Twitter/X URL</label>
                                <input className="w-full p-2 border rounded-lg text-sm" value={data.social_twitter || ""} onChange={e => setData({ ...data, social_twitter: e.target.value })} placeholder="https://twitter.com/..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Facebook URL</label>
                                <input className="w-full p-2 border rounded-lg text-sm" value={data.social_facebook || ""} onChange={e => setData({ ...data, social_facebook: e.target.value })} placeholder="https://facebook.com/..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Logo URL</label>
                                <input className="w-full p-2 border rounded-lg text-sm" value={data.logo_url || ""} onChange={e => setData({ ...data, logo_url: e.target.value })} placeholder="https://..." />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex justify-between items-center">
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating || !data.website}
                        className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {regenerating ? "Regenerating..." : "Regenerate with AI"}
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700">Cancel</button>
                        <button
                            onClick={save}
                            disabled={loading}
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Save Profile"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CompanyProfileModal
