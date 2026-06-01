-- AlterTable: adicionar campo observacoes_template no modelo Planning
-- Campo Json? (opcional) — migration aditiva, zero impacto nos dados existentes
-- NOTA: tabela usa nome "Planning" com P maiúsculo (sem @@map no schema.prisma)
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "observacoes_template" JSONB;
