-- Repair migration: garante que o schema de Planning usado em runtime esteja
-- alinhado ao Prisma Client. Totalmente aditiva e idempotente.

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
