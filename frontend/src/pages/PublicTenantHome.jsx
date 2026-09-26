import React from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { Shield, BookOpen, Layers, CheckCircle, Database, Server, Globe, ArrowRight } from 'lucide-react';

export default function PublicTenantHome() {
  const { tenant, isPlatform } = useTenant();
  const { isAuthenticated } = useAuth();

  if (isPlatform) {
    return (
      <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
        <div className="card" style={{ padding: '3.5rem 2.5rem', textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.85rem',
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 'var(--radius-full)',
            color: '#C084FC',
            fontSize: '0.825rem',
            fontWeight: 700,
            marginBottom: '1.5rem'
          }}>
            <Shield size={16} /> MULTI-TENANT SAAS PROOF OF CONCEPT
          </div>

          <h1 style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Multi-Tenant Note Taker <br />
            <span style={{
              background: 'linear-gradient(135deg, #60A5FA 0%, #A855F7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Platform Administration
            </span>
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto 2.25rem', lineHeight: 1.6 }}>
            Demonstrating shared-database multi-tenancy with dynamic domain resolution.
            One Django backend, One React frontend, and One PostgreSQL database powering isolated tenants.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/admin/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Platform Admin Portal <ArrowRight size={18} />
            </Link>
            <a href="http://abc.localhost:5173" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              Launch Tenant 101 (ABC)
            </a>
            <a href="http://xyz.localhost:5173" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              Launch Tenant 102 (XYZ)
            </a>
          </div>
        </div>

        {/* Architecture Proof Cards */}
        <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
          <div className="card">
            <Globe color="#60A5FA" size={28} style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Domain Resolution</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Incoming Host headers are normalized by <span className="mono">TenantMiddleware</span> and matched against <span className="mono">custom_domains</span>.
            </p>
          </div>

          <div className="card">
            <Database color="#34D399" size={28} style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Logical Isolation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Single PostgreSQL database. Shared tables strictly scoped by <span className="mono">tenant_id</span>. Zero cross-tenant data leakage.
            </p>
          </div>

          <div className="card">
            <Layers color="#F472B6" size={28} style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Unified Codebase</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              One React app and one Django REST backend serve all tenants and administrators dynamically without separate deployments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tenant Public View (Phase 23)
  const settings = tenant?.website_settings || {};
  const companyName = settings.company_name || tenant?.name || 'Company';
  const websiteTitle = settings.website_title || `Welcome to ${companyName}`;
  const description = settings.description || 'Welcome to our multi-tenant document management and note-taking space.';

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '3.5rem 2.5rem', textAlign: 'center', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'var(--tenant-primary)'
        }} />

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.85rem',
          background: 'var(--tenant-primary-light)',
          border: '1px solid var(--tenant-primary)',
          borderRadius: 'var(--radius-full)',
          color: 'var(--tenant-primary)',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '1.5rem'
        }}>
          TENANT DOMAIN: {tenant?.domain} • TENANT ID: {tenant?.id}
        </div>

        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
          {websiteTitle}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto 2.25rem', lineHeight: 1.6 }}>
          {description}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Open Tenant Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Tenant Sign In <ArrowRight size={18} />
            </Link>
          )}
          <Link to="/notes" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
            View Notes
          </Link>
        </div>
      </div>

      {/* Proof of Tenant Isolation Information Banner */}
      <div className="card" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#93C5FD' }}>
          Multi-Tenant Architecture Status (Proof of Concept)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Tenant Name:</span>
            <div style={{ fontWeight: 600 }}>{companyName}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Tenant ID:</span>
            <div className="mono" style={{ fontWeight: 600, color: 'var(--tenant-primary)' }}>{tenant?.id}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Primary Branding Color:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: settings.primary_color || 'var(--tenant-primary)' }} />
              <span className="mono">{settings.primary_color || '#2563EB'}</span>
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Database Isolation:</span>
            <div style={{ fontWeight: 600, color: '#10B981' }}>Shared DB (tenant_id = {tenant?.id})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
