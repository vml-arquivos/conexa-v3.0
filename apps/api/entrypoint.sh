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
