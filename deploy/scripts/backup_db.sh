#!/bin/bash
# ==============================================================================
# Multi-Tenant Note Taker — Automated PostgreSQL Multi-Schema Backup Script
# ==============================================================================
# This script creates compressed PostgreSQL backups including the public schema
# and all physical tenant schemas (tenant_*).
#
# Recommended cron setup (daily at 2:30 AM):
# 30 2 * * * /var/www/multitenant-notes/deploy/scripts/backup_db.sh >> /var/log/multitenant_notes_backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/multitenant_notes"
DATE_STR=$(date +'%Y%m%d_%H%M%S')
ENV_FILE="/var/www/multitenant-notes/.env"
RETENTION_DAYS=14

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Source environment variables if .env exists
if [ -f "$ENV_FILE" ]; then
    # Export only valid key=value lines
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

DB_NAME="${DB_NAME:-multitenant_notes}"
DB_USER="${DB_USER:-notes_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE_STR}.sql.gz"

echo "=========================================================="
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting PostgreSQL Database Backup"
echo "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT} (User: ${DB_USER})"
echo "Destination: ${BACKUP_FILE}"
echo "=========================================================="

# Perform full database dump (all schemas: public, tenant_abc, tenant_xyz, etc.)
if [ -n "${DB_PASSWORD:-}" ]; then
    export PGPASSWORD="${DB_PASSWORD}"
fi

pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup successfully created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Retention policy: Delete backups older than RETENTION_DAYS
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Enforcing ${RETENTION_DAYS}-day retention policy..."
find "${BACKUP_DIR}" -type f -name "${DB_NAME}_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Old backups purged. Current backups count: $(ls -1 ${BACKUP_DIR}/${DB_NAME}_*.sql.gz | wc -l)"
echo "=========================================================="
