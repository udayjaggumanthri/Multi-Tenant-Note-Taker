import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { Plus, Trash2, Edit3, Eye, FileText, Calendar, User as UserIcon } from 'lucide-react';

export default function NotesList() {
  const { tenant } = useTenant();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotes = async () => {
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
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete note "${title}"?`)) return;
    try {
      await api.deleteNote(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err) {
      alert(`Error deleting note: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header flex-between">
        <div>
          <h1 className="page-title">Tenant Notes</h1>
          <p className="page-desc">
            Listing notes strictly scoped to <strong>{tenant?.name}</strong> (Tenant ID: {tenant?.id})
          </p>
        </div>

        <Link to="/notes/create" className="btn btn-primary">
          <Plus size={16} /> Create Note
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : notes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No notes found for this tenant</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Get started by creating a new note. All data is isolated by tenant_id in the database.
          </p>
          <Link to="/notes/create" className="btn btn-primary">
            <Plus size={16} /> Create First Note
          </Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Content Preview</th>
                <th>Created By</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id}>
                  <td className="mono" style={{ color: 'var(--text-muted)' }}>#{note.id}</td>
                  <td style={{ fontWeight: 600 }}>{note.title}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {note.content}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {note.created_by_name || 'Admin'}
                  </td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {new Date(note.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <Link to={`/notes/${note.id}`} className="btn btn-secondary btn-sm" title="View / Edit">
                        <Edit3 size={13} /> Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(note.id, note.title)}
                        className="btn btn-danger btn-sm"
                        title="Delete"
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
