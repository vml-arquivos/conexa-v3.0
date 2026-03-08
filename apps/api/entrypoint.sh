#!/bin/bash
set -e

echo "=== Conexa-V3 Entrypoint ==="

# ── Validação de variáveis obrigatórias ──────────────────────────────────────
echo "Validando variáveis de ambiente obrigatórias..."
for VAR in DATABASE_URL JWT_SECRET; do
  if [ -z "${!VAR:-}" ]; then
    echo "❌ ERRO: variável obrigatória '$VAR' não definida."
    exit 1
  fi
done
echo "✅ Variáveis de ambiente validadas."

# ── Função: verificar se a tabela _prisma_migrations existe ──────────────────
table_exists() {
  psql "$DATABASE_URL" -t -A -c \
    "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;" \
    2>/dev/null | grep -q "t"
}

# ── Função: resolver todas as migrations FAILED (sem filtro de steps) ────────
resolve_failed_migrations() {
  echo "Verificando migrations com status FAILED no banco..."

  if ! table_exists; then
    echo "  ℹ️  Tabela _prisma_migrations ainda não existe (DB zerado). Pulando resolução."
    return 0
  fi

  # Condição correta: finished_at IS NULL AND rolled_back_at IS NULL
  # NÃO filtra por applied_steps_count — migration pode falhar com steps=0
  local FAILED
  FAILED=$(psql "$DATABASE_URL" -t -A \
    -c "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL;" \
    2>&1)

  if [ $? -ne 0 ]; then
    echo "  ⚠️  Erro ao consultar _prisma_migrations: $FAILED"
    return 0
  fi

  FAILED=$(echo "$FAILED" | grep -v "^$" || true)

  if [ -z "$FAILED" ]; then
    echo "✅ Nenhuma migration FAILED encontrada."
    return 0
  fi

  echo "⚠️  Migrations FAILED encontradas. Resolvendo via SQL..."
  while IFS= read -r MIG; do
    [ -z "$MIG" ] && continue
    echo "  → Resolvendo migration FAILED: '$MIG'"
    local RESULT
    RESULT=$(psql "$DATABASE_URL" -c \
      "UPDATE \"_prisma_migrations\" SET rolled_back_at = NOW() WHERE migration_name = '$MIG' AND rolled_back_at IS NULL;" \
      2>&1)
    if echo "$RESULT" | grep -q "UPDATE [1-9]"; then
      echo "    ✅ Migration '$MIG' marcada como rolled-back."
    else
      echo "    ⚠️  Resultado inesperado para '$MIG': $RESULT"
    fi
  done <<< "$FAILED"
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

# ── Função: executar migrate deploy com retry automático em P3009 e P3018 ─────
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

  # ── Tratamento P3018: migration falhou com erro de SQL (objeto já existe) ─────
  # P3018 ocorre quando o SQL da migration falha (ex: "already exists").
  # Estratégia: verificar se os objetos críticos já existem no banco.
  # Se sim, a migration já foi aplicada parcialmente e podemos marcá-la como
  # aplicada via "migrate resolve --applied" para que o Prisma não tente re-executar.
  if echo "$MIGRATE_OUTPUT" | grep -q "P3018\|already exists\|42P07\|42P01"; then
    echo "⚠️  P3018/already-exists detectado. Verificando se estrutura já existe no banco..."

    local FAILED_MIG
    FAILED_MIG=$(extract_migration_name "$MIGRATE_OUTPUT")

    if [ -z "$FAILED_MIG" ]; then
      # Fallback: buscar no banco qual migration está em estado pendente/failed
      FAILED_MIG=$(psql "$DATABASE_URL" -t -A \
        -c "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1;" \
        2>/dev/null | grep -v "^$" || true)
    fi

    if [ -n "$FAILED_MIG" ]; then
      echo "  → Migration com problema: '$FAILED_MIG'"
      echo "  → Marcando como aplicada via 'prisma migrate resolve --applied'..."

      set +e
      RESOLVE_OUTPUT=$(npx prisma migrate resolve --applied "$FAILED_MIG" 2>&1)
      RESOLVE_EXIT=$?
      set -e

      echo "$RESOLVE_OUTPUT"

      if [ $RESOLVE_EXIT -eq 0 ]; then
        echo "  ✅ Migration '$FAILED_MIG' marcada como aplicada."
        echo "  → Retentando prisma migrate deploy (1 retry após P3018)..."

        set +e
        MIGRATE_OUTPUT=$(npx prisma migrate deploy 2>&1)
        MIGRATE_EXIT=$?
        set -e

        echo "$MIGRATE_OUTPUT"

        if [ $MIGRATE_EXIT -eq 0 ]; then
          echo "✅ Migrations aplicadas com sucesso (após resolve P3018)."
          return 0
        else
          echo "❌ ERRO: prisma migrate deploy falhou novamente após resolve P3018 (exit $MIGRATE_EXIT)."
          echo "   Verifique os logs acima para detalhes."
          exit 1
        fi
      else
        echo "  ⚠️  Falha ao executar migrate resolve: $RESOLVE_OUTPUT"
        echo "❌ ERRO: não foi possível resolver a migration P3018. Deploy abortado."
        exit 1
      fi
    else
      echo "  ⚠️  Não foi possível identificar a migration com problema."
      echo "❌ ERRO: prisma migrate deploy falhou com P3018 mas não foi possível identificar a migration."
      exit 1
    fi
  fi

  # Erro diferente de P3009/P3018
  echo "❌ ERRO: prisma migrate deploy falhou (exit $MIGRATE_EXIT). Deploy abortado."
  exit 1
}

# ── Passo 1: Resolver migrations FAILED via SQL ───────────────────────────────
resolve_failed_migrations

# ── Passo 2: Aplicar migrations (com retry inteligente em P3009 e P3018) ──────
run_migrate_deploy

# ── Passo 3: Iniciar aplicação NestJS ─────────────────────────────────────────
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
