#!/bin/bash
# =============================================================================
# CONEXA V3.0 — ATIVAR BACKUP AUTOMÁTICO DIÁRIO
#
# Executar UMA VEZ na VPS:
#   bash scripts/setup-backup-cron.sh
#
# Agenda backup diário às 03:00 Brasília (06:00 UTC).
# Para enviar ao Google Drive, configure rclone e BACKUP_REMOTE antes.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; BOLD='\033[1m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
erro() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"
LOG_FILE="/var/log/conexa-backup.log"
ENV_DIR="/etc/conexa"
ENV_FILE="${ENV_DIR}/backup.env"

echo ""
echo -e "${BOLD}CONEXA — BACKUP AUTOMÁTICO DIÁRIO${NC}"
echo ""

[ -f "$BACKUP_SCRIPT" ] || erro "Arquivo não encontrado: $BACKUP_SCRIPT"
chmod +x "$BACKUP_SCRIPT"
ok "Script de backup localizado"

mkdir -p /root/backups-conexa "$ENV_DIR"
touch "$LOG_FILE"
ok "Pasta local e log prontos"

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<ENV
# Configuração do backup automático Conexa.
DB_NAME=conexa
BACKUP_ROOT=/root/backups-conexa
BACKUP_RETENTION_LOCAL=30

# Para Google Drive via rclone, configure antes:
#   rclone config
# Depois descomente e ajuste a linha abaixo.
# BACKUP_REMOTE=conexa-drive:Backups/Conexa
BACKUP_RETENTION_REMOTE_DAYS=90

# Opcional: healthchecks.io ou similar. Ex: https://hc-ping.com/uuid
# BACKUP_HEALTHCHECK_URL=
ENV
  ok "Arquivo de configuração criado: $ENV_FILE"
else
  ok "Arquivo de configuração já existe: $ENV_FILE"
fi

# Remove agendamentos antigos deste script e instala o novo.
(crontab -l 2>/dev/null | grep -v "backup-database.sh" || true) | crontab - 2>/dev/null || true
(crontab -l 2>/dev/null; echo "0 6 * * * bash ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1") | crontab -
ok "Cron configurado: todo dia às 03:00 Brasília"

echo ""
info "Cron ativo:"
crontab -l | grep backup-database || true

echo ""
info "Executando backup agora para validação..."
bash "$BACKUP_SCRIPT"

echo ""
echo -e "${BOLD}${GREEN}BACKUP AUTOMÁTICO ATIVADO${NC}"
echo "Horário : todo dia às 03:00 Brasília"
echo "Local   : /root/backups-conexa"
echo "Config  : $ENV_FILE"
echo "Log     : $LOG_FILE"
echo "Manual  : bash $BACKUP_SCRIPT"
echo ""
