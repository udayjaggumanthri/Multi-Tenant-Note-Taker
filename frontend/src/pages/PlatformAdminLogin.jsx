import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

export default function PlatformAdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login(email, password, true);
      if (user.role !== 'PLATFORM_ADMIN') {
        throw new Error('Access denied: User is not a Platform Administrator.');
      }
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Platform login error:', err);
      setError(err.message || 'Login failed. Please verify platform administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '3rem auto' }}>
      <div className="card" style={{ padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(168, 85, 247, 0.15)',
            color: '#C084FC',
            marginBottom: '1rem'
          }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Platform Admin Login
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Root administration for Multi-Tenant SaaS
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
            <label className="form-label">Platform Admin Email</label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="admin@prod.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: '#7C3AED' }}
          >
            {loading ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : (
              <>
                Sign In to Platform Admin <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
