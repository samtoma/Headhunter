import { useState } from 'react'
import axios from 'axios'
import { Globe, Sparkles, Check, Loader2 } from 'lucide-react'

const CompanySetupWizard = ({ onComplete }) => {
    const [step, setStep] = useState(1)
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({
        name: localStorage.getItem('company_name') || "",
        industry: "",
        description: "",
        culture: ""
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
            await axios.put('/api/company/profile', data)
            onComplete()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100">
                {step === 1 ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Welcome to {data.name}</h1>
                            <p className="text-slate-500 mt-2">Let's set up your company profile using AI.</p>
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
                            <p className="text-xs text-slate-400 mt-1">We'll scan your website to auto-fill your profile.</p>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Company Name</label>
                                <input
                                    value={data.name}
                                    onChange={e => setData({ ...data, name: e.target.value })}
                                    className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Industry</label>
                                <input
                                    value={data.industry}
                                    onChange={e => setData({ ...data, industry: e.target.value })}
                                    className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={e => setData({ ...data, description: e.target.value })}
                                    rows={3}
                                    className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Culture & Values</label>
                                <textarea
                                    value={data.culture}
                                    onChange={e => setData({ ...data, culture: e.target.value })}
                                    rows={3}
                                    className="w-full p-2 rounded border border-slate-200 focus:border-indigo-500 outline-none"
                                />
                            </div>
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
