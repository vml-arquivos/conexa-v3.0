-- CreateEnum
CREATE TYPE "RdicPeriodo" AS ENUM ('PRIMEIRO_BIMESTRE', 'SEGUNDO_BIMESTRE', 'TERCEIRO_BIMESTRE', 'QUARTO_BIMESTRE', 'PRIMEIRO_TRIMESTRE', 'SEGUNDO_TRIMESTRE', 'TERCEIRO_TRIMESTRE');

-- AlterTable
ALTER TABLE "RDIXInstancia" ADD COLUMN     "periodoEnum" "RdicPeriodo";

-- CreateIndex
CREATE INDEX "RDIXInstancia_periodoEnum_idx" ON "RDIXInstancia"("periodoEnum");

-- =============================================================================
-- Mapeamento seguro de strings legadas para o enum RdicPeriodo
-- REGRA: ZERO DESTRUIÇÃO — apenas UPDATE onde periodoEnum IS NULL
-- =============================================================================
UPDATE "RDIXInstancia"
SET "periodoEnum" = CASE
  WHEN "periodo" ILIKE '%1º Bimestre%' OR "periodo" ILIKE '%primeiro bimestre%'
    THEN 'PRIMEIRO_BIMESTRE'::"RdicPeriodo"
  WHEN "periodo" ILIKE '%2º Bimestre%' OR "periodo" ILIKE '%segundo bimestre%'
    THEN 'SEGUNDO_BIMESTRE'::"RdicPeriodo"
  WHEN "periodo" ILIKE '%3º Bimestre%' OR "periodo" ILIKE '%terceiro bimestre%'
    THEN 'TERCEIRO_BIMESTRE'::"RdicPeriodo"
  WHEN "periodo" ILIKE '%4º Bimestre%' OR "periodo" ILIKE '%quarto bimestre%'
    THEN 'QUARTO_BIMESTRE'::"RdicPeriodo"
  WHEN "periodo" ILIKE '%1º Trimestre%' OR "periodo" ILIKE '%primeiro trimestre%'
    THEN 'PRIMEIRO_TRIMESTRE'::"RdicPeriodo"
  WHEN "periodo" ILIKE '%2º Trimestre%' OR "periodo" ILIKE '%segundo trimestre%'
    THEN 'SEGUNDO_TRIMESTRE'::"RdicPeriodo"
  WHEN "periodo" ILIKE '%3º Trimestre%' OR "periodo" ILIKE '%terceiro trimestre%'
    THEN 'TERCEIRO_TRIMESTRE'::"RdicPeriodo"
  ELSE NULL
END
WHERE "periodoEnum" IS NULL;
