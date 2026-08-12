-- ============================================================================
-- fix-classroom-age-groups.sql
-- Corrige ageGroupMin das turmas que estão com valor incorreto,
-- garantindo que o segment derivado corresponde à faixa etária real.
--
-- Regra BNCC / Currículo em Movimento DF:
--   EI01 – Bebês:               ageGroupMin 0  a 18  meses (Berçário I, Berçário II)
--   EI02 – Crianças Bem Pequenas: ageGroupMin 19 a 47 meses (Maternal I, Maternal II)
--   EI03 – Crianças Pequenas:   ageGroupMin 48 a 71 meses (I Período, II Período)
--
-- Problema encontrado: Maternal 1 no Pelicano tem ageGroupMin=12,
-- que cai erroneamente em EI01 (≤18). Maternal 1 atende 1a7m–2a11m = 19–35 meses.
-- Correção: ageGroupMin deve ser 19 para qualquer turma Maternal.
--
-- Execução: idempotente (UPDATE só muda valores errados).
-- ============================================================================

-- 1. Berçário I — 0 a 12 meses (primeiros meses, EI01)
UPDATE "Classroom"
SET "ageGroupMin" = 4, "ageGroupMax" = 12
WHERE LOWER(name) LIKE '%berç%rio i%'
  AND ("ageGroupMin" <> 4 OR "ageGroupMax" <> 12);

-- 2. Berçário II — 12 a 18 meses (ainda bebês, EI01)
UPDATE "Classroom"
SET "ageGroupMin" = 12, "ageGroupMax" = 18
WHERE LOWER(name) LIKE '%berç%rio ii%'
  AND ("ageGroupMin" <> 12 OR "ageGroupMax" <> 18);

-- 3. Maternal I / Maternal 1 — 19 a 35 meses (Crianças Bem Pequenas, EI02)
--    Corrige turmas com ageGroupMin=12 que caem erroneamente em EI01
UPDATE "Classroom"
SET "ageGroupMin" = 19, "ageGroupMax" = 35
WHERE (
  LOWER(name) LIKE '%maternal i %'
  OR LOWER(name) LIKE '%maternal i'
  OR LOWER(name) LIKE '%maternal 1%'
)
AND ("ageGroupMin" < 19 OR "ageGroupMax" < 19);

-- 4. Maternal II / Maternal 2 — 36 a 47 meses (Crianças Bem Pequenas, EI02)
UPDATE "Classroom"
SET "ageGroupMin" = 36, "ageGroupMax" = 47
WHERE (
  LOWER(name) LIKE '%maternal ii %'
  OR LOWER(name) LIKE '%maternal ii'
  OR LOWER(name) LIKE '%maternal 2%'
)
AND ("ageGroupMin" < 36 OR "ageGroupMax" < 36);

-- 5. Primeiro Período / I Período — 48 a 60 meses (Crianças Pequenas, EI03)
UPDATE "Classroom"
SET "ageGroupMin" = 48, "ageGroupMax" = 60
WHERE (
  LOWER(name) LIKE '%i per%odo%'
  OR LOWER(name) LIKE '%primeiro per%odo%'
  OR LOWER(name) LIKE '%1%per%odo%'
)
AND "ageGroupMin" < 48;

-- 6. Segundo Período / II Período — 60 a 71 meses (Crianças Pequenas, EI03)
UPDATE "Classroom"
SET "ageGroupMin" = 60, "ageGroupMax" = 71
WHERE (
  LOWER(name) LIKE '%ii per%odo%'
  OR LOWER(name) LIKE '%segundo per%odo%'
  OR LOWER(name) LIKE '%2%per%odo%'
)
AND "ageGroupMin" < 60;

-- Verificação pós-correção
SELECT
  name,
  "ageGroupMin",
  "ageGroupMax",
  CASE
    WHEN "ageGroupMin" <= 18 THEN 'EI01 – Bebês'
    WHEN "ageGroupMin" <= 47 THEN 'EI02 – Crianças Bem Pequenas'
    WHEN "ageGroupMin" <= 71 THEN 'EI03 – Crianças Pequenas'
    ELSE 'INDEFINIDO'
  END AS segment_derivado
FROM "Classroom"
WHERE "isActive" = TRUE
ORDER BY "ageGroupMin", name;
