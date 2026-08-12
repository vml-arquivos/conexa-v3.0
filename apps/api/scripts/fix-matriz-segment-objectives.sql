-- ============================================================================
-- fix-matriz-segment-objectives.sql
-- Corrige o problema de objetivos EI01 clonados para EI02 e EI03.
--
-- O script ensure-matriz-segments.js (v1) clonava todas as entries da EI01
-- para EI02 e EI03, resultando em objetivos de bebês sendo atribuídos a
-- crianças bem pequenas e crianças pequenas.
--
-- Este script:
--   1. Detecta se EI02/EI03 têm entries com objetivoBNCCCode de EI01
--   2. Remove essas entries inválidas
--   3. Exibe o estado antes e depois
--
-- ATENÇÃO: Não remove entries que já têm códigos EI02/EI03 corretos.
-- Após executar este script, execute o seed de cada segmento para repopular
-- com os objetivos corretos.
--
-- SEGURANÇA: Verifica existência antes de deletar. Idempotente.
-- ============================================================================

-- ── Diagnóstico antes da correção ──────────────────────────────────────────
DO $$
DECLARE
  v_count_ei02_wrong INT;
  v_count_ei03_wrong INT;
  v_count_ei02_correct INT;
  v_count_ei03_correct INT;
BEGIN
  -- Contar entries erradas em EI02 (objetivos EI01)
  SELECT COUNT(*) INTO v_count_ei02_wrong
  FROM "CurriculumMatrixEntry" cme
  JOIN "CurriculumMatrix" cm ON cm.id = cme."matrixId"
  WHERE cm.segment = 'EI02'
    AND cm."isActive" = TRUE
    AND cme."objetivoBNCCCode" LIKE 'EI01%';

  -- Contar entries erradas em EI03 (objetivos EI01)
  SELECT COUNT(*) INTO v_count_ei03_wrong
  FROM "CurriculumMatrixEntry" cme
  JOIN "CurriculumMatrix" cm ON cm.id = cme."matrixId"
  WHERE cm.segment = 'EI03'
    AND cm."isActive" = TRUE
    AND cme."objetivoBNCCCode" LIKE 'EI01%';

  -- Contar entries corretas em EI02
  SELECT COUNT(*) INTO v_count_ei02_correct
  FROM "CurriculumMatrixEntry" cme
  JOIN "CurriculumMatrix" cm ON cm.id = cme."matrixId"
  WHERE cm.segment = 'EI02'
    AND cm."isActive" = TRUE
    AND (cme."objetivoBNCCCode" LIKE 'EI02%' OR cme."objetivoBNCCCode" IS NULL);

  -- Contar entries corretas em EI03
  SELECT COUNT(*) INTO v_count_ei03_correct
  FROM "CurriculumMatrixEntry" cme
  JOIN "CurriculumMatrix" cm ON cm.id = cme."matrixId"
  WHERE cm.segment = 'EI03'
    AND cm."isActive" = TRUE
    AND (cme."objetivoBNCCCode" LIKE 'EI03%' OR cme."objetivoBNCCCode" IS NULL);

  RAISE NOTICE '=== DIAGNÓSTICO PRÉ-CORREÇÃO ===';
  RAISE NOTICE 'EI02 - entries com código EI01 (ERRADAS): %', v_count_ei02_wrong;
  RAISE NOTICE 'EI02 - entries com código EI02 (CORRETAS): %', v_count_ei02_correct;
  RAISE NOTICE 'EI03 - entries com código EI01 (ERRADAS): %', v_count_ei03_wrong;
  RAISE NOTICE 'EI03 - entries com código EI03 (CORRETAS): %', v_count_ei03_correct;
END $$;

-- ── Remover entries EI01 clonadas na EI02 ──────────────────────────────────
DELETE FROM "CurriculumMatrixEntry"
WHERE "matrixId" IN (
  SELECT id FROM "CurriculumMatrix"
  WHERE segment = 'EI02' AND "isActive" = TRUE
)
AND "objetivoBNCCCode" LIKE 'EI01%';

-- ── Remover entries EI01 clonadas na EI03 ──────────────────────────────────
DELETE FROM "CurriculumMatrixEntry"
WHERE "matrixId" IN (
  SELECT id FROM "CurriculumMatrix"
  WHERE segment = 'EI03' AND "isActive" = TRUE
)
AND "objetivoBNCCCode" LIKE 'EI01%';

-- ── Diagnóstico pós-correção ────────────────────────────────────────────────
DO $$
DECLARE
  v_count_ei02 INT;
  v_count_ei03 INT;
BEGIN
  SELECT COUNT(*) INTO v_count_ei02
  FROM "CurriculumMatrixEntry" cme
  JOIN "CurriculumMatrix" cm ON cm.id = cme."matrixId"
  WHERE cm.segment = 'EI02' AND cm."isActive" = TRUE;

  SELECT COUNT(*) INTO v_count_ei03
  FROM "CurriculumMatrixEntry" cme
  JOIN "CurriculumMatrix" cm ON cm.id = cme."matrixId"
  WHERE cm.segment = 'EI03' AND cm."isActive" = TRUE;

  RAISE NOTICE '=== ESTADO PÓS-CORREÇÃO ===';
  RAISE NOTICE 'EI02 - total entries restantes: %', v_count_ei02;
  RAISE NOTICE 'EI03 - total entries restantes: %', v_count_ei03;
  RAISE NOTICE 'Execute o seed de EI02 e EI03 para popular com objetivos corretos.';
END $$;
