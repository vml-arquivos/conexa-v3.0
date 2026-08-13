-- Migration: Fase 1 — Fundação Técnica de IA
-- Adiciona 6 tabelas novas para orquestração, histórico, logs, prompts,
-- configuração e feedback de IA.
-- 100% ADITIVA — não altera, não remove nenhuma tabela ou coluna existente.
-- Todos os CREATE TABLE usam IF NOT EXISTS para segurança.

-- Enums (PostgreSQL)
DO $$ BEGIN
  CREATE TYPE "IaRequestType" AS ENUM (
    'ATIVIDADE', 'MICROGESTOS', 'RELATORIO_ALUNO', 'RELATORIO_TURMA',
    'ANALISE_PLANO', 'ANALISE_DIARIO', 'LEMBRETE', 'VARREDURA', 'TEXTO_PERSONALIZADO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IaRequestStatus" AS ENUM (
    'PENDENTE', 'PROCESSANDO', 'SUCESSO', 'FALHA', 'CANCELADO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IaResponseStatus" AS ENUM (
    'PENDENTE_REVISAO', 'APROVADO', 'REJEITADO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tabela: prompt_template (sem FK externa — criada primeiro)
CREATE TABLE IF NOT EXISTS "prompt_template" (
  "id"          TEXT NOT NULL,
  "name"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "template"    TEXT NOT NULL,
  "variables"   JSONB NOT NULL DEFAULT '[]',
  "version"     INTEGER NOT NULL DEFAULT 1,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdBy"   VARCHAR(255),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prompt_template_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "prompt_template_active_idx"   ON "prompt_template"("active");
CREATE INDEX IF NOT EXISTS "prompt_template_version_idx"  ON "prompt_template"("version");

-- Tabela: ia_request
CREATE TABLE IF NOT EXISTS "ia_request" (
  "id"            TEXT NOT NULL,
  "mantenedoraId" TEXT NOT NULL,
  "unitId"        TEXT NOT NULL,
  "requesterId"   TEXT NOT NULL,
  "type"          "IaRequestType" NOT NULL,
  "status"        "IaRequestStatus" NOT NULL DEFAULT 'PENDENTE',
  "payload"       JSONB NOT NULL,
  "promptId"      TEXT,
  "errorMessage"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt"     TIMESTAMP(3),
  "completedAt"   TIMESTAMP(3),
  CONSTRAINT "ia_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ia_request_mantenedoraId_fkey"
    FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE,
  CONSTRAINT "ia_request_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE,
  CONSTRAINT "ia_request_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ia_request_promptId_fkey"
    FOREIGN KEY ("promptId") REFERENCES "prompt_template"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "ia_request_mantenedoraId_idx" ON "ia_request"("mantenedoraId");
CREATE INDEX IF NOT EXISTS "ia_request_unitId_idx"        ON "ia_request"("unitId");
CREATE INDEX IF NOT EXISTS "ia_request_requesterId_idx"   ON "ia_request"("requesterId");
CREATE INDEX IF NOT EXISTS "ia_request_type_idx"          ON "ia_request"("type");
CREATE INDEX IF NOT EXISTS "ia_request_status_idx"        ON "ia_request"("status");
CREATE INDEX IF NOT EXISTS "ia_request_createdAt_idx"     ON "ia_request"("createdAt");

-- Tabela: ia_response
CREATE TABLE IF NOT EXISTS "ia_response" (
  "id"                   TEXT NOT NULL,
  "requestId"            TEXT NOT NULL,
  "result"               JSONB NOT NULL,
  "rawResponse"          TEXT,
  "promptUsed"           TEXT,
  "costTokensPrompt"     INTEGER,
  "costTokensCompletion" INTEGER,
  "totalCost"            DOUBLE PRECISION,
  "modelUsed"            VARCHAR(100),
  "status"               "IaResponseStatus" NOT NULL DEFAULT 'PENDENTE_REVISAO',
  "reviewedBy"           VARCHAR(255),
  "approved"             BOOLEAN,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ia_response_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "ia_response_requestId_key" UNIQUE ("requestId"),
  CONSTRAINT "ia_response_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "ia_request"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ia_response_requestId_idx" ON "ia_response"("requestId");
CREATE INDEX IF NOT EXISTS "ia_response_status_idx"    ON "ia_response"("status");
CREATE INDEX IF NOT EXISTS "ia_response_createdAt_idx" ON "ia_response"("createdAt");

-- Tabela: ia_log
CREATE TABLE IF NOT EXISTS "ia_log" (
  "id"        TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "event"     VARCHAR(50) NOT NULL,
  "message"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ia_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ia_log_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "ia_request"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ia_log_requestId_idx" ON "ia_log"("requestId");
CREATE INDEX IF NOT EXISTS "ia_log_event_idx"     ON "ia_log"("event");
CREATE INDEX IF NOT EXISTS "ia_log_createdAt_idx" ON "ia_log"("createdAt");

-- Tabela: ia_config
CREATE TABLE IF NOT EXISTS "ia_config" (
  "id"            TEXT NOT NULL,
  "mantenedoraId" TEXT,
  "unitId"        TEXT,
  "key"           VARCHAR(100) NOT NULL,
  "value"         TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ia_config_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ia_config_mantenedoraId_unitId_key_key"
    UNIQUE ("mantenedoraId", "unitId", "key")
);
CREATE INDEX IF NOT EXISTS "ia_config_mantenedoraId_idx" ON "ia_config"("mantenedoraId");
CREATE INDEX IF NOT EXISTS "ia_config_unitId_idx"        ON "ia_config"("unitId");

-- Tabela: ia_feedback
CREATE TABLE IF NOT EXISTS "ia_feedback" (
  "id"         TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "rating"     INTEGER NOT NULL,
  "comment"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ia_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ia_feedback_responseId_fkey"
    FOREIGN KEY ("responseId") REFERENCES "ia_response"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "ia_feedback_responseId_idx" ON "ia_feedback"("responseId");
CREATE INDEX IF NOT EXISTS "ia_feedback_userId_idx"     ON "ia_feedback"("userId");
