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

  # ── Tratamento de falha de SQL na migration (P3018, "already exists", ────────
  # "relation does not exist", etc.) ────────────────────────────────────────────
  #
  # INCIDENTE 2026-08-13 (Planejamentos não carregavam/salvavam em produção):
  # esta função chegou a marcar automaticamente, via
  # `prisma migrate resolve --applied`, migrations que tinham falhado com
  # 42P01 ("relation does not exist" — nome de tabela ERRADO no SQL da
  # migration, não "já existe"). Isso mentia pro Prisma que a migration
  # tinha rodado com sucesso, sem o ALTER TABLE/CREATE TABLE terem de fato
  # acontecido — e como o Prisma nunca reexecuta uma migration marcada como
  # aplicada, isso deixou colunas críticas de "Planning" (observacoes_template
  # e outras) permanentemente ausentes no banco, mesmo com o deploy "verde".
  # Esse padrão de "resolver --applied automático sem confirmar que o DDL
  # rodou" é exatamente o mesmo incidente já documentado antes neste projeto
  # (ver comentário da migration 20260813040000_repair_planning_observacoes
  # _template). Por isso, a partir de agora, NENHUMA falha de SQL é resolvida
  # automaticamente — o deploy para e mostra instruções claras, para que a
  # causa real seja corrigida (SQL da migration, nome de tabela, etc.) em vez
  # de mascarada.
  if [ $MIGRATE_EXIT -ne 0 ]; then
    local FAILED_MIG
    FAILED_MIG=$(extract_migration_name "$MIGRATE_OUTPUT")
    if [ -z "$FAILED_MIG" ]; then
      FAILED_MIG=$(psql "$DATABASE_URL" -t -A \
        -c "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1;" \
        2>/dev/null | grep -v "^$" || true)
    fi

    echo ""
    echo "❌ ERRO: prisma migrate deploy falhou (exit $MIGRATE_EXIT)."
    if [ -n "$FAILED_MIG" ]; then
      echo "   Migration com problema: '$FAILED_MIG'"
    fi
    echo ""
    echo "   Este entrypoint NÃO resolve falhas de migration automaticamente"
    echo "   (marcar como aplicada sem o SQL ter rodado de verdade já causou"
    echo "   um incidente de produção neste projeto — ver histórico de"
    echo "   20260813040000_repair_planning_observacoes_template)."
    echo ""
    echo "   Para corrigir manualmente:"
    echo "   1. Leia a mensagem de erro completa acima (procure por SQLSTATE"
    echo "      como 42P01 'relation does not exist' ou 42701/42P07 'already"
    echo "      exists') e o nome exato da migration."
    echo "   2. Se for 'relation does not exist': o SQL da migration referencia"
    echo "      um nome de tabela errado (confira @@map no schema.prisma) ou"
    echo "      tenta alterar uma tabela antes dela ter sido criada por uma"
    echo "      migration anterior — corrija o arquivo migration.sql."
    echo "   3. Se for 'already exists' e você confirmar manualmente (via"
    echo "      psql) que a estrutura já existe de fato e está correta, use o"
    echo "      subcomando do Prisma CLI para marcar essa migration específica"
    echo "      como já aplicada (consulte 'prisma migrate resolve' na"
    echo "      documentação oficial do Prisma), passando \"$FAILED_MIG\" como"
    echo "      nome da migration."
    echo "   4. Depois, refaça o deploy."
    echo ""
    exit 1
  fi
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

# ── Passo 3: Executar correção operacional idempotente de acessos ─────────────
run_operational_access_fix

# ── Passo 2.5: Validando schema runtime de Planning ───────────────────────────
# Checagem direta via psql (não depende do Prisma Client) logo após as
# migrations, para travar o deploy AQUI se "migrate deploy" reportou sucesso
# mas o DDL real não aconteceu — em vez de deixar o container subir e falhar
# só quando um usuário tentar carregar/salvar um planejamento.
echo "Validando schema runtime de Planning..."
PLANNING_CHECK=$(psql "$DATABASE_URL" -t -A -c "
  SELECT
    (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Planning' AND column_name='observacoes_template'))::text || '|' ||
    (SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid=(SELECT oid FROM pg_type WHERE typname='PlanningType') AND enumlabel='QUINZENAL'))::text;
" 2>&1) || PLANNING_CHECK="erro|erro"

if [ "$PLANNING_CHECK" != "t|t" ]; then
  echo "❌ ERRO: schema de Planning incompleto no banco após migrate deploy (observacoes_template/QUINZENAL: $PLANNING_CHECK)."
  echo "   Isso significa que alguma migration foi marcada como aplicada sem o DDL ter rodado de fato."
  echo "   Deploy abortado para não subir a API servindo /plannings quebrado."
  exit 1
fi
echo "✅ Schema de Planning validado."

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
