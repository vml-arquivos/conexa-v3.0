-- Migration: add_retroactive_edit_and_relatorio_foto_fields
-- Additive only — sem DROP, sem DELETE FROM, sem ALTER COLUMN destrutivo

-- 1. Campos de edição retroativa no DiaryEvent
ALTER TABLE "DiaryEvent"
  ADD COLUMN IF NOT EXISTS "retroactiveEdit" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "retroactiveNote" TEXT;

-- 2. Campos pedagógicos e de envio semanal no RelatorioFoto
ALTER TABLE "RelatorioFoto"
  ADD COLUMN IF NOT EXISTS "diaryEventId"          TEXT,
  ADD COLUMN IF NOT EXISTS "activityDescription"   VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "campoExperiencia"       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "weeklyReportSent"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "weeklyReportSentAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "weeklyReportRecipient"  VARCHAR(255);
