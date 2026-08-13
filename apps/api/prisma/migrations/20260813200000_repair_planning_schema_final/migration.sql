-- Reparação final e idempotente do schema de Planning.
-- Necessária quando migrations anteriores foram marcadas como aplicadas
-- sem que os objetos correspondentes fossem criados fisicamente.
--
-- Os enums existem desde as migrations estruturais anteriores. O IF NOT EXISTS
-- torna a operação segura caso algum valor já tenha sido aplicado manualmente.
ALTER TYPE "PlanningType" ADD VALUE IF NOT EXISTS 'QUINZENAL' AFTER 'SEMANAL';
ALTER TYPE "PlanningStatus" ADD VALUE IF NOT EXISTS 'EM_REVISAO';
ALTER TYPE "PlanningStatus" ADD VALUE IF NOT EXISTS 'APROVADO';
ALTER TYPE "PlanningStatus" ADD VALUE IF NOT EXISTS 'DEVOLVIDO';

-- Apenas adições nullable: nenhum dado existente é removido ou sobrescrito.
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "reviewedBy" VARCHAR(255);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "anoLetivo" INTEGER;
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "professorId" VARCHAR(255);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "observacoes_template" JSONB;

CREATE INDEX IF NOT EXISTS "Planning_professorId_idx" ON "Planning"("professorId");
CREATE INDEX IF NOT EXISTS "Planning_anoLetivo_idx" ON "Planning"("anoLetivo");
