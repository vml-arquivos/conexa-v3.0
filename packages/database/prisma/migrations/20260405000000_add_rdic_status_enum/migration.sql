-- ============================================================
-- Migration: Adiciona enum RdicStatus e atualiza DevelopmentReport.status
-- Branch: feat/rdic-status-enum-bimestre-fix
-- Data: 2026-04-05
-- Operações: CREATE TYPE, ALTER TABLE (sem DROP, DELETE, TRUNCATE)
-- ============================================================

-- 1. Criar o tipo enum RdicStatus
CREATE TYPE "RdicStatus" AS ENUM (
  'RASCUNHO',
  'EM_REVISAO',
  'DEVOLVIDO',
  'APROVADO',
  'FINALIZADO',
  'PUBLICADO'
);

-- 2. Adicionar coluna temporária com o novo tipo
ALTER TABLE "DevelopmentReport"
  ADD COLUMN "status_new" "RdicStatus" NOT NULL DEFAULT 'RASCUNHO';

-- 3. Migrar dados existentes: mapear DRAFT → RASCUNHO (e qualquer outro valor → RASCUNHO)
UPDATE "DevelopmentReport"
  SET "status_new" = CASE
    WHEN "status" = 'RASCUNHO'   THEN 'RASCUNHO'::"RdicStatus"
    WHEN "status" = 'EM_REVISAO' THEN 'EM_REVISAO'::"RdicStatus"
    WHEN "status" = 'DEVOLVIDO'  THEN 'DEVOLVIDO'::"RdicStatus"
    WHEN "status" = 'APROVADO'   THEN 'APROVADO'::"RdicStatus"
    WHEN "status" = 'FINALIZADO' THEN 'FINALIZADO'::"RdicStatus"
    WHEN "status" = 'PUBLICADO'  THEN 'PUBLICADO'::"RdicStatus"
    ELSE 'RASCUNHO'::"RdicStatus"
  END;

-- 4. Remover coluna antiga (String) e renomear a nova
ALTER TABLE "DevelopmentReport" DROP COLUMN "status";
ALTER TABLE "DevelopmentReport" RENAME COLUMN "status_new" TO "status";
