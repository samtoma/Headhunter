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
        const checkVersion = async () => {
            try {
                // Add timestamp to prevent browser caching of the version endpoint
                const response = await axios.get(`${API_URL}/version?t=${new Date().getTime()}`);
                const serverVersion = response.data.version;
                const localVersion = localStorage.getItem('app_version');

                console.log(`Version Check: Local=${localVersion}, Server=${serverVersion}`);

                if (localVersion && localVersion !== serverVersion) {
                    console.log(`Version mismatch! Forcing hard reload...`);

                    // Clear all caches
                    localStorage.clear();
                    sessionStorage.clear();

                    // Clear service worker caches if available
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }

                    // Set new version and force hard reload
                    localStorage.setItem('app_version', serverVersion);
                    window.location.reload(true); // Force hard reload from server
                } else if (!localVersion) {
                    localStorage.setItem('app_version', serverVersion);
                }
            } catch (error) {
                console.error("Failed to check version:", error);
            }
        };

        checkVersion();
        // Check every 5 minutes
        const interval = setInterval(checkVersion, 5 * 60 * 1000);
        return () => clearInterval(interval);
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