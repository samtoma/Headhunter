import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState({
        role: localStorage.getItem('role'),
        company_name: localStorage.getItem('company_name'),
        email: localStorage.getItem('email'),
        full_name: localStorage.getItem('full_name'),
        picture: localStorage.getItem('picture'),
        sso_provider: localStorage.getItem('sso_provider'),
        is_verified: localStorage.getItem('is_verified') === 'true' // Parse boolean
    });
    const [loading, setLoading] = useState(true);

    // Set global axios header
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('token', token);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
        }
        setLoading(false);
    }, [token]);

    const login = useCallback((newToken, userData) => {
        console.log("AuthContext login called", userData);
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('role', userData.role);
        if (userData.company_name) localStorage.setItem('company_name', userData.company_name);
        if (userData.email) localStorage.setItem('email', userData.email);
        if (userData.full_name) localStorage.setItem('full_name', userData.full_name);
        if (userData.picture) localStorage.setItem('picture', userData.picture);
        if (userData.sso_provider) localStorage.setItem('sso_provider', userData.sso_provider);
        localStorage.setItem('is_verified', userData.is_verified);
    }, []);

    const updateUser = useCallback((updates) => {
        setUser(prev => {
            const newUser = { ...prev, ...updates };
            // Persist specific fields we care about
            if (updates.company_name) localStorage.setItem('company_name', updates.company_name);
            if (updates.role) localStorage.setItem('role', updates.role);
            if (updates.picture) localStorage.setItem('picture', updates.picture);
            if (updates.full_name) localStorage.setItem('full_name', updates.full_name);
            if (updates.is_verified !== undefined) localStorage.setItem('is_verified', updates.is_verified);
            // Email usually doesn't change this way, but if it did:
            if (updates.email) localStorage.setItem('email', updates.email);
            return newUser;
        });
    }, []);

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('role');
        localStorage.removeItem('company_name');
        localStorage.removeItem('email');
        localStorage.removeItem('full_name');
        localStorage.removeItem('picture');
        localStorage.removeItem('sso_provider');
        localStorage.removeItem('is_verified');
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
