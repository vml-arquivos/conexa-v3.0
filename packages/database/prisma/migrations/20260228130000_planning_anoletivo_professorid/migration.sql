-- Migration: 20260228130000_planning_anoletivo_professorid
-- Adiciona campos anoLetivo e professorId ao modelo Planning
-- Operação: ADITIVA (ALTER TABLE ADD COLUMN) — sem risco de perda de dados

-- Adicionar anoLetivo (ano letivo do planejamento, ex: 2026)
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "anoLetivo" INTEGER;

-- Adicionar professorId (ID do professor autor, redundante com createdBy para queries otimizadas)
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "professorId" TEXT;

-- Índice para facilitar queries por professor
CREATE INDEX IF NOT EXISTS "Planning_professorId_idx" ON "Planning"("professorId");

-- Índice para facilitar queries por ano letivo
CREATE INDEX IF NOT EXISTS "Planning_anoLetivo_idx" ON "Planning"("anoLetivo");

-- Backfill: popular anoLetivo com o ano de createdAt para registros existentes
UPDATE "Planning" SET "anoLetivo" = EXTRACT(YEAR FROM "createdAt") WHERE "anoLetivo" IS NULL;
