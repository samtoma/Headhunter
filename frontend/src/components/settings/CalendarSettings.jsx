import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, RefreshCw, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import api from '../../services/api';

const CalendarSettings = () => {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const res = await api.get('/calendars/connections');
            setConnections(res.data);
        } catch (err) {
            console.error("Failed to fetch calendar connections:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (provider) => {
        try {
            const res = await api.get(`/calendars/connect/${provider}`);
            // Redirect to OAuth URL
            window.location.href = res.data.url;
        } catch (err) {
            console.error(`Failed to initiate ${provider} connection:`, err);
            alert(`Failed to connect to ${provider === 'google' ? 'Google Calendar' : 'Outlook'}. Please try again.`);
        }
    };

    const handleDisconnect = async (provider) => {
        if (!window.confirm('Are you sure you want to disconnect this calendar?')) return;
        try {
            await api.delete(`/calendars/disconnect/${provider}`);
            // Refresh list
            fetchConnections();
        } catch (err) {
            console.error("Failed to disconnect:", err);
            alert("Failed to disconnect calendar.");
        }
    };

    const googleConnection = connections.find(c => c.provider === 'google');
    const microsoftConnection = connections.find(c => c.provider === 'microsoft');

    if (loading && connections.length === 0) {
        return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" />Loading settings...</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Calendar Integration</h3>
                        <p className="text-sm text-slate-500 mt-1">Sync your calendar to automatically manage interview availability and detect conflicts.</p>
                    </div>
                    <button
                        onClick={fetchConnections}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition"
                        title="Refresh status"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="grid gap-4">
                    {/* Google Calendar Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                                <Calendar className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg">Google Calendar</h4>
                                {googleConnection ? (
                                    <div className="space-y-1">
                                        <p className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
                                            <Check size={14} strokeWidth={3} />
                                            Connected
                                        </p>
                                        {googleConnection.email && (
                                            <p className="text-xs text-slate-500">
                                                Account: {googleConnection.email}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        Connect your primary calendar to sync events.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="w-full sm:w-auto">
                            {googleConnection ? (
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleDisconnect('google')}
                                        className="flex-1 sm:flex-none border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleConnect('google')}
                                    className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                                >
                                    <ExternalLink size={16} /> Connect Google Calendar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Microsoft Outlook Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center shrink-0">
                                <Calendar className="text-sky-600" size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg">Microsoft Outlook</h4>
                                {microsoftConnection ? (
                                    <div className="space-y-1">
                                        <p className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
                                            <Check size={14} strokeWidth={3} />
                                            Connected
                                        </p>
                                        {microsoftConnection.email && (
                                            <p className="text-xs text-slate-500">
                                                Account: {microsoftConnection.email}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        Connect your work outlook calendar.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="w-full sm:w-auto">
                            {microsoftConnection ? (
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleDisconnect('microsoft')}
                                        className="flex-1 sm:flex-none border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleConnect('microsoft')}
                                    className="w-full sm:w-auto bg-sky-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-sky-700 transition flex items-center justify-center gap-2 shadow-sm shadow-sky-200"
                                >
                                    <ExternalLink size={16} /> Connect Outlook
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarSettings;
