import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Plus, Building2, User, Globe, Database, Shield, Info, Check } from 'lucide-react';

export default function PlatformAdminCreateTenant() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Domain selection: SUBDOMAIN vs CUSTOM
  const [domainMode, setDomainMode] = useState('SUBDOMAIN'); // 'SUBDOMAIN' | 'CUSTOM'
  const [customDomainInput, setCustomDomainInput] = useState('');
  
  // Database Strategy: SHARED_DB vs ISOLATED_SCHEMA vs SEPARATE_DB
  const [dbStrategy, setDbStrategy] = useState('SHARED_DB');
  
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Derive subdomain automatically from slug
  const platformBaseDomain = window.location.hostname.includes('localhost') ? 'localhost' : 'prod.com';
  const autoSubdomain = slug ? `${slug}.${platformBaseDomain}` : '';
  const finalDomain = domainMode === 'SUBDOMAIN' ? autoSubdomain : customDomainInput.trim().toLowerCase();

  const handleNameChange = (val) => {
    setName(val);
    const suggestedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) setSlug(suggestedSlug);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (domainMode === 'CUSTOM' && !customDomainInput.trim()) {
      setError('Please provide a valid custom domain (e.g. company.com).');
      setSaving(false);
      return;
    }

    try {
      await api.createAdminTenant({
        name,
        slug,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
        domain: finalDomain,
        domain_type: domainMode,
        db_strategy: dbStrategy,
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
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin/tenants" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Back to Tenants
        </Link>
      </div>

      <div className="card">
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Onboard New Tenant</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Configure enterprise tenant identity, domain routing strategy, and database isolation.
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: TENANT IDENTITY */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60A5FA', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={16} /> 1. TENANT PROFILE
          </h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tenant / Organization Name</label>
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
              <label className="form-label">Tenant Slug (Identifier)</label>
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

          {/* SECTION 2: DOMAIN STRATEGY */}
          <div style={{ margin: '1.75rem 0', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38BDF8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={16} /> 2. DOMAIN & ROUTING CONFIGURATION
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
              Select whether this tenant accesses the platform through a managed platform subdomain or their own branded apex domain.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Option A: Platform Subdomain */}
              <div
                onClick={() => setDomainMode('SUBDOMAIN')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${domainMode === 'SUBDOMAIN' ? 'var(--tenant-primary)' : 'var(--border-color)'}`,
                  background: domainMode === 'SUBDOMAIN' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Platform Subdomain</span>
                  {domainMode === 'SUBDOMAIN' && <Check size={16} color="var(--tenant-primary)" />}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Default automated routing. Resolves under your SaaS domain.
                </div>
              </div>

              {/* Option B: Custom Domain */}
              <div
                onClick={() => setDomainMode('CUSTOM')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${domainMode === 'CUSTOM' ? '#8B5CF6' : 'var(--border-color)'}`,
                  background: domainMode === 'CUSTOM' ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Independent Custom Domain</span>
                  {domainMode === 'CUSTOM' && <Check size={16} color="#8B5CF6" />}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Client brings their own domain (e.g. acme.com or notes.acme.com).
                </div>
              </div>
            </div>

            {domainMode === 'SUBDOMAIN' ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Auto-Generated Subdomain</label>
                <div className="form-control mono" style={{ background: 'rgba(0, 0, 0, 0.3)', color: '#60A5FA' }}>
                  {autoSubdomain || 'e.g. acme.localhost'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Traffic arrives at Nginx, which matches this hostname and attaches the tenant.
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Enter Custom Domain</label>
                <input
                  type="text"
                  required={domainMode === 'CUSTOM'}
                  className="form-control mono"
                  placeholder="e.g. clientbrand.com or portal.clientbrand.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                />
                <div style={{ fontSize: '0.775rem', color: '#93C5FD', marginTop: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>DNS Setup:</strong> The client will create a DNS <code>CNAME</code> pointing to your platform or an <code>A</code> record pointing to your VPS IP. Nginx forwards the <code>Host</code> header directly to Django.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: DATABASE ARCHITECTURE STRATEGY */}
          <div style={{ margin: '1.75rem 0', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34D399', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={16} /> 3. DATABASE ISOLATION ARCHITECTURE
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
              Choose the architectural database model for this tenant's data storage.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
              {/* Strategy 1: Shared DB */}
              <div
                onClick={() => setDbStrategy('SHARED_DB')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${dbStrategy === 'SHARED_DB' ? '#10B981' : 'var(--border-color)'}`,
                  background: dbStrategy === 'SHARED_DB' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Shared Database</span>
                  {dbStrategy === 'SHARED_DB' && <Check size={14} color="#10B981" />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Single DB with <span className="mono">tenant_id</span> row-level logical isolation. Max resource efficiency & high performance.
                </div>
              </div>

              {/* Strategy 2: Dedicated Schema */}
              <div
                onClick={() => setDbStrategy('ISOLATED_SCHEMA')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${dbStrategy === 'ISOLATED_SCHEMA' ? '#3B82F6' : 'var(--border-color)'}`,
                  background: dbStrategy === 'ISOLATED_SCHEMA' ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Dedicated Schema</span>
                  {dbStrategy === 'ISOLATED_SCHEMA' && <Check size={14} color="#3B82F6" />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Separate PostgreSQL schema on the same server instance.
                </div>
              </div>

              {/* Strategy 3: Dedicated Database */}
              <div
                onClick={() => setDbStrategy('SEPARATE_DB')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${dbStrategy === 'SEPARATE_DB' ? '#F59E0B' : 'var(--border-color)'}`,
                  background: dbStrategy === 'SEPARATE_DB' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Dedicated Database</span>
                  {dbStrategy === 'SEPARATE_DB' && <Check size={14} color="#F59E0B" />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Physical database isolation for high compliance enterprise tiers.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: TENANT ADMINISTRATOR */}
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#A78BFA', margin: '1.75rem 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} /> 4. INITIAL TENANT ADMINISTRATOR
          </h3>

          <div className="form-group">
            <label className="form-label">Administrator Full Name</label>
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
              <label className="form-label">Administrator Email</label>
              <input
                type="email"
                required
                className="form-control"
                placeholder="jane@company.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Password</label>
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

          {/* SECTION 5: BRANDING */}
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label">Primary Brand Accent Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: '42px', height: '38px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="text"
                className="form-control mono"
                style={{ width: '130px' }}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Applied to the tenant's interface and portals
              </span>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <Link to="/admin/tenants" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ background: '#7C3AED', padding: '0.75rem 1.75rem' }}>
              {saving ? <span className="spinner" style={{ width: '18px', height: '18px' }} /> : (
                <>
                  <Plus size={16} /> Onboard Tenant
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
