-- Migration: 20260812000000_fix_planning_type_quinzenal_schema
-- Garante que o valor QUINZENAL existe no enum PlanningType do banco.
-- A migration 20260228120000 adicionou QUINZENAL ao banco mas o schema.prisma
-- não foi atualizado, causando Internal Server Error ao desserializar plannings.
-- Esta migration é idempotente (IF NOT EXISTS).
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
