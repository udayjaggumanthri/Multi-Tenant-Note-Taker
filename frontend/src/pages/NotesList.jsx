import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { Plus, Trash2, Edit3, FileText, Download, Search, Pin, Tag, Sparkles } from 'lucide-react';

export default function NotesList() {
  const { tenant } = useTenant();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

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

  // Extract unique categories across tenant notes
  const categories = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => {
      if (n.category) set.add(n.category);
    });
    return Array.from(set);
  }, [notes]);

  // Filter and sort (pinned notes placed first)
  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        const cat = note.category || 'General';
        const matchesCategory = selectedCategory === 'ALL' || cat === selectedCategory;
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          (note.title && note.title.toLowerCase().includes(term)) ||
          (note.content && note.content.toLowerCase().includes(term)) ||
          (note.category && note.category.toLowerCase().includes(term));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [notes, searchTerm, selectedCategory]);

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `notes_export_${tenant?.slug || 'tenant'}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Tenant Documents & Notes</h1>
          <p className="page-desc">
            Physically isolated schema data for <strong>{tenant?.name}</strong> (Schema: <span className="mono" style={{ color: '#60A5FA' }}>{tenant?.schema_name || ('tenant_' + tenant?.slug)}</span>)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {notes.length > 0 && (
            <button
              onClick={handleExportJson}
              className="btn btn-secondary"
              title="Export all tenant notes as JSON"
            >
              <Download size={15} /> Export Notes (JSON)
            </button>
          )}
          <Link to="/notes/create" className="btn btn-primary">
            <Plus size={16} /> Create Note
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter and Search Bar */}
      {notes.length > 0 && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.5)' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search notes by title, content or tag..."
                className="form-control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.775rem', padding: '0.25rem 0.65rem' }}
              >
                All ({notes.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.775rem', padding: '0.25rem 0.65rem' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : notes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3>No documents found in this tenant schema</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Get started by creating a new note. All data is isolated physically in your organization's PostgreSQL schema.
          </p>
          <Link to="/notes/create" className="btn btn-primary">
            <Plus size={16} /> Create First Note
          </Link>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Search size={36} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
          <h4 style={{ marginBottom: '0.5rem' }}>No matching notes found</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            No notes matched your search query "{searchTerm}".
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Preview</th>
                <th>Author</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map((note) => (
                <tr key={note.id} style={note.is_pinned ? { background: 'rgba(37, 99, 235, 0.04)' } : undefined}>
                  <td className="mono" style={{ color: 'var(--text-muted)' }}>#{note.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      {note.is_pinned && (
                        <span title="Pinned Note" style={{ color: '#F59E0B', display: 'inline-flex' }}>
                          <Pin size={13} fill="#F59E0B" />
                        </span>
                      )}
                      <span style={{ fontWeight: 600 }}>{note.title}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.15rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <Tag size={10} /> {note.category || 'General'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {note.content}
                  </td>
                  <td style={{ fontSize: '0.825rem' }}>
                    {note.created_by_name || 'Admin'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
