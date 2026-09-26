import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { api } from '../services/api';
import { FileText, Plus, Settings, ExternalLink, ArrowRight, ShieldCheck, Clock, User as UserIcon } from 'lucide-react';

export default function TenantDashboard() {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tenantName = tenant?.website_settings?.company_name || tenant?.name || 'Company';

  useEffect(() => {
    async function loadNotes() {
      try {
        setLoading(true);
        const data = await api.getNotes();
        setNotes(data);
      } catch (err) {
        console.error('Failed to load notes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadNotes();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Welcome Header */}
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-tenant">
              Tenant ID: {tenant?.id} ({tenant?.domain})
            </span>
            <span className="badge badge-active">Active</span>
          </div>
          <h1 className="page-title">{tenantName}</h1>
          <p className="page-desc">
            Welcome back, <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/notes/create" className="btn btn-primary">
            <Plus size={16} /> Create Note
          </Link>
          <Link to="/settings" className="btn btn-secondary">
            <Settings size={16} /> Website Settings
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL NOTES</span>
            <FileText size={20} color="var(--tenant-primary)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{notes.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.25rem' }}>
            Isolated in DB: tenant_id = {tenant?.id}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>TENANT DOMAIN</span>
            <ExternalLink size={20} color="#60A5FA" />
          </div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, wordBreak: 'break-all' }}>
            {tenant?.domain}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Primary domain mapped
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>ADMINISTRATOR</span>
            <UserIcon size={20} color="#A78BFA" />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{user?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Role: {user?.role}
          </div>
        </div>
      </div>

      {/* Recent Notes Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Recent Notes</h2>
          <Link to="/notes" className="btn btn-secondary btn-sm">
            View All ({notes.length})
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner" />
          </div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <FileText size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h4 style={{ marginBottom: '0.5rem' }}>No notes created yet</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Create your first note for {tenantName}.
            </p>
            <Link to="/notes/create" className="btn btn-primary btn-sm">
              <Plus size={14} /> Create Note
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notes.slice(0, 5).map((note) => (
              <div
                key={note.id}
                className="flex-between"
                style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {note.title}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {note.content}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                  <Link to={`/notes/${note.id}`} className="btn btn-secondary btn-sm">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" className="btn btn-secondary btn-sm">
          <ExternalLink size={14} /> View Public Tenant Website
        </Link>
        <button onClick={logout} className="btn btn-danger btn-sm">
          Sign Out
        </button>
      </div>
    </div>
  );
}
