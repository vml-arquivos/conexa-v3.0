#!/bin/bash
set -e

echo "=== Conexa-V3 Entrypoint ==="

# ── Validação de variáveis obrigatórias ──────────────────────────────────────
echo "Validando variáveis de ambiente obrigatórias..."
for VAR in DATABASE_URL DIRECT_URL JWT_SECRET; do
  if [ -z "${!VAR:-}" ]; then
    echo "❌ ERRO: variável obrigatória '$VAR' não definida."
    exit 1
  fi
done
echo "✅ Variáveis de ambiente validadas."

# ── Coerência básica entre banco de runtime e banco de migrations ───────────
# DATABASE_URL pode usar pooler e DIRECT_URL conexão direta, portanto host/porta
# podem ser diferentes. O nome lógico do banco, porém, precisa ser o mesmo.
echo "Validando coerência DATABASE_URL x DIRECT_URL..."
RUNTIME_DB=$(psql "$DATABASE_URL" -t -A -v ON_ERROR_STOP=1 -c "SELECT current_database();" 2>/dev/null) || {
  echo "❌ ERRO: não foi possível conectar ao DATABASE_URL de runtime."
  exit 1
}
DIRECT_DB=$(psql "$DIRECT_URL" -t -A -v ON_ERROR_STOP=1 -c "SELECT current_database();" 2>/dev/null) || {
  echo "❌ ERRO: não foi possível conectar ao DIRECT_URL de migrations."
  exit 1
}
if [ -z "$RUNTIME_DB" ] || [ -z "$DIRECT_DB" ] || [ "$RUNTIME_DB" != "$DIRECT_DB" ]; then
  echo "❌ ERRO: DATABASE_URL e DIRECT_URL apontam para bancos lógicos diferentes."
  echo "   Runtime DB: ${RUNTIME_DB:-indisponível}"
  echo "   Migration DB: ${DIRECT_DB:-indisponível}"
  echo "   Nenhuma migration será executada até corrigir as variáveis no Coolify."
  exit 1
fi
echo "✅ Runtime e migrations apontam para o mesmo banco lógico: $RUNTIME_DB"

# Além do nome, compara o histórico Prisma nos dois endpoints. Isso detecta o
# caso perigoso de duas instâncias PostgreSQL diferentes com o mesmo nome de DB.
RUNTIME_HAS_MIG=$(psql "$DATABASE_URL" -t -A -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" 2>/dev/null)
DIRECT_HAS_MIG=$(psql "$DIRECT_URL" -t -A -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" 2>/dev/null)
if [ "$RUNTIME_HAS_MIG" != "$DIRECT_HAS_MIG" ]; then
  echo "❌ ERRO: histórico Prisma diverge entre DATABASE_URL e DIRECT_URL."
  echo "   Nenhuma migration será executada."
  exit 1
fi
if [ "$RUNTIME_HAS_MIG" = "t" ]; then
  MIGRATION_FINGERPRINT_SQL="SELECT md5(COALESCE(string_agg(migration_name || ':' || COALESCE(finished_at::text,'FAILED') || ':' || COALESCE(rolled_back_at::text,''), '|' ORDER BY migration_name),'')) FROM _prisma_migrations;"
  RUNTIME_MIG_FP=$(psql "$DATABASE_URL" -t -A -v ON_ERROR_STOP=1 -c "$MIGRATION_FINGERPRINT_SQL" 2>/dev/null)
  DIRECT_MIG_FP=$(psql "$DIRECT_URL" -t -A -v ON_ERROR_STOP=1 -c "$MIGRATION_FINGERPRINT_SQL" 2>/dev/null)
  if [ -z "$RUNTIME_MIG_FP" ] || [ "$RUNTIME_MIG_FP" != "$DIRECT_MIG_FP" ]; then
    echo "❌ ERRO: DATABASE_URL e DIRECT_URL têm históricos de migrations diferentes."
    echo "   Nenhuma migration será executada até corrigir as conexões."
    exit 1
  fi
  echo "✅ Histórico Prisma consistente entre runtime e migrations."
fi

# ── Função: verificar se a tabela _prisma_migrations existe ──────────────────
table_exists() {
  psql "$DATABASE_URL" -t -A -c \
    "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" \
    2>/dev/null | grep -q "t"
}

# ── Função: diagnosticar migrations FAILED sem alterar histórico ──────────────
check_failed_migrations() {
  echo "Verificando migrations com status FAILED no banco..."

  if ! table_exists; then
    echo "  ℹ️  Tabela _prisma_migrations ainda não existe (DB zerado)."
    return 0
  fi

  local FAILED
  FAILED=$(psql "$DATABASE_URL" -t -A \
    -c "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL;" \
    2>/dev/null | grep -v "^$" || true)

  if [ -z "$FAILED" ]; then
    echo "✅ Nenhuma migration FAILED encontrada."
  else
    echo "⚠️  Migration FAILED detectada. O histórico NÃO será alterado automaticamente:"
    echo "$FAILED" | sed 's/^/  - /'
  fi
}

# ── Função: extrair nome da migration de output do Prisma ────────────────────
extract_migration_name() {
  local OUTPUT="$1"
  # Tenta padrão: "The `NOME` migration started at"
  local NAME
  NAME=$(echo "$OUTPUT" | grep -oP "(?<=The \`)[^\`]+" | head -1 || true)
  if [ -z "$NAME" ]; then
    # Tenta padrão alternativo: "migration `NOME`"
    NAME=$(echo "$OUTPUT" | grep -oP "(?<=migration \`)[^\`]+" | head -1 || true)
  fi
  echo "$NAME"
}

# ── Função: executar migrate deploy com retry controlado em P3009 ─────────────
run_migrate_deploy() {
  echo "Executando prisma migrate deploy..."

  local MIGRATE_OUTPUT
  local MIGRATE_EXIT

  # Captura stdout+stderr para poder inspecionar erros
  set +e
  MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
  MIGRATE_EXIT=$?
  set -e

  echo "$MIGRATE_OUTPUT"

  if [ $MIGRATE_EXIT -eq 0 ]; then
    echo "✅ Migrations aplicadas com sucesso."
    return 0
  fi

  # ── Tratamento P3009: migration em estado FAILED no banco ────────────────────
  if echo "$MIGRATE_OUTPUT" | grep -q "P3009"; then
    echo "⚠️  P3009 detectado. Extraindo migration FAILED do output do Prisma..."

    local FAILED_MIG
    FAILED_MIG=$(extract_migration_name "$MIGRATE_OUTPUT")

    if [ -n "$FAILED_MIG" ]; then
      echo "  → Migration FAILED identificada pelo Prisma: '$FAILED_MIG'"
      local RESULT
      RESULT=$(psql "$DATABASE_URL" -c \
        "UPDATE \"_prisma_migrations\" SET rolled_back_at = NOW() WHERE migration_name = '$FAILED_MIG' AND rolled_back_at IS NULL;" \
        2>&1)
      echo "    SQL result: $RESULT"
      echo "  → Retentando prisma migrate deploy (1 retry após P3009)..."

      set +e
      MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
      MIGRATE_EXIT=$?
      set -e

      echo "$MIGRATE_OUTPUT"

      if [ $MIGRATE_EXIT -eq 0 ]; then
        echo "✅ Migrations aplicadas com sucesso (após retry P3009)."
        return 0
      fi
      # Se ainda falhou, cai para os próximos tratamentos abaixo
    else
      echo "  ⚠️  Não foi possível extrair o nome da migration do output P3009."
    fi
  fi

  # ── Tratamento P3018: nunca marcar migration como aplicada sem prova ────────
  # A versão anterior usava `prisma migrate resolve --applied` automaticamente
  # quando encontrava "already exists". Isso pode registrar uma migration como
  # aplicada mesmo com colunas/índices ausentes, gerando schema drift e 500 em runtime.
  if echo "$MIGRATE_OUTPUT" | grep -q "P3018\|already exists\|42P07\|42P01"; then
    echo "❌ ERRO DE MIGRATION P3018/already-exists."
    echo "   Por segurança, o Conexa NÃO marca migrations como aplicadas automaticamente."
    echo "   O deploy foi abortado para impedir schema drift e perda de consistência."
    exit 1
  fi

  # Erro diferente de P3009/P3018
  echo "❌ ERRO: prisma migrate deploy falhou (exit $MIGRATE_EXIT). Deploy abortado."
  exit 1
}

# ── Passo 1: Diagnosticar migrations FAILED sem alterar histórico ────────────
check_failed_migrations

# ── Passo 2: Aplicar migrations (retry controlado apenas em P3009) ─────────────
run_migrate_deploy

# ── Passo 3: Regenerar Prisma client com o schema atual ──────────────────────
# CRÍTICO: o Prisma client é gerado no build, mas novas migrations podem adicionar
# modelos que o client buildado não conhece (ex: MaterialRequestItem, Material).
# Sem este passo, qualquer 'include' em relações novas lança PrismaClientValidationError → 500.
echo "Regenerando Prisma client com schema atual..."
npx prisma generate --schema=./prisma/schema.prisma
echo "✅ Prisma client regenerado."

# ── Passo 4: Validar schema de Planning no MESMO banco usado em runtime ───────
echo "Validando schema runtime de Planning..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c '
  SELECT
    "id", "mantenedoraId", "unitId", "classroomId", "templateId",
    "curriculumMatrixId", "title", "description", "type",
    "startDate", "endDate", "objectives", "activities", "resources",
    "evaluation", "bnccAreas", "curriculumAlignment", "pedagogicalContent",
    "observacoes_template", "status", "anoLetivo", "professorId",
    "createdAt", "updatedAt", "createdBy", "updatedBy", "publishedAt",
    "submittedAt", "reviewedAt", "reviewedBy", "reviewComment"
  FROM "Planning" LIMIT 0;
  SELECT '"'"'QUINZENAL'"'"'::"PlanningType";
  UPDATE "Planning" SET "updatedAt" = "updatedAt" WHERE FALSE;
' >/dev/null
echo "✅ Schema runtime de Planning validado (leitura + enum + permissão de escrita)."

# ── Passo 5: Popular banco de alimentos (idempotente) ─────────────────────────
# Executa o seed de alimentos a cada deploy — é idempotente (upsert por nome).
# Garante que novos alimentos adicionados ao CSV sejam inseridos automaticamente.
if [ -f /app/scripts/seed-alimentos.js ]; then
  echo "🥗 Populando banco de alimentos..."
  node /app/scripts/seed-alimentos.js && echo "✅ Banco de alimentos atualizado." || echo "⚠️  Seed de alimentos falhou (não crítico — aplicação continuará)."
fi

# ── Passo 6: Iniciar aplicação NestJS ─────────────────────────────────────────
echo "🚀 Iniciando aplicação..."
if [ -f /app/dist/src/main.js ]; then
  exec node /app/dist/src/main.js
elif [ -f /app/dist/main.js ]; then
  exec node /app/dist/main.js
else
  echo "❌ ERRO: entrypoint compilado não encontrado em /app/dist."
  ls -la /app/dist/ 2>/dev/null || true
  exit 1
fi
