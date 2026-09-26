import React from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { Shield, BookOpen, Layers, CheckCircle, Database, Server, Globe, ArrowRight, Lock, Sparkles } from 'lucide-react';

export default function PublicTenantHome() {
  const { tenant, isPlatform } = useTenant();
  const { isAuthenticated } = useAuth();

  if (isPlatform) {
    return (
      <div style={{ maxWidth: '960px', margin: '2rem auto' }}>
        <div className="card" style={{ padding: '3.75rem 2.5rem', textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.95rem',
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 'var(--radius-full)',
            color: '#C084FC',
            fontSize: '0.825rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            letterSpacing: '0.04em'
          }}>
            <Shield size={15} /> ENTERPRISE MULTI-TENANT CLOUD PLATFORM
          </div>

          <h1 style={{ fontSize: '2.85rem', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
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
            Enterprise documentation management platform serving multiple isolated organizations with dynamic custom domain routing and strict database boundary enforcement.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/admin/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Platform Admin Console <ArrowRight size={18} />
            </Link>
            <a href="http://abc.localhost:5173" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              Launch ABC Electronics
            </a>
            <a href="http://xyz.localhost:5173" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              Launch XYZ Furniture
            </a>
          </div>
        </div>

        {/* Enterprise Architecture Pillars */}
        <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
          <div className="card">
            <Globe color="#60A5FA" size={28} style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Multi-Domain Routing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Automatic hostname resolution supports both platform subdomains and dedicated custom domains with seamless SSL routing.
            </p>
          </div>

          <div className="card">
            <Database color="#34D399" size={28} style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Strict Data Isolation</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              PostgreSQL shared database with row-level boundary enforcement. Zero cross-tenant data exposure.
            </p>
          </div>

          <div className="card">
            <Layers color="#C084FC" size={28} style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dynamic Theming</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Single responsive frontend engine renders custom logos, brand colors, titles, and workspaces for each organization dynamically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tenant Public View
  const settings = tenant?.website_settings || {};
  const companyName = settings.company_name || tenant?.name || 'Company';
  const websiteTitle = settings.website_title || `Welcome to ${companyName}`;
  const description = settings.description || 'Welcome to our secure enterprise document management and note-taking workspace.';

  return (
    <div style={{ maxWidth: '960px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '3.75rem 2.5rem', textAlign: 'center', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
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
          marginBottom: '1.5rem',
          letterSpacing: '0.03em'
        }}>
          ORGANIZATION WORKSPACE: {tenant?.domain}
        </div>

        <h1 style={{ fontSize: '2.85rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '1.25rem' }}>
          {websiteTitle}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto 2.25rem', lineHeight: 1.6 }}>
          {description}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Open Workspace Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Sign In to Workspace <ArrowRight size={18} />
            </Link>
          )}
          <Link to="/notes" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
            View Documents
          </Link>
        </div>
      </div>

      {/* Enterprise Organization Infrastructure Panel */}
      <div className="card" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#93C5FD' }}>
          Organization Infrastructure & Boundary Status
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Organization:</span>
            <div style={{ fontWeight: 600, marginTop: '2px' }}>{companyName}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Workspace Domain:</span>
            <div className="mono" style={{ fontWeight: 600, color: '#60A5FA', marginTop: '2px' }}>{tenant?.domain}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Brand Accent:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginTop: '2px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: settings.primary_color || 'var(--tenant-primary)' }} />
              <span className="mono">{settings.primary_color || '#2563EB'}</span>
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Data Isolation:</span>
            <div style={{ fontWeight: 600, color: '#10B981', marginTop: '2px' }}>
              Active (tenant_id = {tenant?.id})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
