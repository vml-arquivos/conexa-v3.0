\pset pager off
\timing on

\echo '============================================================'
\echo 'AUTO DEPLOY - Correção faixas etárias das turmas'
\echo 'Currículo em Movimento DF / BNCC'
\echo 'EI01 Bebês: 0-18m | EI02 Crianças Bem Pequenas: 19-47m | EI03 Crianças Pequenas: 48-71m'
\echo '============================================================'

BEGIN;

CREATE TEMP TABLE _faixas_antes AS
SELECT id, name, "ageGroupMin" AS min_antes, "ageGroupMax" AS max_antes
FROM "Classroom" WHERE "isActive" = TRUE;

-- Berçário I: 0–12 meses → midpoint=6 → EI01
UPDATE "Classroom"
SET "ageGroupMin"=0, "ageGroupMax"=12, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND UPPER(name) LIKE '%BERÇ%RIO I%'
  AND UPPER(name) NOT LIKE '%II%'
  AND ("ageGroupMin"<>0 OR "ageGroupMax"<>12);

-- Berçário II: 12–18 meses → midpoint=15 → EI01
UPDATE "Classroom"
SET "ageGroupMin"=12, "ageGroupMax"=18, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND UPPER(name) LIKE '%BERÇ%RIO II%'
  AND ("ageGroupMin"<>12 OR "ageGroupMax"<>18);

-- Maternal I / Maternal 1: 19–35 meses → midpoint=27 → EI02
UPDATE "Classroom"
SET "ageGroupMin"=19, "ageGroupMax"=35, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%MATERNAL I%' OR UPPER(name) LIKE '%MATERNAL 1%')
  AND UPPER(name) NOT LIKE '%MATERNAL II%'
  AND UPPER(name) NOT LIKE '%MATERNAL 2%'
  AND ("ageGroupMin"<>19 OR "ageGroupMax"<>35);

-- Maternal II / Maternal 2: 36–47 meses → midpoint=41 → EI02
UPDATE "Classroom"
SET "ageGroupMin"=36, "ageGroupMax"=47, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%MATERNAL II%' OR UPPER(name) LIKE '%MATERNAL 2%')
  AND ("ageGroupMin"<>36 OR "ageGroupMax"<>47);

-- I Período / Primeiro Período: 48–60 meses → midpoint=54 → EI03
UPDATE "Classroom"
SET "ageGroupMin"=48, "ageGroupMax"=60, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%I PERÍODO%' OR UPPER(name) LIKE '%I PERIODO%'
    OR UPPER(name) LIKE '%PRIMEIRO PERÍODO%' OR UPPER(name) LIKE '%PRIMEIRO PERIODO%')
  AND UPPER(name) NOT LIKE '%II PERÍODO%'
  AND UPPER(name) NOT LIKE '%II PERIODO%'
  AND ("ageGroupMin"<>48 OR "ageGroupMax"<>60);

-- II Período / Segundo Período: 60–71 meses → midpoint=65 → EI03
UPDATE "Classroom"
SET "ageGroupMin"=60, "ageGroupMax"=71, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%II PERÍODO%' OR UPPER(name) LIKE '%II PERIODO%'
    OR UPPER(name) LIKE '%SEGUNDO PERÍODO%' OR UPPER(name) LIKE '%SEGUNDO PERIODO%')
  AND ("ageGroupMin"<>60 OR "ageGroupMax"<>71);

\echo '--- Turmas alteradas neste deploy ---'
SELECT c.name,
       b.min_antes, b.max_antes,
       c."ageGroupMin" AS min_depois, c."ageGroupMax" AS max_depois,
       CASE WHEN (c."ageGroupMin"+c."ageGroupMax")/2.0 <= 18 THEN 'EI01'
            WHEN (c."ageGroupMin"+c."ageGroupMax")/2.0 <= 47 THEN 'EI02'
            WHEN (c."ageGroupMin"+c."ageGroupMax")/2.0 <= 71 THEN 'EI03'
       END AS segmento
FROM "Classroom" c
JOIN _faixas_antes b ON b.id = c.id
WHERE c."isActive"=TRUE
  AND (b.min_antes<>c."ageGroupMin" OR b.max_antes<>c."ageGroupMax")
ORDER BY c."ageGroupMin", c.name;

\echo '--- Estado final de todas as turmas ativas ---'
SELECT name,
       "ageGroupMin" AS age_min, "ageGroupMax" AS age_max,
       ROUND(("ageGroupMin"+"ageGroupMax")/2.0,1) AS midpoint,
       CASE WHEN ("ageGroupMin"+"ageGroupMax")/2.0 <= 18 THEN 'EI01 - Bebês'
            WHEN ("ageGroupMin"+"ageGroupMax")/2.0 <= 47 THEN 'EI02 - Crianças Bem Pequenas'
            WHEN ("ageGroupMin"+"ageGroupMax")/2.0 <= 71 THEN 'EI03 - Crianças Pequenas'
       END AS segmento
FROM "Classroom"
WHERE "isActive"=TRUE
ORDER BY "ageGroupMin", name;

COMMIT;
\echo '✅ Correção de faixas etárias concluída.'
