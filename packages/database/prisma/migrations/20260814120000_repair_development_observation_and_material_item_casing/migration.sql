-- Repair migration — histórico de migrations tinha DUAS falhas de "relation
-- does not exist" (SQLSTATE 42P01) que o entrypoint.sh vinha mascarando
-- automaticamente com `prisma migrate resolve --applied` (ver correção em
-- entrypoint.sh). Isso significa que, mesmo com essas migrations marcadas
-- como "aplicadas" em _prisma_migrations, o SQL delas nunca rodou de
-- verdade. Esta migration nova (timestamp inédito — o Prisma nunca reexecuta
-- uma migration já marcada como aplicada) refaz esse trabalho, usando os
-- nomes de tabela CORRETOS desta vez. Totalmente aditiva e idempotente.
--
-- 1) "20260421000000_add_imagens_tags_indicadores_development_observation"
--    usava `ALTER TABLE "DevelopmentObservation"` (PascalCase), mas o model
--    tem @@map("development_observation") — a tabela real é minúscula.
-- 2) "20260813010000_add_missing_models_from_zellare" tinha o mesmo erro
--    numa das linhas, e por estar logo antes de
--    "20260813040000_repair_planning_observacoes_template" na ordem
--    cronológica, bloqueou a correção de Planning de chegar a rodar —
--    causa raiz do sintoma "planejamento não carrega nem salva".
-- 3) "20260223000000_sala_virtual_recados_observacoes" tentava alterar
--    "material_request_item" antes dessa tabela existir (ela só foi criada
--    em 20260307000000) — outra falha 42P01 histórica, sem relação com
--    Planning, mas corrigida aqui também para não deixar a mesma classe de
--    problema pendurada.
--
-- CONFIRMADO EM PRODUÇÃO (13/08, logs reais do container da API): o banco
-- efetivamente usado pela aplicação (dentro do mesmo container Postgres,
-- database "postgres" — não "postgres" o motor, o NOME do banco) estava
-- lançando exatamente P2022 em "Planning.observacoes_template" e também em
-- "Child.dados_responsaveis" — este último por causa de mais um erro de
-- casing na mesma migration quebrada (usava "dadosResponsaveis" quando o
-- campo tem @map("dados_responsaveis") no schema.prisma). Ambos corrigidos
-- abaixo.

-- ── development_observation (nome real, minúsculas) ─────────────────────────
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "atividade_arquivo_url" TEXT;
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "atividade_arquivo_nome" VARCHAR(255);
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "indicadores" JSONB NOT NULL DEFAULT '{}';

-- ── Child (colunas trazidas pela mesma migration quebrada) ──────────────────
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "endereco" VARCHAR(255);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "cep" VARCHAR(10);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "dados_responsaveis" JSONB;

-- ── MaterialRequestItem (nome real — sem @@map, é PascalCase) ───────────────
-- Nota: colunas "item"/"quantidade"/"unidade" não existem no schema.prisma
-- atual de MaterialRequestItem (usa productName/quantity/unit) — a migration
-- de Fev/2026 que tentava adicioná-las referenciava um modelo de dados que
-- não corresponde ao schema atual. Não recriamos essas colunas aqui para não
-- introduzir campos órfãos sem uso; se ainda forem necessárias, isso deve
-- ser decidido separadamente, não como parte do reparo de Planning.

-- ── Planning: reforço idempotente (safety net — caso a migration de reparo
-- anterior também tenha sido mascarada da mesma forma) ──────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanningType')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningType')
         AND enumlabel = 'QUINZENAL'
     ) THEN
    ALTER TYPE "PlanningType" ADD VALUE 'QUINZENAL' AFTER 'SEMANAL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanningStatus') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus') AND enumlabel = 'EM_REVISAO') THEN
      ALTER TYPE "PlanningStatus" ADD VALUE 'EM_REVISAO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus') AND enumlabel = 'APROVADO') THEN
      ALTER TYPE "PlanningStatus" ADD VALUE 'APROVADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus') AND enumlabel = 'DEVOLVIDO') THEN
      ALTER TYPE "PlanningStatus" ADD VALUE 'DEVOLVIDO';
    END IF;
  END IF;
END $$;

ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "reviewedBy" VARCHAR(255);
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "anoLetivo" INTEGER;
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "professorId" VARCHAR(255);
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "observacoes_template" JSONB;

CREATE INDEX IF NOT EXISTS "Planning_professorId_idx" ON "Planning"("professorId");
CREATE INDEX IF NOT EXISTS "Planning_anoLetivo_idx" ON "Planning"("anoLetivo");
