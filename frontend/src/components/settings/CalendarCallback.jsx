import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';

/**
 * CalendarCallback - Handles OAuth callback from Google/Microsoft Calendar
 * Exchanges the authorization code for tokens via backend API
 */
const CalendarCallback = ({ provider = 'google' }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('Connecting your calendar...');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            setMessage(`Authorization failed: ${error}`);
            return;
        }

        if (!code) {
            setStatus('error');
            setMessage('No authorization code received.');
            return;
        }

        // Exchange code for tokens via backend
        const exchangeCode = async () => {
            try {
                await api.post(`/calendars/callback/${provider}`, { code, state });
                setStatus('success');
                setMessage('Calendar connected successfully!');
                // Redirect to calendar settings after short delay
                setTimeout(() => {
                    navigate('/settings/calendar', { replace: true });
                }, 1500);
            } catch (err) {
                console.error('Failed to exchange code:', err);
                setStatus('error');
                setMessage(err.response?.data?.detail || 'Failed to connect calendar. Please try again.');
            }
        };

        exchangeCode();
    }, [searchParams, navigate, provider]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
                {status === 'processing' && (
                    <>
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Connecting Calendar</h2>
                        <p className="text-slate-600">{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Connected!</h2>
                        <p className="text-slate-600">{message}</p>
                        <p className="text-sm text-slate-400 mt-2">Redirecting...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Failed</h2>
                        <p className="text-slate-600 mb-4">{message}</p>
                        <button
                            onClick={() => navigate('/settings/calendar')}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            Back to Settings
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CalendarCallback;
