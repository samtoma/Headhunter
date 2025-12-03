import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState({
        role: localStorage.getItem('role'),
        company_name: localStorage.getItem('company_name')
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

    const login = (newToken, userData) => {
        console.log("AuthContext login called", userData);
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('role', userData.role);
        if (userData.company_name) localStorage.setItem('company_name', userData.company_name);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('role');
        localStorage.removeItem('company_name');
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, loading }}>
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
