import { useState } from 'react'
import axios from 'axios'
import { Lock, Mail } from 'lucide-react'

const Signup = ({ onLogin, onSwitchToLogin, onSetup }) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await axios.post('/api/auth/signup', { email, password })
            localStorage.setItem('token', res.data.access_token)
            localStorage.setItem('role', res.data.role)
            localStorage.setItem('company_name', res.data.company_name || "")

            if (res.data.is_new_company) {
                onSetup(res.data.access_token)
            } else {
                onLogin(res.data.access_token)
            }
        } catch (err) {
            console.error(err)
            setError(err.response?.data?.detail || "Signup failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
                    <p className="text-slate-500">Join Headhunter to manage your recruitment</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                            <input
                                type="email"
                                required
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                placeholder="you@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                            <input
                                type="password"
                                required
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition shadow-lg shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="text-indigo-600 font-bold hover:underline">
                        Sign in
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Signup
