import { useState, useEffect } from 'react';
import axios from 'axios';
import PageHeader from '../components/layout/PageHeader';
import { useHeadhunter } from '../context/HeadhunterContext';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Lock } from 'lucide-react';

const Settings = ({ onOpenMobileSidebar }) => {
    const { user } = useAuth();
    const canEdit = user?.role === 'admin' || user?.role === 'super_admin';
    const { fetchSettings, company: globalCompany, companyStages } = useHeadhunter();
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        description: '',
        website: '',
        linkedIn: '',
        twitter: '',
        facebook: ''
    });

    // Stage logic
    const [stages, setStages] = useState([]);
    const [newStageName, setNewStageName] = useState("");
    const [activeTab, setActiveTab] = useState("general"); // general | pipeline

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (globalCompany) {
            setFormData({
                name: globalCompany.name || '',
                industry: globalCompany.industry || '',
                description: globalCompany.description || '',
                website: globalCompany.website || '',
                linkedIn: globalCompany.social_linkedin || '',
                twitter: globalCompany.social_twitter || '',
                facebook: globalCompany.social_facebook || ''
            });

            if (companyStages && companyStages.length > 0) {
                setStages(companyStages);
            } else if (globalCompany.interview_stages) {
                // Fallback if companyStages isn't populated yet but raw JSON is
                try {
                    setStages(JSON.parse(globalCompany.interview_stages));
                } catch { /* ignore */ }
            } else {
                // Default stages
                setStages([
                    { name: "Screening" },
                    { name: "Technical" },
                    { name: "Manager" },
                    { name: "Final" }
                ]);
            }
            setLoading(false);
        } else {
            // If global company not loaded yet, fetch explicitly or wait (context should load it)
            fetchSettings().then(() => setLoading(false));
        }
    }, [globalCompany, companyStages, fetchSettings]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.patch('/api/companies/me', {
                name: formData.name,
                industry: formData.industry,
                description: formData.description,
                website: formData.website,
                social_linkedin: formData.linkedIn,
                social_twitter: formData.twitter,
                social_facebook: formData.facebook,
                interview_stages: JSON.stringify(stages)
            });
            await fetchSettings(); // Refresh global context immediately
            alert('Settings saved successfully');
        } catch (err) {
            console.error("Failed to save settings", err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Stage Management
    const addStage = () => {
        if (!newStageName.trim()) return;
        setStages([...stages, { name: newStageName.trim() }]);
        setNewStageName("");
    };

    const removeStage = (index) => {
        const newStages = [...stages];
        newStages.splice(index, 1);
        setStages(newStages);
    };

    const moveStage = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === stages.length - 1) return;

        const newStages = [...stages];
        const temp = newStages[index];
        newStages[index] = newStages[index + (direction === 'up' ? -1 : 1)];
        newStages[index + (direction === 'up' ? -1 : 1)] = temp;
        setStages(newStages);
    };

    const resetStages = () => {
        if (window.confirm("Reset to default stages?")) {
            setStages([
                { name: "Screening" },
                { name: "Technical" },
                { name: "Manager" },
                { name: "Final" }
            ]);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <PageHeader
                title="Company Settings"
                subtitle="Manage your company profile and pipeline"
                icon={SettingsIcon}
                onOpenMobileSidebar={onOpenMobileSidebar}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto">

                    {/* Tabs */}
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'general' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            General Info
                        </button>
                        <button
                            onClick={() => setActiveTab('pipeline')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'pipeline' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pipeline Configuration
                        </button>
                    </div>

                    {/* Read-only banner for non-admins */}
                    {!canEdit && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                            <Lock size={18} className="text-amber-600" />
                            <span className="text-sm text-amber-800 font-medium">View Only — Only administrators can modify company settings.</span>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-6">
                        {activeTab === 'general' && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">General Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Company Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Industry</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                            value={formData.industry}
                                            onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">Website</label>
                                        <input
                                            type="url"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                            value={formData.website}
                                            onChange={e => setFormData({ ...formData, website: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">Description</label>
                                        <textarea
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition h-32 resize-none"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 pt-4">Social Media</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">LinkedIn</label>
                                        <input
                                            type="url"
                                            placeholder="https://linkedin.com/company/..."
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.linkedIn}
                                            onChange={e => setFormData({ ...formData, linkedIn: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Twitter</label>
                                        <input
                                            type="url"
                                            placeholder="https://twitter.com/..."
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.twitter}
                                            onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Facebook</label>
                                        <input
                                            type="url"
                                            placeholder="https://facebook.com/..."
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.facebook}
                                            onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'pipeline' && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">Pipeline Stages</h2>
                                        <p className="text-sm text-slate-500">Customize the interview stages for your company workflow.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resetStages}
                                        className="text-slate-400 hover:text-indigo-600 transition flex items-center gap-1 text-sm font-medium"
                                    >
                                        <RotateCcw size={14} /> Reset
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {stages.map((stage, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:border-indigo-100 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="text-slate-400 text-xs font-bold w-6 text-center">{idx + 1}</div>
                                                <input
                                                    type="text"
                                                    value={stage.name}
                                                    onChange={(e) => {
                                                        const newStages = [...stages];
                                                        newStages[idx].name = e.target.value;
                                                        setStages(newStages);
                                                    }}
                                                    className="flex-1 bg-transparent border-none font-medium text-slate-800 focus:ring-0 p-0"
                                                />
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newStages = [...stages];
                                                            newStages[idx].expanded = !newStages[idx].expanded;
                                                            setStages(newStages);
                                                        }}
                                                        className={`p-1.5 rounded-lg transition ${stage.expanded ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-white text-slate-400 hover:text-indigo-600'}`}
                                                        title="Stage Settings"
                                                    >
                                                        <SettingsIcon size={16} />
                                                    </button>
                                                    <button type="button" onClick={() => moveStage(idx, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                                                    <button type="button" onClick={() => moveStage(idx, 'down')} disabled={idx === stages.length - 1} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ArrowDown size={16} /></button>
                                                    <button type="button" onClick={() => removeStage(idx)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 ml-1"><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            {/* Advanced Settings */}
                                            {stage.expanded && (
                                                <div className="pl-9 pr-2 pb-2 pt-2 border-t border-slate-200/50 mt-1 animate-in slide-in-from-top-2 duration-200 flex flex-wrap gap-x-8 gap-y-2">
                                                    <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer select-none border border-transparent p-1.5 rounded-lg hover:bg-slate-50 transition-colors -ml-1.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={stage.requiresInterview !== false} // Default true
                                                            onChange={(e) => {
                                                                const newStages = [...stages];
                                                                newStages[idx].requiresInterview = e.target.checked;
                                                                // Mutually exclusiveish? Or can act as both? Let's say separate.
                                                                // If review is required, often interview is not, but flexible.
                                                                setStages(newStages);
                                                            }}
                                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-slate-800">Requires Live Interview</div>
                                                            <div className="text-xs text-slate-500">Uncheck for &quot;Homework&quot;</div>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer select-none border border-transparent p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!stage.requiresReviewer}
                                                            onChange={(e) => {
                                                                const newStages = [...stages];
                                                                newStages[idx].requiresReviewer = e.target.checked;
                                                                setStages(newStages);
                                                            }}
                                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-slate-800">Requires Reviewer Assignment</div>
                                                            <div className="text-xs text-slate-500">For homework review, etc.</div>
                                                        </div>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="New Stage Name (e.g. Culture Fit)"
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStage())}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={addStage}
                                        className="px-4 py-2.5 bg-slate-800 hover:bg-indigo-600 text-white rounded-xl font-bold transition flex items-center gap-2"
                                    >
                                        <Plus size={18} /> Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {canEdit && (
                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving ? "Saving..." : <><Save size={20} /> Save Changes</>}
                                </button>
                            </div>
                        )}
                    </form>
                </div >
            </div >
        </div >
    );
};

export default Settings;
