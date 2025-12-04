import { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Plus, Trash2, Code2, FileText, Sparkles, Loader2 } from 'lucide-react'

const DepartmentModal = ({ isOpen, onClose, department, onSave }) => {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        technologies: [],
        job_templates: []
    })
    const [techInput, setTechInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)

    useEffect(() => {
        if (department) {
            setFormData({
                name: department.name,
                description: department.description || "",
                technologies: department.technologies ? JSON.parse(department.technologies) : [],
                job_templates: department.job_templates ? JSON.parse(department.job_templates) : []
            })
        } else {
            setFormData({
                name: "",
                description: "",
                technologies: [],
                job_templates: []
            })
        }
    }, [department])

    const handleAddTech = (e) => {
        if (e.key === 'Enter' && techInput.trim()) {
            e.preventDefault()
            if (!formData.technologies.includes(techInput.trim())) {
                setFormData(prev => ({ ...prev, technologies: [...prev.technologies, techInput.trim()] }))
            }
            setTechInput("")
        }
    }

    const removeTech = (tech) => {
        setFormData(prev => ({ ...prev, technologies: prev.technologies.filter(t => t !== tech) }))
    }

    const addTemplate = () => {
        setFormData(prev => ({
            ...prev,
            job_templates: [...prev.job_templates, { title_match: "", description: "", technologies: [] }]
        }))
    }

    const updateTemplate = (index, field, value) => {
        const newTemplates = [...formData.job_templates]
        newTemplates[index][field] = value
        setFormData(prev => ({ ...prev, job_templates: newTemplates }))
    }

    const removeTemplate = (index) => {
        setFormData(prev => ({
            ...prev,
            job_templates: prev.job_templates.filter((_, i) => i !== index)
        }))
    }

    const handleTemplateTechAdd = (index, e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault()
            const newTemplates = [...formData.job_templates]
            if (!newTemplates[index].technologies) newTemplates[index].technologies = []
            newTemplates[index].technologies.push(e.target.value.trim())
            setFormData(prev => ({ ...prev, job_templates: newTemplates }))
            e.target.value = ""
        }
    }

    const removeTemplateTech = (tIndex, techIndex) => {
        const newTemplates = [...formData.job_templates]
        newTemplates[tIndex].technologies = newTemplates[tIndex].technologies.filter((_, i) => i !== techIndex)
        setFormData(prev => ({ ...prev, job_templates: newTemplates }))
    }

    // AI Generation function
    const generateWithAI = async () => {
        if (!formData.name.trim()) {
            alert("Please enter a department name first")
            return
        }

        setGenerating(true)
        try {
            const res = await axios.post('/api/departments/generate', {
                name: formData.name.trim()
            })

            // Populate form with AI-generated content
            setFormData(prev => ({
                ...prev,
                description: res.data.description || prev.description,
                technologies: res.data.technologies || prev.technologies,
                job_templates: res.data.job_templates || prev.job_templates
            }))
        } catch (err) {
            console.error("AI generation failed:", err)
            alert("Failed to generate department profile. Please try again.")
        } finally {
            setGenerating(false)
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const payload = {
                ...formData,
                technologies: JSON.stringify(formData.technologies),
                job_templates: JSON.stringify(formData.job_templates)
            }

            if (department) {
                await axios.patch(`/api/departments/${department.id}`, payload)
            } else {
                await axios.post('/api/departments/', payload)
            }
            onSave()
            onClose()
        } catch (err) {
            console.error(err)
            alert("Failed to save department")
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center isolate">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">{department ? "Edit Department" : "New Department"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition"><X size={20} className="text-slate-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Department Name</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Engineering, Sales"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={generateWithAI}
                                    disabled={generating || !formData.name.trim()}
                                    className="text-sm flex items-center gap-1.5 text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-2 rounded-lg"
                                    title="Generate profile with AI"
                                >
                                    <Sparkles size={14} className={generating ? "animate-spin" : ""} />
                                    <span>Generate</span>
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">AI will auto-fill description, technologies, and job templates</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">General Description</label>
                            <textarea
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                                placeholder="Describe what this department does..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Shared Technologies / Stack</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.technologies.map((tech, i) => (
                                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-1">
                                        {tech}
                                        <button onClick={() => removeTech(tech)} className="hover:text-indigo-900"><X size={14} /></button>
                                    </span>
                                ))}
                            </div>
                            <input
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Type and press Enter to add technologies..."
                                value={techInput}
                                onChange={e => setTechInput(e.target.value)}
                                onKeyDown={handleAddTech}
                            />
                        </div>
                    </div>

                    {/* Job Templates */}
                    <div className="border-t border-slate-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <FileText size={20} className="text-indigo-600" /> Job Templates
                            </h3>
                            <button
                                onClick={addTemplate}
                                className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                            >
                                <Plus size={16} /> Add Template
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Define specific context for different roles within this department. The AI will use this when the job title matches.</p>

                        <div className="space-y-4">
                            {formData.job_templates.map((template, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group">
                                    <button
                                        onClick={() => removeTemplate(i)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Title Match Keyword</label>
                                            <input
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                                placeholder="e.g. Backend, Frontend, Manager"
                                                value={template.title_match}
                                                onChange={e => updateTemplate(i, 'title_match', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Role Description Context</label>
                                            <textarea
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm h-20 resize-none"
                                                placeholder="Specific context for this role..."
                                                value={template.description}
                                                onChange={e => updateTemplate(i, 'description', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Specific Technologies</label>
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {(template.technologies || []).map((tech, tIndex) => (
                                                    <span key={tIndex} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-xs font-medium flex items-center gap-1">
                                                        {tech}
                                                        <button onClick={() => removeTemplateTech(i, tIndex)} className="hover:text-red-500"><X size={12} /></button>
                                                    </span>
                                                ))}
                                            </div>
                                            <input
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                                placeholder="Press Enter to add..."
                                                onKeyDown={e => handleTemplateTechAdd(i, e)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {formData.job_templates.length === 0 && (
                                <div className="text-center py-8 text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                                    No templates defined.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.name}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? "Saving..." : "Save Department"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DepartmentModal
