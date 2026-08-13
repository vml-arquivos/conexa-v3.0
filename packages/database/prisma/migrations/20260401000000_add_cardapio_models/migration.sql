-- Migration: add_cardapio_models
-- Criação dos enums e tabelas para o módulo de Cardápio e Nutrição
-- Idempotente: usa CREATE TYPE IF NOT EXISTS e CREATE TABLE IF NOT EXISTS

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "DiaSemana" AS ENUM (
    'SEGUNDA',
    'TERCA',
    'QUARTA',
    'QUINTA',
    'SEXTA'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TipoRefeicao" AS ENUM (
    'CAFE_MANHA',
    'ALMOCO',
    'LANCHE_TARDE',
    'JANTAR'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABELA: cardapio
-- ============================================================================

CREATE TABLE IF NOT EXISTS "cardapio" (
  "id"             TEXT          NOT NULL,
  "mantenedoraId"  TEXT          NOT NULL,
  "unitId"         TEXT          NOT NULL,
  "semana"         VARCHAR(10)   NOT NULL,
  "titulo"         VARCHAR(255),
  "observacoes"    TEXT,
  "publicado"      BOOLEAN       NOT NULL DEFAULT false,
  "createdBy"      VARCHAR(255),
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "cardapio_pkey" PRIMARY KEY ("id")
);

-- Unique e índices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_unitId_semana_key'
  ) THEN
    ALTER TABLE "cardapio" ADD CONSTRAINT "cardapio_unitId_semana_key" UNIQUE ("unitId", "semana");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "cardapio_mantenedoraId_idx" ON "cardapio"("mantenedoraId");
CREATE INDEX IF NOT EXISTS "cardapio_unitId_idx"         ON "cardapio"("unitId");
CREATE INDEX IF NOT EXISTS "cardapio_semana_idx"          ON "cardapio"("semana");

-- Foreign Keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_mantenedoraId_fkey'
  ) THEN
    ALTER TABLE "cardapio"
      ADD CONSTRAINT "cardapio_mantenedoraId_fkey"
      FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_unitId_fkey'
  ) THEN
    ALTER TABLE "cardapio"
      ADD CONSTRAINT "cardapio_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- TABELA: cardapio_refeicao
-- ============================================================================

CREATE TABLE IF NOT EXISTS "cardapio_refeicao" (
  "id"            TEXT          NOT NULL,
  "cardapioId"    TEXT          NOT NULL,
  "diaSemana"     "DiaSemana"   NOT NULL,
  "tipoRefeicao"  "TipoRefeicao" NOT NULL,
  "observacoes"   TEXT,
  "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "cardapio_refeicao_pkey" PRIMARY KEY ("id")
);

-- Unique e índices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_refeicao_cardapioId_diaSemana_tipoRefeicao_key'
  ) THEN
    ALTER TABLE "cardapio_refeicao"
      ADD CONSTRAINT "cardapio_refeicao_cardapioId_diaSemana_tipoRefeicao_key"
      UNIQUE ("cardapioId", "diaSemana", "tipoRefeicao");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "cardapio_refeicao_cardapioId_idx" ON "cardapio_refeicao"("cardapioId");

-- Foreign Key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_refeicao_cardapioId_fkey'
  ) THEN
    ALTER TABLE "cardapio_refeicao"
      ADD CONSTRAINT "cardapio_refeicao_cardapioId_fkey"
      FOREIGN KEY ("cardapioId") REFERENCES "cardapio"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- TABELA: cardapio_item
-- ============================================================================

CREATE TABLE IF NOT EXISTS "cardapio_item" (
  "id"           TEXT           NOT NULL,
  "refeicaoId"   TEXT           NOT NULL,
  "nome"         VARCHAR(255)   NOT NULL,
  "quantidade"   DECIMAL(10, 3),
  "unidade"      VARCHAR(50),
  "calorias"     DECIMAL(8, 2),
  "proteinas"    DECIMAL(8, 2),
  "carboidratos" DECIMAL(8, 2),
  "gorduras"     DECIMAL(8, 2),
  "fibras"       DECIMAL(8, 2),
  "sodio"        DECIMAL(8, 2),
  "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)   NOT NULL,

  CONSTRAINT "cardapio_item_pkey" PRIMARY KEY ("id")
);

-- Índice
CREATE INDEX IF NOT EXISTS "cardapio_item_refeicaoId_idx" ON "cardapio_item"("refeicaoId");

-- Foreign Key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_item_refeicaoId_fkey'
  ) THEN
    ALTER TABLE "cardapio_item"
      ADD CONSTRAINT "cardapio_item_refeicaoId_fkey"
      FOREIGN KEY ("refeicaoId") REFERENCES "cardapio_refeicao"("id") ON DELETE CASCADE;
  END IF;
END $$;
