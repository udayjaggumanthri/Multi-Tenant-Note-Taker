import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Building2, Users, FileText, CheckCircle2, XCircle, Plus, ArrowRight, ExternalLink } from 'lucide-react';

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState({
    total_tenants: 0,
    active_tenants: 0,
    inactive_tenants: 0,
    total_notes: 0,
  });
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, tenantsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTenants(),
      ]);
      setStats(statsData);
      setTenants(tenantsData);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (tenant) => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateAdminTenant(tenant.id, { status: nextStatus });
      await loadData();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      <div className="page-header flex-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-platform">Platform Administration</span>
          </div>
          <h1 className="page-title">Platform Dashboard</h1>
          <p className="page-desc">
            Global overview of all onboarded SaaS tenants, domains, and activity
          </p>
        </div>

        <Link to="/admin/tenants/create" className="btn btn-primary" style={{ background: '#7C3AED' }}>
          <Plus size={16} /> Create Tenant
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Metrics Row (Phase 10) */}
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL TENANTS</span>
            <Building2 size={20} color="#60A5FA" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_tenants}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Registered SaaS tenants
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>ACTIVE TENANTS</span>
            <CheckCircle2 size={20} color="#10B981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981' }}>{stats.active_tenants}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Serving traffic normally
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>INACTIVE TENANTS</span>
            <XCircle size={20} color="#EF4444" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: stats.inactive_tenants > 0 ? '#EF4444' : 'inherit' }}>
            {stats.inactive_tenants}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Access suspended (403)
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL NOTES</span>
            <FileText size={20} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.total_notes}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Across all shared tables
          </div>
        </div>
      </div>

      {/* Tenants Table Preview */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Tenant Overview</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Quick status and activation controls (Phase 28 test)
            </p>
          </div>
          <Link to="/admin/tenants" className="btn btn-secondary btn-sm">
            View All Tenants ({tenants.length})
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant ID</th>
                  <th>Tenant Name</th>
                  <th>Mapped Domain</th>
                  <th>Status</th>
                  <th>Notes Count</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontWeight: 700, color: '#60A5FA' }}>
                      #{t.id}
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td className="mono" style={{ fontSize: '0.85rem' }}>
                      <a
                        href={`http://${t.primary_domain}:${window.location.port || '5173'}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#60A5FA', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {t.primary_domain} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td>
                      <span className={`badge ${t.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.notes_count}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`btn btn-sm ${t.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {t.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
