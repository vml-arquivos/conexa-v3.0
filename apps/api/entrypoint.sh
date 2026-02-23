#!/bin/bash
set -e

echo "=== Conexa-V3 Entrypoint ==="

# ── Validação de variáveis obrigatórias ──────────────────────────
echo "Validando variáveis de ambiente obrigatórias..."
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET")
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ ERRO: variável obrigatória '$VAR' não definida."
    exit 1
  fi
done
echo "✅ Variáveis de ambiente validadas."

# ── Resolver migrations FAILED via SQL direto (nome exato) ───────
echo "Verificando migrations com status FAILED no banco..."
FAILED=$(psql "$DATABASE_URL" -t -A -c "
  SELECT migration_name
  FROM \"_prisma_migrations\"
  WHERE finished_at IS NULL
    AND rolled_back_at IS NULL
    AND applied_steps_count > 0;
" 2>/dev/null || echo "")

if [ -n "$FAILED" ]; then
  echo "⚠️  Migrations FAILED encontradas. Resolvendo via SQL..."
  while IFS= read -r MIG; do
    [ -z "$MIG" ] && continue
    echo "  → Resolvendo: $MIG"
    psql "$DATABASE_URL" -c "
      UPDATE \"_prisma_migrations\"
      SET rolled_back_at = NOW()
      WHERE migration_name = '$MIG';
    " && echo "    ✅ Resolvido." || echo "    ⚠️  Falha ao resolver $MIG"
  done <<< "$FAILED"
else
  echo "✅ Nenhuma migration FAILED encontrada."
fi

# ── Aplicar migrations ────────────────────────────────────────────
echo "Executando prisma migrate deploy..."
if npx prisma migrate deploy; then
  echo "✅ Migrations aplicadas com sucesso."
else
  EXIT_CODE=$?
  echo "❌ ERRO: prisma migrate deploy falhou (exit $EXIT_CODE)."
  if [ "${MIGRATE_BEST_EFFORT:-false}" = "true" ]; then
    echo "⚠️  MIGRATE_BEST_EFFORT=true — continuando mesmo assim."
  else
    echo "Deploy abortado."
    exit 1
  fi
fi

# ── Iniciar aplicação ─────────────────────────────────────────────
echo "🚀 Iniciando aplicação..."
if [ -f /app/dist/src/main.js ]; then
  exec node /app/dist/src/main.js
elif [ -f /app/dist/main.js ]; then
  exec node /app/dist/main.js
else
  echo "❌ ERRO: entrypoint compilado não encontrado em /app/dist."
  ls -la /app/dist || true
  exit 1
fi
