import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Trash2, Power, ExternalLink, CheckCircle, XCircle, Search } from 'lucide-react';

export default function PlatformAdminTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

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
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">SaaS Tenants</h1>
          <p className="page-desc">
            Manage all active and inactive tenants, custom domain bindings, and access
          </p>
        </div>

        <Link to="/admin/tenants/create" className="btn btn-primary" style={{ background: '#7C3AED' }}>
          <Plus size={16} /> Create Tenant
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by tenant name, domain, or ID..."
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
                <th>Tenant Name</th>
                <th>Slug</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Notes Count</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => (
                <tr key={t.id}>
                  <td className="mono" style={{ fontWeight: 700, color: '#60A5FA' }}>
                    #{t.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td className="mono" style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {t.slug}
                  </td>
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
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`btn btn-sm ${t.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ fontSize: '0.75rem' }}
                        title={t.status === 'ACTIVE' ? 'Deactivate Tenant' : 'Activate Tenant'}
                      >
                        <Power size={13} /> {t.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.375rem 0.5rem' }}
                        title="Delete Tenant"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
