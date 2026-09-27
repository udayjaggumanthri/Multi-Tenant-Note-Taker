# Multi-Tenant Note Taker — Production Deployment Guide

Comprehensive guide for deploying the Multi-Tenant Note Taker application to a Linux Virtual Private Server (Ubuntu 22.04 / 24.04 LTS or Debian 12).

---

## Architecture Topology

```
Internet (Users & Custom Domains)
  │
  ▼
[ Nginx Reverse Proxy (Port 80 / 443) ]
  ├── Direct IP Access (198.51.100.24) ──► Dropped immediately with HTTP 444 (0 bytes)
  ├── Static Frontend Assets (Vite) ─────► Served directly from /dist/
  ├── Django Static Files (/static/) ────► Served directly from /staticfiles/
  └── API & Admin (/api/*, /admin/*) ────► Proxied to Gunicorn (127.0.0.1:8000)
                                                 │
                                                 ▼
                                     [ Django Gunicorn Workers ]
                                                 │
                                                 ▼
                                     [ PostgreSQL Database (multitenant_notes) ]
                                       ├── public schema
                                       ├── tenant_abc schema
                                       └── tenant_xyz schema
```

---

## 1. Quick Automated VPS Provisioning

We provide an automated script that installs and configures all system packages, PostgreSQL 16, Node.js 20, Python virtual environment, Nginx, and PM2:

```bash
# On your clean Ubuntu VPS:
git clone https://github.com/udayjaggumanthri/Multi-Tenant-Note-Taker.git /var/www/multitenant-notes
cd /var/www/multitenant-notes
chmod +x deploy/scripts/*.sh

# Run provisioning script
sudo ./deploy/scripts/setup_vps.sh
```

---

## 2. Step-by-Step Manual Deployment

### Step A: System Packages & Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip postgresql postgresql-contrib \
    nginx git curl build-essential libpq-dev certbot python3-certbot-nginx

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Step B: PostgreSQL Database Configuration
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE multitenant_notes;
CREATE USER notes_user WITH PASSWORD 'YourSecureStrongPasswordHere';
ALTER ROLE notes_user SET client_encoding TO 'utf8';
ALTER ROLE notes_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE notes_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE multitenant_notes TO notes_user;
\q
```

### Step C: Environment Variables (`.env`)
Create `/var/www/multitenant-notes/.env`:
```ini
DEBUG=False
SECRET_KEY=your-production-high-entropy-secret-key-min-50-chars
ALLOWED_HOSTS=.yourplatform.com,localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=True

DB_NAME=multitenant_notes
DB_USER=notes_user
DB_PASSWORD=YourSecureStrongPasswordHere
DB_HOST=127.0.0.1
DB_PORT=5432
```

### Step D: Backend Setup & Migrations
```bash
cd /var/www/multitenant-notes/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations (Shared apps in public schema, then tenant apps)
python manage.py migrate_schemas --shared
python manage.py collectstatic --noinput

# Seed initial admin & tenants
python manage.py seed_data
```

### Step E: Frontend Production Build
```bash
cd /var/www/multitenant-notes/frontend
npm install
npm run build
```

### Step F: Process Management with PM2
Start the Django backend using Gunicorn managed by PM2:
```bash
cd /var/www/multitenant-notes
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Step G: Nginx Reverse Proxy Setup
Copy the production Nginx configuration:
```bash
sudo cp deploy/nginx/multitenant_notes.conf /etc/nginx/sites-available/multitenant_notes
```
Edit `/etc/nginx/sites-available/multitenant_notes` and replace `yourdomain.com` with your real platform domain.

Enable the configuration and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/multitenant_notes /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3. SSL Configuration (Let's Encrypt Wildcard)

For multi-tenant custom domains and subdomains, install a Wildcard certificate:
```bash
sudo certbot certonly --manual --preferred-challenges=dns \
  -d yourplatform.com -d "*.yourplatform.com"
```
Or if using Cloudflare DNS:
```bash
sudo apt install python3-certbot-dns-cloudflare
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d yourplatform.com -d "*.yourplatform.com"
```

---

## 4. Automated Database Backups

Set up an automated daily PostgreSQL multi-schema backup:
```bash
sudo chmod +x /var/www/multitenant-notes/deploy/scripts/backup_db.sh
```
Add to root crontab (`sudo crontab -e`):
```cron
30 2 * * * /var/www/multitenant-notes/deploy/scripts/backup_db.sh >> /var/log/multitenant_notes_backup.log 2>&1
```
Backups are saved to `/var/backups/multitenant_notes/` as compressed `.sql.gz` files and automatically kept for 14 days.

---

## 5. Continuous Deployment & Updates

To deploy code updates with zero downtime, use the provided update script:
```bash
cd /var/www/multitenant-notes
sudo ./deploy/scripts/deploy_update.sh
```
This script pulls new code from Git, runs tenant migrations (`migrate_schemas`), rebuilds the frontend Vite bundle, collects static files, and reloads PM2 and Nginx.
