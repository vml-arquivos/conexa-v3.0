#!/bin/bash
# =============================================================================
# CONEXA V3.0 — BACKUP COMPLETO AUTOMÁTICO
#
# Faz backup do PostgreSQL do Conexa e, opcionalmente, envia para Google Drive
# via rclone. Não altera banco, matriz, planos, RDIC, diário ou dados.
#
# Uso manual:
#   bash scripts/backup-database.sh
#
# Configuração opcional:
#   /etc/conexa/backup.env ou /root/conexa-backup.env
#
# Variáveis principais:
#   DB_NAME=conexa
#   BACKUP_ROOT=/root/backups-conexa
#   BACKUP_RETENTION_LOCAL=30
#   BACKUP_REMOTE=conexa-drive:Backups/Conexa
#   BACKUP_RETENTION_REMOTE_DAYS=90
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
erro()  { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }
titulo(){ echo -e "\n${BOLD}${BLUE}──────── $1 ────────${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Carrega configuração externa sem versionar credenciais.
for env_file in /etc/conexa/backup.env /root/conexa-backup.env "${REPO_ROOT}/.backup.env"; do
  if [ -f "$env_file" ]; then
    # shellcheck disable=SC1090
    source "$env_file"
  fi
done

DATE="$(date +"%Y%m%d_%H%M%S")"
DB_NAME="${DB_NAME:-conexa}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/backups-conexa}"
WORK_DIR="${BACKUP_ROOT}/tmp_${DATE}"
OUTPUT="${BACKUP_ROOT}/conexa_backup_${DATE}.tar.gz"
LOG="${BACKUP_LOG:-${BACKUP_ROOT}/backup.log}"
RETENTION_LOCAL="${BACKUP_RETENTION_LOCAL:-30}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
RETENTION_REMOTE_DAYS="${BACKUP_RETENTION_REMOTE_DAYS:-90}"
HEALTHCHECK_URL="${BACKUP_HEALTHCHECK_URL:-}"

notify_healthcheck() {
  local status="$1"
  if [ -n "$HEALTHCHECK_URL" ] && command -v curl >/dev/null 2>&1; then
    curl -fsS -m 10 --retry 2 "${HEALTHCHECK_URL}/${status}" >/dev/null 2>&1 || true
  fi
}

on_error() {
  local exit_code=$?
  echo "ERRO: backup falhou em $(date '+%Y-%m-%d %H:%M:%S') — exit ${exit_code}" >> "$LOG" 2>/dev/null || true
  notify_healthcheck "fail"
  exit "$exit_code"
}
trap on_error ERR

mkdir -p "$BACKUP_ROOT"
touch "$LOG"

echo ""
echo -e "${BOLD}CONEXA V3.0 — BACKUP AUTOMÁTICO${NC}"
echo "Início: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Destino local: $BACKUP_ROOT"
[ -n "$BACKUP_REMOTE" ] && echo "Destino remoto: $BACKUP_REMOTE"
echo ""
echo "===== BACKUP INICIADO $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG"

notify_healthcheck "start"

titulo "VERIFICAÇÕES"
docker info >/dev/null 2>&1 || erro "Docker não está rodando."
ok "Docker OK"

info "Detectando container PostgreSQL com banco '${DB_NAME}'..."
DB_CONTAINER=""
DB_USER=""
DB_PASS=""

for container in $(docker ps --format "{{.Names}}" | grep -v "^coolify-db$" || true); do
  IMAGE="$(docker inspect "$container" --format "{{.Config.Image}}" 2>/dev/null || true)"
  if echo "$IMAGE" | grep -qi "postgres"; then
    PGPASS_TMP="$(docker inspect "$container" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^POSTGRES_PASSWORD=' | cut -d= -f2- | head -1 || true)"
    PGUSER_TMP="$(docker inspect "$container" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^POSTGRES_USER=' | cut -d= -f2- | head -1 || true)"
    PGUSER_TMP="${PGUSER_TMP:-postgres}"

    if PGPASSWORD="$PGPASS_TMP" docker exec -e PGPASSWORD="$PGPASS_TMP" "$container" psql -U "$PGUSER_TMP" -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
      DB_CONTAINER="$container"
      DB_USER="$PGUSER_TMP"
      DB_PASS="$PGPASS_TMP"
      break
    fi
  fi
done

[ -z "$DB_CONTAINER" ] && erro "Nenhum PostgreSQL com banco '${DB_NAME}' foi encontrado."
ok "Container PostgreSQL: $DB_CONTAINER"
ok "Banco: $DB_NAME"

DB_VOLUME="$(docker inspect "$DB_CONTAINER" --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}{{"\n"}}{{end}}{{end}}' 2>/dev/null | head -1 || true)"
info "Volume detectado: ${DB_VOLUME:-sem volume nomeado}"

AVAIL="$(df "$BACKUP_ROOT" --output=avail -BG 2>/dev/null | tail -1 | tr -d 'G ' || echo 0)"
info "Espaço disponível: ${AVAIL}GB"
[ "${AVAIL:-0}" -lt 2 ] && warn "Menos de 2GB disponível. Verifique disco/limpeza."

mkdir -p "$WORK_DIR"/{database,volume,configs,checks}

titulo "1/5 — DUMP DO BANCO"
info "Gerando dump custom para pg_restore..."
docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" pg_dump -U "$DB_USER" --format=custom --compress=9 --no-password "$DB_NAME" > "${WORK_DIR}/database/conexa_${DATE}.dump"
ok "Dump custom: $(du -sh "${WORK_DIR}/database/conexa_${DATE}.dump" | cut -f1)"

info "Gerando dump SQL puro..."
docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" pg_dump -U "$DB_USER" --format=plain --no-owner --no-privileges --no-password "$DB_NAME" > "${WORK_DIR}/database/conexa_${DATE}.sql"
ok "Dump SQL: $(du -sh "${WORK_DIR}/database/conexa_${DATE}.sql" | cut -f1)"

titulo "2/5 — INVENTÁRIO"
docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT tablename AS tabela, n_live_tup AS registros
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_live_tup DESC;" > "${WORK_DIR}/checks/inventario_${DATE}.txt" 2>&1

TOTAL="$(docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COALESCE(SUM(n_live_tup),0) FROM pg_stat_user_tables;" 2>/dev/null | xargs)"
DB_SIZE="$(docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs)"
ok "Total aproximado: ${TOTAL:-0} registros | Tamanho: ${DB_SIZE:-indisponível}"

titulo "3/5 — VOLUME POSTGRESQL"
if [ -n "$DB_VOLUME" ]; then
  docker run --rm -v "${DB_VOLUME}:/pgdata:ro" -v "${WORK_DIR}/volume:/backup" alpine tar czf "/backup/pg_volume_${DATE}.tar.gz" -C /pgdata .
  ok "Volume exportado: $(du -sh "${WORK_DIR}/volume/pg_volume_${DATE}.tar.gz" | cut -f1)"
else
  warn "Volume nomeado não detectado. Dump SQL/custom continua válido para restauração."
fi

titulo "4/5 — CONFIGURAÇÕES E MANIFESTO"
if [ -d "/data/coolify" ]; then
  tar czf "${WORK_DIR}/configs/coolify_${DATE}.tar.gz" /data/coolify/ 2>/dev/null || warn "Falha parcial ao copiar /data/coolify."
fi

docker ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}" > "${WORK_DIR}/configs/docker_containers_${DATE}.txt"
cat > "${WORK_DIR}/MANIFESTO.txt" <<MANIFEST
Conexa V3.0 Backup
Data: ${DATE}
Banco: ${DB_NAME}
Container: ${DB_CONTAINER}
Tamanho banco: ${DB_SIZE:-indisponível}
Registros aproximados: ${TOTAL:-0}
Servidor: $(hostname)
MANIFEST
ok "Manifesto gerado"

titulo "5/5 — EMPACOTAMENTO"
tar czf "$OUTPUT" -C "$BACKUP_ROOT" "tmp_${DATE}/"
sha256sum "$OUTPUT" > "${OUTPUT}.sha256"
rm -rf "$WORK_DIR"
FINAL_SIZE="$(du -sh "$OUTPUT" | cut -f1)"
ok "Arquivo final: $OUTPUT ($FINAL_SIZE)"

info "Limpando backups locais antigos. Retenção: últimos ${RETENTION_LOCAL} arquivos."
ls -t "${BACKUP_ROOT}"/conexa_backup_*.tar.gz 2>/dev/null | tail -n +$((RETENTION_LOCAL + 1)) | xargs rm -f 2>/dev/null || true
ls -t "${BACKUP_ROOT}"/conexa_backup_*.tar.gz.sha256 2>/dev/null | tail -n +$((RETENTION_LOCAL + 1)) | xargs rm -f 2>/dev/null || true

if [ -n "$BACKUP_REMOTE" ]; then
  titulo "UPLOAD REMOTO"
  command -v rclone >/dev/null 2>&1 || erro "BACKUP_REMOTE configurado, mas rclone não está instalado. Instale/configure rclone antes."
  info "Enviando backup para ${BACKUP_REMOTE}..."
  rclone mkdir "$BACKUP_REMOTE" >/dev/null 2>&1 || true
  rclone copy "$OUTPUT" "$BACKUP_REMOTE" --transfers=1 --checkers=4 --drive-chunk-size=64M --stats=30s
  rclone copy "${OUTPUT}.sha256" "$BACKUP_REMOTE" --transfers=1 --checkers=4
  ok "Upload remoto concluído"

  if [ "${RETENTION_REMOTE_DAYS:-0}" -gt 0 ]; then
    info "Aplicando retenção remota: apagar arquivos com mais de ${RETENTION_REMOTE_DAYS} dias."
    rclone delete "$BACKUP_REMOTE" --include "conexa_backup_*.tar.gz" --include "conexa_backup_*.tar.gz.sha256" --min-age "${RETENTION_REMOTE_DAYS}d" || warn "Falha não crítica na limpeza remota."
  fi
else
  warn "BACKUP_REMOTE não configurado. Backup ficou apenas local."
fi

COUNT="$(ls "${BACKUP_ROOT}"/conexa_backup_*.tar.gz 2>/dev/null | wc -l | xargs)"
echo "Backup OK: $OUTPUT ($FINAL_SIZE) — ${TOTAL:-0} registros" >> "$LOG"
echo "===== FIM $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG"
notify_healthcheck "0"

echo ""
echo -e "${BOLD}${GREEN}BACKUP CONCLUÍDO COM SUCESSO${NC}"
echo "Arquivo local : $OUTPUT"
echo "Tamanho       : $FINAL_SIZE"
echo "Backups locais: $COUNT"
[ -n "$BACKUP_REMOTE" ] && echo "Destino remoto: $BACKUP_REMOTE"
echo "Log           : $LOG"
echo ""
