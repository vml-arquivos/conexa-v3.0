-- Migration: 20260406000000_add_planning_conferencia
-- Tipo: ADITIVA — não remove nem renomeia nada existente
-- Descrição: Cria enum PlanningConferenciaStatus e tabela PlanningConferencia
-- para suporte à Conferência do Planejamento (FEITO / PARCIAL / NAO_REALIZADO)
-- Autor: Manus AI
-- Data: 2026-04-06

-- 1. Criar enum PlanningConferenciaStatus (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'PlanningConferenciaStatus'
  ) THEN
    CREATE TYPE "PlanningConferenciaStatus" AS ENUM (
      'FEITO',
      'PARCIAL',
      'NAO_REALIZADO'
    );
  END IF;
END;
$$;

-- 2. Criar tabela PlanningConferencia (idempotente via IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "PlanningConferencia" (
  "id"              TEXT NOT NULL,
  "planningId"      TEXT NOT NULL,
  "mantenedoraId"   TEXT NOT NULL,
  "unitId"          TEXT NOT NULL,
  "classroomId"     TEXT NOT NULL,
  "professorId"     VARCHAR(255) NOT NULL,
  "dataConferencia" TIMESTAMP(3) NOT NULL,
  "status"          "PlanningConferenciaStatus" NOT NULL,
  "observacao"      TEXT,
  "justificativa"   TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlanningConferencia_pkey" PRIMARY KEY ("id")
);

-- 3. FK para Planning (ON DELETE CASCADE — se o planning for apagado, a conferência vai junto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PlanningConferencia_planningId_fkey'
  ) THEN
    ALTER TABLE "PlanningConferencia"
      ADD CONSTRAINT "PlanningConferencia_planningId_fkey"
      FOREIGN KEY ("planningId")
      REFERENCES "Planning"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END;
$$;

-- 4. Unique constraint: 1 conferência por planning por dia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PlanningConferencia_planningId_dataConferencia_key'
  ) THEN
    ALTER TABLE "PlanningConferencia"
      ADD CONSTRAINT "PlanningConferencia_planningId_dataConferencia_key"
      UNIQUE ("planningId", "dataConferencia");
  END IF;
END;
$$;

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS "PlanningConferencia_classroomId_idx"
  ON "PlanningConferencia"("classroomId");

CREATE INDEX IF NOT EXISTS "PlanningConferencia_professorId_idx"
  ON "PlanningConferencia"("professorId");

CREATE INDEX IF NOT EXISTS "PlanningConferencia_mantenedoraId_idx"
  ON "PlanningConferencia"("mantenedoraId");

CREATE INDEX IF NOT EXISTS "PlanningConferencia_dataConferencia_idx"
  ON "PlanningConferencia"("dataConferencia");
