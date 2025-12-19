import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const AuthCallback = () => {
    const [searchParams] = useSearchParams()
    const processed = useRef(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (processed.current) return
        processed.current = true

        const token = searchParams.get('token')
        const role = searchParams.get('role')
        const error = searchParams.get('error')
        const company_name = searchParams.get('company_name')
        const email = searchParams.get('email')
        const full_name = searchParams.get('full_name') // Google Name
        const picture = searchParams.get('picture')
        const sso_provider = searchParams.get('sso_provider') // google, microsoft
        const is_verified = searchParams.get('is_verified') // SSO users are always verified

        if (error) {
            navigate(`/login?error=${error}`)
            return
        }

        if (token) {
            localStorage.setItem('token', token)
            if (role) localStorage.setItem('role', role)
            if (company_name) localStorage.setItem('company_name', company_name)
            if (email) localStorage.setItem('email', email)
            if (full_name) localStorage.setItem('full_name', full_name)
            if (picture) localStorage.setItem('picture', picture)
            if (sso_provider) localStorage.setItem('sso_provider', sso_provider)
            // SSO users are always verified
            localStorage.setItem('is_verified', is_verified === 'true' ? 'true' : 'false')

            // Call context login with all user data including SSO info
            login(token, {
                role,
                company_name,
                email,
                full_name,
                picture,
                sso_provider,
                is_verified: is_verified === 'true'
            })

            navigate('/')
        } else {
            navigate('/login?error=no_token')
        }
    }, [searchParams, login, navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-slate-700">Completing Sign In...</h2>
            </div>
        </div>
    )
}

export default AuthCallback
