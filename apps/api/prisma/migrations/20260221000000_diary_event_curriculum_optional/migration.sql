-- AlterTable: tornar curriculumEntryId opcional em DiaryEvent
ALTER TABLE "DiaryEvent" ALTER COLUMN "curriculumEntryId" DROP NOT NULL;

-- Remover a constraint de FK antiga (Restrict) e recriar como SetNull
-- No PostgreSQL, DROP CONSTRAINT + ADD CONSTRAINT recria a FK
ALTER TABLE "DiaryEvent" DROP CONSTRAINT IF EXISTS "DiaryEvent_curriculumEntryId_fkey";
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_curriculumEntryId_fkey"
  FOREIGN KEY ("curriculumEntryId")
  REFERENCES "CurriculumMatrixEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
