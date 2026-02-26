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
  CREATE TYPE "observation_category" AS ENUM (
    'COMPORTAMENTO','DESENVOLVIMENTO','SAUDE','APRENDIZAGEM','GERAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "report_type" AS ENUM (
    'RDI','RIA','RDIC','BIMESTRAL','SEMESTRAL','ANUAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "post_type" AS ENUM (
    'TAREFA','AVISO','ATIVIDADE','MATERIAL','REGISTRO','PLANEJAMENTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "post_status" AS ENUM (
    'RASCUNHO','PUBLICADO','ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "recado_destinatario" AS ENUM (
    'TODAS_PROFESSORAS','TURMA_ESPECIFICA','PROFESSOR_ESPECIFICO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. DevelopmentObservation — tabela JÁ EXISTE, adicionar apenas colunas faltantes ──

ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "classroom_id"           TEXT;
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "diary_event_id"          TEXT;
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "planning_participation" TEXT;
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "psychological_notes"    TEXT;
ALTER TABLE "development_observation" ADD COLUMN IF NOT EXISTS "development_alerts"     TEXT;

CREATE INDEX IF NOT EXISTS "DevelopmentObservation_childId_idx"     ON "development_observation"("child_id");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_classroomId_idx" ON "development_observation"("classroom_id");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_date_idx"        ON "development_observation"("date");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_category_idx"    ON "development_observation"("category");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_createdBy_idx"   ON "development_observation"("created_by");

DO $$ BEGIN
  ALTER TABLE "development_observation"
    ADD CONSTRAINT "DevelopmentObservation_childId_fkey"
    FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. DevelopmentReport — tabela JÁ EXISTE completa, apenas índices/FK ─────

CREATE INDEX IF NOT EXISTS "DevelopmentReport_childId_idx"           ON "development_report"("child_id");
CREATE INDEX IF NOT EXISTS "DevelopmentReport_startDate_endDate_idx" ON "development_report"("start_date", "end_date");

DO $$ BEGIN
  ALTER TABLE "development_report"
    ADD CONSTRAINT "DevelopmentReport_childId_fkey"
    FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. MaterialRequestItem — tabela JÁ EXISTE com schema diferente ──────────
-- A tabela existe com: requestId, materialId, quantity, unitPrice, totalPrice,
-- observations, createdAt, updatedAt
-- Adicionar apenas colunas novas que o sistema precisa (item, quantidade, unidade)
-- NÃO recriar a tabela, NÃO criar índice em colunas que não existem

ALTER TABLE "material_request_item" ADD COLUMN IF NOT EXISTS "item"       VARCHAR(255);
ALTER TABLE "material_request_item" ADD COLUMN IF NOT EXISTS "quantidade" INTEGER;
ALTER TABLE "material_request_item" ADD COLUMN IF NOT EXISTS "unidade"    VARCHAR(50);

CREATE INDEX IF NOT EXISTS "MaterialRequestItem_requestId_idx" ON "material_request_item"("request_id");

-- ─── 5. ClassroomPost — NÃO EXISTE → criar ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "classroom_post" (
    "id"            TEXT NOT NULL,
    "classroom_id"   TEXT NOT NULL,
    "mantenedora_id" TEXT NOT NULL,
    "unit_id"        TEXT NOT NULL,
    "type"          "post_type" NOT NULL DEFAULT 'TAREFA',
    "status"        "post_status" NOT NULL DEFAULT 'PUBLICADO',
    "title"         VARCHAR(255) NOT NULL,
    "content"       TEXT NOT NULL,
    "planning_id"    TEXT,
    "due_date"       TIMESTAMP(3),
    "created_by"     TEXT NOT NULL,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassroomPost_classroomId_idx"   ON "classroom_post"("classroom_id");
CREATE INDEX IF NOT EXISTS "ClassroomPost_mantenedoraId_idx" ON "classroom_post"("mantenedora_id");
CREATE INDEX IF NOT EXISTS "ClassroomPost_createdAt_idx"     ON "classroom_post"("created_at");

DO $$ BEGIN
  ALTER TABLE "classroom_post"
    ADD CONSTRAINT "ClassroomPost_classroomId_fkey"
    FOREIGN KEY ("classroom_id") REFERENCES "classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 6. ClassroomPostFile — NÃO EXISTE → criar ───────────────────────────────

CREATE TABLE IF NOT EXISTS "classroom_post_file" (
    "id"           TEXT NOT NULL,
    "post_id"       TEXT NOT NULL,
    "nome_original" VARCHAR(255) NOT NULL,
    "url"          VARCHAR(500) NOT NULL,
    "mime_type"     VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    "tamanho_bytes" INTEGER NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomPostFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassroomPostFile_postId_idx" ON "classroom_post_file"("post_id");

DO $$ BEGIN
  ALTER TABLE "classroom_post_file"
    ADD CONSTRAINT "ClassroomPostFile_postId_fkey"
    FOREIGN KEY ("post_id") REFERENCES "classroom_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 7. StudentPostPerformance — NÃO EXISTE → criar ─────────────────────────

CREATE TABLE IF NOT EXISTS "student_post_performance" (
    "id"          TEXT NOT NULL,
    "post_id"      TEXT NOT NULL,
    "child_id"     TEXT NOT NULL,
    "performance" VARCHAR(50) NOT NULL DEFAULT 'NAO_AVALIADO',
    "notes"       TEXT,
    "created_by"   TEXT NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentPostPerformance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentPostPerformance_postId_childId_key" UNIQUE ("post_id", "child_id")
);

CREATE INDEX IF NOT EXISTS "StudentPostPerformance_postId_idx"  ON "student_post_performance"("post_id");
CREATE INDEX IF NOT EXISTS "StudentPostPerformance_childId_idx" ON "student_post_performance"("child_id");

DO $$ BEGIN
  ALTER TABLE "student_post_performance"
    ADD CONSTRAINT "StudentPostPerformance_postId_fkey"
    FOREIGN KEY ("post_id") REFERENCES "classroom_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_post_performance"
    ADD CONSTRAINT "StudentPostPerformance_childId_fkey"
    FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 8. RecadoTurma — NÃO EXISTE → criar ────────────────────────────────────

CREATE TABLE IF NOT EXISTS "recado_turma" (
    "id"            TEXT NOT NULL,
    "mantenedora_id" TEXT NOT NULL,
    "unit_id"        TEXT NOT NULL,
    "classroom_id"   TEXT,
    "destinatario"  "recado_destinatario" NOT NULL DEFAULT 'TODAS_PROFESSORAS',
    "professor_id"   TEXT,
    "titulo"        VARCHAR(255) NOT NULL,
    "mensagem"      TEXT NOT NULL,
    "importante"    BOOLEAN NOT NULL DEFAULT false,
    "criado_por_id"   TEXT NOT NULL,
    "criado_em"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at"     TIMESTAMP(3),
    CONSTRAINT "RecadoTurma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RecadoTurma_unitId_idx"      ON "recado_turma"("unit_id");
CREATE INDEX IF NOT EXISTS "RecadoTurma_classroomId_idx" ON "recado_turma"("classroom_id");
CREATE INDEX IF NOT EXISTS "RecadoTurma_criadoEm_idx"    ON "recado_turma"("criado_em");

DO $$ BEGIN
  ALTER TABLE "recado_turma"
    ADD CONSTRAINT "RecadoTurma_unitId_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 9. RecadoLeitura — NÃO EXISTE → criar ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "recado_leitura" (
    "id"       TEXT NOT NULL,
    "recado_id" TEXT NOT NULL,
    "user_id"   TEXT NOT NULL,
    "lido_em"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecadoLeitura_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RecadoLeitura_recadoId_userId_key" UNIQUE ("recado_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "RecadoLeitura_recadoId_idx" ON "recado_leitura"("recado_id");
CREATE INDEX IF NOT EXISTS "RecadoLeitura_userId_idx"   ON "recado_leitura"("user_id");

DO $$ BEGIN
  ALTER TABLE "recado_leitura"
    ADD CONSTRAINT "RecadoLeitura_recadoId_fkey"
    FOREIGN KEY ("recado_id") REFERENCES "recado_turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
