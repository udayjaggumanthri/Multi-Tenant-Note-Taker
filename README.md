# Multi-Tenant Note Taker (Proof-of-Concept)

> A production-ready technical Proof-of-Concept (POC) proving that **ONE React frontend**, **ONE Django REST backend**, and **ONE PostgreSQL database** can reliably serve **multiple isolated tenants** across **multiple domains**.

All deployment configurations—including **Nginx reverse proxy**, **PM2 process manager**, **Gunicorn WSGI**, and **one-click automated setup scripts**—are built directly into this repository so you never have to manually write config files on your server.

---

## Architecture Flow

```
                    INTERNET
                        |
                 Customer Domain
           (abc.yourdomain.com / abc.localhost)
                        |
                       DNS
                        |
                   VPS Public IP
                        |
                      Nginx
             (Port 80/443 SSL Proxy)
                        |
           Preserves Host: $host header
                        |
               PM2 / Gunicorn WSGI
                 (127.0.0.1:8000)
                        |
                Tenant Middleware
                        |
             1. Normalize Host Header
             2. Match custom_domains table
             3. Check tenant status (ACTIVE / INACTIVE)
                        |
                 request.tenant
                        |
              PostgreSQL Database
             (Single Shared Database)
                        |
              Strict tenant_id Filter
            Note.objects.filter(tenant_id=request.tenant.id)
                        |
              Tenant-Specific Data
                        |
                React Frontend
           (Dynamic Theming & Branding)
                        |
                  User Browser
```

### Core Architectural Principle
* **ONE Codebase** (unified Git repository)
* **ONE React Application** (Vite + React.js + Vanilla CSS design system)
* **ONE Django REST Application** (Python 3 + Django REST Framework)
* **ONE PostgreSQL Database** (`multitenant_notes` with shared tables)
* **MULTIPLE Tenants** (ABC Electronics, XYZ Furniture, etc.)
* **MULTIPLE Domains** (`abc.localhost`, `xyz.localhost`, `prod.localhost`)
* **Tenant Resolution via Domain** (`TenantMiddleware` resolves domain -> tenant)
* **Tenant Isolation via `tenant_id`** (Every database query is strictly filtered by `request.tenant.id`)

---

## Repository Structure & Ready-Made Configs

```
.
├── deploy/                                  # ZERO-CONFIGURATION DEPLOYMENT ASSETS
│   ├── nginx/
│   │   └── multitenant_notes.conf           # Production Nginx reverse proxy (preserves Host)
│   ├── pm2/
│   │   └── ecosystem.config.cjs             # PM2 process configuration for Gunicorn/Django
│   └── scripts/
│       ├── setup_vps.sh                     # ONE-CLICK VPS SETUP SCRIPT (Ubuntu/Debian)
│       └── deploy_update.sh                 # Fast zero-downtime update script
│
├── ecosystem.config.cjs                     # Root PM2 config (run: pm2 start ecosystem.config.cjs)
│
├── frontend/                                # Unified React Frontend (Single App)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx                   # Dynamic navbar with tenant badges
│   │   │   ├── DomainSwitcherDemo.jsx       # Floating local domain quick-switch bar
│   │   │   └── ErrorTenantPage.jsx          # Custom 404/403 multi-tenant error screen
│   │   ├── context/
│   │   │   ├── TenantContext.jsx            # Dynamic domain resolver & branding provider
│   │   │   └── AuthContext.jsx              # Role-aware authentication context
│   │   ├── pages/
│   │   │   ├── PublicTenantHome.jsx         # Public tenant landing page (Phase 23)
│   │   │   ├── TenantLogin.jsx              # Tenant user login (Phase 12)
│   │   │   ├── TenantDashboard.jsx          # Tenant dashboard (Phase 21)
│   │   │   ├── NotesList.jsx                # Tenant notes CRUD (Phase 22)
│   │   │   ├── NoteDetail.jsx               # Note create / edit form
│   │   │   ├── TenantSettings.jsx           # Tenant branding & primary color settings
│   │   │   ├── PlatformAdminLogin.jsx       # Platform admin login (/admin/login)
│   │   │   ├── PlatformAdminDashboard.jsx   # Platform metrics (/admin/dashboard)
│   │   │   ├── PlatformAdminTenants.jsx     # Tenant table & activation controls
│   │   │   └── PlatformAdminCreateTenant.jsx# Onboarding form (+ Create Tenant)
│   │   ├── services/
│   │   │   └── api.js                       # API client (forwards Host & X-Tenant-Domain)
│   │   ├── App.jsx
│   │   └── index.css                        # Modern CSS design system
│   ├── package.json
│   └── vite.config.js                       # Allowed hosts & host-preserving reverse proxy
│
├── backend/                                 # Unified Django REST Backend
│   ├── manage.py
│   ├── config/
│   │   ├── settings.py                      # PostgreSQL, TenantMiddleware, CORS, logging
│   │   └── urls.py                          # Routing for auth, tenants, notes, and admin
│   ├── tenants/
│   │   ├── models.py                        # Tenant, CustomDomain, WebsiteSettings
│   │   ├── middleware.py                    # TenantMiddleware (Phase 13, 14, 15, 16)
│   │   ├── serializers.py                   # Tenant & domain serializers
│   │   ├── views.py                         # Tenant resolver, settings, platform admin API
│   │   ├── tests.py                         # Django automated test suite (11 tests)
│   │   └── management/commands/seed_data.py # Seed data script
│   ├── users/
│   │   ├── models.py                        # Custom User (PLATFORM_ADMIN, TENANT_ADMIN)
│   │   ├── permissions.py                   # Strict tenant boundary permissions
│   │   └── views.py                         # Token auth & cross-tenant login validation
│   ├── notes/
│   │   ├── models.py                        # Note (tenant_id FK, created_by FK)
│   │   └── views.py                         # Strict query isolation (tenant_id enforcement)
│   └── requirements.txt                     # Includes Gunicorn for Linux VPS
│
├── test_e2e_isolation.py                    # End-to-end multi-tenant test script
├── .env.example                             # Environment variable template
├── .gitignore                               # Clean Git tracking (no secrets/venv/node_modules)
└── README.md                                # This complete documentation
```

---

## Database Architecture: Shared Tables with `tenant_id`

This proof-of-concept demonstrates **shared-database multi-tenancy**:
* **NO** separate PostgreSQL databases per tenant.
* **NO** separate PostgreSQL schemas per tenant.
* All data resides in shared tables and is strictly isolated using `tenant_id`.

```sql
                 List of relations
 Schema |      Name        | Type  |  Owner   
--------+------------------+-------+----------
 public | tenants          | table | postgres
 public | custom_domains   | table | postgres
 public | users            | table | postgres
 public | notes            | table | postgres
 public | website_settings | table | postgres
```

### Pre-Seeded Sample Data

```sql
-- tenants:
 101 | ABC Electronics | abc-electronics | ACTIVE
 102 | XYZ Furniture   | xyz-furniture   | ACTIVE

-- custom_domains:
 1 | 101 | abc.localhost | is_primary=true | ACTIVE
 2 | 102 | xyz.localhost | is_primary=true | ACTIVE

-- users:
 1 | NULL | Uday (Platform Admin) | admin@prod.com | PLATFORM_ADMIN
 2 |  101 | Ravi Kumar            | ravi@abc.com   | TENANT_ADMIN
 3 |  102 | John Doe              | john@xyz.com   | TENANT_ADMIN

-- notes (isolated by tenant_id):
 1 | 101 | ABC Secret Note         | created_by: ravi@abc.com
 2 | 101 | ABC Q3 Roadmap          | created_by: ravi@abc.com
 3 | 102 | XYZ Secret Note         | created_by: john@xyz.com
 4 | 102 | XYZ Warehouse Inventory | created_by: john@xyz.com
```

---

## Tenant Resolution & Data Isolation Security

### 1. Hostname Normalization & Resolution (`TenantMiddleware`)
1. User requests `http://abc.localhost:5173`.
2. `TenantMiddleware` normalizes the incoming hostname:
   * Strips port (`abc.localhost:5173` -> `abc.localhost`)
   * Lowercases letters (`ABC.LOCALHOST` -> `abc.localhost`)
   * Removes trailing dots (`abc.localhost.` -> `abc.localhost`)
3. Matches hostname in `custom_domains`:
   * If found and `tenant.status == ACTIVE`: sets `request.tenant = tenant`.
   * If found and `tenant.status == INACTIVE`: returns **403 Forbidden** (`{"error": "Tenant account is currently inactive."}`).
   * If not found: returns **404 Not Found** (`{"error": "Tenant / domain not configured."}`). Never selects a random tenant.

### 2. Tenant Data Isolation Rules
* **Backend Enforced**: All queries filter by `Note.objects.filter(tenant_id=request.tenant.id)`.
* **Zero Client Trust**: Query parameters like `?tenant_id=101` and payload overrides are ignored.
* **Cross-Tenant Access Prevention**:
  * If Tenant 101 requests note `#3` (belonging to Tenant 102), the backend checks `note.tenant_id == request.tenant.id` and returns **404 Not Found**.
  * Ravi (`ravi@abc.com`, Tenant 101) cannot log in on `xyz.localhost` (returns **403 Forbidden**).

---

## Local Windows Development Setup

### 1. Configure Local Windows Domains
Add local test domains to `C:\Windows\System32\drivers\etc\hosts`. Open PowerShell as **Administrator** and run:

```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "`n127.0.0.1 prod.localhost abc.localhost xyz.localhost unknown.localhost"
```

### 2. Create PostgreSQL Database
In your local PostgreSQL console:
```sql
CREATE DATABASE multitenant_notes;
```

### 3. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy .env.example to .env and configure your PostgreSQL password
copy ..\.env.example ..\.env

python manage.py migrate
python manage.py seed_data
python manage.py runserver 8000
```

### 4. Frontend Setup
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```

Visit in your browser:
* **Tenant 101 (ABC Electronics)**: [http://abc.localhost:5173](http://abc.localhost:5173)
* **Tenant 102 (XYZ Furniture)**: [http://xyz.localhost:5173](http://xyz.localhost:5173)
* **Platform Admin**: [http://prod.localhost:5173](http://prod.localhost:5173)

---

## Seed Accounts & Test Credentials

| Portal / Tenant | Browser URL | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `http://prod.localhost:5173/admin/login` | `admin@prod.com` | `AdminPass@123` | Platform Admin |
| **Tenant 101 (ABC)** | `http://abc.localhost:5173/login` | `ravi@abc.com` | `RaviPass@123` | Tenant Admin (101) |
| **Tenant 102 (XYZ)** | `http://xyz.localhost:5173/login` | `john@xyz.com` | `JohnPass@123` | Tenant Admin (102) |

---

## Automated Verification

### Run Django Test Suite (11 Tests)
```bash
cd backend
python manage.py test
```
*Result: 11 tests passed in ~30s with zero failures.*

### Run End-to-End Live Isolation Script
```bash
python test_e2e_isolation.py
```
*Tests live API domain resolution, cross-tenant isolation, direct note access rejection, and deactivation.*

---

## Linux VPS Deployment (One-Click Setup)

When deploying to a Linux VPS (Ubuntu 22.04 / 24.04 or Debian 11 / 12), **you do not need to manually write configuration files**. Everything is automated.

### Step 1: Connect to VPS & Clone Repository
```bash
ssh root@YOUR_VPS_IP

# Clone repository into /var/www
cd /var/www
git clone https://github.com/udayjaggumanthri/Multi-Tenant-Note-Taker.git multitenant-notes
cd /var/www/multitenant-notes
```

### Step 2: Run the Automated Setup Script
```bash
chmod +x deploy/scripts/setup_vps.sh
sudo ./deploy/scripts/setup_vps.sh
```

#### What `setup_vps.sh` does automatically:
1. Updates system packages (`apt update && apt upgrade`).
2. Installs Python 3, PostgreSQL, Nginx, Node.js, Certbot, and **PM2**.
3. Configures local PostgreSQL: creates database `multitenant_notes` and user `notesuser`.
4. Creates production `.env` with a secure random secret key.
5. Sets up Python virtual environment and installs all dependencies (including Gunicorn).
6. Runs database migrations (`migrate`) and seeds test data (`seed_data`).
7. Builds the production React frontend bundle into `frontend/dist/`.
8. Starts Django/Gunicorn under **PM2** process manager (`pm2 start ecosystem.config.cjs`).
9. Configures **Nginx** reverse proxy using `deploy/nginx/multitenant_notes.conf` (preserving the `Host` header) and restarts Nginx.

---

## PM2 Process Management Reference

PM2 keeps the Django/Gunicorn backend running 24/7, restarts it automatically on system reboot, and restarts if memory exceeds limits.

### Common PM2 Commands:
```bash
# Check status of the application
pm2 status

# View live application logs (request paths, resolved tenants)
pm2 logs multitenant-backend

# Restart the application
pm2 restart multitenant-backend

# Stop the application
pm2 stop multitenant-backend

# Save current process list for reboot
pm2 save
```

The configuration is stored in [`ecosystem.config.cjs`](file:///e:/note%20taker/ecosystem.config.cjs):
* **Workers**: 3 Gunicorn workers
* **Binding**: `127.0.0.1:8000` (internal only, protected from the Internet)
* **Auto-restart**: Enabled on crash
* **Memory Limit**: Auto-restart if memory exceeds `500M`

---

## Nginx Reverse Proxy Configuration

The Nginx configuration file is stored in [`deploy/nginx/multitenant_notes.conf`](file:///e:/note%20taker/deploy/nginx/multitenant_notes.conf).

### Critical Reverse Proxy Settings:
```nginx
# Routes all /api/ and /admin/ endpoints directly to Django
location ~ ^/(api|admin)/ {
    proxy_pass http://127.0.0.1:8000;

    # CRITICAL: Preserve the original Host header so Django resolves the tenant!
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Serves React Frontend (SPA)
location / {
    root /var/www/multitenant-notes/frontend/dist;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

---

## Configuring Domains, DNS & Free HTTPS (SSL)

### 1. DNS Configuration
Point your domain `A` records to your VPS Public IP in your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):
* `prod.yourdomain.com` -> `YOUR_VPS_IP`
* `abc.yourdomain.com` -> `YOUR_VPS_IP`
* `xyz.yourdomain.com` -> `YOUR_VPS_IP`
* Or a wildcard record `*.yourdomain.com` -> `YOUR_VPS_IP`

> **Note on DNS**: DNS does **not** choose the tenant. DNS only points traffic to your VPS IP. Nginx forwards the original `Host` header to Django, and Django's `TenantMiddleware` queries PostgreSQL to determine the tenant.

### 2. Enable Free HTTPS via Certbot
Once your DNS records have propagated, run:
```bash
sudo certbot --nginx -d yourdomain.com -d prod.yourdomain.com -d abc.yourdomain.com -d xyz.yourdomain.com
```
Certbot will automatically install the SSL certificates and configure HTTP -> HTTPS redirection while preserving the original `Host` header.

---

## Fast Updates / Redeployments

Whenever you push new changes to GitHub, update your VPS with zero downtime using the included update script:

```bash
cd /var/www/multitenant-notes
chmod +x deploy/scripts/deploy_update.sh
./deploy/scripts/deploy_update.sh
```

This script automatically pulls from Git, runs migrations, builds the React frontend, and reloads PM2 and Nginx.

---

## Acceptance Criteria Checklist

- [x] **Platform Admin can login** (`/admin/login` with `admin@prod.com`)
- [x] **Platform Admin can create Tenant 101 & Tenant 102**
- [x] **Each tenant receives a custom domain** (`abc.localhost`, `xyz.localhost`)
- [x] **Both tenants use the same React application**
- [x] **Both tenants use the same Django application**
- [x] **Both tenants use the same PostgreSQL database** (`multitenant_notes`)
- [x] **PostgreSQL uses `tenant_id` for logical isolation**
- [x] **`abc.localhost` resolves to Tenant 101**
- [x] **`xyz.localhost` resolves to Tenant 102**
- [x] **ABC sees only ABC data; XYZ sees only XYZ data**
- [x] **Tenant 101 cannot access Tenant 102 data** (returns 404)
- [x] **Tenant 102 cannot access Tenant 101 data** (returns 404)
- [x] **Unknown domains do not receive a tenant** (returns 404 "Tenant / domain not configured.")
- [x] **Inactive tenants cannot access application** (returns 403 "Tenant account is currently inactive.")
- [x] **PM2 ecosystem configuration ready** (`ecosystem.config.cjs`)
- [x] **Nginx configuration ready with Host header forwarding** (`deploy/nginx/multitenant_notes.conf`)
- [x] **One-click VPS deployment script ready** (`deploy/scripts/setup_vps.sh`)
- [x] **Zero-downtime update script ready** (`deploy/scripts/deploy_update.sh`)
- [x] **PostgreSQL remains private (never exposed to public Internet)**
- [x] **Git repository clean with `.gitignore` and `.env.example`**
