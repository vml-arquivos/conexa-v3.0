-- Migration: add_alimento_model
-- Cria o banco de alimentos com informações nutricionais para o módulo Nutricionista
-- Idempotente: usa DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL END $$

-- Enum CategoriaAlimento
DO $$ BEGIN
  CREATE TYPE "CategoriaAlimento" AS ENUM (
    'CEREAIS_GRAOS',
    'LEGUMINOSAS',
    'PROTEINAS',
    'LATICINIOS',
    'FRUTAS',
    'VERDURAS_LEGUMES',
    'GORDURAS_OLEOS',
    'ACUCARES_DOCES',
    'BEBIDAS',
    'PREPARACOES',
    'OLEAGINOSAS',
    'EMBUTIDOS',
    'FARINHAS_AMIDOS',
    'TEMPEROS_CONDIMENTOS',
    'SOPAS_CALDOS',
    'OUTROS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela alimento
CREATE TABLE IF NOT EXISTS "alimento" (
    "id"               TEXT NOT NULL,
    "nome"             VARCHAR(255) NOT NULL,
    "categoria"        "CategoriaAlimento" NOT NULL,
    "unidadePadrao"    VARCHAR(20) NOT NULL DEFAULT 'g',
    "porcaoPadrao"     DECIMAL(8,2) NOT NULL DEFAULT 100,
    "descricao"        TEXT,
    "calorias100g"     DECIMAL(8,2) NOT NULL,
    "proteinas100g"    DECIMAL(8,3) NOT NULL,
    "carboidratos100g" DECIMAL(8,3) NOT NULL,
    "gorduras100g"     DECIMAL(8,3) NOT NULL,
    "fibras100g"       DECIMAL(8,3) NOT NULL DEFAULT 0,
    "sodio100g"        DECIMAL(8,3) NOT NULL DEFAULT 0,
    "ativo"            BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alimento_pkey" PRIMARY KEY ("id")
);

-- Unique constraint no nome
DO $$ BEGIN
  ALTER TABLE "alimento" ADD CONSTRAINT "alimento_nome_key" UNIQUE ("nome");
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS "alimento_categoria_idx" ON "alimento"("categoria");
CREATE INDEX IF NOT EXISTS "alimento_nome_idx"      ON "alimento"("nome");
