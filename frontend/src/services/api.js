import axios from 'axios';

// Use /api prefix to go through Vite proxy (browser can't access Docker internal URLs directly)
// The proxy in vite.config.js rewrites /api to the actual backend URL
const api = axios.create({
    baseURL: '/api',
});

// Request interceptor for adding token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const userService = {
    invite: async (data) => {
        const response = await api.post('/users/invite', data);
        return response.data;
    },
    // Other user related methods can go here
};

export const departmentService = {
    getAll: async () => {
        const response = await api.get('/departments/');
        return response.data;
    },
};

export default api;
