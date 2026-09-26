import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function TenantLogin() {
  const { tenant } = useTenant();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tenantName = tenant?.website_settings?.company_name || tenant?.name || 'Tenant';

  // Demo credential autofill helper
  const handleQuickFill = () => {
    if (tenant?.id === 101) {
      setEmail('ravi@abc.com');
      setPassword('RaviPass@123');
    } else if (tenant?.id === 102) {
      setEmail('john@xyz.com');
      setPassword('JohnPass@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password, false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '460px',
      margin: '3rem auto',
    }}>
      <div className="card" style={{ padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--tenant-primary-light)',
            color: 'var(--tenant-primary)',
            marginBottom: '1rem'
          }}>
            <Lock size={24} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            {tenantName} Sign In
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Domain: <span className="mono" style={{ color: '#60A5FA' }}>{tenant?.domain || window.location.hostname}</span> (Tenant ID: {tenant?.id})
          </p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-control"
                placeholder="admin@tenant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : (
              <>
                Sign In to Tenant Space <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick autofill helper for local demonstration */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <button
            type="button"
            onClick={handleQuickFill}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', fontSize: '0.775rem' }}
          >
            <ShieldCheck size={14} color="#10B981" /> Auto-fill Demo Credentials ({tenant?.id === 101 ? 'Ravi' : tenant?.id === 102 ? 'John' : 'Demo'})
          </button>
        </div>
      </div>
    </div>
  );
}
