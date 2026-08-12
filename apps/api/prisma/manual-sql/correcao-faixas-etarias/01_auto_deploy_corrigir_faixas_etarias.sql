\pset pager off
\timing on

\echo '============================================================'
\echo 'AUTO DEPLOY - Correção idempotente de faixas etárias das turmas'
\echo 'Fonte: Currículo em Movimento DF + BNCC'
\echo 'EI01 Bebês: 0-18m | EI02 Crianças Bem Pequenas: 19-47m | EI03 Crianças Pequenas: 48-71m'
\echo 'O service usa midpoint=(ageGroupMin+ageGroupMax)/2 para derivar o segmento.'
\echo '============================================================'

BEGIN;

-- ── Registrar estado antes ───────────────────────────────────────────────────
CREATE TEMP TABLE _faixas_antes AS
SELECT
  id,
  name,
  "ageGroupMin" AS age_min_antes,
  "ageGroupMax" AS age_max_antes
FROM "Classroom"
WHERE "isActive" = TRUE;

-- ── EI01 – Bebês (midpoint 0–18 meses) ──────────────────────────────────────

-- Berçário I — 0 a 12 meses → midpoint=6 → EI01
UPDATE "Classroom"
SET
  "ageGroupMin" = 0,
  "ageGroupMax" = 12,
  "updatedAt"   = NOW()
WHERE "isActive" = TRUE
  AND (
    UPPER(name) LIKE '%BERÇ%RIO I'
    OR UPPER(name) LIKE '%BERÇ%RIO I %'
    OR UPPER(name) LIKE '%BERCARIO I'
    OR UPPER(name) LIKE '%BERCARIO I %'
  )
  AND UPPER(name) NOT LIKE '%II%'
  AND ("ageGroupMin" <> 0 OR "ageGroupMax" <> 12);

-- Berçário II — 12 a 18 meses → midpoint=15 → EI01
UPDATE "Classroom"
SET
  "ageGroupMin" = 12,
  "ageGroupMax" = 18,
  "updatedAt"   = NOW()
WHERE "isActive" = TRUE
  AND (
    UPPER(name) LIKE '%BERÇ%RIO II%'
    OR UPPER(name) LIKE '%BERCARIO II%'
  )
  AND ("ageGroupMin" <> 12 OR "ageGroupMax" <> 18);

-- ── EI02 – Crianças Bem Pequenas (midpoint 19–47 meses) ─────────────────────

-- Maternal I / Maternal 1 — 19 a 35 meses → midpoint=27 → EI02
-- Corrige também Maternal 1 do Pelicano (ageGroupMin=12 → EI01 errado)
UPDATE "Classroom"
SET
  "ageGroupMin" = 19,
  "ageGroupMax" = 35,
  "updatedAt"   = NOW()
WHERE "isActive" = TRUE
  AND (
    UPPER(name) LIKE 'MATERNAL I'
    OR UPPER(name) LIKE 'MATERNAL I %'
    OR UPPER(name) LIKE '%MATERNAL I '
    OR UPPER(name) LIKE '% MATERNAL I'
    OR UPPER(name) LIKE '%MATERNAL 1%'
    OR UPPER(name) LIKE 'MATERNAL 1%'
  )
  AND UPPER(name) NOT LIKE '%MATERNAL II%'
  AND UPPER(name) NOT LIKE '%MATERNAL 2%'
  AND ("ageGroupMin" <> 19 OR "ageGroupMax" <> 35);

-- Maternal II / Maternal 2 — 36 a 47 meses → midpoint=41.5 → EI02
UPDATE "Classroom"
SET
  "ageGroupMin" = 36,
  "ageGroupMax" = 47,
  "updatedAt"   = NOW()
WHERE "isActive" = TRUE
  AND (
    UPPER(name) LIKE '%MATERNAL II%'
    OR UPPER(name) LIKE '%MATERNAL 2%'
  )
  AND ("ageGroupMin" <> 36 OR "ageGroupMax" <> 47);

-- ── EI03 – Crianças Pequenas (midpoint 48–71 meses) ─────────────────────────

-- I Período / Primeiro Período — 48 a 60 meses → midpoint=54 → EI03
UPDATE "Classroom"
SET
  "ageGroupMin" = 48,
  "ageGroupMax" = 60,
  "updatedAt"   = NOW()
WHERE "isActive" = TRUE
  AND (
    UPPER(name) LIKE '%I PERÍODO%'
    OR UPPER(name) LIKE '%I PERIODO%'
    OR UPPER(name) LIKE '%PRIMEIRO PERÍODO%'
    OR UPPER(name) LIKE '%PRIMEIRO PERIODO%'
    OR UPPER(name) LIKE '%1%PERÍODO%'
    OR UPPER(name) LIKE '%1%PERIODO%'
  )
  AND UPPER(name) NOT LIKE '%II PERÍODO%'
  AND UPPER(name) NOT LIKE '%II PERIODO%'
  AND UPPER(name) NOT LIKE '%SEGUNDO%'
  AND ("ageGroupMin" <> 48 OR "ageGroupMax" <> 60);

-- II Período / Segundo Período — 60 a 71 meses → midpoint=65.5 → EI03
UPDATE "Classroom"
SET
  "ageGroupMin" = 60,
  "ageGroupMax" = 71,
  "updatedAt"   = NOW()
WHERE "isActive" = TRUE
  AND (
    UPPER(name) LIKE '%II PERÍODO%'
    OR UPPER(name) LIKE '%II PERIODO%'
    OR UPPER(name) LIKE '%SEGUNDO PERÍODO%'
    OR UPPER(name) LIKE '%SEGUNDO PERIODO%'
    OR UPPER(name) LIKE '%2%PERÍODO%'
    OR UPPER(name) LIKE '%2%PERIODO%'
  )
  AND ("ageGroupMin" <> 60 OR "ageGroupMax" <> 71);

-- ── Relatório das alterações realizadas ──────────────────────────────────────
\echo ''
\echo '--- Turmas alteradas neste deploy ---'
SELECT
  c.name,
  b.age_min_antes,
  b.age_max_antes,
  c."ageGroupMin"                                              AS age_min_depois,
  c."ageGroupMax"                                             AS age_max_depois,
  ROUND((c."ageGroupMin" + c."ageGroupMax") / 2.0, 1)        AS midpoint,
  CASE
    WHEN (c."ageGroupMin" + c."ageGroupMax") / 2.0 <= 18 THEN 'EI01'
    WHEN (c."ageGroupMin" + c."ageGroupMax") / 2.0 <= 47 THEN 'EI02'
    WHEN (c."ageGroupMin" + c."ageGroupMax") / 2.0 <= 71 THEN 'EI03'
    ELSE '??'
  END                                                         AS segmento
FROM "Classroom" c
JOIN _faixas_antes b ON b.id = c.id
WHERE c.isActive = TRUE
  AND (b.age_min_antes <> c."ageGroupMin" OR b.age_max_antes <> c."ageGroupMax")
ORDER BY c."ageGroupMin", c.name;

\echo ''
\echo '--- Estado final de todas as turmas ativas ---'
SELECT
  name,
  "ageGroupMin"                                              AS age_min,
  "ageGroupMax"                                              AS age_max,
  ROUND(("ageGroupMin" + "ageGroupMax") / 2.0, 1)           AS midpoint,
  CASE
    WHEN ("ageGroupMin" + "ageGroupMax") / 2.0 <= 18 THEN 'EI01 – Bebês'
    WHEN ("ageGroupMin" + "ageGroupMax") / 2.0 <= 47 THEN 'EI02 – Crianças Bem Pequenas'
    WHEN ("ageGroupMin" + "ageGroupMax") / 2.0 <= 71 THEN 'EI03 – Crianças Pequenas'
    ELSE 'INDEFINIDO'
  END                                                        AS segmento
FROM "Classroom"
WHERE "isActive" = TRUE
ORDER BY "ageGroupMin", name;

COMMIT;

\echo '✅ Correção de faixas etárias concluída.'
