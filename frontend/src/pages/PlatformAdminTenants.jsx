import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatDomainUrl } from '../utils/domain';
import { Plus, Trash2, Power, ExternalLink, Globe, Database, Search, HelpCircle } from 'lucide-react';
import DnsSetupModal from '../components/DnsSetupModal';

export default function PlatformAdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [modalDomain, setModalDomain] = useState('company.com');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminTenants();
      setTenants(data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleOpenDns = (domain) => {
    setModalDomain(domain || 'company.com');
    setIsDnsModalOpen(true);
  };

  const handleToggleStatus = async (tenant) => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateAdminTenant(tenant.id, { status: nextStatus });
      await fetchTenants();
    } catch (err) {
      alert(`Error updating tenant status: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete tenant "${name}" and all associated data?`)) return;
    try {
      await api.deleteAdminTenant(id);
      setTenants(tenants.filter((t) => t.id !== id));
    } catch (err) {
      alert(`Error deleting tenant: ${err.message}`);
    }
  };

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.primary_domain && t.primary_domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
    String(t.id).includes(searchTerm)
  );

  return (
    <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Enterprise Tenants</h1>
          <p className="page-desc">
            Centralized directory of all onboarded organizations, custom domain bindings, and database isolation strategies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => handleOpenDns('customdomain.com')}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Globe size={15} color="#60A5FA" /> DNS Setup Guide
          </button>
          <Link to="/admin/tenants/create" className="btn btn-primary" style={{ background: '#7C3AED' }}>
            <Plus size={16} /> Onboard Tenant
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search organizations by name, domain, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tenant ID</th>
                <th>Organization</th>
                <th>Domain & Routing</th>
                <th>DB Strategy</th>
                <th>Status</th>
                <th>Total Notes</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Controls</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => {
                const primaryDomainObj = t.domains?.find((d) => d.is_primary) || t.domains?.[0];
                const domainType = primaryDomainObj?.domain_type || 'SUBDOMAIN';

                return (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontWeight: 700, color: '#60A5FA' }}>
                      #{t.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.name}</div>
                      <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.slug}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <a
                          href={formatDomainUrl(t.primary_domain, t.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="mono"
                          style={{ color: '#60A5FA', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {t.primary_domain} <ExternalLink size={11} />
                        </a>
                      </div>
                      {window.location.hostname.includes('ngrok') && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <a
                            href={`${window.location.origin}/?tenant=${t.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mono"
                            style={{ color: '#A78BFA', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            ⚡ Test on Tunnel: ?tenant={t.slug} <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                      {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && t.slug && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <a
                            href={`http://${t.slug}.localhost:5173`}
                            target="_blank"
                            rel="noreferrer"
                            className="mono"
                            style={{ color: '#34D399', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            💻 Local Dev: {t.slug}.localhost:5173 <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: '0.25rem' }}>
                        <span className="badge" style={{
                          fontSize: '0.675rem',
                          padding: '0.15rem 0.45rem',
                          background: domainType === 'CUSTOM' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                          color: domainType === 'CUSTOM' ? '#C084FC' : '#93C5FD',
                          border: `1px solid ${domainType === 'CUSTOM' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`
                        }}>
                          {domainType === 'CUSTOM' ? 'Custom Domain' : 'Subdomain'}
                        </span>
                        {t.domains?.[0]?.is_verified ? (
                          <span style={{ fontSize: '0.675rem', color: '#34D399', fontWeight: 600 }}>
                            ✓ DNS Active
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.675rem', color: '#FBBF24', fontWeight: 600 }}>
                            ⏳ Pending DNS
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{
                        fontSize: '0.675rem',
                        padding: '0.15rem 0.45rem',
                        background: t.db_strategy === 'SHARED_DB' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: t.db_strategy === 'SHARED_DB' ? '#34D399' : '#FCD34D',
                        border: `1px solid ${t.db_strategy === 'SHARED_DB' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                      }}>
                        {t.db_strategy_display || 'Shared DB'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.notes_count}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenDns(t.primary_domain)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                          title="View DNS Records & Setup Guide"
                        >
                          <Globe size={12} color="#60A5FA" /> DNS
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`btn btn-sm ${t.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
                          style={{ fontSize: '0.75rem' }}
                          title={t.status === 'ACTIVE' ? 'Deactivate Access' : 'Reactivate Access'}
                        >
                          <Power size={13} /> {t.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.375rem 0.5rem' }}
                          title="Delete Organization"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DnsSetupModal
        isOpen={isDnsModalOpen}
        onClose={() => setIsDnsModalOpen(false)}
        initialDomain={modalDomain}
      />
    </div>
  );
}
