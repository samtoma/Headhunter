import { useState, useEffect } from 'react'
import axios from 'axios'
import { Lock, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const ResetPassword = () => {
    const [searchParams] = useSearchParams()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [tokenValid, setTokenValid] = useState(true)
    const navigate = useNavigate()
    const token = searchParams.get('token')
    const type = searchParams.get('type') // 'invite' or null

    useEffect(() => {
        if (!token) {
            setTokenValid(false)
            setError('Invalid reset link')
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setLoading(true)
        setError('')

        try {
            await axios.post('/api/auth/reset-password', null, {
                params: { token, new_password: password }
            })
            setSuccess(true)
            setTimeout(() => navigate('/login'), 3000)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.')
        } finally {
            setLoading(false)
        }
    }

    if (tokenValid === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FAF5FF] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] w-full max-w-md border border-red-100">
                    <div className="text-center">
                        <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 font-display">Invalid Link</h2>
                        <p className="text-slate-600 mb-6">This link is invalid or has expired.</p>
                        <button
                            onClick={() => navigate('/forgot-password')}
                            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20"
                        >
                            Request New Link
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FAF5FF] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] w-full max-w-md border border-green-100 animate-fade-in">
                    <div className="text-center">
                        <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 animate-bounce-in">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3 font-display">
                            {type === 'invite' ? 'Account Activated!' : 'Password Reset!'}
                        </h2>
                        <p className="text-slate-600 mb-6 text-lg">
                            {type === 'invite'
                                ? 'Your account has been fully activated.'
                                : 'Your password has been successfully reset.'}
                        </p>
                        <p className="text-sm text-slate-400 font-medium">Redirecting to login...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-[#F5F3FF] to-[#FAF5FF] flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] w-full max-w-[480px] border border-slate-100/50 relative overflow-hidden">
                <div className="text-center mb-10">
                    <div className="mx-auto w-20 h-20 bg-[#F5F3FF] rounded-full flex items-center justify-center mb-6 ring-8 ring-[#F5F3FF]/50">
                        <Lock className="w-8 h-8 text-[#6366F1]" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-3 font-display tracking-tight">
                        {type === 'invite' ? 'Welcome to the Team!' : 'Reset Password'}
                    </h1>
                    <p className="text-slate-500 text-lg">
                        {type === 'invite'
                            ? 'Please set your password to activate your account.'
                            : 'Enter your new password below.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-8 border border-red-100 animate-shake flex items-center gap-3">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">New Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-slate-400 w-5 h-5 transition group-focus-within:text-[#6366F1]" />
                            <input
                                type="password"
                                required
                                minLength={8}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-[#6366F1]/10 focus:border-[#6366F1] outline-none transition-all duration-200 placeholder:text-slate-400 font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2 ml-1 font-medium">Must be at least 8 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Confirm Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-4 text-slate-400 w-5 h-5 transition group-focus-within:text-[#6366F1]" />
                            <input
                                type="password"
                                required
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-[#6366F1]/10 focus:border-[#6366F1] outline-none transition-all duration-200 placeholder:text-slate-400 font-medium"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#6366F1] hover:bg-[#4F46E5] active:scale-[0.98] text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-2"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                {type === 'invite' ? 'Activating...' : 'Resetting...'}
                            </span>
                        ) : (type === 'invite' ? 'Set Password & Activate' : 'Reset Password')}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ResetPassword
