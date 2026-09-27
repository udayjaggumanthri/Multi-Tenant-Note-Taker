import React from 'react';
import { AlertTriangle, ShieldAlert, RefreshCw, Home } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { formatDomainUrl } from '../utils/domain';

export default function ErrorTenantPage() {
  const { error, reloadTenant } = useTenant();
  const currentHost = window.location.hostname;

  const isNotFound = error?.status === 404 || error?.code === 'TENANT_NOT_FOUND';
  const isInactive = error?.status === 403 || error?.code === 'TENANT_INACTIVE' || error?.code === 'DOMAIN_INACTIVE';

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="card" style={{ maxWidth: '580px', width: '100%', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isInactive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: isInactive ? '#EF4444' : '#F59E0B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          {isInactive ? <ShieldAlert size={34} /> : <AlertTriangle size={34} />}
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          {isInactive
            ? 'Tenant Account Is Currently Inactive'
            : isNotFound
            ? 'Tenant / Domain Not Configured'
            : 'Multi-Tenant Resolution Error'}
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          {isInactive ? (
            <>
              The tenant account for domain <span className="mono" style={{ color: '#F9FAFB' }}>{currentHost}</span> has been deactivated by the platform administrator. Access to tenant data and services is suspended.
            </>
          ) : isNotFound ? (
            <>
              No active tenant workspace found matching domain <span className="mono" style={{ color: '#F9FAFB' }}>{currentHost}</span>. Please verify that this custom domain or subdomain has been registered in the platform admin console and that DNS records point to this server.
            </>
          ) : (
            error?.message || 'An unexpected error occurred while resolving the tenant domain.'
          )}
        </p>

        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          textAlign: 'left',
          fontSize: '0.85rem',
          marginBottom: '2rem'
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 700 }}>
            REQUEST METADATA:
          </div>
          <div className="mono" style={{ color: 'var(--text-secondary)' }}>
            Domain: <span style={{ color: '#60A5FA' }}>{currentHost}</span>
          </div>
          <div className="mono" style={{ color: 'var(--text-secondary)' }}>
            Status Code: <span style={{ color: isInactive ? '#EF4444' : '#F59E0B' }}>{error?.status}</span>
          </div>
          <div className="mono" style={{ color: 'var(--text-secondary)' }}>
            Tenant Middleware: <span style={{ color: '#10B981' }}>Active (PostgreSQL Enforced)</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={reloadTenant} className="btn btn-secondary">
            <RefreshCw size={15} /> Retry Resolution
          </button>
          <a href={`${formatDomainUrl('prod.localhost')}/admin/login`} className="btn btn-primary">
            Platform Admin Portal
          </a>
        </div>
      </div>
    </div>
  );
}
