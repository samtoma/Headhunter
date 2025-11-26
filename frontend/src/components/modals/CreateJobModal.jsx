import React, { useState } from 'react'
import axios from 'axios'
import { Sparkles, X, RefreshCw, Users, CheckSquare, Square, Award } from 'lucide-react'
import { safeList } from '../../utils/helpers'

const CreateJobModal = ({ onClose, onCreate }) => {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({ title: "", department: "", description: "", required_experience: 0, skills_required: [] })
    const [matches, setMatches] = useState([])
    const [selectedMatches, setSelectedMatches] = useState([])

    const runInitialAnalysis = async () => {
        if (!data.title) return
        setLoading(true)
        try {
            const res = await axios.post('/api/jobs/analyze', { title: data.title })
            setData(prev => ({ ...prev, ...res.data }))

            await refreshCandidates({ ...data, ...res.data })

            setStep(2)
        } catch (e) { alert("AI Analysis Failed") }
        setLoading(false)
    }

    const refreshCandidates = async (jobData) => {
        setLoading(true)
        try {
            const matchRes = await axios.post('/api/jobs/matches', {
                required_experience: jobData.required_experience || 0,
                skills_required: jobData.skills_required || []
            })
            setMatches(matchRes.data)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const toggleMatch = (id) => {
        if (selectedMatches.includes(id)) {
            setSelectedMatches(selectedMatches.filter(i => i !== id))
        } else {
            setSelectedMatches([...selectedMatches, id])
        }
    }

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Sparkles className="text-indigo-500" /> New Job Pipeline</h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        {step === 1 && (
                            <div className="animate-in fade-in">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                                <div className="flex gap-2">
                                    <input className="flex-1 text-lg font-bold p-3 border border-slate-200 rounded-xl focus:ring-2 ring-indigo-500 outline-none" placeholder="e.g. Senior Product Designer" value={data.title} onChange={e => setData({ ...data, title: e.target.value })} autoFocus onKeyDown={e => e.key === 'Enter' && runInitialAnalysis()} />
                                    <button onClick={runInitialAnalysis} disabled={loading || !data.title} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50">
                                        {loading ? <RefreshCw className="animate-spin" /> : <Sparkles size={18} />} {loading ? "Analyze" : "Analyze"}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2 ml-1">AI will generate a description, required skills, and find matching candidates from your pool.</p>
                            </div>
                        )}

                        {(step === 2) && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                                <div className="flex justify-end">
                                    <button onClick={() => refreshCandidates(data)} disabled={loading} className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded transition">
                                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Candidates
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                                        <input className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={data.department} onChange={e => setData({ ...data, department: e.target.value })} placeholder="Engineering" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exp (Years)</label>
                                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={data.required_experience} onChange={e => setData({ ...data, required_experience: parseInt(e.target.value) })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Skills Required</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {safeList(data.skills_required).map((s, i) => (
                                            <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">{s} <button onClick={() => setData({ ...data, skills_required: data.skills_required.filter((_, idx) => idx !== i) })}>×</button></span>
                                        ))}
                                    </div>
                                    <input className="w-full p-2 border border-slate-200 rounded-lg text-sm" placeholder="Type & Enter to add skill..." onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const newSkill = e.target.value.trim();
                                            if (newSkill) {
                                                setData({ ...data, skills_required: [...(data.skills_required || []), newSkill] });
                                                e.target.value = "";
                                            }
                                        }
                                    }} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Description (LinkedIn Ready)</label>
                                    <textarea className="w-full p-4 border border-slate-200 rounded-xl text-sm leading-relaxed h-40 resize-none focus:ring-2 ring-indigo-500 outline-none" value={data.description} onChange={e => setData({ ...data, description: e.target.value })} />
                                </div>

                                {matches.length > 0 ? (
                                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                                        <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><Users size={16} /> Smart Candidate Match</span>
                                            <span className="text-xs font-normal text-indigo-600">{selectedMatches.length} selected</span>
                                        </h3>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {matches.map(m => (
                                                <div key={m.id} onClick={() => toggleMatch(m.id)} className={`p-2 rounded-lg border flex justify-between items-center cursor-pointer transition ${selectedMatches.includes(m.id) ? "bg-indigo-100 border-indigo-200" : "bg-white border-slate-100 hover:border-indigo-200"}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`text-indigo-600 ${selectedMatches.includes(m.id) ? "opacity-100" : "opacity-40"}`}>
                                                            {selectedMatches.includes(m.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800">{m.name}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-emerald-600">{m.score}% Match</span>
                                                                {m.status === "Silver Medalist" && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Award size={10} /> Silver Medalist</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-slate-400 text-sm italic border border-dashed border-slate-200 rounded-xl">No matching candidates found in your pool.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition">Cancel</button>
                    {step === 2 && <button onClick={() => onCreate(data, selectedMatches)} disabled={!data.title} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2">Create & Assign {selectedMatches.length > 0 && `(${selectedMatches.length})`}</button>}
                </div>
            </div>
        </div>
    )
}

export default CreateJobModal
