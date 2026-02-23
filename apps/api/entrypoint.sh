#!/usr/bin/env sh
set -eu

echo "=== Conexa-V3 Entrypoint ==="
echo "Validando variáveis de ambiente obrigatórias..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ ERRO: DATABASE_URL não definida no runtime."
  echo "Configure esta variável no Coolify (Environment Variables)."
  exit 1
fi

echo "✅ Variáveis de ambiente validadas."
echo ""

SCHEMA_PATH="prisma/schema.prisma"

# ─── Passo 1: Resolver migrations com status FAILED ──────────────────────────
# O Prisma bloqueia o deploy (P3009) se houver qualquer migration com rolled_back_at=NULL
# e applied_steps_count < total. Isso acontece quando uma migration falhou parcialmente.
# A correção segura é marcar essas migrations como rolled_back para que o Prisma
# as re-execute na próxima rodada de migrate deploy.
echo "Verificando migrations com status FAILED no banco..."
npx prisma db execute --schema="$SCHEMA_PATH" --stdin <<'SQL' || true
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND started_at IS NOT NULL;
SQL
echo "✅ Verificação de migrations FAILED concluída."
echo ""

# ─── Passo 2: Aplicar migrations pendentes ───────────────────────────────────
echo "Executando prisma migrate deploy..."
if npx prisma migrate deploy --schema="$SCHEMA_PATH"; then
  echo "✅ Migrations aplicadas com sucesso."
else
  echo "❌ ERRO: prisma migrate deploy falhou."
  echo ""
  echo "Possíveis causas:"
  echo "  1. DATABASE_URL incorreta"
  echo "  2. Banco de dados inacessível"
  echo "  3. Permissões insuficientes"
  echo "  4. Conflito de schema irrecuperável"
  echo ""
  if [ "${MIGRATE_BEST_EFFORT:-false}" = "true" ]; then
    echo "⚠️  MIGRATE_BEST_EFFORT=true: Subindo app mesmo assim (NÃO RECOMENDADO EM PRODUÇÃO)"
  else
    echo "Deploy abortado. Configure MIGRATE_BEST_EFFORT=true para subir mesmo com migrations falhando."
    exit 1
  fi
fi

# ─── Passo 3: Iniciar a aplicação NestJS ─────────────────────────────────────
echo ""
echo "Iniciando aplicação NestJS..."

if [ -f /app/dist/src/main.js ]; then
  echo "Path: node /app/dist/src/main.js"
  exec node /app/dist/src/main.js
elif [ -f /app/dist/main.js ]; then
  echo "Path: node /app/dist/main.js"
  exec node /app/dist/main.js
else
  echo "❌ ERRO: não encontrei o entrypoint compilado em /app/dist."
  echo "Conteúdo de /app/dist:"
  ls -la /app/dist || true
  exit 1
fi
