# Multi-Tenant Note Taker — Production Deployment Guide

Comprehensive, step-by-step production deployment manual for hosting the Multi-Tenant Note Taker SaaS application on a Linux Virtual Private Server (Ubuntu 22.04 / 24.04 LTS or Debian 12).

> 💡 **Detailed Architecture Reference**: For deep architectural diagrams, PostgreSQL `search_path` mechanics, and sequence flows, refer to **[`ARCHITECTURE.md`](../ARCHITECTURE.md)**.
> 🌐 **Domain & DNS Guide**: For customer and registrar DNS steps (Cloudflare, GoDaddy, Namecheap), refer to **[`docs/DNS_AND_DOMAINS.md`](../docs/DNS_AND_DOMAINS.md)**.

---

## Production System Topology

```
Internet (Public Users, Platform Admins & Custom Domains)
  │
  ▼
[ Nginx Reverse Proxy (Ports 80 & 443) ]
  ├── Direct IP Scanners (http://198.51.100.24/) ──► Dropped immediately with HTTP 444 (0 bytes)
  ├── Static Frontend Assets (Vite) ───────────────► Served from /var/www/multitenant-notes/frontend/dist/
  ├── Django Static Files (/static/) ──────────────► Served from /var/www/multitenant-notes/backend/staticfiles/
  └── API & Admin (/api/*, /admin/*) ──────────────► Proxied to Gunicorn (127.0.0.1:8000)
                                                           │
                                                           ▼
                                               [ Gunicorn WSGI Workers (PM2 Daemon) ]
                                                           │
                                                           ▼
                                               [ PostgreSQL 16 (multitenant_notes) ]
                                                 ├── public schema (Platform Master)
                                                 ├── tenant_abc schema (ABC Electronics)
                                                 └── tenant_xyz schema (XYZ Furniture)
```

---

## 1. Pre-Deployment Domain & DNS Setup (Crucial First Step)

Before running the VPS installation scripts, point your real domain DNS records to your VPS IP address in your DNS registrar (e.g. Cloudflare, Namecheap, GoDaddy):

| Type | Name / Host | Value / Target | Description |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `YOUR_VPS_PUBLIC_IP` | Primary apex platform domain (e.g. `yourplatform.com`) |
| **A** | `prod` | `YOUR_VPS_PUBLIC_IP` | Platform Super Admin console (`prod.yourplatform.com`) |
| **A** | `*` | `YOUR_VPS_PUBLIC_IP` | Wildcard record routing all tenant subdomains (`*.yourplatform.com`) |

*(Replace `YOUR_VPS_PUBLIC_IP` with your actual server IP, e.g. `198.51.100.24`).*

---

## 2. Automated One-Click VPS Provisioning

We provide a fully automated provisioning script that installs all dependencies, configures PostgreSQL 16, builds the frontend, and initializes PM2 and Nginx:

```bash
# SSH into your clean Ubuntu VPS:
ssh root@YOUR_VPS_PUBLIC_IP

# Clone repository to /var/www/multitenant-notes
git clone https://github.com/udayjaggumanthri/Multi-Tenant-Note-Taker.git /var/www/multitenant-notes
cd /var/www/multitenant-notes
chmod +x deploy/scripts/*.sh

# Run the automated installer
sudo ./deploy/scripts/setup_vps.sh
```

---

## 3. Step-by-Step Manual Deployment Guide

If you prefer to configure each component manually, follow these exact steps:

### Step 1: Install System Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib \
    nginx git curl build-essential libpq-dev certbot python3-certbot-nginx

# Install Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Step 2: Configure PostgreSQL 16 Database
```bash
sudo -u postgres psql
```
Execute SQL:
```sql
CREATE DATABASE multitenant_notes;
CREATE USER notes_user WITH PASSWORD 'YourStrongProductionPasswordHere';
ALTER ROLE notes_user SET client_encoding TO 'utf8';
ALTER ROLE notes_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE notes_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE multitenant_notes TO notes_user;
\c multitenant_notes
GRANT ALL ON SCHEMA public TO notes_user;
\q
```

### Step 3: Production Environment Variables (`.env`)
Create `/var/www/multitenant-notes/.env`:
```ini
DATABASE_NAME=multitenant_notes
DATABASE_USER=notes_user
DATABASE_PASSWORD=YourStrongProductionPasswordHere
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432

# Generate a 50-character random key: python3 -c "import secrets; print(secrets.token_urlsafe(50))"
DJANGO_SECRET_KEY=generate-a-strong-random-secret-key-here
DEBUG=False

# Real production platform domain
PLATFORM_DOMAIN=prod.yourplatform.com

# Allows dynamic multi-tenant custom domains (enforced by AppTenantMiddleware)
ALLOWED_HOSTS=*
CORS_ALLOW_ALL_ORIGINS=True
CSRF_TRUSTED_ORIGINS=https://yourplatform.com,https://*.yourplatform.com,https://prod.yourplatform.com
```

### Step 4: Backend Setup & Multi-Schema Migrations
```bash
cd /var/www/multitenant-notes/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run multi-schema migrations (creates public schema and all tenant schemas)
python manage.py migrate_schemas
python manage.py collectstatic --noinput

# Seed default platform admin and initial tenants
python manage.py seed_data
```

### Step 5: Build React 19 Frontend
```bash
cd /var/www/multitenant-notes/frontend
npm install
npm run build
```

### Step 6: Start Backend Daemon with PM2
```bash
cd /var/www/multitenant-notes
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```

### Step 7: Configure Nginx Reverse Proxy
```bash
sudo cp deploy/nginx/multitenant_notes.conf /etc/nginx/sites-available/multitenant_notes
```

Edit `/etc/nginx/sites-available/multitenant_notes` and replace `yourdomain.com` with your real domain:
```bash
sudo sed -i 's/yourdomain.com/yourplatform.com/g' /etc/nginx/sites-available/multitenant_notes
```

Enable the configuration:
```bash
sudo ln -sf /etc/nginx/sites-available/multitenant_notes /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. SSL Certificates (Let's Encrypt Wildcard HTTPS)

To protect your platform domain, platform admin, and all tenant subdomains with SSL:

### Option A: Cloudflare DNS Plugin (Automatic Wildcard)
```bash
sudo apt install -y python3-certbot-dns-cloudflare
cat <<EOF > ~/.secrets/cloudflare.ini
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
chmod 600 ~/.secrets/cloudflare.ini

sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d yourplatform.com \
  -d "*.yourplatform.com"
```

### Option B: Manual DNS Challenge
```bash
sudo certbot certonly --manual --preferred-challenges=dns \
  -d yourplatform.com \
  -d "*.yourplatform.com"
```
*(Certbot will instruct you to add a `TXT` record `_acme-challenge.yourplatform.com` to your DNS registrar).*

---

## 5. Automated Daily PostgreSQL Backups

We provide an automated script [`deploy/scripts/backup_db.sh`](scripts/backup_db.sh) that dumps all schemas (public and tenant schemas) with gzip compression and a 14-day retention cycle.

Make it executable:
```bash
sudo chmod +x /var/www/multitenant-notes/deploy/scripts/backup_db.sh
```

Add to system cron (`sudo crontab -e`):
```cron
30 2 * * * /var/www/multitenant-notes/deploy/scripts/backup_db.sh >> /var/log/multitenant_notes_backup.log 2>&1
```

---

## 6. Zero-Downtime Application Updates

Whenever you push new code to your Git repository, run the update script on your VPS:
```bash
cd /var/www/multitenant-notes
sudo ./deploy/scripts/deploy_update.sh
```
This atomic script:
1. Pulls the latest commits from `origin/main`.
2. Automatically migrates schemas across all tenants (`python manage.py migrate_schemas`).
3. Compiles the production React Vite bundle.
4. Hot-reloads Gunicorn workers via PM2 without dropping incoming requests.
5. Reloads Nginx.
