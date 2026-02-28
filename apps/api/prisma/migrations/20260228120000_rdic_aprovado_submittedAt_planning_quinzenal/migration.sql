-- Migration: 20260228120000_rdic_aprovado_submittedAt_planning_quinzenal
-- Tipo: ADITIVA — não remove nem renomeia nada
-- Alterações:
--   1. Adiciona APROVADO ao enum StatusRDIX
--   2. Adiciona submittedAt e reviewedAt ao RDIXInstancia
--   3. Altera reviewComment para TEXT (era VARCHAR sem tamanho)
--   4. Adiciona QUINZENAL ao enum PlanningType

-- ─── 1. StatusRDIX: adicionar APROVADO ────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'StatusRDIX')
      AND enumlabel = 'APROVADO'
  ) THEN
    ALTER TYPE "StatusRDIX" ADD VALUE 'APROVADO' AFTER 'DEVOLVIDO';
  END IF;
END $$;

-- ─── 2. RDIXInstancia: adicionar submittedAt ──────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'RDIXInstancia' AND column_name = 'submittedAt'
  ) THEN
    ALTER TABLE "RDIXInstancia" ADD COLUMN "submittedAt" TIMESTAMP(3);
  END IF;
END $$;

-- ─── 3. RDIXInstancia: adicionar reviewedAt ───────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'RDIXInstancia' AND column_name = 'reviewedAt'
  ) THEN
    ALTER TABLE "RDIXInstancia" ADD COLUMN "reviewedAt" TIMESTAMP(3);
  END IF;
END $$;

-- ─── 4. RDIXInstancia: garantir reviewComment como TEXT ──────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'RDIXInstancia' AND column_name = 'reviewComment'
  ) THEN
    ALTER TABLE "RDIXInstancia" ALTER COLUMN "reviewComment" TYPE TEXT;
  END IF;
END $$;

-- ─── 5. PlanningType: adicionar QUINZENAL ─────────────────────────────────────
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
