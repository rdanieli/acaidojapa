#!/bin/bash
set -e

# ============================================
# Acai do Japa — Deploy Script
# Usage:
#   ./deploy.sh setup    — First-time setup on a new server
#   ./deploy.sh up       — Start all services
#   ./deploy.sh down     — Stop all services
#   ./deploy.sh update   — Rebuild dashboard and restart
#   ./deploy.sh logs     — View dashboard logs
#   ./deploy.sh db:push  — Push Drizzle schema to database
#   ./deploy.sh status   — Show status of all services
# ============================================

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}[DEPLOY]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check .env exists
if [ ! -f .env ]; then
  err ".env file not found. Copy .env.example to .env and fill in values."
  exit 1
fi

case "$1" in
  setup)
    log "Setting up Acai do Japa..."

    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
      log "Installing Docker..."
      curl -fsSL https://get.docker.com | sh
    fi
    ok "Docker installed"

    # Install Nginx if not present
    if ! command -v nginx &> /dev/null; then
      log "Installing Nginx..."
      apt-get update -qq && apt-get install -y -qq nginx certbot python3-certbot-nginx
    fi
    ok "Nginx installed"

    # Login to GitHub Container Registry
    log "Logging into GHCR..."
    echo "${GHCR_TOKEN}" | docker login ghcr.io -u rdanieli --password-stdin 2>/dev/null || true

    # Start services
    log "Pulling images and starting services..."
    docker compose pull dashboard
    docker compose up -d
    ok "Services started"

    # Wait for DB
    log "Waiting for database..."
    sleep 10

    # Push Drizzle schema
    log "Pushing database schema..."
    docker compose exec dashboard node -e "
      const { execSync } = require('child_process');
      console.log('Schema push not available in production container');
    " 2>/dev/null || true

    # Push schema from host if drizzle-kit is available
    if command -v npx &> /dev/null; then
      cd dashboard
      DATABASE_URL="postgresql://acaidojapa:$(grep DB_PASSWORD ../.env | cut -d= -f2)@localhost:5433/acaidojapa" npx drizzle-kit push
      cd ..
    fi
    ok "Database schema pushed"

    log ""
    log "Setup complete! Configure Nginx:"
    log "  1. Add Nginx proxy: your-domain → localhost:3001"
    log "  2. Add Nginx proxy: evolution.your-domain → localhost:8082"
    log "  3. Run: certbot --nginx -d your-domain -d evolution.your-domain"
    log "  4. Open dashboard and connect WhatsApp in Estoque → Conexão"
    ;;

  up)
    log "Starting services..."
    docker compose up -d
    ok "All services running"
    docker compose ps
    ;;

  down)
    log "Stopping services..."
    docker compose down
    ok "All services stopped"
    ;;

  update)
    log "Pulling latest dashboard image..."
    docker compose pull dashboard
    log "Restarting dashboard..."
    docker compose up -d dashboard
    ok "Dashboard updated"
    ;;

  logs)
    docker compose logs -f dashboard
    ;;

  db:push)
    log "Pushing database schema..."
    cd dashboard
    DATABASE_URL="postgresql://acaidojapa:$(grep DB_PASSWORD ../.env | cut -d= -f2)@localhost:5433/acaidojapa" npx drizzle-kit push
    cd ..
    ok "Schema pushed"
    ;;

  status)
    docker compose ps
    echo ""
    log "Dashboard: http://localhost:3001"
    log "Evolution API: http://localhost:8082"
    log "PostgreSQL: localhost:5433"
    ;;

  setup-cron)
    log "Setting up cron jobs..."
    CRON_SECRET=$(grep CRON_SECRET .env | cut -d= -f2)
    if [ -z "$CRON_SECRET" ]; then
      err "CRON_SECRET not found in .env"
      exit 1
    fi

    AUTH_HEADER="Authorization: Bearer ${CRON_SECRET}"
    CONTENT_TYPE="Content-Type: application/json"
    BASE="http://localhost:3001/api/dashboard"
    LOG="/var/log/acaidojapa-cron.log"

    # Sync orders every 2 hours (import from PDV/CW APIs to local DB)
    SYNC_LINE="0 */2 * * * curl -s -X POST ${BASE}/orders/sync -H '${AUTH_HEADER}' -H '${CONTENT_TYPE}' -d '{}' >> ${LOG} 2>&1"

    # Daily stock processing at 23:00 UTC (20:00 BRT)
    PROCESS_LINE="0 23 * * * curl -s -X POST ${BASE}/stock/process-daily-sales -H '${AUTH_HEADER}' -H '${CONTENT_TYPE}' -d '{}' >> ${LOG} 2>&1"

    # Remove old entries, add new ones
    (crontab -l 2>/dev/null | grep -v 'acaidojapa' | grep -v 'process-daily-sales' | grep -v 'orders/sync'; echo "$SYNC_LINE"; echo "$PROCESS_LINE") | crontab -
    ok "Cron installed:"
    ok "  - Order sync: every 2 hours"
    ok "  - Daily stock processing: 23:00 UTC (20:00 BRT)"
    crontab -l | grep -E 'orders/sync|process-daily-sales'
    ;;

  *)
    echo "Usage: ./deploy.sh {setup|up|down|update|logs|db:push|status|setup-cron}"
    exit 1
    ;;
esac
