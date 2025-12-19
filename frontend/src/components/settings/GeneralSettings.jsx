import { useState, useEffect } from 'react';
import axios from 'axios';
import { useHeadhunter } from '../../context/HeadhunterContext';
import { useAuth } from '../../context/AuthContext';
import { Save, Lock, Sliders } from 'lucide-react';
import PageHeader from '../layout/PageHeader';

const GeneralSettings = ({ onOpenMobileSidebar }) => {
    const { user } = useAuth();
    const canEdit = user?.role === 'admin' || user?.role === 'super_admin';
    const { fetchSettings, company: globalCompany } = useHeadhunter();

    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        description: '',
        website: '',
        linkedIn: '',
        twitter: '',
        facebook: ''
    });

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
            setLoading(false);
        } else {
            fetchSettings().then(() => setLoading(false));
        }
    }, [globalCompany, fetchSettings]);

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
                social_facebook: formData.facebook
            });
            await fetchSettings();
            alert('Settings saved successfully');
        } catch (err) {
            console.error("Failed to save settings", err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <PageHeader
                title="General Options"
                subtitle="Manage basic company information and social links."
                icon={Sliders}
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
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-4">General Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Company Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    disabled={!canEdit}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Industry</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={formData.industry}
                                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                    disabled={!canEdit}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700">Website</label>
                                <input
                                    type="url"
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                    disabled={!canEdit}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-slate-700">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition h-32 resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    disabled={!canEdit}
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
                                    disabled={!canEdit}
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
                                    disabled={!canEdit}
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
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>

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

export default GeneralSettings;
