-- Migration: 20260813000000_fix_quinzenal_e_faixas_etarias
-- 1. Garante QUINZENAL no enum PlanningType (idempotente)
-- 2. Normaliza plannings com type inválido para SEMANAL
-- 3. Corrige ageGroupMin/Max das turmas conforme Currículo em Movimento DF

-- ── 1. QUINZENAL no enum ─────────────────────────────────────────────────────
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

-- ── 2. Normalizar plannings com type desconhecido ────────────────────────────
-- Executa depois que QUINZENAL foi adicionado ao enum
-- Qualquer valor fora do conjunto válido → SEMANAL
DO $$
BEGIN
  UPDATE "Planning"
  SET type = 'SEMANAL'
  WHERE type IS NOT NULL
    AND type NOT IN ('SEMANAL','QUINZENAL','MENSAL','TRIMESTRAL','SEMESTRAL','ANUAL');
EXCEPTION WHEN others THEN
  -- Tabela pode não existir ainda em deploy limpo
  NULL;
END $$;

-- ── 3. Corrigir faixas etárias das turmas (Currículo em Movimento DF) ─────────
-- EI01 Bebês: 0-18m | EI02 Crianças Bem Pequenas: 19-47m | EI03 Crianças Pequenas: 48-71m
-- O service usa midpoint=(ageGroupMin+ageGroupMax)/2 para derivar EI01/EI02/EI03

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
  AND UPPER(name) NOT LIKE '%II%' AND UPPER(name) NOT LIKE '%2%'
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
  AND (UPPER(name) LIKE '%I PERÍODO%' OR UPPER(name) LIKE '%PRIMEIRO%')
  AND UPPER(name) NOT LIKE '%II PERÍODO%'
  AND ("ageGroupMin"<>48 OR "ageGroupMax"<>60);

-- II Período / Segundo Período: 60–71 meses → midpoint=65 → EI03
UPDATE "Classroom"
SET "ageGroupMin"=60, "ageGroupMax"=71, "updatedAt"=NOW()
WHERE "isActive"=TRUE
  AND (UPPER(name) LIKE '%II PERÍODO%' OR UPPER(name) LIKE '%SEGUNDO%')
  AND ("ageGroupMin"<>60 OR "ageGroupMax"<>71);
