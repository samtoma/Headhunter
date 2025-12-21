/*
 * Copyright (c) 2025 Headhunter AI Engineering Team
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HeadhunterProvider } from './context/HeadhunterContext';
import { UploadProvider } from './context/UploadContext';
import AppRoutes from './AppRoutes';
import UploadProgressWidget from './components/ui/UploadProgressWidget';
import axios from 'axios';

const API_URL = '/api'; // Use relative path to leverage Vite proxy

function VersionCheck() {
    useEffect(() => {
        const token = localStorage.getItem('token')
        
        // If authenticated, use WebSocket (handled by sync WebSocket in useHeadhunterData)
        // Otherwise, do initial check via HTTP
        const checkVersion = async () => {
            try {
                const response = await axios.get(`${API_URL}/version?t=${new Date().getTime()}`);
                const serverVersion = response.data.version;
                const localVersion = localStorage.getItem('app_version');

                if (localVersion && localVersion !== serverVersion) {
                    console.log(`Version mismatch! Forcing hard reload...`);
                    localStorage.clear();
                    sessionStorage.clear();
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }
                    localStorage.setItem('app_version', serverVersion);
                    window.location.reload(true);
                } else if (!localVersion) {
                    localStorage.setItem('app_version', serverVersion);
                }
            } catch (error) {
                // Silently fail - version check is not critical for initial load
            }
        };

        // Only do initial check if not authenticated (WebSocket will handle updates when authenticated)
        if (!token) {
            checkVersion();
            // Fallback: check every 5 minutes if not authenticated
            const interval = setInterval(checkVersion, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
        // If authenticated, WebSocket in useHeadhunterData will handle version updates
    }, []);

    return null;
}

function App() {
    return (
        <React.StrictMode>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthProvider>
                    <UploadProvider>
                        <HeadhunterProvider>
                            <AppRoutes />
                            <UploadProgressWidget />
                            <VersionCheck />
                        </HeadhunterProvider>
                    </UploadProvider>
                </AuthProvider>
            </Router>
        </React.StrictMode>
    );
}

export default App;