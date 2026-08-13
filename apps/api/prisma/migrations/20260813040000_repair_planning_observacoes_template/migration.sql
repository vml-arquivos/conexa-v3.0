-- Repair migration (nova, com timestamp inédito): a migration
-- 20260812164500_repair_planning_runtime_schema já continha estes mesmos
-- comandos, mas ficou registrada em _prisma_migrations sem que as colunas
-- tivessem sido de fato criadas no banco de produção (drift confirmado nos
-- logs de runtime: P2022 "Planning.observacoes_template does not exist").
-- Como o Prisma não reexecuta uma migration já marcada como aplicada,
-- criamos esta com timestamp novo para garantir a execução real.
-- Totalmente aditiva e idempotente — repetir os comandos não causa dano.

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
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus')
        AND enumlabel = 'EM_REVISAO'
    ) THEN
      ALTER TYPE "PlanningStatus" ADD VALUE 'EM_REVISAO';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus')
        AND enumlabel = 'APROVADO'
    ) THEN
      ALTER TYPE "PlanningStatus" ADD VALUE 'APROVADO';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus')
        AND enumlabel = 'DEVOLVIDO'
    ) THEN
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
