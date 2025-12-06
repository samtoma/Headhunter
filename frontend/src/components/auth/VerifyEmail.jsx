import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided.');
            return;
        }

        const verify = async () => {
            try {
                await axios.get(`/api/auth/verify?token=${token}`);
                setStatus('success');
                setMessage('Your email has been successfully verified.');
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.detail || 'Verification failed. The link may be invalid or expired.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 text-center">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifying Email</h2>
                        <p className="text-slate-600">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Email Verified!</h2>
                        <p className="text-slate-600 mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2"
                        >
                            Proceed to Login <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <XCircle className="w-16 h-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Verification Failed</h2>
                        <p className="text-slate-600 mb-6">{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-indigo-600 font-bold hover:underline"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
