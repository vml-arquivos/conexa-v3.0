\pset pager off
\echo 'AUTO DEPLOY - Correção faixas etárias (Currículo em Movimento DF/BNCC)'
BEGIN;

UPDATE "Classroom" SET "ageGroupMin"=0,  "ageGroupMax"=12, "updatedAt"=NOW()
WHERE "isActive"=TRUE AND UPPER(name) LIKE '%BERÇ%RIO I%' AND UPPER(name) NOT LIKE '%II%'
  AND ("ageGroupMin"<>0 OR "ageGroupMax"<>12);

UPDATE "Classroom" SET "ageGroupMin"=12, "ageGroupMax"=18, "updatedAt"=NOW()
WHERE "isActive"=TRUE AND UPPER(name) LIKE '%BERÇ%RIO II%'
  AND ("ageGroupMin"<>12 OR "ageGroupMax"<>18);

UPDATE "Classroom" SET "ageGroupMin"=19, "ageGroupMax"=35, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%MATERNAL I%' OR UPPER(name) LIKE '%MATERNAL 1%')
  AND UPPER(name) NOT LIKE '%II%' AND UPPER(name) NOT LIKE '%2%'
  AND ("ageGroupMin"<>19 OR "ageGroupMax"<>35);

UPDATE "Classroom" SET "ageGroupMin"=36, "ageGroupMax"=47, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%MATERNAL II%' OR UPPER(name) LIKE '%MATERNAL 2%')
  AND ("ageGroupMin"<>36 OR "ageGroupMax"<>47);

UPDATE "Classroom" SET "ageGroupMin"=48, "ageGroupMax"=60, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%I PERÍODO%' OR UPPER(name) LIKE '%PRIMEIRO%')
  AND UPPER(name) NOT LIKE '%II PERÍODO%'
  AND ("ageGroupMin"<>48 OR "ageGroupMax"<>60);

UPDATE "Classroom" SET "ageGroupMin"=60, "ageGroupMax"=71, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%II PERÍODO%' OR UPPER(name) LIKE '%SEGUNDO%')
  AND ("ageGroupMin"<>60 OR "ageGroupMax"<>71);

SELECT name,
  "ageGroupMin", "ageGroupMax",
  CASE WHEN ("ageGroupMin"+"ageGroupMax")/2.0<=18 THEN 'EI01-Bebês'
       WHEN ("ageGroupMin"+"ageGroupMax")/2.0<=47 THEN 'EI02-CriançasBemPequenas'
       WHEN ("ageGroupMin"+"ageGroupMax")/2.0<=71 THEN 'EI03-CriançasPequenas'
  END segmento
FROM "Classroom" WHERE "isActive"=TRUE ORDER BY "ageGroupMin", name;

COMMIT;
\echo '✅ Faixas etárias corrigidas.'
