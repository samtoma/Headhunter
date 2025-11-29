import { useState } from 'react'
import axios from 'axios'
import { Globe, Sparkles, Check, Loader2, Building2, Users, Target, Share2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

const CompanySetupWizard = () => {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("basic")
    const [data, setData] = useState({
        name: localStorage.getItem('company_name') || "",
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

    const handleExtract = async () => {
        if (!url) return
        setLoading(true)
        try {
            const res = await axios.post('/api/company/extract_info', { url })
            setData(prev => ({ ...prev, ...res.data, website: url }))
            setStep(2)
        } catch (err) {
            console.error(err)
            // Move to next step anyway to let user fill manually
            setStep(2)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // Convert comma-separated strings to JSON arrays for backend
            const saveData = {
                ...data,
                values: data.values ? toJsonArray(data.values) : "",
                specialties: data.specialties ? toJsonArray(data.specialties) : ""
            }
            await axios.put('/api/company/profile', saveData)
            navigate('/')
        } catch (err) {
            console.error(err)
            alert("Failed to save company profile. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-4xl border border-slate-100">
                {step === 1 ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Welcome to {data.name}</h1>
                            <p className="text-slate-500 mt-2">Let&apos;s set up your company profile using AI.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company Website</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                                <input
                                    type="url"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">We&apos;ll scan your website to auto-fill your profile.</p>
                        </div>

                        <button
                            onClick={handleExtract}
                            disabled={loading || !url}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {loading ? "Analyzing Website..." : "Auto-Fill with AI"}
                        </button>

                        <button
                            onClick={() => setStep(2)}
                            className="w-full text-slate-500 text-sm hover:text-slate-700"
                        >
                            Skip and fill manually
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Review Company Profile</h2>
                            <p className="text-slate-500 text-sm">Make sure everything looks correct.</p>
                        </div>

                        {/* Tab Navigation */}
                        <div className="border-b border-slate-200">
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
                        <div className="max-h-[500px] overflow-y-auto">
                            {activeTab === "basic" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Company Name *</label>
                                        <input value={data.name || ""} onChange={e => setData({ ...data, name: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Tagline</label>
                                        <input value={data.tagline || ""} onChange={e => setData({ ...data, tagline: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="Short company tagline" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Industry</label>
                                        <input value={data.industry || ""} onChange={e => setData({ ...data, industry: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Founded Year</label>
                                        <input type="number" value={data.founded_year || ""} onChange={e => setData({ ...data, founded_year: parseInt(e.target.value) || null })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="2020" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Company Size</label>
                                        <select value={data.company_size || ""} onChange={e => setData({ ...data, company_size: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none bg-white">
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
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Headquarters</label>
                                        <input value={data.headquarters || ""} onChange={e => setData({ ...data, headquarters: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="City, Country" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Company Type</label>
                                        <select value={data.company_type || ""} onChange={e => setData({ ...data, company_type: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none bg-white">
                                            <option value="">Select type</option>
                                            <option value="Private">Private</option>
                                            <option value="Public">Public</option>
                                            <option value="Startup">Startup</option>
                                            <option value="Non-profit">Non-profit</option>
                                            <option value="Government">Government</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === "about" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Description</label>
                                        <textarea value={data.description || ""} onChange={e => setData({ ...data, description: e.target.value })} rows={4} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="What does your company do?" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Mission Statement</label>
                                        <textarea value={data.mission || ""} onChange={e => setData({ ...data, mission: e.target.value })} rows={3} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="What do you aim to achieve?" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Vision Statement</label>
                                        <textarea value={data.vision || ""} onChange={e => setData({ ...data, vision: e.target.value })} rows={3} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="Where do you want to be in the future?" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Culture & Values</label>
                                        <textarea value={data.culture || ""} onChange={e => setData({ ...data, culture: e.target.value })} rows={3} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="Describe your company culture" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Core Values (comma-separated)</label>
                                        <input value={parseJsonArray(data.values)} onChange={e => setData({ ...data, values: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="Innovation, Integrity, Teamwork" />
                                    </div>
                                </div>
                            )}

                            {activeTab === "business" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Products & Services</label>
                                        <textarea value={data.products_services || ""} onChange={e => setData({ ...data, products_services: e.target.value })} rows={4} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="Describe your main products and services" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Target Market</label>
                                        <textarea value={data.target_market || ""} onChange={e => setData({ ...data, target_market: e.target.value })} rows={3} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="Who are your target customers?" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Competitive Advantage</label>
                                        <textarea value={data.competitive_advantage || ""} onChange={e => setData({ ...data, competitive_advantage: e.target.value })} rows={3} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="What makes you unique?" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Specialties (comma-separated)</label>
                                        <input value={parseJsonArray(data.specialties)} onChange={e => setData({ ...data, specialties: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="AI, Machine Learning, Cloud Computing" />
                                    </div>
                                </div>
                            )}

                            {activeTab === "social" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">LinkedIn URL</label>
                                        <input value={data.social_linkedin || ""} onChange={e => setData({ ...data, social_linkedin: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="https://linkedin.com/company/..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Twitter/X URL</label>
                                        <input value={data.social_twitter || ""} onChange={e => setData({ ...data, social_twitter: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="https://twitter.com/..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Facebook URL</label>
                                        <input value={data.social_facebook || ""} onChange={e => setData({ ...data, social_facebook: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="https://facebook.com/..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Logo URL</label>
                                        <input value={data.logo_url || ""} onChange={e => setData({ ...data, logo_url: e.target.value })} className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none" placeholder="https://..." />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            Save & Continue to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CompanySetupWizard
