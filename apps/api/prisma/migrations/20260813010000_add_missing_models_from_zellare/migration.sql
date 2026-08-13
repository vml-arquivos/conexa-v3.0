-- Migration: 20260813010000_add_missing_models_from_zellare
-- Adiciona models que existem no código mas faltavam no schema:
-- EmpresaTransporte, IaRequest, IaResponse, IaLog, IaFeedback, PromptTemplate
-- AlertaAluno, ChildProfileStats, e enums relacionados
-- Idempotente: usa IF NOT EXISTS em todas as criações

-- ── Enums novos ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IaRequestType') THEN
    CREATE TYPE "IaRequestType" AS ENUM ('ATIVIDADE', 'OBSERVACAO', 'RELATORIO', 'PLANO', 'GERAL');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IaRequestStatus') THEN
    CREATE TYPE "IaRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IaResponseStatus') THEN
    CREATE TYPE "IaResponseStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'REJECTED', 'REVISED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MicrogestoCategoria') THEN
    CREATE TYPE "MicrogestoCategoria" AS ENUM ('HIGIENE', 'ALIMENTACAO', 'SONO', 'BRINCADEIRA', 'APRENDIZADO', 'SOCIAL', 'EMOCIONAL', 'OUTRO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MicrogestoNivel') THEN
    CREATE TYPE "MicrogestoNivel" AS ENUM ('INICIANDO', 'EM_DESENVOLVIMENTO', 'CONSOLIDADO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertaTipo') THEN
    CREATE TYPE "AlertaTipo" AS ENUM ('SAUDE', 'COMPORTAMENTO', 'PEDAGOGICO', 'ADMINISTRATIVO', 'OUTRO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertaStatus') THEN
    CREATE TYPE "AlertaStatus" AS ENUM ('ATIVO', 'RESOLVIDO', 'DESCARTADO');
  END IF;
END $$;

-- ── EmpresaTransporte ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmpresaTransporte" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mantenedoraId" TEXT NOT NULL,
  "nome"          VARCHAR(255) NOT NULL,
  "cnpj"          VARCHAR(20),
  "contato"       TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── PromptTemplate ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PromptTemplate" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mantenedoraId" TEXT NOT NULL,
  "name"          VARCHAR(255) NOT NULL,
  "type"          VARCHAR(100) NOT NULL DEFAULT 'GERAL',
  "content"       TEXT NOT NULL,
  "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── IaRequest ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "IaRequest" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mantenedoraId" TEXT NOT NULL,
  "userId"        TEXT,
  "type"          "IaRequestType" NOT NULL DEFAULT 'GERAL',
  "status"        "IaRequestStatus" NOT NULL DEFAULT 'PENDING',
  "payload"       JSONB,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── IaResponse ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "IaResponse" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "requestId"     TEXT NOT NULL,
  "status"        "IaResponseStatus" NOT NULL DEFAULT 'DRAFT',
  "content"       TEXT,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── IaLog ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "IaLog" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "requestId"  TEXT,
  "message"    TEXT NOT NULL,
  "level"      VARCHAR(20) NOT NULL DEFAULT 'INFO',
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── IaFeedback ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "IaFeedback" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "requestId"  TEXT,
  "userId"     TEXT,
  "rating"     INTEGER,
  "comment"    TEXT,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── AlertaAluno ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AlertaAluno" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "childId"     TEXT NOT NULL,
  "tipo"        "AlertaTipo" NOT NULL DEFAULT 'OUTRO',
  "status"      "AlertaStatus" NOT NULL DEFAULT 'ATIVO',
  "descricao"   TEXT NOT NULL,
  "createdBy"   TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── ChildProfileStats ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ChildProfileStats" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "childId"     TEXT NOT NULL UNIQUE,
  "totalObs"    INTEGER NOT NULL DEFAULT 0,
  "lastObsAt"   TIMESTAMP,
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── MicrogestoRegistro ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "MicrogestoRegistro" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "childId"     TEXT NOT NULL,
  "classroomId" TEXT,
  "categoria"   "MicrogestoCategoria" NOT NULL DEFAULT 'OUTRO',
  "nivel"       "MicrogestoNivel" NOT NULL DEFAULT 'INICIANDO',
  "descricao"   TEXT,
  "data"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdBy"   TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Campos extras em Child (idempotente) ─────────────────────────────────────
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "endereco"         VARCHAR(255);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "cep"              VARCHAR(10);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "dadosResponsaveis" JSONB;

-- ── Campo tags em DevelopmentObservation (idempotente) ───────────────────────
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
