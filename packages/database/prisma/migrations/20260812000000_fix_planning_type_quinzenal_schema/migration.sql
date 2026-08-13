-- Migration: 20260812000000_fix_planning_type_quinzenal_schema
-- Sincroniza o enum PlanningType com o banco.
-- Idempotente: só executa se QUINZENAL ainda não existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningType')
      AND enumlabel = 'QUINZENAL'
  ) THEN
    ALTER TYPE "PlanningType" ADD VALUE 'QUINZENAL' AFTER 'SEMANAL';
  END IF;
END $$;
