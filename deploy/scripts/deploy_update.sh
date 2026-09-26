#!/usr/bin/env bash
# ==============================================================================
# Multi-Tenant Note Taker — Fast Update / Redeployment Script
# ==============================================================================
# Run this on your VPS whenever you push new changes to GitHub:
#   chmod +x deploy/scripts/deploy_update.sh
#   ./deploy/scripts/deploy_update.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$PROJECT_DIR"

echo -e "${BLUE}>>> Pulling latest changes from Git...${NC}"
git pull origin main

echo -e "${BLUE}>>> Updating Python dependencies and running migrations...${NC}"
cd "$PROJECT_DIR/backend"
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

echo -e "${BLUE}>>> Building React frontend...${NC}"
cd "$PROJECT_DIR/frontend"
npm install
npm run build

echo -e "${BLUE}>>> Reloading PM2 backend daemon...${NC}"
cd "$PROJECT_DIR"
pm2 reload ecosystem.config.cjs

echo -e "${BLUE}>>> Testing and reloading Nginx...${NC}"
if command -v sudo &> /dev/null; then
    sudo nginx -t && sudo systemctl reload nginx
else
    nginx -t && systemctl reload nginx
fi

echo -e "${GREEN}>>> Update successfully deployed with ZERO downtime!${NC}"
pm2 status
