# Multi-Tenant Note Taker — Enterprise SaaS Platform

> A production-grade multi-tenant architecture demonstrating that **ONE React frontend**, **ONE Django REST backend**, and **ONE PostgreSQL database** can reliably serve **multiple isolated enterprise tenants** across **both managed subdomains and independent custom domains**.

All deployment configurations—including **Nginx reverse proxy**, **PM2 process manager**, **Gunicorn WSGI**, and **one-click automated VPS setup scripts**—are built directly into this repository so you never have to manually write config files on your server.

---

## 1. Enterprise Architecture Overview

```
                    INTERNET
                        |
                 Customer Domain
   (Subdomain: abc.prod.com  OR  Custom: clientbrand.com)
                        |
                       DNS
   (CNAME to prod.com  OR  A-Record to VPS IP)
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
             1. Normalize Host Header (strip port & case)
             2. Match custom_domains table (Subdomain vs Custom)
             3. Check tenant status (ACTIVE / INACTIVE)
                        |
                 request.tenant
                        |
              PostgreSQL Database
                        |
          Isolation Strategy Routing
   [Shared DB (tenant_id) | Dedicated Schema | Dedicated DB]
                        |
              Tenant-Specific Data
            Note.objects.filter(tenant_id=request.tenant.id)
                        |
                React Frontend
           (Dynamic Theming & Custom Branding)
                        |
                  User Browser
```

### Core Architectural Principle
* **ONE Unified Codebase**
* **ONE React Single-Page Application** (Vite + React.js + Vanilla CSS design system)
* **ONE Django REST Framework Backend** (Python 3 + DRF)
* **ONE High-Performance PostgreSQL Database** (`multitenant_notes` with shared tables)
* **MULTIPLE Tenants** (ABC Electronics, XYZ Furniture, etc.)
* **MULTIPLE Domains** (`abc.localhost`, `xyz.localhost`, `clientbrand.com`)
* **Tenant Resolution via Domain** (`TenantMiddleware` resolves incoming hostname -> tenant)
* **Tenant Isolation via `tenant_id`** (Every database query is strictly filtered by `request.tenant.id`)

---

## 2. Multi-Domain Routing: Subdomains vs Custom Domains

Our routing engine dynamically accommodates two distinct domain onboarding models:

| Feature | Option A: Platform Subdomain | Option B: Independent Custom Domain |
| :--- | :--- | :--- |
| **Domain Example** | `abc.prod.com` (or `abc.localhost`) | `clientbrand.com` or `notes.clientbrand.com` |
| **Use Case** | Default automated provisioning for standard tenants | Enterprise clients who require their own branding |
| **DNS Configuration** | Wildcard record: `*.prod.com -> VPS IP` | Client adds `CNAME` pointing to `prod.com` OR `A` record to VPS IP |
| **Nginx Handling** | Handled automatically by wildcard server block | Caught by regex server block: `server_name ~^(?<tenant>.+)\.prod\.com$ yourdomain.com;` |
| **Tenant Matching** | Normalized `Host` header matched in `custom_domains` | Normalized `Host` header matched in `custom_domains` |
| **SSL / HTTPS** | Wildcard SSL certificate via Certbot | Certbot multi-domain certificate (`certbot -d clientbrand.com`) |

### How DNS & Nginx Resolve Custom Domains:
1. **Client DNS**: The client company points their domain `notes.acme.com` to your server using a DNS `CNAME` pointing to `prod.com` (or `A` record pointing to your VPS Public IP).
2. **Nginx Capture**: Nginx listens on port 80/443. It receives the request and **preserves the client's original domain** using:
   ```nginx
   proxy_set_header Host $host;
   ```
3. **Django Resolution**: Django's [`TenantMiddleware`](file:///e:/note%20taker/backend/tenants/middleware.py) reads `request.get_host()`, queries `custom_domains` for `notes.acme.com`, and finds the assigned tenant.
4. **Data Isolation**: Django attaches `request.tenant = Acme Corporation`. All API queries automatically filter by `tenant_id = Acme.id`.

---

## 3. Database Multi-Tenancy Architecture Options

When onboarding a tenant via the Platform Admin portal, administrators can designate the tenant's **Database Isolation Strategy**:

```
                               DATABASE ISOLATION STRATEGIES
                                             |
     +---------------------------------------+---------------------------------------+
     |                                       |                                       |
1. SHARED DATABASE                      2. DEDICATED SCHEMA                     3. DEDICATED DATABASE
  (High Efficiency MVP)                 (Enterprise Isolation)                 (Full Physical Isolation)
  ---------------------                 ----------------------                 -------------------------
  • Single DB: multitenant_notes        • Single DB instance                   • Separate PostgreSQL DBs
  • Shared tables                       • Separate PostgreSQL schema           • e.g. tenant_101_db
  • Filtered by tenant_id               • (search_path per tenant)             • (Django DB Router)
  • Maximum cost efficiency             • Logical schema boundary              • Physical database isolation
  • Sub-millisecond queries             • Easy per-tenant backup               • Strict compliance / HIPAA
```

### Strategy Comparison:
1. **Shared Database with `tenant_id` (Active MVP Engine)**:
   * **How it works**: All tenant records live in shared tables (`tenants`, `users`, `notes`, `website_settings`). Every query includes `WHERE tenant_id = request.tenant.id`.
   * **Pros**: Lowest hosting cost, effortless database migrations, pooled connection efficiency, scalable to thousands of tenants on a modest server.
   * **Security**: Enforced in backend code. Client-supplied `tenant_id` parameters are strictly rejected.
2. **Dedicated Schema (Schema-per-tenant)**:
   * **How it works**: Tenants share one PostgreSQL database, but have separate PostgreSQL schemas (e.g. `schema_abc`, `schema_xyz`).
   * **Pros**: Clean logical schema separation; individual tenant schemas can be dumped and restored independently.
3. **Dedicated Database (Database-per-tenant)**:
   * **How it works**: Enterprise clients receive their own physical PostgreSQL database (e.g. `multitenant_notes_acme`).
   * **Pros**: Complete physical isolation for high-compliance healthcare/finance customers.

---

## 4. Repository Structure & Deployment Assets

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
│   │   │   ├── PublicTenantHome.jsx         # Organization workspace landing page
│   │   │   ├── TenantLogin.jsx              # Tenant user login
│   │   │   ├── TenantDashboard.jsx          # Tenant dashboard
│   │   │   ├── NotesList.jsx                # Tenant notes CRUD
│   │   │   ├── NoteDetail.jsx               # Note create / edit form
│   │   │   ├── TenantSettings.jsx           # Tenant branding & primary color settings
│   │   │   ├── PlatformAdminLogin.jsx       # Platform admin login (/admin/login)
│   │   │   ├── PlatformAdminDashboard.jsx   # Platform metrics (/admin/dashboard)
│   │   │   ├── PlatformAdminTenants.jsx     # Tenant table & activation controls
│   │   │   └── PlatformAdminCreateTenant.jsx# Onboarding form with Subdomain/Custom & DB options
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
│   │   ├── middleware.py                    # TenantMiddleware (resolution, normalization, 404/403)
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

## 5. Local Windows Development Setup

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

## 6. Seed Accounts & Credentials

| Portal / Tenant | Browser URL | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `http://prod.localhost:5173/admin/login` | `admin@prod.com` | `AdminPass@123` | Platform Admin |
| **Tenant 101 (ABC)** | `http://abc.localhost:5173/login` | `ravi@abc.com` | `RaviPass@123` | Tenant Admin (101) |
| **Tenant 102 (XYZ)** | `http://xyz.localhost:5173/login` | `john@xyz.com` | `JohnPass@123` | Tenant Admin (102) |

---

## 7. Linux VPS Deployment (One-Click Setup)

When deploying to a Linux VPS (Ubuntu 22.04 / 24.04 or Debian 11 / 12), **you do not need to manually write configuration files**. Everything is pre-configured and automated.

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
6. Runs database migrations (`migrate`) and seeds initial tenant data (`seed_data`).
7. Builds the production React frontend bundle into `frontend/dist/`.
8. Starts Django/Gunicorn under **PM2** process manager (`pm2 start ecosystem.config.cjs`).
9. Configures **Nginx** reverse proxy using `deploy/nginx/multitenant_notes.conf` (preserving the `Host` header) and restarts Nginx.

---

## 8. PM2 Process Management Reference

PM2 keeps the Django/Gunicorn backend running 24/7, restarts it automatically on system reboot, and restarts if memory exceeds limits.

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

Configuration is stored in [`ecosystem.config.cjs`](file:///e:/note%20taker/ecosystem.config.cjs):
* **Workers**: 3 Gunicorn workers
* **Binding**: `127.0.0.1:8000` (internal only, protected from the Internet)
* **Auto-restart**: Enabled on crash
* **Memory Limit**: Auto-restart if memory exceeds `500M`

---

## 9. Fast Zero-Downtime Updates

Whenever you push new changes to GitHub, update your VPS in seconds:

```bash
cd /var/www/multitenant-notes
chmod +x deploy/scripts/deploy_update.sh
./deploy/scripts/deploy_update.sh
```

---

## 10. Verification & Test Suite

### Run Django Automated Tests (11 Tests)
```bash
cd backend
python manage.py test
```
*Result: 11 tests passed in ~30s with zero failures.*

### Run End-to-End Live Isolation Script
```bash
python test_e2e_isolation.py
```
*Result: All 10 live isolation and security scenarios passed 100%.*
