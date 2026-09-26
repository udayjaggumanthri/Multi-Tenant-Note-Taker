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

## 2. Multi-Domain Routing & DNS Architecture

Our multi-tenant platform supports **two distinct domain models** simultaneously without modifying application code or reloading servers:

| Feature | Option A: Platform Managed Subdomain | Option B: Independent Custom Domain |
| :--- | :--- | :--- |
| **Domain Example** | `abc.yourdomain.com` (or `abc.localhost`) | `notes.clientbrand.com` or `clientbrand.com` |
| **Target Audience** | Standard tenants, quick self-service onboarding | Enterprise clients requiring custom white-label branding |
| **DNS Record Type** | Wildcard `A` or `CNAME` managed by SaaS owner | `CNAME` (recommended for subdomains) or `A` (for apex domains) managed by client |
| **DNS Target** | `*.yourdomain.com &rarr; VPS_PUBLIC_IP` | `prod.yourdomain.com` (CNAME) or `VPS_PUBLIC_IP` (A Record) |
| **Nginx Handling** | Wildcard server block catch-all | Regex server block preserving `$host` header |
| **Tenant Middleware** | Queries `custom_domains` where `domain = 'abc.yourdomain.com'` | Queries `custom_domains` where `domain = 'notes.clientbrand.com'` |
| **SSL / HTTPS** | Wildcard Let's Encrypt certificate (`*.yourdomain.com`) | Certbot domain expansion (`certbot --nginx -d notes.clientbrand.com`) |

---

## 3. Comprehensive DNS & Custom Domain Manual

### 3.1 Understanding the Request Flow (DNS &rarr; Nginx &rarr; Django &rarr; UI)

```
[ User types: notes.clientbrand.com ]
                |
                v
[ 1. Client DNS Lookup ]
       Does notes.clientbrand.com have a CNAME to prod.yourdomain.com?
       Resolves to: VPS Public IP (e.g., 203.0.113.10)
                |
                v
[ 2. Nginx Reverse Proxy (Port 80/443) ]
       Receives incoming HTTP/HTTPS TCP connection
       CRITICAL: proxy_set_header Host $host; preserves "notes.clientbrand.com"
       Forwards request to 127.0.0.1:8000 (Django / Gunicorn)
                |
                v
[ 3. Django TenantMiddleware ]
       Reads request.get_host() &rarr; "notes.clientbrand.com"
       Normalizes host (lowercases, removes port)
       SQL Query: SELECT * FROM custom_domains WHERE domain = 'notes.clientbrand.com'
       Finds Tenant: "Acme Corp" (ID: 101, Status: ACTIVE)
       Sets: request.tenant = Acme Corp
                |
                v
[ 4. Database Query Isolation ]
       API View executes: Note.objects.filter(tenant_id=request.tenant.id)
       Tenant A can NEVER query or view Tenant B's records.
                |
                v
[ 5. React Frontend Theming & Rendering ]
       TenantContext loads organization name ("Acme Corp") & primary brand color.
       Renders the tenant-branded workspace instantly.
```

---

### 3.2 DNS Records Required

#### For SaaS Platform Owners (Subdomain Wildcard)
To enable instant, zero-touch tenant subdomains (`tenant1.yourdomain.com`, `tenant2.yourdomain.com`, etc.):

| Record Type | Host / Name | Value / Points To | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `YOUR_VPS_PUBLIC_IP` | 3600 (Auto) | Directs apex domain (`yourdomain.com`) to VPS |
| **A** | `prod` | `YOUR_VPS_PUBLIC_IP` | 3600 (Auto) | Platform landing page & admin portal (`prod.yourdomain.com`) |
| **A** (or CNAME) | `*` | `YOUR_VPS_PUBLIC_IP` | 3600 (Auto) | Wildcard record routing **all tenant subdomains** to VPS |

#### For Tenant Customers (Custom Domains)
When an enterprise customer wants to use their own branded domain (e.g., `notes.clientcompany.com` or `clientcompany.com`):

**Option A: Subdomain (Recommended — e.g., `notes.clientcompany.com`)**
| Record Type | Host / Name | Value / Points To | TTL | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `notes` | `prod.yourdomain.com` | 1800 (30m) | Automatically tracks your VPS even if server IP changes |

**Option B: Apex / Root Domain (e.g., `clientcompany.com`)**
| Record Type | Host / Name | Value / Points To | TTL | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (or blank) | `YOUR_VPS_PUBLIC_IP` | 1800 (30m) | Apex domains cannot use CNAME according to RFC specs |

---

### 3.3 Step-by-Step Registrar Guides

#### 1. Cloudflare DNS
1. Log in to your Cloudflare Dashboard and select the target zone/domain.
2. Navigate to **DNS &rarr; Records** and click **Add record**.
3. For a subdomain (e.g., `notes.clientcompany.com`):
   * **Type**: `CNAME`
   * **Name**: `notes`
   * **Target**: `prod.yourdomain.com`
   * **Proxy status**: ⚠️ **DNS only (Grey Cloud)** during initial verification and SSL issuance so Let's Encrypt / Certbot can reach the origin server directly. Once verified, you may enable proxying if desired.
   * **TTL**: Auto. Click **Save**.

#### 2. GoDaddy
1. Log in to your GoDaddy account and navigate to **Domain Portfolio**.
2. Click the domain you wish to configure, then select the **DNS** tab.
3. In the DNS Records section, click **Add New Record**:
   * **Type**: `CNAME`
   * **Name**: `notes` (or your chosen subdomain prefix)
   * **Value**: `prod.yourdomain.com`
   * **TTL**: `1/2 Hour` (or default). Click **Save**.

#### 3. Namecheap
1. Log in to your Namecheap Dashboard and go to **Domain List**.
2. Click **Manage** next to your domain, then open the **Advanced DNS** tab.
3. Click **Add New Record**:
   * **Type**: `CNAME Record`
   * **Host**: `notes`
   * **Value**: `prod.yourdomain.com`
   * **TTL**: Automatic. Click the green checkmark to save.

#### 4. AWS Route 53
1. Open the Route 53 console and navigate to **Hosted Zones**.
2. Click your domain and click **Create record**:
   * **Record name**: `notes`
   * **Record type**: `CNAME`
   * **Value**: `prod.yourdomain.com`
   * **Routing policy**: Simple routing. Click **Create records**.

---

### 3.4 How to Verify DNS Propagation

DNS propagation typically completes within 2 to 30 minutes. You can verify whether DNS is correctly pointing to your VPS from any terminal:

```bash
# 1. Test using nslookup (Windows, macOS, Linux)
nslookup notes.clientcompany.com

# 2. Test using dig (macOS, Linux)
dig +short notes.clientcompany.com

# 3. Test HTTP Host resolution directly against your VPS IP
curl -H "Host: notes.clientcompany.com" http://YOUR_VPS_PUBLIC_IP/api/tenants/current/
```

**Expected API Response:**
```json
{
  "id": 101,
  "name": "Acme Corporation",
  "domain": "notes.clientcompany.com",
  "theme": {
    "primary_color": "#4F46E5",
    "logo_url": ""
  }
}
```

---

### 3.5 Automated SSL / HTTPS Provisioning

Once DNS is pointed to your server, issue a free, auto-renewing Let's Encrypt SSL certificate on your VPS using Certbot:

```bash
# Issue SSL for a custom domain (Nginx will automatically reload)
sudo certbot --nginx -d notes.clientcompany.com

# Test automatic renewal
sudo certbot renew --dry-run
```

---

### 3.6 In-App DNS Assistant & Interactive Setup Modal

To ensure neither platform admins nor tenant customers are confused when connecting custom domains:
* **Interactive DNS Setup Modal (`DnsSetupModal.jsx`)**: Available in the Tenant Settings page (`/settings`), Tenant Creation portal, and Platform Admin Tenants table. Features:
  * One-click copy buttons for Host, Type, and Value.
  * Direct registrar walkthroughs (Cloudflare, GoDaddy, Namecheap).
  * In-app terminal command snippets for `nslookup` and `certbot`.
* **Dedicated DNS Architecture Guide Page (`/dns-guide`)**: Full interactive guide accessible from the main navigation bar anytime.

---

### 3.7 Security Architecture: Direct IP Access Prevention & Rogue Domain Pointing

#### The Security Threat Model:
In a multi-tenant platform, when your application server is deployed on a Linux VPS with a public IP (e.g. `203.0.113.10`), two major attack vectors arise:
1. **Direct IP Access / Port Scanners**: Automated bots (Shodan, Censys, masscan) scan public IPv4 addresses and hit `http://203.0.113.10` directly without a domain name. If unprotected, scanners can fingerprint your web stack, access static bundles, or probe endpoints.
2. **Rogue / Unauthorized Domain Pointing ("Host Spoofing" & Parasitic Hosting)**: An attacker who owns `evil-phishing.com` creates a DNS `A` or `CNAME` record pointing to your server's IP address. If your web server blindly proxies every incoming request, your application would be served under `evil-phishing.com`!

#### Our 4-Layer Defense-in-Depth Solution:

```
                            INCOMING REQUEST
                                   |
                  +----------------+----------------+
                  |                                 |
         Direct IP Access                 Rogue / Unregistered Domain
      (http://203.0.113.10/)               (evil-phishing-site.com)
                  |                                 |
                  v                                 v
        [ LAYER 1: NGINX DEFAULT_SERVER BLOCK (PORT 80 & 443) ]
        • listen 80 default_server; server_name _; return 444;
        • ssl_reject_handshake on; (drops TLS before certificate exchange)
        • Nginx closes TCP connection immediately with 0 bytes sent.
        • Port scanners and rogue domains receive NO HTTP RESPONSE.
                                   |
                         (If request reaches Django)
                                   v
        [ LAYER 2: DJANGO TENANT MIDDLEWARE IP DETECTION ]
        • Normalizes Host header (e.g. "198.51.100.24")
        • is_ip_address(host) detects IPv4/IPv6 addresses
        • Strictly blocks direct IP access with HTTP 403:
          {"error": "Direct IP access is prohibited", "code": "DIRECT_IP_ACCESS_DENIED"}
                                   |
                                   v
        [ LAYER 3: DATABASE DOMAIN WHITELIST MATCHING ]
        • SQL Query: SELECT * FROM custom_domains WHERE domain = host
        • If domain is NOT registered to an active tenant:
          Rejects immediately with HTTP 404 / 400:
          {"error": "Tenant / domain not configured", "code": "TENANT_NOT_FOUND"}
        • Attacker CANNOT hijack, spoof, or serve your app on rogue domains.
                                   |
                                   v
        [ LAYER 4: CLOUDFLARE ORIGIN MASKING & UFW FIREWALL ]
        • Public DNS points to Cloudflare proxy (Orange Cloud)
        • Real VPS IP is never exposed in public DNS records
        • Linux UFW firewall configured to only permit traffic from Cloudflare IPs.
```

#### Automated Security Tests:
Our test suite includes dedicated security tests verifying this defense:
* `test_direct_ip_access_blocked`: Verifies that requests with a direct IP host header return `403 DIRECT_IP_ACCESS_DENIED`.
* `test_unregistered_domain_blocked`: Verifies that requests with an unauthorized rogue domain return `404 TENANT_NOT_FOUND`.
* `test_domain_verification_endpoint`: Verifies that administrators can validate live DNS records before routing traffic.

---

## 4. Database Multi-Tenancy Architecture Options

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

## 5. Repository Structure & Deployment Assets

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

## 6. Local Windows Development Setup

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

## 7. Seed Accounts & Credentials

| Portal / Tenant | Browser URL | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `http://prod.localhost:5173/admin/login` | `admin@prod.com` | `AdminPass@123` | Platform Admin |
| **Tenant 101 (ABC)** | `http://abc.localhost:5173/login` | `ravi@abc.com` | `RaviPass@123` | Tenant Admin (101) |
| **Tenant 102 (XYZ)** | `http://xyz.localhost:5173/login` | `john@xyz.com` | `JohnPass@123` | Tenant Admin (102) |

---

## 8. Linux VPS Deployment (One-Click Setup)

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

## 9. PM2 Process Management Reference

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

## 10. Fast Zero-Downtime Updates

Whenever you push new changes to GitHub, update your VPS in seconds:

```bash
cd /var/www/multitenant-notes
chmod +x deploy/scripts/deploy_update.sh
./deploy/scripts/deploy_update.sh
```

---

## 11. Verification & Test Suite

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
