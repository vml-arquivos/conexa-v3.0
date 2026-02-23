#!/usr/bin/env sh
# NÃO usar set -e aqui — precisamos tratar erros manualmente para não abortar
# em passos de recuperação que podem retornar exit code != 0

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

# ─── Passo 1: Auto-resolver migrations com status FAILED (P3009 prevention) ──
# O Prisma bloqueia migrate deploy com P3009 se houver migration com
# finished_at=NULL e rolled_back_at=NULL. Usamos 'prisma migrate resolve'
# para marcar cada uma como rolled-back antes de tentar o deploy.
echo "Verificando migrations com status FAILED no banco..."

# Busca nomes de migrations FAILED via psql (disponível no container via DATABASE_URL)
# Fallback: se psql não estiver disponível, tenta via node script inline
FAILED_MIGRATIONS=""

if command -v psql > /dev/null 2>&1; then
  FAILED_MIGRATIONS=$(psql "$DATABASE_URL" -t -A -c \
    "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;" \
    2>/dev/null || true)
else
  # Fallback via node + @prisma/client direto no banco
  FAILED_MIGRATIONS=$(node -e "
const { execSync } = require('child_process');
try {
  const result = execSync(
    'npx prisma db execute --schema=$SCHEMA_PATH --stdin',
    { input: 'SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;', encoding: 'utf8' }
  );
  const lines = result.split('\n').filter(l => l.trim() && !l.startsWith('migration_name') && !l.startsWith('-'));
  console.log(lines.join('\n'));
} catch(e) { /* tabela pode não existir ainda — ok */ }
" 2>/dev/null || true)
fi

if [ -n "$FAILED_MIGRATIONS" ]; then
  echo "⚠️  Encontradas migrations FAILED. Resolvendo automaticamente..."
  for MIGRATION_NAME in $FAILED_MIGRATIONS; do
    echo "  → Resolvendo: $MIGRATION_NAME"
    npx prisma migrate resolve \
      --schema="$SCHEMA_PATH" \
      --rolled-back "$MIGRATION_NAME" \
      2>&1 || echo "  ⚠️  Não foi possível resolver $MIGRATION_NAME via CLI — continuando..."
  done
  echo "✅ Resolução de migrations FAILED concluída."
else
  echo "✅ Nenhuma migration FAILED encontrada."
fi
echo ""

# ─── Passo 2: Aplicar migrations pendentes ───────────────────────────────────
echo "Executando prisma migrate deploy..."
if npx prisma migrate deploy --schema="$SCHEMA_PATH"; then
  echo "✅ Migrations aplicadas com sucesso."
else
  MIGRATE_EXIT=$?
  echo "❌ ERRO: prisma migrate deploy falhou (exit $MIGRATE_EXIT)."
  echo ""
  if [ "${MIGRATE_BEST_EFFORT:-false}" = "true" ]; then
    echo "⚠️  MIGRATE_BEST_EFFORT=true: Subindo app mesmo assim."
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
  ls -la /app/dist || true
  exit 1
fi
