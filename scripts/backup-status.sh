#!/bin/bash
# Mostra status dos backups locais e remotos do Conexa.
set -euo pipefail
for env_file in /etc/conexa/backup.env /root/conexa-backup.env .backup.env; do
  [ -f "$env_file" ] && source "$env_file"
done
BACKUP_ROOT="${BACKUP_ROOT:-/root/backups-conexa}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"

echo "=== Backups locais (${BACKUP_ROOT}) ==="
ls -lh "${BACKUP_ROOT}"/conexa_backup_*.tar.gz 2>/dev/null | tail -10 || echo "Nenhum backup local encontrado."

echo ""
echo "=== Cron ==="
crontab -l 2>/dev/null | grep backup-database || echo "Cron de backup não encontrado."

echo ""
if [ -n "$BACKUP_REMOTE" ]; then
  echo "=== Backups remotos (${BACKUP_REMOTE}) ==="
  if command -v rclone >/dev/null 2>&1; then
    rclone lsf "$BACKUP_REMOTE" --include "conexa_backup_*.tar.gz" | tail -10 || true
  else
    echo "rclone não instalado."
  fi
else
  echo "BACKUP_REMOTE não configurado."
fi
