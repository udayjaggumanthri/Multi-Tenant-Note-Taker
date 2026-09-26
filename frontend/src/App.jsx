import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from './context/TenantContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DomainSwitcherDemo from './components/DomainSwitcherDemo';
import ErrorTenantPage from './components/ErrorTenantPage';

// Tenant Pages
import PublicTenantHome from './pages/PublicTenantHome';
import TenantLogin from './pages/TenantLogin';
import TenantDashboard from './pages/TenantDashboard';
import NotesList from './pages/NotesList';
import NoteDetail from './pages/NoteDetail';
import TenantSettings from './pages/TenantSettings';

// Platform Admin Pages
import PlatformAdminLogin from './pages/PlatformAdminLogin';
import PlatformAdminDashboard from './pages/PlatformAdminDashboard';
import PlatformAdminTenants from './pages/PlatformAdminTenants';
import PlatformAdminCreateTenant from './pages/PlatformAdminCreateTenant';
import DnsGuidePage from './pages/DnsGuidePage';

function TenantProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PlatformAdminProtectedRoute({ children }) {
  const { isAuthenticated, isPlatformAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated || !isPlatformAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function AppContent() {
  const { loading, error } = useTenant();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '42px', height: '42px', marginBottom: '1rem' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
          Resolving Tenant from Domain...
        </div>
      </div>
    );
  }

  // If unknown domain (404) or inactive tenant (403), render multi-tenant error screen (Phase 15 & 16)
  if (error) {
    return (
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <ErrorTenantPage />
        </main>
        <DomainSwitcherDemo />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content">
        <Routes>
          {/* Public Tenant / Platform Home */}
          <Route path="/" element={<PublicTenantHome />} />

          {/* Tenant Authentication & Dashboard */}
          <Route path="/login" element={<TenantLogin />} />
          <Route
            path="/dashboard"
            element={
              <TenantProtectedRoute>
                <TenantDashboard />
              </TenantProtectedRoute>
            }
          />

          {/* Notes Management (Phase 22) */}
          <Route
            path="/notes"
            element={
              <TenantProtectedRoute>
                <NotesList />
              </TenantProtectedRoute>
            }
          />
          <Route
            path="/notes/create"
            element={
              <TenantProtectedRoute>
                <NoteDetail />
              </TenantProtectedRoute>
            }
          />
          <Route
            path="/notes/:id"
            element={
              <TenantProtectedRoute>
                <NoteDetail />
              </TenantProtectedRoute>
            }
          />

          {/* Tenant Website Branding Settings (Phase 9) */}
          <Route
            path="/settings"
            element={
              <TenantProtectedRoute>
                <TenantSettings />
              </TenantProtectedRoute>
            }
          />

          {/* Platform Admin Routes (Phase 10 & 11) */}
          <Route path="/admin/login" element={<PlatformAdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <PlatformAdminProtectedRoute>
                <PlatformAdminDashboard />
              </PlatformAdminProtectedRoute>
            }
          />
          <Route
            path="/admin/tenants"
            element={
              <PlatformAdminProtectedRoute>
                <PlatformAdminTenants />
              </PlatformAdminProtectedRoute>
            }
          />
          <Route
            path="/admin/tenants/create"
            element={
              <PlatformAdminProtectedRoute>
                <PlatformAdminCreateTenant />
              </PlatformAdminProtectedRoute>
            }
          />

          {/* DNS Configuration & Architecture Guide */}
          <Route path="/dns-guide" element={<DnsGuidePage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating Quick Domain Switcher for local demo & testing */}
      <DomainSwitcherDemo />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
}
