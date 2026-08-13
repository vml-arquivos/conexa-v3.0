-- Migration: 20260531000000_add_observacoes_template_to_planning
-- Adiciona coluna observacoes_template ao model Planning
-- Aditiva, idempotente, zero impacto nos dados existentes
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "observacoes_template" JSONB;
