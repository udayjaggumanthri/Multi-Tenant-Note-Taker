import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Plus, Building2, User, Globe, Lock, Palette } from 'lucide-react';

export default function PlatformAdminCreateTenant() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Auto-fill slug and domain suggestions based on tenant name
  const handleNameChange = (val) => {
    setName(val);
    const suggestedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) setSlug(suggestedSlug);
    if (!domain && suggestedSlug) setDomain(`${suggestedSlug}.localhost`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.createAdminTenant({
        name,
        slug,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        domain,
        primary_color: primaryColor,
      });

      navigate('/admin/tenants');
    } catch (err) {
      console.error('Error creating tenant:', err);
      setError(err.message || 'Failed to create tenant.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin/tenants" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Back to Tenants
        </Link>
      </div>

      <div className="card">
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create New Tenant</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Onboards a new SaaS tenant with administrator account, domain binding, and initial branding.
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60A5FA', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={16} /> 1. TENANT DETAILS
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tenant / Company Name</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Acme Corporation"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tenant Slug</label>
              <input
                type="text"
                required
                className="form-control mono"
                placeholder="e.g. acme-corporation"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Custom Domain</label>
              <input
                type="text"
                required
                className="form-control mono"
                placeholder="e.g. acme.localhost"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Primary Brand Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{ width: '40px', height: '38px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  className="form-control mono"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#A78BFA', margin: '1.5rem 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} /> 2. TENANT ADMINISTRATOR
          </h3>

          <div className="form-group">
            <label className="form-label">Admin Full Name</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Jane Smith"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="jane@acme.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Admin Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-control"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <Link to="/admin/tenants" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ background: '#7C3AED' }}>
              {saving ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : (
                <>
                  <Plus size={16} /> Create Tenant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
