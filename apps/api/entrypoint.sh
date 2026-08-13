#!/bin/bash
set -e

echo "=== Conexa-V3 Entrypoint ==="

# ── Validação de variáveis obrigatórias ──────────────────────────────────────
echo "Validando variáveis de ambiente obrigatórias..."
# DIRECT_URL é exigida porque prisma/schema.prisma declara
# `directUrl = env("DIRECT_URL")` no datasource — sem ela, "prisma migrate
# deploy" falha com um erro genérico "Environment variable not found"
# no meio do deploy. Validar aqui dá um erro claro antes de tocar no banco.
for VAR in DATABASE_URL DIRECT_URL JWT_SECRET; do
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
# ATENÇÃO: esta função marca migrations como "rolled_back_at = NOW()" no
# histórico do Prisma SEM verificar se as alterações de schema dessa migration
# foram de fato revertidas no banco. Isso já causou drift real em produção
# (ver 20260813040000_repair_planning_observacoes_template: uma migration
# ficou marcada como aplicada sem que as colunas existissem de fato).
# Pode ser desativada com AUTO_RESOLVE_FAILED_MIGRATIONS=false para forçar
# investigação manual antes do deploy em vez de resolução automática.
resolve_failed_migrations() {
  if [ "${AUTO_RESOLVE_FAILED_MIGRATIONS:-true}" != "true" ]; then
    echo "ℹ️  Resolução automática de migrations FAILED desativada (AUTO_RESOLVE_FAILED_MIGRATIONS=false)."
    echo "   Se o deploy falhar a seguir, investigue _prisma_migrations manualmente."
    return 0
  fi

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
  #
  # HISTÓRICO: esta função já automatizou "prisma migrate resolve --applied"
  # com base apenas no TEXTO do erro (ex: "already exists"), sem verificar se
  # TODAS as colunas/tabelas da migration realmente existiam. Isso já causou
  # drift real em produção — uma migration foi marcada como aplicada sem que
  # suas colunas tivessem sido criadas (ver
  # 20260813040000_repair_planning_observacoes_template). Por isso o deploy
  # agora FALHA aqui de propósito em vez de assumir automaticamente que está
  # tudo certo: exige que um humano confirme o estado real do banco antes de
  # marcar a migration como aplicada.
  if echo "$MIGRATE_OUTPUT" | grep -q "P3018\|already exists\|42P07\|42P01"; then
    local FAILED_MIG
    FAILED_MIG=$(extract_migration_name "$MIGRATE_OUTPUT")
    if [ -z "$FAILED_MIG" ]; then
      FAILED_MIG=$(psql "$DATABASE_URL" -t -A \
        -c "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1;" \
        2>/dev/null | grep -v "^$" || true)
    fi

    echo "❌ ERRO: P3018/already-exists detectado (migration: '${FAILED_MIG:-desconhecida}')."
    echo "   Deploy abortado intencionalmente. Este erro geralmente significa que a"
    echo "   migration foi aplicada parcialmente. Para resolver com segurança:"
    echo "     1. Rode 'npx prisma migrate status' e compare com o schema.prisma."
    echo "     2. Confirme manualmente (via psql) que TODAS as colunas/tabelas/"
    echo "        enums dessa migration já existem no banco de produção."
    echo "     3. Só então rode manualmente o comando de Prisma Migrate que marca"
    echo "        uma migration como já aplicada (subcomando 'migrate', flag"
    echo "        'resolve --applied', com o nome da migration acima)."
    echo "     4. Refaça o deploy."
    exit 1
  fi

  # Erro diferente de P3009/P3018
  echo "❌ ERRO: prisma migrate deploy falhou (exit $MIGRATE_EXIT). Deploy abortado."
  exit 1
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

# ── Passo 1: Resolver migrations FAILED via SQL ───────────────────────────────
resolve_failed_migrations

# ── Passo 2: Aplicar migrations (com retry inteligente em P3009 e P3018) ──────
run_migrate_deploy

# Sempre imprimir o status final de migrations no log do deploy — mesmo em
# caminho de sucesso — para dar visibilidade caso alguma resolução automática
# (Passo 1 acima) tenha sido acionada. Não falha o deploy se o comando em si
# der erro (apenas informativo).
echo "Status final das migrations (informativo):"
npx prisma migrate status || echo "  ⚠️  Não foi possível obter o status das migrations."

# ── Passo 2.5: Validando schema runtime de Planning ───────────────────────────
# Checagem direta no Postgres (não depende do Prisma Client) para o drift que
# já causou incidente em produção: enum PlanningType sem QUINZENAL, ou coluna
# Planning.observacoes_template ausente mesmo com "migrate deploy" tendo
# retornado sucesso (ou tendo sido contornado no Passo 1). Sem isso, o deploy
# seguia em frente e o erro só aparecia depois, na primeira requisição real.
echo "Validando schema runtime de Planning..."
PLANNING_SCHEMA_OK=$(psql "$DATABASE_URL" -t -A -c "
  SELECT (
    EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningType')
      AND enumlabel = 'QUINZENAL'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Planning' AND column_name = 'observacoes_template'
    )
  );" 2>/dev/null || echo "f")
if [ "$PLANNING_SCHEMA_OK" != "t" ]; then
  echo "❌ ERRO: schema runtime de Planning inconsistente (enum QUINZENAL e/ou"
  echo "   coluna observacoes_template ausentes no banco). Deploy abortado antes"
  echo "   de iniciar a aplicação, para não servir tráfego com um banco divergente"
  echo "   do Prisma Client. Investigue manualmente antes de tentar novamente."
  exit 1
fi
echo "✅ Schema runtime de Planning validado (QUINZENAL + observacoes_template presentes)."

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
