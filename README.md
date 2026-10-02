# Multi-Tenant Note Taker — Enterprise SaaS Platform

A production-ready Multi-Tenant SaaS document management platform featuring physical PostgreSQL schema-per-tenant data isolation via **`django-tenants`**, dynamic custom domain routing, runtime brand theming, and an enterprise administration console.

> 📘 **Looking for a beginner-friendly system overview?** Read the [Complete System Architecture & Flow Guide](SYSTEM_ARCHITECTURE_FLOW.md).

---

## 🏗 Architecture Blueprint

```
                         Incoming Request (Browser / Client)
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
Tenant Subdomain or Custom Domain                               Platform Administration
  e.g. abc.localhost / notes.acme.com                           e.g. prod.localhost:5173
        │                                                                 │
        └────────────────────────────────┬────────────────────────────────┘
                                         ▼
                   [ Nginx Reverse Proxy / Host Normalization ]
                     - Preserves Host Header
                     - Drops direct IP scans immediately (HTTP 444)
                                         │
                                         ▼
                   [ Django AppTenantMiddleware (django-tenants) ]
                     - Validates domain & tenant active status
                     - Sets PostgreSQL search_path = "tenant_<slug>", "public"
                                         │
                                         ▼
                       [ PostgreSQL Database (multitenant_notes) ]
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           ▼                             ▼                             ▼
     public Schema               tenant_abc Schema             tenant_xyz Schema
  (Platform Master Data)         (ABC Electronics)              (XYZ Furniture)
  ├── clients (Tenants)          └── notes_note (Notes)         └── notes_note (Notes)
  ├── domains (Domain Routing)
  ├── website_settings
  └── users_user (Users)
```

---

## 📚 Dedicated Documentation Catalog

This repository is organized into dedicated, comprehensive manuals:

| Document | Scope | Target Audience |
| :--- | :--- | :--- |
| 🏛️ **[Architecture Manual](ARCHITECTURE.md)** | Complete system blueprints, PostgreSQL schema isolation, request lifecycle, 6-layer defense | Software Architects & Engineers |
| 🌐 **[DNS & Custom Domains Manual](docs/DNS_AND_DOMAINS.md)** | Step-by-step domain setup (Cloudflare, GoDaddy, Namecheap), A/CNAME records, Wildcard DNS, Let's Encrypt SSL, IP protection | Customers, Workspace Admins & DevOps |
| ⚙️ **[Backend Manual](backend/README.md)** | `django-tenants` schema design, `SHARED_APPS` vs `TENANT_APPS`, security middleware, API catalog, test suite | Backend Engineers |
| 🎨 **[Frontend Manual](frontend/README.md)** | React 19 + Vite, dynamic CSS token design system, context providers, routes, production build | Frontend Engineers |
| 🚀 **[Production Deployment Guide](deploy/README.md)** | Ubuntu VPS provisioning, PostgreSQL 16, Nginx configuration, PM2 / Gunicorn, daily backups | DevOps & SysAdmins |

---

## ✨ Enterprise Features

- **Physical Schema Isolation**: Backed by `django-tenants`. Each tenant's data resides in its own isolated PostgreSQL schema (`tenant_abc`, `tenant_xyz`). Zero cross-tenant data exposure.
- **Dynamic Multi-Domain Routing**: Handles platform subdomains (`*.yourplatform.com`), apex domains, and custom subdomains (`notes.company.com`) seamlessly.
- **Host Header & Direct IP Defense**: Rejects direct IP access (`403 Forbidden` / Nginx `444`), drops rogue host headers, and blocks inactive tenants at the middleware boundary.
- **Dynamic Brand Theming**: Renders custom company names, titles, descriptions, and brand accent colors at runtime based on incoming domain.
- **Enterprise Note Management**: Includes category tags, search filtering, pinned notes prioritization, and JSON document export.
- **Platform SuperAdmin Console**: Complete control over tenants, lifecycle statuses (Active/Inactive), domain verification, and system-wide metrics.

---

## 🚀 Local Quickstart (Windows Development)

### 1. Prerequisites
- **Python 3.11+** installed and available on PATH
- **Node.js 18+ & npm** installed
- **PostgreSQL 14+** running locally on port 5432

### 2. Configure Windows Hosts File (For Local Multi-Domain Testing)
Open PowerShell as **Administrator** and add test domains to `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1 prod.localhost
127.0.0.1 abc.localhost
127.0.0.1 xyz.localhost
```
*(Chrome, Edge, and modern Firefox automatically resolve any `*.localhost` domain to `127.0.0.1` even without editing hosts).*

### 3. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies (includes django-tenants and psycopg2)
pip install -r requirements.txt

# Run migrations (creates public schema and tables)
python manage.py migrate_schemas --shared

# Seed initial platform admin and tenants (creates tenant_abc and tenant_xyz schemas)
python manage.py seed_data

# Start backend server
python manage.py runserver 0.0.0.0:8000
```

### 4. Frontend Setup
In a new terminal:
```powershell
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

---

## 🔑 Default Credentials (After Seeding)

| Domain | Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| `http://prod.localhost:5173` | Platform Admin Console | `admin@prod.com` | `AdminPass@123` | Platform Admin |
| `http://abc.localhost:5173` | ABC Electronics Space | `ravi@abc.com` | `RaviPass@123` | Tenant Admin |
| `http://xyz.localhost:5173` | XYZ Furniture Space | `john@xyz.com` | `JohnPass@123` | Tenant Admin |

---

## 🧪 Testing & Verification

### Automated Unit Test Suite
The backend includes 14 unit tests covering domain normalization, physical schema isolation, direct note access protection, payload tampering prevention, and platform admin operations:
```powershell
cd backend
.\venv\Scripts\python manage.py test
```
*Result: 14 tests run with 100% success.*

### Live End-to-End Architecture Verification
Run the end-to-end verification script against the running Django backend:
```powershell
python test_e2e_isolation.py
```
This tests:
1. `abc.localhost` resolution to Tenant 101
2. `xyz.localhost` resolution to Tenant 102
3. Port normalization (`ABC.LOCALHOST:8000` -> `abc.localhost`)
4. Direct IP address blocking (`198.51.100.24` -> `403 Forbidden`)
5. Rogue domain rejection (`evil-attacker.com` -> `404 Not Found`)
6. Cross-tenant authentication blocking (`ravi@abc.com` on `xyz.localhost` -> `403 Forbidden`)
7. Data isolation between `tenant_abc` and `tenant_xyz` schemas (Zero data leakage)
8. Direct note ID tampering protection
9. Tamper-resistant tenant assignment
10. Platform admin tenant deactivation and reactivation lifecycle

---

## 📂 Project Directory Structure

```
Multi-Tenant-Note-Taker/
├── backend/                  # Django REST Framework Backend
│   ├── config/               # Settings, URLs, django-tenants config
│   ├── tenants/              # Client, Domain, WebsiteSettings, Middleware
│   ├── users/                # Custom User model and authentication
│   ├── notes/                # Note model (instantiated in tenant schemas)
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Backend architecture & API catalog
├── frontend/                 # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/       # Navbar, ErrorTenantPage, DomainSwitcherDemo
│   │   ├── context/          # TenantContext, AuthContext
│   │   ├── pages/            # NotesList, NoteDetail, Admin, Settings
│   │   └── services/         # Axios API client
│   ├── package.json          # Node dependencies
│   └── README.md             # Frontend tokens, routes & design guide
├── deploy/                   # Production Deployment Configurations
│   ├── nginx/                # Production Nginx reverse proxy (444 IP drop)
│   ├── pm2/                  # Gunicorn ecosystem configuration
│   ├── scripts/              # setup_vps.sh, deploy_update.sh, backup_db.sh
│   └── README.md             # Full Linux VPS deployment manual
├── docs/
│   └── DNS_AND_DOMAINS.md    # Customer & Admin DNS configuration guide
├── test_e2e_isolation.py     # Live automated architecture verification test
└── README.md                 # System overview and quickstart (this file)
```

---

## 📄 License
This project is open-source under the MIT License.
