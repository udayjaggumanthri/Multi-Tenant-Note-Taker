import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, LogOut, LogIn, LayoutDashboard, FileText, Settings, Building2, Globe } from 'lucide-react';

export default function Navbar() {
  const { tenant, isPlatform } = useTenant();
  const { user, isAuthenticated, logout, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    if (isPlatform) {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  const isActive = (path) => location.pathname === path;

  const brandName = isPlatform
    ? 'Multi-Tenant SaaS Platform'
    : (tenant?.website_settings?.company_name || tenant?.name || 'Note Taker');

  const brandInitial = isPlatform ? 'P' : brandName.charAt(0).toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <div className="brand-icon-box">
            {isPlatform ? <Shield size={18} /> : <span>{brandInitial}</span>}
          </div>
          <div>
            <span>{brandName}</span>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '2px' }}>
              {isPlatform ? (
                <span className="badge badge-platform">Platform Mode</span>
              ) : (
                <span className="badge badge-tenant">
                  ID: {tenant?.id} ({tenant?.domain})
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Navigation links */}
        <div className="navbar-nav">
          {isPlatform ? (
            // Platform Mode Nav
            <>
              {isAuthenticated && isPlatformAdmin ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <LayoutDashboard size={16} /> Dashboard
                    </span>
                  </Link>
                  <Link
                    to="/admin/tenants"
                    className={`nav-link ${isActive('/admin/tenants') || isActive('/admin/tenants/create') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={16} /> Tenants
                    </span>
                  </Link>
                  <Link
                    to="/dns-guide"
                    className={`nav-link ${isActive('/dns-guide') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={15} color="#60A5FA" /> DNS Guide
                    </span>
                  </Link>
                  <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                    <LogOut size={14} /> Logout ({user.name.split(' ')[0]})
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/dns-guide"
                    className={`nav-link ${isActive('/dns-guide') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={15} color="#60A5FA" /> DNS Guide
                    </span>
                  </Link>
                  <Link to="/admin/login" className="btn btn-primary btn-sm">
                    <LogIn size={14} /> Admin Login
                  </Link>
                </>
              )}
            </>
          ) : (
            // Tenant Mode Nav
            <>
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                Home
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <LayoutDashboard size={16} /> Dashboard
                    </span>
                  </Link>
                  <Link
                    to="/notes"
                    className={`nav-link ${isActive('/notes') || isActive('/notes/create') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={16} /> Notes
                    </span>
                  </Link>
                  <Link
                    to="/settings"
                    className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Settings size={16} /> Settings
                    </span>
                  </Link>
                  <Link
                    to="/dns-guide"
                    className={`nav-link ${isActive('/dns-guide') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={15} color="#60A5FA" /> DNS Guide
                    </span>
                  </Link>
                  <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                    <LogOut size={14} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/dns-guide"
                    className={`nav-link ${isActive('/dns-guide') ? 'active' : ''}`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={15} color="#60A5FA" /> DNS Guide
                    </span>
                  </Link>
                  <Link to="/login" className="btn btn-primary btn-sm">
                    <LogIn size={14} /> Sign In
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
