#!/bin/bash
# =============================================================================
# CONEXA V3.0 — BACKUP COMPLETO DO BANCO DE DADOS
#
# USO:
#   bash scripts/backup-database.sh
#
# As credenciais são lidas automaticamente dos containers Docker em execução.
# Nenhuma senha ou chave fica armazenada neste arquivo.
#
# Backup salvo em: /root/backups-conexa/
# =============================================================================

set -euo pipefail

# ── Cores ─────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
ok()    { echo -e "${GREEN}[✅]${NC} $1"; }
info()  { echo -e "${BLUE}[ℹ️ ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠️ ]${NC} $1"; }
erro()  { echo -e "${RED}[❌]${NC} $1"; exit 1; }
titulo(){ echo -e "\n${BOLD}${BLUE}──────── $1 ────────${NC}"; }

# ── Configurações ─────────────────────────────────────────────────────────────
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_ROOT="/root/backups-conexa"
WORK_DIR="${BACKUP_ROOT}/tmp_${DATE}"
OUTPUT="${BACKUP_ROOT}/conexa_backup_${DATE}.tar.gz"
LOG="${BACKUP_ROOT}/backup.log"
RETENTION=30
DB_NAME="conexa"

# ── Cabeçalho ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   CONEXA V3.0 — BACKUP DO BANCO DE DADOS          ║${NC}"
echo -e "${BOLD}║   $(date '+%Y-%m-%d %H:%M:%S')                        ║${NC}"
echo -e "${BOLD}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

mkdir -p "$BACKUP_ROOT"
echo "===== BACKUP INICIADO $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG"

# ── Verificações iniciais ─────────────────────────────────────────────────────
titulo "VERIFICAÇÕES"

docker info > /dev/null 2>&1 || erro "Docker não está rodando!"
ok "Docker OK"

# ── Detectar automaticamente o container PostgreSQL da aplicação ──────────────
info "Detectando container PostgreSQL da aplicação..."

DB_CONTAINER=""
DB_USER=""
DB_PASS=""

# Percorre todos os containers postgres em execução, ignora o do próprio Coolify
for container in $(docker ps --format "{{.Names}}" | grep -v "^coolify-db$"); do
    IMAGE=$(docker inspect "$container" --format "{{.Config.Image}}" 2>/dev/null || true)
    if echo "$IMAGE" | grep -qi "postgres"; then
        # Testa se o banco 'conexa' existe neste container
        PGPASS_TMP=$(docker inspect "$container" \
            --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
            | grep "^POSTGRES_PASSWORD=" | cut -d= -f2- | head -1)
        PGUSER_TMP=$(docker inspect "$container" \
            --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
            | grep "^POSTGRES_USER=" | cut -d= -f2- | head -1)
        PGUSER_TMP="${PGUSER_TMP:-postgres}"

        if PGPASSWORD="$PGPASS_TMP" docker exec -e PGPASSWORD="$PGPASS_TMP" \
            "$container" psql -U "$PGUSER_TMP" -lqt 2>/dev/null \
            | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
            DB_CONTAINER="$container"
            DB_USER="$PGUSER_TMP"
            DB_PASS="$PGPASS_TMP"
            break
        fi
    fi
done

[ -z "$DB_CONTAINER" ] && erro "Nenhum container PostgreSQL com banco '$DB_NAME' encontrado. Verifique se os containers estão rodando."
ok "Container PostgreSQL: $DB_CONTAINER"
ok "Usuário: $DB_USER"
ok "Banco: $DB_NAME"

# ── Detectar volume do PostgreSQL ─────────────────────────────────────────────
DB_VOLUME=$(docker inspect "$DB_CONTAINER" \
    --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}{{end}}{{end}}' \
    2>/dev/null | head -1)
info "Volume detectado: ${DB_VOLUME:-'(nenhum volume nomeado)'}"

# ── Verificar espaço ──────────────────────────────────────────────────────────
AVAIL=$(df /root --output=avail -BG | tail -1 | tr -d 'G ')
info "Espaço disponível: ${AVAIL}GB"
[ "$AVAIL" -lt 2 ] && warn "Menos de 2GB disponível. Verifique o disco."

mkdir -p "$WORK_DIR"/{database,volume,configs,envs}

# ── 1. DUMP DO BANCO ──────────────────────────────────────────────────────────
titulo "1/4 — DUMP DO BANCO DE DADOS"

info "Gerando dump formato custom (pg_restore)..."
docker exec \
    -e PGPASSWORD="$DB_PASS" \
    "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" \
        --format=custom \
        --compress=9 \
        --no-password \
        "$DB_NAME" \
    > "${WORK_DIR}/database/conexa_${DATE}.dump"
ok "Dump custom: $(du -sh ${WORK_DIR}/database/conexa_${DATE}.dump | cut -f1)"

info "Gerando dump formato SQL puro (psql)..."
docker exec \
    -e PGPASSWORD="$DB_PASS" \
    "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" \
        --format=plain \
        --no-owner \
        --no-privileges \
        --no-password \
        "$DB_NAME" \
    > "${WORK_DIR}/database/conexa_${DATE}.sql"
ok "Dump SQL: $(du -sh ${WORK_DIR}/database/conexa_${DATE}.sql | cut -f1)"

# ── 2. INVENTÁRIO DE REGISTROS ────────────────────────────────────────────────
titulo "2/4 — INVENTÁRIO DE REGISTROS"

docker exec \
    -e PGPASSWORD="$DB_PASS" \
    "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" \
    -c "
SELECT
    tablename  AS tabela,
    n_live_tup AS registros
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_live_tup DESC;" \
    > "${WORK_DIR}/inventario_${DATE}.txt" 2>&1

ok "Inventário salvo"
echo ""
cat "${WORK_DIR}/inventario_${DATE}.txt"

TOTAL=$(docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT COALESCE(SUM(n_live_tup),0) FROM pg_stat_user_tables;" \
    2>/dev/null | xargs)
DB_SIZE=$(docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -t \
    -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" \
    2>/dev/null | xargs)

ok "Total de registros: $TOTAL | Tamanho: $DB_SIZE"

# ── 3. VOLUME DOCKER ──────────────────────────────────────────────────────────
titulo "3/4 — VOLUME DOCKER DO POSTGRESQL"

if [ -n "$DB_VOLUME" ]; then
    info "Exportando volume '$DB_VOLUME'..."
    docker run --rm \
        -v "${DB_VOLUME}:/pgdata:ro" \
        -v "${WORK_DIR}/volume:/backup" \
        alpine \
        tar czf "/backup/pg_volume_${DATE}.tar.gz" -C /pgdata .
    ok "Volume exportado: $(du -sh ${WORK_DIR}/volume/pg_volume_${DATE}.tar.gz | cut -f1)"
else
    warn "Nenhum volume nomeado encontrado para este container. Pulando volume."
fi

# ── 4. CONFIGS DO COOLIFY ─────────────────────────────────────────────────────
titulo "4/4 — CONFIGURAÇÕES DO COOLIFY"

if [ -d "/data/coolify" ]; then
    tar czf "${WORK_DIR}/configs/coolify_${DATE}.tar.gz" \
        /data/coolify/ 2>/dev/null \
        && ok "Coolify configs salvas" \
        || warn "Coolify configs — falha parcial (não crítico)"
else
    warn "/data/coolify não encontrado. Pulando."
fi

# Salvar lista de containers em execução
docker ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}" \
    > "${WORK_DIR}/configs/docker_containers_${DATE}.txt"
ok "Lista de containers salva"

# ── EMPACOTAR ─────────────────────────────────────────────────────────────────
titulo "EMPACOTANDO ARQUIVO FINAL"

info "Criando pacote final..."
tar czf "$OUTPUT" -C "$BACKUP_ROOT" "tmp_${DATE}/"
sha256sum "$OUTPUT" > "${OUTPUT}.sha256"
rm -rf "$WORK_DIR"

FINAL_SIZE=$(du -sh "$OUTPUT" | cut -f1)

# ── LIMPAR BACKUPS ANTIGOS ────────────────────────────────────────────────────
titulo "LIMPANDO BACKUPS ANTIGOS"

ls -t "${BACKUP_ROOT}"/conexa_backup_*.tar.gz 2>/dev/null | \
    tail -n +$((RETENTION + 1)) | xargs rm -f 2>/dev/null || true
ls -t "${BACKUP_ROOT}"/conexa_backup_*.tar.gz.sha256 2>/dev/null | \
    tail -n +$((RETENTION + 1)) | xargs rm -f 2>/dev/null || true

COUNT=$(ls "${BACKUP_ROOT}"/conexa_backup_*.tar.gz 2>/dev/null | wc -l)
ok "Backups armazenados: $COUNT (máximo: $RETENTION)"

# ── RESUMO FINAL ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   ✅  BACKUP CONCLUÍDO COM SUCESSO!               ║${NC}"
echo -e "${BOLD}${GREEN}╠═══════════════════════════════════════════════════╣${NC}"
printf "${GREEN}║${NC}  📁 Arquivo  : %-33s${GREEN}║${NC}\n" "$(basename $OUTPUT)"
printf "${GREEN}║${NC}  📏 Tamanho  : %-33s${GREEN}║${NC}\n" "$FINAL_SIZE"
printf "${GREEN}║${NC}  🗄️  Banco    : %-33s${GREEN}║${NC}\n" "$DB_NAME ($DB_SIZE)"
printf "${GREEN}║${NC}  📊 Registros: %-33s${GREEN}║${NC}\n" "$TOTAL registros"
printf "${GREEN}║${NC}  📂 Local    : %-33s${GREEN}║${NC}\n" "$BACKUP_ROOT"
echo -e "${BOLD}${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

echo "✅ Backup OK: $OUTPUT ($FINAL_SIZE) — $TOTAL registros" >> "$LOG"
echo "===== FIM $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG"

echo "📋 Backups disponíveis:"
ls -lh "${BACKUP_ROOT}"/conexa_backup_*.tar.gz 2>/dev/null || true
