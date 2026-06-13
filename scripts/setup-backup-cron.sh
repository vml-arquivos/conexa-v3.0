#!/bin/bash
# =============================================================================
# CONEXA V3.0 — ATIVAR BACKUP AUTOMÁTICO DIÁRIO
#
# USO: Execute UMA VEZ na VPS após clonar/atualizar o repositório.
#   bash scripts/setup-backup-cron.sh
#
# Agenda backup diário às 03:00 (Brasília) via cron.
# Nenhuma credencial é armazenada neste arquivo.
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; BOLD='\033[1m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}[✅]${NC} $1"; }
info() { echo -e "${BLUE}[ℹ️ ]${NC} $1"; }
erro() { echo -e "${RED}[❌]${NC} $1"; exit 1; }

# Caminho absoluto do script de backup (resolve independente de onde for chamado)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"
LOG_FILE="/var/log/conexa-backup.log"

echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   CONEXA — ATIVAR BACKUP AUTOMÁTICO DIÁRIO        ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Verificações
[ -f "$BACKUP_SCRIPT" ] || erro "Arquivo não encontrado: $BACKUP_SCRIPT"
chmod +x "$BACKUP_SCRIPT"
ok "Script de backup localizado"

mkdir -p /root/backups-conexa
ok "Pasta /root/backups-conexa pronta"

touch "$LOG_FILE"
ok "Arquivo de log: $LOG_FILE"

# Remover agendamento antigo se existir
crontab -l 2>/dev/null | grep -v "backup-database.sh" | crontab - 2>/dev/null || true

# Agendar: 06:00 UTC = 03:00 Brasília (UTC-3)
(crontab -l 2>/dev/null; echo "0 6 * * * bash ${BACKUP_SCRIPT} >> ${LOG_FILE} 2>&1") | crontab -
ok "Cron configurado: todo dia às 03:00 (Brasília)"

echo ""
info "Cron ativo:"
crontab -l | grep backup
echo ""

# Executar backup imediatamente como teste
echo -e "${BOLD}Executando backup agora para validar...${NC}"
echo ""
bash "$BACKUP_SCRIPT"

echo ""
echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   ✅  BACKUP AUTOMÁTICO ATIVADO!                  ║${NC}"
echo -e "${BOLD}${GREEN}╠═══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  🕒 Horário : todo dia às 03:00 (Brasília)        ║${NC}"
echo -e "${GREEN}║  📂 Backups : /root/backups-conexa/               ║${NC}"
echo -e "${GREEN}║  📋 Logs    : /var/log/conexa-backup.log          ║${NC}"
echo -e "${GREEN}║  🗂️  Retenção: últimos 30 backups                  ║${NC}"
echo -e "${BOLD}${GREEN}╠═══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Forçar backup manualmente:                       ║${NC}"
echo -e "${GREEN}║    bash scripts/backup-database.sh                ║${NC}"
echo -e "${GREEN}║  Ver logs:                                        ║${NC}"
echo -e "${GREEN}║    tail -f /var/log/conexa-backup.log             ║${NC}"
echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
