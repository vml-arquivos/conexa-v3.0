#!/bin/bash
set -e

echo "=== Conexa-V3 Entrypoint ==="

# ── Validação de variáveis obrigatórias ──────────────────────────────────────
echo "Validando variáveis de ambiente obrigatórias..."
for VAR in DATABASE_URL DIRECT_URL JWT_SECRET JWT_REFRESH_SECRET; do
  if [ -z "${!VAR:-}" ]; then
    echo "❌ ERRO: variável obrigatória '$VAR' não definida."
    exit 1
  fi
done
echo "✅ Variáveis de ambiente validadas."

# ── Guarda de consistência: runtime e migrations devem usar o mesmo banco ───
# Sem esta validação, Prisma pode aplicar migrations em um banco e a API
# consultar outro, produzindo P2022/P2021 mesmo com o deploy aparentemente verde.
if [ "${NODE_ENV:-production}" = "production" ]; then
  echo "Validando que DATABASE_URL e DIRECT_URL apontam para o mesmo banco..."
  set +e
  runtime_db=$(psql "$DATABASE_URL" -Atqc 'SELECT current_database();' 2>/dev/null)
  runtime_exit=$?
  direct_db=$(psql "$DIRECT_URL" -Atqc 'SELECT current_database();' 2>/dev/null)
  direct_exit=$?
  set -e

  if [ "$runtime_exit" -ne 0 ] || [ "$direct_exit" -ne 0 ] || [ -z "$runtime_db" ] || [ -z "$direct_db" ]; then
    echo "❌ ERRO: não foi possível identificar os bancos de DATABASE_URL/DIRECT_URL."
    exit 1
  fi

  if [ "$runtime_db" != "$direct_db" ]; then
    echo "❌ ERRO: DATABASE_URL aponta para '$runtime_db', mas DIRECT_URL aponta para '$direct_db'."
    echo "❌ Runtime e migrations devem usar o mesmo banco. Deploy abortado para proteger os dados."
    exit 1
  fi

  echo "✅ Banco consistente: $runtime_db"
fi

# ── Função: executar migrations com falha explícita ─────────────────────────
run_migrate_deploy() {
  echo "Executando prisma migrate deploy..."

  local migrate_output
  local migrate_exit

  set +e
  migrate_output=$(npx prisma migrate deploy 2>&1)
  migrate_exit=$?
  set -e

  echo "$migrate_output"

  if [ "$migrate_exit" -eq 0 ]; then
    echo "✅ Migrations aplicadas com sucesso."
    return 0
  fi

  echo "❌ ERRO: prisma migrate deploy falhou (exit $migrate_exit)."
  echo "❌ Nenhuma migration foi marcada automaticamente como aplicada ou revertida."
  echo "❌ Corrija a migration/estado do banco explicitamente antes de tentar novamente."
  exit "$migrate_exit"
}

# ── Função: executar correção operacional de acessos no deploy ────────────────
run_operational_access_fix() {
  local ACCESS_FIX_SQL="/app/prisma/manual-sql/correcao-acessos-operacionais/04_auto_deploy_corrigir_acessos_operacionais.sql"

  if [ "${RUN_ACCESS_FIX_ON_DEPLOY:-true}" != "true" ]; then
    echo "ℹ️  Correção operacional de acessos desativada por RUN_ACCESS_FIX_ON_DEPLOY=${RUN_ACCESS_FIX_ON_DEPLOY:-}."
    return 0
  fi

  if [ ! -f "$ACCESS_FIX_SQL" ]; then
    echo "⚠️  SQL de correção operacional não encontrado em $ACCESS_FIX_SQL. Pulando."
    return 0
  fi

  echo "🔐 Executando correção operacional idempotente de acessos..."
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ACCESS_FIX_SQL"; then
    echo "✅ Correção operacional de acessos concluída."
  else
    echo "⚠️  Correção operacional de acessos falhou; aplicação continuará para não derrubar o serviço. Verifique os logs do deploy."
    return 0
  fi
}

# ── Passo 1: Não resolver migrations automaticamente ──────────────────────────
# O estado FAILED deve permanecer visível para diagnóstico e correção explícita.
echo "🔎 Migrations FAILED serão preservadas para diagnóstico; nenhuma será marcada como aplicada automaticamente."

# ── Passo 2: Aplicar migrations com falha explícita em caso de drift ──────────
run_migrate_deploy

# ── Passo 2.5: Validar schema runtime de Planning antes de receber tráfego ────
# Esta checagem usa psql, não o Prisma Client, e impede que um deploy verde
# esconda DDL que não foi aplicado fisicamente no banco runtime.
echo "Validando schema runtime de Planning..."
PLANNING_CHECK=$(psql "$DATABASE_URL" -t -A -v ON_ERROR_STOP=1 -c "
  SELECT
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Planning' AND column_name='observacoes_template'))::text || '|' ||
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Planning' AND column_name='anoLetivo'))::text || '|' ||
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Child' AND column_name='dados_responsaveis'))::text || '|' ||
    (SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid=(SELECT oid FROM pg_type WHERE typname='PlanningType') AND enumlabel='QUINZENAL'))::text;
")

if [ "$PLANNING_CHECK" != "t|t|t|t" ]; then
  echo "❌ ERRO: schema runtime incompleto após migrate deploy (observacoes_template/anoLetivo/Child.dados_responsaveis/QUINZENAL: $PLANNING_CHECK)."
  echo "❌ Deploy abortado para não subir a API servindo Planning ou Child quebrados."
  exit 1
fi
echo "✅ Schema runtime de Planning/Child validado."

# ── Passo 3: Executar correção operacional idempotente de acessos ─────────────
run_operational_access_fix

# ── Passo 4: Regenerar Prisma client com o schema atual ──────────────────────
# CRÍTICO: o Prisma client é gerado no build, mas novas migrations podem adicionar
# modelos que o client buildado não conhece (ex: MaterialRequestItem, Material).
# Sem este passo, qualquer 'include' em relações novas lança PrismaClientValidationError → 500.
echo "Regenerando Prisma client com schema atual..."
npx prisma generate --schema=./prisma/schema.prisma
echo "✅ Prisma client regenerado."

# ── Passo 5: Popular banco de alimentos (idempotente) ─────────────────────────
# Executa o seed de alimentos a cada deploy — é idempotente (upsert por nome).
# Garante que novos alimentos adicionados ao CSV sejam inseridos automaticamente.
if [ -f /app/scripts/seed-alimentos.js ]; then
  echo "🥗 Populando banco de alimentos..."
  node /app/scripts/seed-alimentos.js && echo "✅ Banco de alimentos atualizado." || echo "⚠️  Seed de alimentos falhou (não crítico — aplicação continuará)."
fi

# ── Passo 6.5: Importar dados de responsáveis das planilhas (idempotente) ─────
# Preenche dados_responsaveis (CPF, celular, telefone, endereço da mãe/pai/resp),
# além de tipo sanguíneo/endereço/CEP da criança quando vazios.
# É idempotente: nunca sobrescreve dados já preenchidos, pode rodar a cada deploy.
# Controlável por RUN_IMPORT_RESPONSAVEIS_ON_DEPLOY (default: true).
if [ "${RUN_IMPORT_RESPONSAVEIS_ON_DEPLOY:-true}" = "true" ]; then
  IMPORT_SCRIPT=""
  if [ -f /app/dist/src/scripts/import-dados-responsaveis.js ]; then
    IMPORT_SCRIPT=/app/dist/src/scripts/import-dados-responsaveis.js
  elif [ -f /app/dist/scripts/import-dados-responsaveis.js ]; then
    IMPORT_SCRIPT=/app/dist/scripts/import-dados-responsaveis.js
  fi
  if [ -n "$IMPORT_SCRIPT" ]; then
    echo "📋 Importando dados de responsáveis (idempotente)..."
    node "$IMPORT_SCRIPT" || echo "⚠️  Import de responsáveis falhou (não crítico — aplicação continuará)."
  else
    echo "ℹ️  Script de import de responsáveis não encontrado em dist — pulando."
  fi
else
  echo "ℹ️  Import de responsáveis desativado por RUN_IMPORT_RESPONSAVEIS_ON_DEPLOY."
fi

# ── Passo 7: Iniciar aplicação NestJS ─────────────────────────────────────────
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
