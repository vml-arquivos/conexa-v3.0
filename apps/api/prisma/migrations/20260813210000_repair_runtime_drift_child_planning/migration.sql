-- Reparação aditiva do schema runtime identificado no banco operacional.
--
-- O banco usado pela API possui o histórico de migrations, mas não contém
-- fisicamente algumas colunas opcionais presentes no Prisma schema. Todas as
-- operações abaixo são idempotentes e não removem, sobrescrevem ou transformam
-- dados existentes.

ALTER TYPE "PlanningType" ADD VALUE IF NOT EXISTS 'QUINZENAL' AFTER 'SEMANAL';
ALTER TYPE "PlanningStatus" ADD VALUE IF NOT EXISTS 'EM_REVISAO';
ALTER TYPE "PlanningStatus" ADD VALUE IF NOT EXISTS 'APROVADO';
ALTER TYPE "PlanningStatus" ADD VALUE IF NOT EXISTS 'DEVOLVIDO';

ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "reviewedBy" VARCHAR(255);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "anoLetivo" INTEGER;
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "professorId" VARCHAR(255);
ALTER TABLE IF EXISTS "Planning" ADD COLUMN IF NOT EXISTS "observacoes_template" JSONB;

CREATE INDEX IF NOT EXISTS "Planning_professorId_idx" ON "Planning"("professorId");
CREATE INDEX IF NOT EXISTS "Planning_anoLetivo_idx" ON "Planning"("anoLetivo");

ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "nacionalidade" VARCHAR(100);
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "naturalidade" VARCHAR(100);
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "uf_nascimento" VARCHAR(2);
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "endereco" VARCHAR(255);
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "cep" VARCHAR(10);
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "dados_responsaveis" JSONB;
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "documentos_matricula" JSONB;
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "autorizados_retirada" JSONB;
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "transporte_escolar" JSONB;
ALTER TABLE IF EXISTS "Child" ADD COLUMN IF NOT EXISTS "ficha_administrativa" JSONB;

ALTER TABLE IF EXISTS "DevelopmentObservation"
  ADD COLUMN IF NOT EXISTS "tags" TEXT[];
