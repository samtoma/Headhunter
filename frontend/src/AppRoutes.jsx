import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import CompanySetupWizard from './components/auth/CompanySetupWizard';
import DashboardView from './components/dashboard/DashboardView';
import AuthCallback from './components/auth/AuthCallback';

import Pipeline from './pages/Pipeline';
import Settings from './pages/Settings';
import SuperAdminDashboard from './components/dashboard/SuperAdminDashboard';
import Team from './pages/Team';
import InterviewerDashboard from './pages/InterviewerDashboard';
import Search from './pages/Search';
import Analytics from './pages/Analytics';
import Departments from './pages/Departments';
import Sidebar from './components/layout/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import React, { useState } from 'react';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!token) return <Navigate to="/login" replace />;
    return children;
};

// Role Protected Route Wrapper
const RoleProtected = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user || user.role !== requiredRole) return <Navigate to="/" replace />;
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
            <Route path="/auth/callback" element={<AuthCallback />} />
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
                        <ErrorBoundary>
                            <Pipeline />
                        </ErrorBoundary>
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

            <Route path="/team" element={
                <ProtectedRoute>
                    <AppLayout>
                        <Team />
                    </AppLayout>
                </ProtectedRoute>
            } />

            <Route path="/interviewer" element={
                <ProtectedRoute>
                    <AppLayout>
                        <InterviewerDashboard />
                    </AppLayout>
                </ProtectedRoute>
            } />

            <Route path="/super-admin" element={
                <ProtectedRoute>
                    <RoleProtected requiredRole="super_admin">
                        <AppLayout>
                            <SuperAdminDashboard />
                        </AppLayout>
                    </RoleProtected>
                </ProtectedRoute>
            } />

            <Route path="/search" element={
                <ProtectedRoute>
                    <AppLayout>
                        <Search />
                    </AppLayout>
                </ProtectedRoute>
            } />

            <Route path="/analytics" element={
                <ProtectedRoute>
                    <AppLayout>
                        <Analytics />
                    </AppLayout>
                </ProtectedRoute>
            } />

            <Route path="/departments" element={
                <ProtectedRoute>
                    <AppLayout>
                        <Departments />
                    </AppLayout>
                </ProtectedRoute>
            } />
        </Routes>
    );
};

export default AppRoutes;
