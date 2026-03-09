-- Manually-created migration for the planning review flow
-- Add new values to the "PlanningStatus" enum if they don't exist
-- This command is idempotent and safe to run multiple times.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus') AND enumlabel = 'EM_REVISAO') THEN
        ALTER TYPE "PlanningStatus" ADD VALUE 'EM_REVISAO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus') AND enumlabel = 'APROVADO') THEN
        ALTER TYPE "PlanningStatus" ADD VALUE 'APROVADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningStatus') AND enumlabel = 'DEVOLVIDO') THEN
        ALTER TYPE "PlanningStatus" ADD VALUE 'DEVOLVIDO';
    END IF;
END;
$$;
-- Add review-related columns to the "Planning" table
-- Using ALTER TABLE with ADD COLUMN IF NOT EXISTS for idempotency.
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
ALTER TABLE "Planning" ADD COLUMN IF NOT EXISTS "reviewComment" TEXT;
