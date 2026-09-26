import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { ArrowLeft, Save, Trash2, ShieldAlert } from 'lucide-react';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const isEditing = Boolean(id);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      async function loadNote() {
        try {
          setLoading(true);
          const data = await api.getNote(id);
          setTitle(data.title);
          setContent(data.content);
        } catch (err) {
          console.error('Failed to load note:', err);
          setError(err.message || 'Note not found or inaccessible for this tenant.');
        } finally {
          setLoading(false);
        }
      }
      loadNote();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        await api.updateNote(id, { title, content });
      } else {
        await api.createNote({ title, content });
      }
      navigate('/notes');
    } catch (err) {
      console.error('Failed to save note:', err);
      setError(err.message || 'Error saving note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.deleteNote(id);
      navigate('/notes');
    } catch (err) {
      alert(`Error deleting note: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/notes" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Back to Notes
        </Link>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {isEditing ? 'Edit Note' : 'Create New Note'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
              Assigning strictly to <strong>{tenant?.name}</strong> (Tenant ID: {tenant?.id})
            </p>
          </div>
          {isEditing && (
            <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm">
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-danger">
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Note Title</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Q3 Strategic Planning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Note Content</label>
            <textarea
              required
              className="form-control"
              placeholder="Write your note content here..."
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <Link to="/notes" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : (
                <>
                  <Save size={16} /> {isEditing ? 'Save Changes' : 'Create Note'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
