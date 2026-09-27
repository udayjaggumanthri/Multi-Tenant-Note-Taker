import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { ArrowLeft, Plus, Building2, User, Globe, Database, Shield, Info, Check, Sparkles } from 'lucide-react';
import DnsSetupModal from '../components/DnsSetupModal';

export default function PlatformAdminCreateTenant() {
  const navigate = useNavigate();
  const { platformInfo } = useTenant();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  
  // Domain selection: SUBDOMAIN vs CUSTOM
  const [domainMode, setDomainMode] = useState('SUBDOMAIN'); // 'SUBDOMAIN' | 'CUSTOM'
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  
  // Auto-detect candidate base domains (browser host, backend setting, flowiq.in, localhost)
  const detectedApexDomain = (() => {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('localhost') || host === '127.0.0.1' || host.includes('ngrok')) {
      return null;
    }
    return host.replace(/^(prod|app|admin|platform|api)\./i, '');
  })();

  const candidateBaseDomains = Array.from(new Set([
    platformInfo?.platform_base_domain,
    detectedApexDomain,
    'flowiq.in',
    'localhost'
  ].filter(d => Boolean(d && typeof d === 'string' && d.trim() !== ''))));

  // Base domain state (defaults to production apex domain e.g. flowiq.in or detected apex)
  const [baseDomain, setBaseDomain] = useState(() => {
    if (detectedApexDomain) return detectedApexDomain;
    if (platformInfo?.platform_base_domain && platformInfo.platform_base_domain !== 'localhost') {
      return platformInfo.platform_base_domain;
    }
    return 'flowiq.in';
  });

  useEffect(() => {
    if (platformInfo?.platform_base_domain && platformInfo.platform_base_domain !== 'localhost') {
      setBaseDomain(platformInfo.platform_base_domain);
    } else if (detectedApexDomain) {
      setBaseDomain(detectedApexDomain);
    }
  }, [platformInfo, detectedApexDomain]);

  // Database Strategy: ISOLATED_SCHEMA (django-tenants default)
  const [dbStrategy, setDbStrategy] = useState('ISOLATED_SCHEMA');
  
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sanitized domain calculation
  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '');
  const cleanBaseDomain = baseDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/:\d+$/, '')
    .replace(/^\.+|\.+$/g, '');

  const autoSubdomain = cleanSlug && cleanBaseDomain ? `${cleanSlug}.${cleanBaseDomain}` : '';
  const cleanCustomDomain = customDomainInput
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/:\d+$/, '')
    .replace(/^\.+|\.+$/g, '');

  const finalDomain = domainMode === 'SUBDOMAIN' ? autoSubdomain : cleanCustomDomain;

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

    if (domainMode === 'SUBDOMAIN') {
      if (!cleanSlug) {
        setError('Please provide a valid tenant slug (alphanumeric and dashes only).');
        setSaving(false);
        return;
      }
      if (!cleanBaseDomain) {
        setError('Please specify a platform base domain (e.g. flowiq.in or localhost).');
        setSaving(false);
        return;
      }
    } else if (domainMode === 'CUSTOM') {
      if (!cleanCustomDomain) {
        setError('Please provide a valid custom domain (e.g. company.com).');
        setSaving(false);
        return;
      }
    }

    try {
      await api.createAdminTenant({
        name,
        slug: cleanSlug,
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.2fr) auto minmax(180px, 2fr)', alignItems: 'center', gap: '0.6rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Subdomain Prefix</label>
                    <input
                      type="text"
                      required
                      className="form-control mono"
                      placeholder="e.g. acme"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                    />
                  </div>

                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-muted)', paddingTop: '1.25rem', userSelect: 'none' }}>
                    .
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Base Apex Domain</span>
                      <span style={{ fontSize: '0.72rem', color: '#60A5FA' }}>Production Domain</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="form-control mono"
                      placeholder="e.g. flowiq.in or localhost"
                      value={baseDomain}
                      onChange={(e) => setBaseDomain(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Selection Suggestions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Select Base Domain:</span>
                  {candidateBaseDomains.map((cand) => (
                    <button
                      key={cand}
                      type="button"
                      onClick={() => setBaseDomain(cand)}
                      style={{
                        padding: '0.2rem 0.65rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: baseDomain === cand ? 'rgba(37, 99, 235, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${baseDomain === cand ? '#60A5FA' : 'var(--border-color)'}`,
                        color: baseDomain === cand ? '#93C5FD' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cand === 'localhost' ? '💻 localhost (Local Dev)' : `🌐 ${cand} (Production)`}
                    </button>
                  ))}
                </div>

                {/* Live Preview Box */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      Resolved Access Domain
                    </div>
                    <div className="mono" style={{ color: '#60A5FA', fontSize: '0.95rem', fontWeight: 700 }}>
                      {finalDomain ? (baseDomain === 'localhost' ? `http://${finalDomain}:5173` : `https://${finalDomain}`) : 'e.g. acme.flowiq.in'}
                    </div>
                  </div>
                  <span className="badge" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#93C5FD', border: '1px solid rgba(37, 99, 235, 0.3)' }}>
                    ✓ Auto-Managed Subdomain
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Incoming requests to <code>{finalDomain || '*.yourdomain.com'}</code> are routed via Nginx directly into this tenant's dedicated PostgreSQL schema.
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
                    <strong>DNS Setup:</strong> Point a <code>CNAME</code> to your platform domain or an <code>A</code> record to your VPS Public IP.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDnsModalOpen(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.75rem', fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Globe size={13} color="#60A5FA" /> View Exact DNS Records & Registrar Guide
                </button>
              </div>
            )}
          </div>

          <DnsSetupModal
            isOpen={isDnsModalOpen}
            onClose={() => setIsDnsModalOpen(false)}
            initialDomain={customDomainInput || 'clientdomain.com'}
          />

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
