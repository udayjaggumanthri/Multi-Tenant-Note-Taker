# Multi-Tenant Note Taker (Proof-of-Concept)

> A technical proof-of-concept proving that **ONE React frontend**, **ONE Django REST backend**, and **ONE PostgreSQL database** can reliably serve **multiple isolated tenants** across **multiple domains**.

---

## Architecture Overview

```
                    INTERNET
                        |
                 Customer Domain
                        |
                       DNS
                        |
                   VPS Public IP
                        |
                      Nginx
                        |
                 Django REST API
                        |
                Tenant Middleware
                        |
              Read Host / Domain
                        |
                Find Custom Domain
                        |
                  Find Tenant
                        |
               request.tenant
                        |
                  PostgreSQL
                        |
             tenant_id filtering
                        |
              Tenant-specific data
                        |
                     React
                        |
                  User Browser
```

### Core Architectural Principle
* **ONE Codebase**
* **ONE React Application** (Vite + React.js + Vanilla CSS)
* **ONE Django REST Application** (Python + DRF)
* **ONE PostgreSQL Database** (`multitenant_notes`)
* **MULTIPLE Tenants** (ABC Electronics, XYZ Furniture, etc.)
* **MULTIPLE Domains** (`abc.localhost`, `xyz.localhost`, `prod.localhost`)
* **Tenant Resolution via Domain** (`TenantMiddleware` resolves domain -> tenant)
* **Tenant Isolation via `tenant_id`** (Every query is filtered by `request.tenant.id`)

---

## Database Architecture: Shared Database with `tenant_id`

This proof-of-concept utilizes a **shared-database, shared-schema** multi-tenancy model. 
* There are **NO separate PostgreSQL databases** for tenants.
* There are **NO separate PostgreSQL schemas** for tenants.
* All tenant-owned records reside in the same tables and contain a `tenant_id` foreign key.

### Database Tables (`multitenant_notes`)

1. **`tenants`**: Registered tenants
   * Columns: `id`, `name`, `slug`, `status` (`ACTIVE`/`INACTIVE`), `created_at`, `updated_at`
   * Example: `101 | ABC Electronics | abc-electronics | ACTIVE`
2. **`custom_domains`**: Domains mapped to tenants
   * Columns: `id`, `tenant_id`, `domain`, `is_primary`, `status`, `created_at`, `updated_at`
   * Example: `1 | 101 | abc.localhost | true | ACTIVE`
3. **`users`**: Platform administrators and tenant users
   * Columns: `id`, `tenant_id`, `name`, `email`, `password`, `role` (`PLATFORM_ADMIN`/`TENANT_ADMIN`), `created_at`, `updated_at`
   * Platform Admin: `tenant_id = NULL`
   * Tenant Admin: `tenant_id = 101`
4. **`notes`**: Tenant-specific notes
   * Columns: `id`, `tenant_id`, `created_by`, `title`, `content`, `created_at`, `updated_at`
   * Example: `1 | 101 | ABC Secret Note | Confidential specs`
5. **`website_settings`**: Tenant branding and customizations
   * Columns: `id`, `tenant_id`, `company_name`, `logo`, `website_title`, `description`, `primary_color`, `created_at`, `updated_at`
   * Example: `1 | 101 | ABC Electronics | #2563EB`

---

## How Tenant Resolution & Isolation Works

### 1. Domain Resolution Flow
1. User navigates to `http://abc.localhost:5173`.
2. Browser sends request with `Host: abc.localhost:5173`.
3. `TenantMiddleware` normalizes the hostname:
   * Strips port (`abc.localhost:5173` -> `abc.localhost`)
   * Lowercases string (`ABC.LOCALHOST` -> `abc.localhost`)
   * Removes trailing dot (`abc.localhost.` -> `abc.localhost`)
4. Middleware queries `custom_domains` for matching domain.
5. If found and active, it checks `tenant.status`:
   * If `ACTIVE`: Attaches `request.tenant = tenant`
   * If `INACTIVE`: Immediately returns **403 Forbidden** (`{"error": "Tenant account is currently inactive."}`)
6. If domain is not found in `custom_domains`:
   * Returns **404 Not Found** (`{"error": "Tenant / domain not configured."}`)

### 2. Tenant Data Isolation Security
* **Backend Enforced**: All note queries use `Note.objects.filter(tenant_id=request.tenant.id)`.
* **Zero Front-end Trust**: Query parameters like `?tenant_id=101` or payload fields like `{"tenant_id": 102}` are strictly ignored. The tenant is derived **only** from `request.tenant`.
* **Cross-Tenant Prevention**:
  * If user authenticated to Tenant 101 requests `GET /api/notes/<tenant-102-note-id>/`, the backend checks `note.tenant_id == request.tenant.id` and returns **404 Not Found**.
  * Tenant 101 user (`ravi@abc.com`) cannot log in on `xyz.localhost` (returns **403 Forbidden**).

---

## Local Windows Development Setup

### Prerequisites
* Python 3.11+ (Python 3.13 tested)
* Node.js v18+ & npm
* PostgreSQL 14+ installed and running locally

### 1. Configure Windows Hosts File
To test local tenant domains in your browser, add the following lines to your Windows hosts file (`C:\Windows\System32\drivers\etc\hosts`).

Open PowerShell as **Administrator** and run:
```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "`n127.0.0.1 prod.localhost abc.localhost xyz.localhost unknown.localhost"
```

### 2. Configure Local Database
Ensure PostgreSQL is running, then create the database:
```bash
# In psql or pgAdmin:
CREATE DATABASE multitenant_notes;
```

### 3. Backend Setup
1. Open terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Copy `.env.example` in the project root to `.env` and fill in your PostgreSQL credentials:
   ```env
   DATABASE_NAME=multitenant_notes
   DATABASE_USER=postgres
   DATABASE_PASSWORD=your_password
   DATABASE_HOST=127.0.0.1
   DATABASE_PORT=5432
   DJANGO_SECRET_KEY=local-dev-secret-key
   DEBUG=True
   PLATFORM_DOMAIN=prod.localhost
   ALLOWED_HOSTS=localhost,127.0.0.1,.localhost,prod.localhost,abc.localhost,xyz.localhost
   ```
5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```
6. Seed test data (Creates Platform Admin, Tenant 101, Tenant 102, and test notes):
   ```bash
   python manage.py seed_data
   ```
7. Start Django development server:
   ```bash
   python manage.py runserver 8000
   ```

### 4. Frontend Setup
1. In a new terminal, navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser:
   * **Tenant 101 (ABC Electronics)**: `http://abc.localhost:5173`
   * **Tenant 102 (XYZ Furniture)**: `http://xyz.localhost:5173`
   * **Platform Admin**: `http://prod.localhost:5173`
   * **Unknown Domain Test**: `http://unknown.localhost:5173`

---

## Seed Accounts & Test Credentials

| Portal / Tenant | URL | Email | Password | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Admin** | `http://prod.localhost:5173/admin/login` | `admin@prod.com` | `AdminPass@123` | Platform Admin |
| **Tenant 101 (ABC)** | `http://abc.localhost:5173/login` | `ravi@abc.com` | `RaviPass@123` | Tenant Admin (101) |
| **Tenant 102 (XYZ)** | `http://xyz.localhost:5173/login` | `john@xyz.com` | `JohnPass@123` | Tenant Admin (102) |

---

## Automated Verification & Tests

### 1. Django Automated Test Suite
Runs 11 automated test cases verifying hostname normalization, domain resolution, cross-tenant login blocking, data isolation, and platform admin operations:
```bash
cd backend
python manage.py test
```

### 2. End-to-End Live Isolation Test Script
Verifies tenant isolation directly against the running backend server:
```bash
python test_e2e_isolation.py
```
This tests:
1. `abc.localhost` resolves to Tenant 101
2. `xyz.localhost` resolves to Tenant 102
3. Port stripping and case normalization
4. `unknown.localhost` returns 404 Not Found
5. Ravi (Tenant 101) blocked from logging in on `xyz.localhost` (403 Forbidden)
6. Ravi sees only ABC notes (`['ABC Q3 Roadmap', 'ABC Secret Note']`)
7. John sees only XYZ notes (`['XYZ Warehouse Inventory', 'XYZ Secret Note']`)
8. Ravi requesting XYZ note ID directly returns 404 Not Found
9. Client trying to inject `tenant_id=102` is ignored and scoped to `101`
10. Deactivating Tenant 101 immediately locks `abc.localhost` (403 Forbidden), and reactivation restores access.

---

## Linux VPS Production Deployment Guide

Follow these step-by-step instructions to deploy the application to an Ubuntu/Debian Linux VPS.

```
Internet
   ↓
DNS (A Records for prod.example.com, abc.example.com, xyz.example.com)
   ↓
VPS Public IP
   ↓
Nginx (Port 80/443, SSL termination, reverse proxy)
   ↓ (Host header preserved)
Gunicorn / Django (127.0.0.1:8000)
   ↓
PostgreSQL (Local unix socket / 127.0.0.1:5432 - NEVER exposed to Internet)
```

### Step 1: Connect to VPS & Update Packages
```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
```

### Step 2: Install Required System Packages
```bash
apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx curl git certbot python3-certbot-nginx
```

### Step 3: Configure PostgreSQL (Private & Secure)
PostgreSQL runs on `127.0.0.1:5432` by default and is **never** exposed to the internet.
```bash
sudo -u postgres psql
```
Inside the `psql` console:
```sql
CREATE DATABASE multitenant_notes;
CREATE USER notesuser WITH PASSWORD 'StrongProductionPasswordHere!';
ALTER ROLE notesuser SET client_encoding TO 'utf8';
ALTER ROLE notesuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE notesuser SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE multitenant_notes TO notesuser;
\q
```

### Step 4: Clone Codebase & Setup Python Environment
```bash
cd /var/www
git clone <YOUR_GIT_REPO_URL> multitenant-notes
cd /var/www/multitenant-notes/backend

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### Step 5: Configure Production Environment Variables
Create `/var/www/multitenant-notes/.env`:
```env
DATABASE_NAME=multitenant_notes
DATABASE_USER=notesuser
DATABASE_PASSWORD=StrongProductionPasswordHere!
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432

DJANGO_SECRET_KEY=generate-a-strong-random-production-key-here
DEBUG=False

PLATFORM_DOMAIN=prod.yourdomain.com
ALLOWED_HOSTS=.yourdomain.com,prod.yourdomain.com,abc.yourdomain.com,xyz.yourdomain.com,127.0.0.1
```

### Step 6: Run Migrations, Collect Static & Seed
```bash
cd /var/www/multitenant-notes/backend
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_data
```

### Step 7: Build React Frontend for Production
On your local machine or on VPS (requires Node.js):
```bash
cd /var/www/multitenant-notes/frontend
npm install
npm run build
```
The production bundle will be created at `/var/www/multitenant-notes/frontend/dist`.

### Step 8: Configure Systemd Service for Django/Gunicorn
Create `/etc/systemd/system/gunicorn.service`:
```ini
[Unit]
Description=Gunicorn daemon for Multi-Tenant Notes
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/multitenant-notes/backend
ExecStart=/var/www/multitenant-notes/backend/venv/bin/gunicorn \
          --access-logfile /var/log/gunicorn/access.log \
          --error-logfile /var/log/gunicorn/error.log \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          config.wsgi:application

[Install]
WantedBy=multi-user.target
```
Start and enable the service:
```bash
mkdir -p /var/log/gunicorn
chown -R www-data:www-data /var/log/gunicorn
systemctl daemon-reload
systemctl start gunicorn
systemctl enable gunicorn
```

### Step 9: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/multitenant_notes`:
```nginx
server {
    listen 80;
    server_name ~^(?<subdomain>.+)\.yourdomain\.com$ yourdomain.com prod.yourdomain.com;

    # Serve React Frontend static files
    location / {
        root /var/www/multitenant-notes/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Django Static Files
    location /static/ {
        alias /var/www/multitenant-notes/backend/staticfiles/;
    }

    # Proxy API & Admin requests to Django
    location ~ ^/(api|admin)/ {
        proxy_pass http://127.0.0.1:8000;
        
        # CRITICAL: Preserve the original Host header so Django resolves the tenant!
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable the site:
```bash
ln -s /etc/nginx/sites-available/multitenant_notes /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 10: Configure DNS Records
In your domain registrar / DNS provider, add `A` records pointing to your VPS Public IP:
* `prod.yourdomain.com` -> `YOUR_VPS_IP`
* `abc.yourdomain.com` -> `YOUR_VPS_IP`
* `xyz.yourdomain.com` -> `YOUR_VPS_IP`
* Or a wildcard record `*.yourdomain.com` -> `YOUR_VPS_IP`

> **Note on DNS**: DNS does **not** choose the tenant. DNS only points traffic to your VPS IP. Nginx forwards the original `Host` header to Django, and Django's `TenantMiddleware` queries PostgreSQL to determine the tenant.

### Step 11: Configure HTTPS with Let's Encrypt / Certbot
```bash
certbot --nginx -d prod.yourdomain.com -d abc.yourdomain.com -d xyz.yourdomain.com
```
Certbot automatically installs TLS certificates and configures HTTP -> HTTPS redirection while preserving the original `Host` header.

---

## Git Version Control Setup

To initialize and push this project to your Git repository:

```bash
# 1. Initialize Git repository
git init

# 2. Add files (sensitive .env and build files are excluded by .gitignore)
git add .

# 3. Create initial commit
git commit -m "feat: initial multi-tenant proof of concept with shared database and domain resolution"

# 4. Link your remote repository
git remote add origin https://github.com/your-username/multitenant-note-taker.git

# 5. Push to GitHub / GitLab
git branch -M main
git push -u origin main
```

---

## Acceptance Criteria Verification Checklist

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
- [x] **Local Windows testing fully functional**
- [x] **Git repository clean with proper `.gitignore`**
- [x] **Application ready for Linux VPS deployment**
- [x] **Nginx preserves original Host header** (`proxy_set_header Host $host;`)
- [x] **PostgreSQL remains private and secure**
