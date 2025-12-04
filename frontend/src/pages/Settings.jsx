import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Save, GripVertical, Settings as SettingsIcon } from 'lucide-react'

import PageHeader from '../components/layout/PageHeader'

const Settings = ({ onOpenMobileSidebar }) => {
    const [stages, setStages] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/companies/me')
            if (res.data.interview_stages) {
                try {
                    setStages(JSON.parse(res.data.interview_stages))
                } catch (e) {
                    console.error("Failed to parse stages", e)
                    setStages([])
                }
            } else {
                // Default stages if none exist
                setStages([
                    { name: "Screening", fields: [] },
                    { name: "Technical", fields: [] },
                    { name: "Culture", fields: [] },
                    { name: "Final", fields: [] }
                ])
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await axios.patch('/api/companies/me', {
                interview_stages: JSON.stringify(stages)
            })
            alert("Settings saved!")
        } catch (err) {
            console.error(err)
            alert("Failed to save settings")
        } finally {
            setSaving(false)
        }
    }

    const addStage = () => {
        setStages([...stages, { name: "New Stage", fields: [] }])
    }

    const removeStage = (index) => {
        if (confirm("Are you sure? This will affect all future interviews.")) {
            const newStages = [...stages]
            newStages.splice(index, 1)
            setStages(newStages)
        }
    }

    const updateStageName = (index, name) => {
        const newStages = [...stages]
        newStages[index].name = name
        setStages(newStages)
    }

    const addField = (stageIndex) => {
        const newStages = [...stages]
        newStages[stageIndex].fields.push({ label: "New Field", type: "text" })
        setStages(newStages)
    }

    const removeField = (stageIndex, fieldIndex) => {
        const newStages = [...stages]
        newStages[stageIndex].fields.splice(fieldIndex, 1)
        setStages(newStages)
    }

    const updateField = (stageIndex, fieldIndex, key, value) => {
        const newStages = [...stages]
        newStages[stageIndex].fields[fieldIndex][key] = value
        setStages(newStages)
    }

    if (loading) return <div className="p-8">Loading settings...</div>

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <PageHeader
                title="Interview Workflow Settings"
                subtitle="Configure your interview stages and custom evaluation fields."
                icon={SettingsIcon}
                onOpenMobileSidebar={onOpenMobileSidebar}
                actions={
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                }
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto">

                    <div className="space-y-6">
                        {stages.map((stage, sIndex) => (
                            <div key={sIndex} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-3">
                                    <GripVertical className="text-slate-400 cursor-move" size={20} />
                                    <input
                                        type="text"
                                        value={stage.name}
                                        onChange={(e) => updateStageName(sIndex, e.target.value)}
                                        className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 text-lg w-full"
                                        placeholder="Stage Name"
                                    />
                                    <button onClick={() => removeStage(sIndex)} className="text-slate-400 hover:text-red-500">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="p-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Evaluation Fields</h4>

                                    <div className="space-y-3">
                                        {stage.fields.map((field, fIndex) => (
                                            <div key={fIndex} className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={field.name}
                                                    onChange={(e) => updateField(sIndex, fIndex, "name", e.target.value)}
                                                    className="flex-1 border border-slate-200 rounded px-3 py-1.5 text-sm focus:border-indigo-500 outline-none"
                                                    placeholder="Field Label"
                                                />
                                                <select
                                                    value={field.type}
                                                    onChange={(e) => updateField(sIndex, fIndex, "type", e.target.value)}
                                                    className="border border-slate-200 rounded px-3 py-1.5 text-sm focus:border-indigo-500 outline-none bg-white"
                                                >
                                                    <option value="text">Text Input</option>
                                                    <option value="number">Number</option>
                                                    <option value="rating">1-5 Rating</option>
                                                    <option value="boolean">Yes/No</option>
                                                </select>
                                                <button onClick={() => removeField(sIndex, fIndex)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => addField(sIndex)}
                                        className="mt-4 text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800"
                                    >
                                        <Plus size={16} /> Add Field
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addStage}
                            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex justify-center items-center gap-2"
                        >
                            <Plus size={20} /> Add New Stage
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Settings
