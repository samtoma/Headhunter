import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle, Loader2, LogOut } from 'lucide-react';
import axios from 'axios';

const PendingVerification = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [resendStatus, setResendStatus] = useState('idle'); // idle, sending, sent, error
    const [errorMsg, setErrorMsg] = useState('');

    const handleResend = async () => {
        if (!user?.email) return;
        setResendStatus('sending');
        try {
            await axios.post(`/api/auth/resend-verification?email=${user.email}`);
            setResendStatus('sent');
            setTimeout(() => setResendStatus('idle'), 5000);
        } catch (err) {
            setResendStatus('error');
            console.error(err);
            setErrorMsg(err.response?.data?.detail || 'Failed to resend email.');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 text-center">
                <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-10 h-10 text-indigo-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Verify your email</h1>
                <p className="text-slate-600 mb-6">
                    We&apos;ve sent a verification link to <span className="font-semibold text-slate-800">{user?.email}</span>.
                    Please check your inbox and click the link to activate your account.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={handleLogout}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout & Return to Login
                    </button>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500 mb-3">Didn&apos;t receive the email?</p>

                        {resendStatus === 'sending' ? (
                            <button disabled className="text-indigo-400 font-bold flex items-center justify-center gap-2 mx-auto cursor-not-allowed">
                                <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                            </button>
                        ) : resendStatus === 'sent' ? (
                            <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Email Sent!
                            </span>
                        ) : (
                            <button
                                onClick={handleResend}
                                className="text-indigo-600 font-bold hover:underline hover:text-indigo-700 transition"
                            >
                                Resend Verification Email
                            </button>
                        )}

                        {resendStatus === 'error' && (
                            <p className="text-red-500 text-sm mt-2">{errorMsg}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingVerification;
