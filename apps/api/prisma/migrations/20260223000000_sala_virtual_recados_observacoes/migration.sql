-- ============================================================================
-- Migration: sala_virtual_recados_observacoes
-- Versão FINAL: baseada no estado REAL do banco de produção (inspecionado em 2026-02-23)
--
-- Estado real do banco ANTES desta migration:
--   ✅ DevelopmentObservation — existe (20 colunas), faltam: classroomId, diaryEventId,
--      planningParticipation, psychologicalNotes, developmentAlerts
--   ✅ DevelopmentReport — existe completa (15 colunas) — apenas garantir índices/FK
--   ✅ MaterialRequestItem — existe com schema DIFERENTE (requestId, materialId, etc.)
--      NÃO tem materialRequestId — não recriar, apenas adicionar colunas novas se necessário
--   ✅ ObservationCategory, ReportType — enums já existem
--   ❌ ClassroomPost, ClassroomPostFile, StudentPostPerformance — não existem → CREATE
--   ❌ RecadoTurma, RecadoLeitura — não existem → CREATE
--   ❌ PostType, PostStatus, RecadoDestinatario — não existem → CREATE
-- ============================================================================

-- ─── 1. Enums novos (PostType, PostStatus, RecadoDestinatario) ───────────────
-- ObservationCategory e ReportType já existem — usar DO $$ EXCEPTION por segurança

DO $$ BEGIN
  CREATE TYPE "ObservationCategory" AS ENUM (
    'COMPORTAMENTO','DESENVOLVIMENTO','SAUDE','APRENDIZAGEM','GERAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportType" AS ENUM (
    'RDI','RIA','RDIC','BIMESTRAL','SEMESTRAL','ANUAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PostType" AS ENUM (
    'TAREFA','AVISO','ATIVIDADE','MATERIAL','REGISTRO','PLANEJAMENTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PostStatus" AS ENUM (
    'RASCUNHO','PUBLICADO','ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecadoDestinatario" AS ENUM (
    'TODAS_PROFESSORAS','TURMA_ESPECIFICA','PROFESSOR_ESPECIFICO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. DevelopmentObservation — tabela JÁ EXISTE, adicionar apenas colunas faltantes ──

ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "classroomId"           TEXT;
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "diaryEventId"          TEXT;
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "planningParticipation" TEXT;
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "psychologicalNotes"    TEXT;
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "developmentAlerts"     TEXT;

CREATE INDEX IF NOT EXISTS "DevelopmentObservation_childId_idx"     ON "DevelopmentObservation"("childId");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_classroomId_idx" ON "DevelopmentObservation"("classroomId");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_date_idx"        ON "DevelopmentObservation"("date");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_category_idx"    ON "DevelopmentObservation"("category");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_createdBy_idx"   ON "DevelopmentObservation"("createdBy");

DO $$ BEGIN
  ALTER TABLE "DevelopmentObservation"
    ADD CONSTRAINT "DevelopmentObservation_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. DevelopmentReport — tabela JÁ EXISTE completa, apenas índices/FK ─────

CREATE INDEX IF NOT EXISTS "DevelopmentReport_childId_idx"           ON "DevelopmentReport"("childId");
CREATE INDEX IF NOT EXISTS "DevelopmentReport_startDate_endDate_idx" ON "DevelopmentReport"("startDate", "endDate");

DO $$ BEGIN
  ALTER TABLE "DevelopmentReport"
    ADD CONSTRAINT "DevelopmentReport_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. MaterialRequestItem — tabela JÁ EXISTE com schema diferente ──────────
-- A tabela existe com: requestId, materialId, quantity, unitPrice, totalPrice,
-- observations, createdAt, updatedAt
-- Adicionar apenas colunas novas que o sistema precisa (item, quantidade, unidade)
-- NÃO recriar a tabela, NÃO criar índice em colunas que não existem

ALTER TABLE "MaterialRequestItem" ADD COLUMN IF NOT EXISTS "item"       VARCHAR(255);
ALTER TABLE "MaterialRequestItem" ADD COLUMN IF NOT EXISTS "quantidade" INTEGER;
ALTER TABLE "MaterialRequestItem" ADD COLUMN IF NOT EXISTS "unidade"    VARCHAR(50);

CREATE INDEX IF NOT EXISTS "MaterialRequestItem_requestId_idx" ON "MaterialRequestItem"("requestId");

-- ─── 5. ClassroomPost — NÃO EXISTE → criar ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClassroomPost" (
    "id"            TEXT NOT NULL,
    "classroomId"   TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId"        TEXT NOT NULL,
    "type"          "PostType" NOT NULL DEFAULT 'TAREFA',
    "status"        "PostStatus" NOT NULL DEFAULT 'PUBLICADO',
    "title"         VARCHAR(255) NOT NULL,
    "content"       TEXT NOT NULL,
    "planningId"    TEXT,
    "dueDate"       TIMESTAMP(3),
    "createdBy"     TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassroomPost_classroomId_idx"   ON "ClassroomPost"("classroomId");
CREATE INDEX IF NOT EXISTS "ClassroomPost_mantenedoraId_idx" ON "ClassroomPost"("mantenedoraId");
CREATE INDEX IF NOT EXISTS "ClassroomPost_createdAt_idx"     ON "ClassroomPost"("createdAt");

DO $$ BEGIN
  ALTER TABLE "ClassroomPost"
    ADD CONSTRAINT "ClassroomPost_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. ClassroomPostFile — NÃO EXISTE → criar ───────────────────────────────

CREATE TABLE IF NOT EXISTS "ClassroomPostFile" (
    "id"           TEXT NOT NULL,
    "postId"       TEXT NOT NULL,
    "nomeOriginal" VARCHAR(255) NOT NULL,
    "url"          VARCHAR(500) NOT NULL,
    "mimeType"     VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    "tamanhoBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomPostFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassroomPostFile_postId_idx" ON "ClassroomPostFile"("postId");

DO $$ BEGIN
  ALTER TABLE "ClassroomPostFile"
    ADD CONSTRAINT "ClassroomPostFile_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "ClassroomPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 7. StudentPostPerformance — NÃO EXISTE → criar ─────────────────────────

CREATE TABLE IF NOT EXISTS "StudentPostPerformance" (
    "id"          TEXT NOT NULL,
    "postId"      TEXT NOT NULL,
    "childId"     TEXT NOT NULL,
    "performance" VARCHAR(50) NOT NULL DEFAULT 'NAO_AVALIADO',
    "notes"       TEXT,
    "createdBy"   TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentPostPerformance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentPostPerformance_postId_childId_key" UNIQUE ("postId", "childId")
);

CREATE INDEX IF NOT EXISTS "StudentPostPerformance_postId_idx"  ON "StudentPostPerformance"("postId");
CREATE INDEX IF NOT EXISTS "StudentPostPerformance_childId_idx" ON "StudentPostPerformance"("childId");

DO $$ BEGIN
  ALTER TABLE "StudentPostPerformance"
    ADD CONSTRAINT "StudentPostPerformance_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "ClassroomPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StudentPostPerformance"
    ADD CONSTRAINT "StudentPostPerformance_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 8. RecadoTurma — NÃO EXISTE → criar ────────────────────────────────────

CREATE TABLE IF NOT EXISTS "RecadoTurma" (
    "id"            TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId"        TEXT NOT NULL,
    "classroomId"   TEXT,
    "destinatario"  "RecadoDestinatario" NOT NULL DEFAULT 'TODAS_PROFESSORAS',
    "professorId"   TEXT,
    "titulo"        VARCHAR(255) NOT NULL,
    "mensagem"      TEXT NOT NULL,
    "importante"    BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId"   TEXT NOT NULL,
    "criadoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"     TIMESTAMP(3),
    CONSTRAINT "RecadoTurma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RecadoTurma_unitId_idx"      ON "RecadoTurma"("unitId");
CREATE INDEX IF NOT EXISTS "RecadoTurma_classroomId_idx" ON "RecadoTurma"("classroomId");
CREATE INDEX IF NOT EXISTS "RecadoTurma_criadoEm_idx"    ON "RecadoTurma"("criadoEm");

DO $$ BEGIN
  ALTER TABLE "RecadoTurma"
    ADD CONSTRAINT "RecadoTurma_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 9. RecadoLeitura — NÃO EXISTE → criar ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "RecadoLeitura" (
    "id"       TEXT NOT NULL,
    "recadoId" TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "lidoEm"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecadoLeitura_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RecadoLeitura_recadoId_userId_key" UNIQUE ("recadoId", "userId")
);

CREATE INDEX IF NOT EXISTS "RecadoLeitura_recadoId_idx" ON "RecadoLeitura"("recadoId");
CREATE INDEX IF NOT EXISTS "RecadoLeitura_userId_idx"   ON "RecadoLeitura"("userId");

DO $$ BEGIN
  ALTER TABLE "RecadoLeitura"
    ADD CONSTRAINT "RecadoLeitura_recadoId_fkey"
    FOREIGN KEY ("recadoId") REFERENCES "RecadoTurma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
