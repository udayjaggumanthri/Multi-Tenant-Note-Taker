#!/usr/bin/env bash
# ==============================================================================
# Multi-Tenant Note Taker — Automated Linux VPS Setup Script
# ==============================================================================
# Compatible with Ubuntu 22.04 / 24.04 and Debian 11 / 12
# Run as root or with sudo:
#   chmod +x deploy/scripts/setup_vps.sh
#   sudo ./deploy/scripts/setup_vps.sh
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}       Multi-Tenant Note Taker — Linux VPS Automated Setup         ${NC}"
echo -e "${BLUE}===================================================================${NC}"

# Ensure script is run with sudo/root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root or with sudo.${NC}"
  exit 1
fi

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$PROJECT_DIR"
echo -e "${GREEN}Project directory:${NC} $PROJECT_DIR"

# 1. Update system packages
echo -e "\n${YELLOW}[1/8] Updating system packages...${NC}"
apt update -y && apt upgrade -y

# 2. Install essential system dependencies
echo -e "\n${YELLOW}[2/8] Installing Python, PostgreSQL, Nginx, Node.js & Tools...${NC}"
apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx curl git certbot python3-certbot-nginx

# Install Node.js & PM2 if not installed
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}Installing Node.js LTS via NodeSource...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo -e "${BLUE}Installing PM2 process manager globally...${NC}"
    npm install -g pm2
fi

echo -e "${GREEN}System dependencies installed successfully.${NC}"

# 3. Setup PostgreSQL Database
echo -e "\n${YELLOW}[3/8] Configuring local PostgreSQL (private)...${NC}"
DB_NAME="multitenant_notes"
DB_USER="notesuser"
DB_PASS="NotesSecurePass@2026"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

echo -e "${GREEN}PostgreSQL database and user ready.${NC}"

# 4. Configure .env file
echo -e "\n${YELLOW}[4/8] Configuring environment variables (.env)...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    cat <<EOF > "$PROJECT_DIR/.env"
DATABASE_NAME=$DB_NAME
DATABASE_USER=$DB_USER
DATABASE_PASSWORD=$DB_PASS
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432

DJANGO_SECRET_KEY=$SECRET_KEY
DEBUG=False

PLATFORM_DOMAIN=${DOMAIN:-prod.localhost}
PLATFORM_BASE_DOMAIN=${BASE_DOMAIN:-localhost}
ALLOWED_HOSTS=*
CORS_ALLOW_ALL_ORIGINS=True
EOF
    echo -e "${GREEN}Created new .env with production database credentials.${NC}"
else
    echo -e "${BLUE}Existing .env found. Keeping current configuration.${NC}"
fi

# 5. Setup Python Backend Virtual Environment
echo -e "\n${YELLOW}[5/8] Setting up Python virtual environment & backend...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations, collectstatic & seed initial data
python manage.py migrate_schemas
python manage.py collectstatic --noinput
python manage.py seed_data
mkdir -p "$PROJECT_DIR/logs"

# 6. Build React Frontend Bundle
echo -e "\n${YELLOW}[6/8] Building React Frontend...${NC}"
cd "$PROJECT_DIR/frontend"
npm install
npm run build
echo -e "${GREEN}React frontend bundle built successfully in frontend/dist.${NC}"

# 7. Configure PM2 Process Manager
echo -e "\n${YELLOW}[7/8] Configuring and Starting PM2 Daemon...${NC}"
cd "$PROJECT_DIR"
pm2 delete multitenant-backend 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME 2>/dev/null || true

# 8. Configure Nginx Reverse Proxy
echo -e "\n${YELLOW}[8/8] Configuring Nginx Reverse Proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/multitenant_notes"

# Copy pre-configured Nginx config
cp "$PROJECT_DIR/deploy/nginx/multitenant_notes.conf" "$NGINX_CONF"

# Adjust project path if not /var/www/multitenant-notes
sed -i "s|/var/www/multitenant-notes|$PROJECT_DIR|g" "$NGINX_CONF"

# Enable site in Nginx
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/multitenant_notes
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl restart nginx

echo -e "\n${GREEN}===================================================================${NC}"
echo -e "${GREEN}         DEPLOYMENT COMPLETE! MULTI-TENANT IS RUNNING              ${NC}"
echo -e "${GREEN}===================================================================${NC}"
echo -e "Backend Status:  pm2 status"
echo -e "Backend Logs:    pm2 logs multitenant-backend"
echo -e "Nginx Status:    systemctl status nginx"
echo -e "\nNext step for custom domains and HTTPS:"
echo -e "  sudo certbot --nginx -d yourdomain.com -d abc.yourdomain.com -d xyz.yourdomain.com"
