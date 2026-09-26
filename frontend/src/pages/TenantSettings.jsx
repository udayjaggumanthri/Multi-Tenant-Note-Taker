import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { Settings, Save, CheckCircle, Palette, Building, Globe } from 'lucide-react';

export default function TenantSettings() {
  const { tenant, reloadTenant } = useTenant();

  const [companyName, setCompanyName] = useState('');
  const [websiteTitle, setWebsiteTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.getWebsiteSettings();
        setCompanyName(data.company_name || '');
        setWebsiteTitle(data.website_title || '');
        setDescription(data.description || '');
        setPrimaryColor(data.primary_color || '#2563EB');
      } catch (err) {
        console.error('Failed to load website settings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.updateWebsiteSettings({
        company_name: companyName,
        website_title: websiteTitle,
        description: description,
        primary_color: primaryColor,
      });

      // Update CSS variable immediately
      document.documentElement.style.setProperty('--tenant-primary', primaryColor);
      await reloadTenant();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const presetColors = [
    { label: 'ABC Blue', hex: '#2563EB' },
    { label: 'XYZ Purple', hex: '#7C3AED' },
    { label: 'Emerald Green', hex: '#10B981' },
    { label: 'Rose Pink', hex: '#E11D48' },
    { label: 'Amber Gold', hex: '#D97706' },
    { label: 'Dark Indigo', hex: '#4F46E5' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Website & Branding Settings</h1>
        <p className="page-desc">
          Configure branding for <strong>{tenant?.name}</strong> (Tenant ID: {tenant?.id})
        </p>
      </div>

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>Website settings updated successfully! Dynamic branding applied.</span>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              type="text"
              required
              className="form-control"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Website Header Title</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Welcome to ABC Electronics"
              value={websiteTitle}
              onChange={(e) => setWebsiteTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Website Description</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Company mission and note portal description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Primary Brand Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: '45px', height: '40px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent' }}
              />
              <input
                type="text"
                className="form-control mono"
                style={{ width: '130px' }}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Applied live to buttons, badges, and accents
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {presetColors.map((color) => (
                <button
                  type="button"
                  key={color.hex}
                  onClick={() => setPrimaryColor(color.hex)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderColor: primaryColor === color.hex ? color.hex : 'var(--border-color)',
                  }}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color.hex }} />
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : (
                <>
                  <Save size={16} /> Save Branding Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
