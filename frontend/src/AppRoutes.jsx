import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import CompanySetupWizard from './components/auth/CompanySetupWizard';
import DashboardView from './components/dashboard/DashboardView';

import Pipeline from './pages/Pipeline';
import Settings from './pages/Settings';
import SuperAdminDashboard from './components/dashboard/SuperAdminDashboard';
import Sidebar from './components/layout/Sidebar';
import React, { useState } from 'react';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

// Layout Component to wrap protected pages
const AppLayout = ({ children }) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden">
            <Sidebar
                isMobileOpen={isMobileSidebarOpen}
                setIsMobileOpen={setIsMobileSidebarOpen}
            />
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
                {React.Children.map(children, child =>
                    React.isValidElement(child)
                        ? React.cloneElement(child, { onOpenMobileSidebar: () => setIsMobileSidebarOpen(true) })
                        : child
                )}
            </div>
        </div>
    );
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/setup" element={<CompanySetupWizard />} />

            <Route path="/" element={
                <ProtectedRoute>
                    <AppLayout>
                        <DashboardView />
                    </AppLayout>
                </ProtectedRoute>
            } />

            <Route path="/pipeline" element={
                <ProtectedRoute>
                    <AppLayout>
                        <Pipeline />
                    </AppLayout>
                </ProtectedRoute>
            } />

            <Route path="/settings" element={
                <ProtectedRoute>
                    <AppLayout>
                        <Settings />
                    </AppLayout>
                </ProtectedRoute>
            } />

            <Route path="/super-admin" element={
                <ProtectedRoute>
                    <AppLayout>
                        <SuperAdminDashboard />
                    </AppLayout>
                </ProtectedRoute>
            } />
        </Routes>
    );
};

export default AppRoutes;
