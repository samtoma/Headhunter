/*
 * Copyright (c) 2025 Headhunter AI Engineering Team
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HeadhunterProvider } from './context/HeadhunterContext';
import { UploadProvider } from './context/UploadContext';
import AppRoutes from './AppRoutes';
import UploadProgressWidget from './components/ui/UploadProgressWidget';

function App() {
    return (
        <React.StrictMode>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthProvider>
                    <UploadProvider>
                        <HeadhunterProvider>
                            <AppRoutes />
                            <UploadProgressWidget />
                        </HeadhunterProvider>
                    </UploadProvider>
                </AuthProvider>
            </Router>
        </React.StrictMode>
    );
}

export default App;