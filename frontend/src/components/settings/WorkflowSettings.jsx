import { useState, useEffect } from 'react';
import axios from 'axios';
import { useHeadhunter } from '../../context/HeadhunterContext';
import { useAuth } from '../../context/AuthContext';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Settings as SettingsIcon, Lock, GitBranch } from 'lucide-react';
import PageHeader from '../layout/PageHeader';

const WorkflowSettings = ({ onOpenMobileSidebar }) => {
    const { user } = useAuth();
    const canEdit = user?.role === 'admin' || user?.role === 'super_admin';
    const { fetchSettings, company: globalCompany, companyStages } = useHeadhunter();

    // Stage logic
    const [stages, setStages] = useState([]);
    const [newStageName, setNewStageName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (globalCompany) {
            if (companyStages && companyStages.length > 0) {
                setStages(companyStages);
            } else if (globalCompany.interview_stages) {
                try {
                    setStages(JSON.parse(globalCompany.interview_stages));
                } catch { /* ignore */ }
            } else {
                setStages([
                    { name: "Screening" },
                    { name: "Technical" },
                    { name: "Manager" },
                    { name: "Final" }
                ]);
            }
            setLoading(false);
        } else {
            fetchSettings().then(() => setLoading(false));
        }
    }, [globalCompany, companyStages, fetchSettings]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.patch('/api/companies/me', {
                interview_stages: JSON.stringify(stages)
            });
            await fetchSettings();
            alert('Workflow settings saved successfully');
        } catch (err) {
            console.error("Failed to save workflow settings", err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

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
                title="Workflow & Pipeline"
                subtitle="Customize your recruitment pipeline stages and automation rules."
                icon={GitBranch}
                onOpenMobileSidebar={onOpenMobileSidebar}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    {!canEdit && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                            <Lock size={18} className="text-amber-600" />
                            <span className="text-sm text-amber-800 font-medium">View Only — Only administrators can modify company settings.</span>
                        </div>
                    )}

                    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Pipeline Stages</h2>
                                <p className="text-sm text-slate-500">Define the steps in your hiring process.</p>
                            </div>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={resetStages}
                                    className="text-slate-400 hover:text-indigo-600 transition flex items-center gap-1 text-sm font-medium"
                                    title="Reset to default"
                                >
                                    <RotateCcw size={14} /> Reset
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {stages.map((stage, idx) => (
                                <div key={idx} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 group hover:border-indigo-100 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="text-slate-400 text-xs font-bold w-6 text-center">{idx + 1}</div>
                                        <input
                                            type="text"
                                            value={stage.name}
                                            disabled={!canEdit}
                                            onChange={(e) => {
                                                const newStages = [...stages];
                                                newStages[idx].name = e.target.value;
                                                setStages(newStages);
                                            }}
                                            className="flex-1 bg-transparent border-none font-medium text-slate-800 focus:ring-0 p-0 disabled:text-slate-500"
                                        />
                                        {canEdit && (
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
                                        )}
                                    </div>

                                    {/* Advanced Settings */}
                                    {stage.expanded && (
                                        <div className="pl-9 pr-2 pb-2 pt-2 border-t border-slate-200/50 mt-1 animate-in slide-in-from-top-2 duration-200 flex flex-wrap gap-x-8 gap-y-2">
                                            <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer select-none border border-transparent p-1.5 rounded-lg hover:bg-slate-50 transition-colors -ml-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={stage.requiresInterview !== false} // Default true
                                                    disabled={!canEdit}
                                                    onChange={(e) => {
                                                        const newStages = [...stages];
                                                        newStages[idx].requiresInterview = e.target.checked;
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
                                                    disabled={!canEdit}
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

                        {canEdit && (
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
                </div>
            </div>
        </div>
    );
};

export default WorkflowSettings;
