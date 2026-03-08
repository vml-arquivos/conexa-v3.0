-- Migration: 20260307000000_fix_schema_mapping_and_missing_columns
-- Objetivo: Adicionar colunas faltantes e criar tabelas novas que estão no schema
--           mas ainda não existem no banco de produção.
-- Estratégia: Todas as operações usam IF NOT EXISTS / IF EXISTS para ser idempotente.
-- NÃO renomeia tabelas, NÃO remove colunas, NÃO altera dados existentes.

-- ─── 1. Unit: adicionar nonSchoolDays ─────────────────────────────────────────
-- Campo para armazenar datas não letivas configuradas pela unidade
ALTER TABLE "Unit"
  ADD COLUMN IF NOT EXISTS "nonSchoolDays" TEXT[] DEFAULT '{}';

-- ─── 2. Child: adicionar photoUrl ─────────────────────────────────────────────
-- Campo opcional para URL da foto do aluno
ALTER TABLE "Child"
  ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;

-- ─── 3. recado_turma: adicionar atualizado_em ─────────────────────────────────
-- Coluna de timestamp de atualização (mapeada como @updatedAt no Prisma)
ALTER TABLE "recado_turma"
  ADD COLUMN IF NOT EXISTS "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- ─── 4. Material: criar tabela do catálogo de materiais ───────────────────────
CREATE TABLE IF NOT EXISTS "Material" (
    "id"               TEXT NOT NULL,
    "mantenedoraId"    TEXT NOT NULL,
    "code"             VARCHAR(50) NOT NULL,
    "name"             VARCHAR(255) NOT NULL,
    "description"      TEXT,
    "category"         VARCHAR(50) NOT NULL,
    "unit"             VARCHAR(50),
    "referencePrice"   DECIMAL(10,2),
    "defaultSupplier"  VARCHAR(255),
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Material_mantenedoraId_code_key"
  ON "Material"("mantenedoraId", "code");

CREATE INDEX IF NOT EXISTS "Material_mantenedoraId_idx"
  ON "Material"("mantenedoraId");

CREATE INDEX IF NOT EXISTS "Material_category_idx"
  ON "Material"("category");

CREATE INDEX IF NOT EXISTS "Material_isActive_idx"
  ON "Material"("isActive");

DO $$ BEGIN
  ALTER TABLE "Material"
    ADD CONSTRAINT "Material_mantenedoraId_fkey"
    FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 5. MaterialRequestItem: criar tabela de itens de requisição ──────────────
CREATE TABLE IF NOT EXISTS "MaterialRequestItem" (
    "id"                TEXT NOT NULL,
    "materialRequestId" TEXT NOT NULL,
    "materialId"        TEXT,
    "productName"       VARCHAR(255) NOT NULL,
    "quantity"          INTEGER NOT NULL,
    "unit"              VARCHAR(50),
    "unitPrice"         DECIMAL(10,2),
    "supplier"          VARCHAR(255),
    "observations"      TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaterialRequestItem_materialRequestId_idx"
  ON "MaterialRequestItem"("materialRequestId");

CREATE INDEX IF NOT EXISTS "MaterialRequestItem_materialId_idx"
  ON "MaterialRequestItem"("materialId");

DO $$ BEGIN
  ALTER TABLE "MaterialRequestItem"
    ADD CONSTRAINT "MaterialRequestItem_materialRequestId_fkey"
    FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MaterialRequestItem"
    ADD CONSTRAINT "MaterialRequestItem_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "Material"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
