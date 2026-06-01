-- AlterTable: adicionar campo observacoes_template no modelo Planning
-- Campo Json? (opcional) — migration aditiva, zero impacto nos dados existentes
ALTER TABLE "planning" ADD COLUMN "observacoes_template" JSONB;
