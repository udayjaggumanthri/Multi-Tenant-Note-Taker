// Multi-Tenant API Client
// Automatically sets X-Tenant-Domain and Authorization headers

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const urlParams = new URLSearchParams(window.location.search);
  const tenantOverride = urlParams.get('tenant') || urlParams.get('domain');

  let tenantDomain = window.location.hostname;
  if (tenantOverride) {
    tenantDomain = tenantOverride.includes('.') ? tenantOverride : `${tenantOverride}.localhost`;
  }

  const headers = {
    'Content-Type': 'application/json',
    // Pass resolved tenant domain or browser hostname
    'X-Tenant-Domain': tenantDomain,
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(
      (data && data.error) ||
      (data && data.detail) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Public Tenant & Settings
  getTenant: () => request('/tenant/'),
  getWebsiteSettings: () => request('/website/'),
  updateWebsiteSettings: (settings) => request('/website/', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),

  // Auth
  login: (email, password, isPlatformLogin = false) => request('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password, is_platform_login: isPlatformLogin }),
  }),
  logout: () => request('/auth/logout/', { method: 'POST' }),
  getMe: () => request('/auth/me/'),

  // Notes (Scoped by current tenant)
  getNotes: () => request('/notes/'),
  getNote: (id) => request(`/notes/${id}/`),
  createNote: (note) => request('/notes/', {
    method: 'POST',
    body: JSON.stringify(note),
  }),
  updateNote: (id, note) => request(`/notes/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(note),
  }),
  deleteNote: (id) => request(`/notes/${id}/`, { method: 'DELETE' }),

  // Platform Admin
  getAdminStats: () => request('/admin/stats/'),
  getAdminTenants: () => request('/admin/tenants/'),
  getAdminTenant: (id) => request(`/admin/tenants/${id}/`),
  createAdminTenant: (tenantData) => request('/admin/tenants/', {
    method: 'POST',
    body: JSON.stringify(tenantData),
  }),
  updateAdminTenant: (id, tenantData) => request(`/admin/tenants/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(tenantData),
  }),
  deleteAdminTenant: (id) => request(`/admin/tenants/${id}/`, { method: 'DELETE' }),
};
