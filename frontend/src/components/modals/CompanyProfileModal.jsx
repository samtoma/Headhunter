import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Building2, X } from 'lucide-react'

const CompanyProfileModal = ({ onClose }) => {
    const [data, setData] = useState({ name: "", industry: "", description: "", culture: "" })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('/api/jobs/company').then(res => { setData(res.data); setLoading(false) })
    }, [])

    const save = async () => {
        await axios.post('/api/jobs/company', data)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Building2 className="text-indigo-500" /> Company Profile</h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Company Name</label><input className="w-full p-2 border rounded-lg text-sm" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Industry</label><input className="w-full p-2 border rounded-lg text-sm" value={data.industry} onChange={e => setData({ ...data, industry: e.target.value })} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">About (Description)</label><textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.description} onChange={e => setData({ ...data, description: e.target.value })} placeholder="What do you do?" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Culture & Values</label><textarea className="w-full p-2 border rounded-lg text-sm h-24" value={data.culture} onChange={e => setData({ ...data, culture: e.target.value })} placeholder="e.g. Performance driven, remote friendly..." /></div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold">Cancel</button>
                    <button onClick={save} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg">Save Profile</button>
                </div>
            </div>
        </div>
    )
}

export default CompanyProfileModal
