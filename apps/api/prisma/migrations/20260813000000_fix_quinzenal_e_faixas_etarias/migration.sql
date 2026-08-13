-- Migration: 20260813000000_fix_quinzenal_e_faixas_etarias
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid=(SELECT oid FROM pg_type WHERE typname='PlanningType') AND enumlabel='QUINZENAL') THEN
    ALTER TYPE "PlanningType" ADD VALUE 'QUINZENAL' AFTER 'SEMANAL';
  END IF;
END $$;

DO $$ BEGIN
  UPDATE "Planning" SET type='SEMANAL' WHERE type NOT IN ('SEMANAL','QUINZENAL','MENSAL','TRIMESTRAL','SEMESTRAL','ANUAL');
EXCEPTION WHEN others THEN NULL;
END $$;

UPDATE "Classroom" SET "ageGroupMin"=0,"ageGroupMax"=12,"updatedAt"=NOW() WHERE "isActive"=TRUE AND UPPER(name) LIKE '%BERÇ%RIO I%' AND UPPER(name) NOT LIKE '%II%' AND ("ageGroupMin"<>0 OR "ageGroupMax"<>12);
UPDATE "Classroom" SET "ageGroupMin"=12,"ageGroupMax"=18,"updatedAt"=NOW() WHERE "isActive"=TRUE AND UPPER(name) LIKE '%BERÇ%RIO II%' AND ("ageGroupMin"<>12 OR "ageGroupMax"<>18);
UPDATE "Classroom" SET "ageGroupMin"=19,"ageGroupMax"=35,"updatedAt"=NOW() WHERE "isActive"=TRUE AND (UPPER(name) LIKE '%MATERNAL I%' OR UPPER(name) LIKE '%MATERNAL 1%') AND UPPER(name) NOT LIKE '%II%' AND UPPER(name) NOT LIKE '%2%' AND ("ageGroupMin"<>19 OR "ageGroupMax"<>35);
UPDATE "Classroom" SET "ageGroupMin"=36,"ageGroupMax"=47,"updatedAt"=NOW() WHERE "isActive"=TRUE AND (UPPER(name) LIKE '%MATERNAL II%' OR UPPER(name) LIKE '%MATERNAL 2%') AND ("ageGroupMin"<>36 OR "ageGroupMax"<>47);
UPDATE "Classroom" SET "ageGroupMin"=48,"ageGroupMax"=60,"updatedAt"=NOW() WHERE "isActive"=TRUE AND (UPPER(name) LIKE '%I PERÍODO%' OR UPPER(name) LIKE '%PRIMEIRO%') AND UPPER(name) NOT LIKE '%II PERÍODO%' AND ("ageGroupMin"<>48 OR "ageGroupMax"<>60);
UPDATE "Classroom" SET "ageGroupMin"=60,"ageGroupMax"=71,"updatedAt"=NOW() WHERE "isActive"=TRUE AND (UPPER(name) LIKE '%II PERÍODO%' OR UPPER(name) LIKE '%SEGUNDO%') AND ("ageGroupMin"<>60 OR "ageGroupMax"<>71);
