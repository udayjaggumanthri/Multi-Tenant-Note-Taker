# Multi-Tenant Note Taker — Frontend Application

Modern, responsive single-page application built with **React 19** and **Vite**, featuring dynamic runtime multi-tenant white-label branding, domain-driven context resolution, and complete tenant isolation.

---

## Architecture Overview

```
Browser (e.g. abc.localhost:5173 or notes.acme.com)
  │
  ├──► TenantProvider (Bootstraps on mount)
  │      └── Calls GET /api/tenant/ (with Host header)
  │      └── Stores active tenant object & website branding
  │      └── Injects dynamic CSS variables: --tenant-primary
  │
  ├──► AuthProvider
  │      └── Scopes auth tokens to the active tenant domain
  │      └── Prevents cross-tenant token replay attacks
  │
  └──► AppRouter
         ├── Public Tenant Portal (/)
         ├── Tenant Space (/dashboard, /notes, /settings)
         ├── Platform Admin Space (/admin/*)
         └── Enterprise DNS Guide (/dns-guide)
```

---

## Dynamic Multi-Tenant Design System

The application uses custom CSS design tokens defined in `src/index.css`. Upon resolving the tenant from the domain name, `TenantContext` dynamically applies the tenant's brand colors directly to the CSS root:

```javascript
// Dynamic CSS variable injection in TenantContext.jsx
document.documentElement.style.setProperty(
  '--tenant-primary',
  tenant.website_settings.primary_color || '#2563EB'
);
```

### Core Design Tokens
- `--tenant-primary`: Dynamic primary branding color (e.g., `#2563EB` for ABC Electronics, `#7C3AED` for XYZ Furniture).
- `--tenant-primary-light`: 15% opacity tint for badges and highlights.
- `--bg-primary`: Dark mode canvas background (`#0B0F17`).
- `--bg-surface`: Elevated card surface background (`#111827`).
- `--border-color`: Glassmorphism border stroke (`#1F2937`).
- `--text-primary`: High-contrast typography (`#F9FAFB`).
- `--text-secondary`: Subtitle typography (`#9CA3AF`).

---

## Context Providers

### 1. `TenantContext.jsx`
- Automatically extracts `window.location.hostname`.
- Calls `/api/tenant/` using axios with the current hostname.
- Detects whether the current site is the platform master domain (`prod.localhost` or `prod.yourplatform.com`) via `isPlatform`.
- Handles errors:
  - `404 Not Found`: Displays `ErrorTenantPage` indicating unconfigured domain.
  - `403 Forbidden`: Displays `ErrorTenantPage` indicating inactive tenant subscription.

### 2. `AuthContext.jsx`
- Manages authentication tokens and current user profile in `localStorage`.
- Tokens are namespaced by domain to prevent token leakage across tenants.
- Exposes `login(email, password, isPlatformLogin)`, `logout()`, and role flags:
  - `isPlatformAdmin`: Superuser managing all tenants.
  - `isTenantAdmin`: Workspace owner managing tenant documents & settings.
  - `isMember`: Standard team member.

---

## Route & Page Catalog

| Path | Component | Access Control | Description |
| :--- | :--- | :--- | :--- |
| `/` | `PublicTenantHome.jsx` | Public | Public landing page for the active tenant or platform |
| `/login` | `TenantLogin.jsx` | Public | Tenant employee and administrator sign-in |
| `/dashboard` | `TenantDashboard.jsx` | Tenant Auth | Workspace metrics, quick shortcuts, brand status |
| `/notes` | `NotesList.jsx` | Tenant Auth | Searchable, category-filtered document catalog with JSON export |
| `/notes/create` | `NoteDetail.jsx` | Tenant Auth | Create a new document in the tenant's PostgreSQL schema |
| `/notes/:id` | `NoteDetail.jsx` | Tenant Auth | Edit or delete a specific note |
| `/settings` | `TenantSettings.jsx` | Tenant Auth | Customize brand name, title, description, and primary color |
| `/admin/login` | `PlatformAdminLogin.jsx` | Public | Root platform administrator login |
| `/admin/dashboard` | `PlatformAdminDashboard.jsx` | Platform Admin | Cross-tenant metrics, active tenants, notes count |
| `/admin/tenants` | `PlatformAdminTenants.jsx` | Platform Admin | Tenant directory, status toggle (Active/Inactive), domain links |
| `/admin/tenants/create` | `PlatformAdminCreateTenant.jsx` | Platform Admin | Provision new tenant with schema, admin user, domain, & brand |
| `/dns-guide` | `DnsGuidePage.jsx` | Public | Interactive DNS setup guide with live verification tools |

---

## Development & Production Commands

From the `frontend` directory:

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (Port 5173)
npm run dev

# 3. Build optimized production bundle
npm run build

# 4. Preview production build locally
npm run preview
```
