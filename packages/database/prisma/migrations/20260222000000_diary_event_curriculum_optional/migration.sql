-- Migration: 20260222000000_diary_event_curriculum_optional
-- Objetivo: tornar curriculumEntryId opcional no DiaryEvent
-- Motivação: o código do diary-event.service.ts não exige curriculumEntryId em todos os fluxos
--            (ex: microgestos rápidos, entradas avulsas). Tornar o campo opcional evita erros
--            de TypeScript e permite registros sem vínculo com a matriz curricular.

-- 1. Remover a constraint NOT NULL do campo
ALTER TABLE "DiaryEvent" ALTER COLUMN "curriculumEntryId" DROP NOT NULL;

-- 2. Atualizar a foreign key para ON DELETE SET NULL (já era assim na migration inicial,
--    mas a sprint1 pode ter alterado o comportamento)
ALTER TABLE "DiaryEvent" DROP CONSTRAINT IF EXISTS "DiaryEvent_curriculumEntryId_fkey";
ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_curriculumEntryId_fkey"
  FOREIGN KEY ("curriculumEntryId")
  REFERENCES "CurriculumMatrixEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
