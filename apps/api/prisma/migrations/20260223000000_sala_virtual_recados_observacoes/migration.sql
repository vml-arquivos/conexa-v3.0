-- ============================================================================
-- Migration: sala_virtual_recados_observacoes
-- Criada em: 2026-02-23 | Corrigida: 2026-02-23 (idempotente)
-- Adiciona:
--   1. DevelopmentObservation  — observações individuais por aluno (professor)
--   2. DevelopmentReport       — relatório consolidado de desenvolvimento
--   3. ClassroomPost           — sala de aula virtual (tarefas/posts por turma)
--   4. ClassroomPostFile       — arquivos anexados a posts da sala virtual
--   5. StudentPostPerformance  — desempenho individual por post/tarefa
--   6. RecadoTurma             — recados da coordenadora para professoras/turma
--   7. RecadoLeitura           — controle de leitura dos recados
--   8. MaterialRequestItem     — itens detalhados de requisição de material
--   9. Enums novos             — ObservationCategory, ReportType, PostType, PostStatus, RecadoDestinatario
-- NOTA: Todos os CREATE TYPE e CREATE TABLE são idempotentes (IF NOT EXISTS / DO $$ EXCEPTION)
-- ============================================================================

-- ─── 1. Enums (idempotentes via DO $$ EXCEPTION WHEN duplicate_object) ────────

DO $$ BEGIN
  CREATE TYPE "ObservationCategory" AS ENUM (
    'COMPORTAMENTO',
    'DESENVOLVIMENTO',
    'SAUDE',
    'APRENDIZAGEM',
    'GERAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReportType" AS ENUM (
    'RDI',
    'RIA',
    'RDIC',
    'BIMESTRAL',
    'SEMESTRAL',
    'ANUAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PostType" AS ENUM (
    'TAREFA',
    'AVISO',
    'ATIVIDADE',
    'MATERIAL',
    'REGISTRO',
    'PLANEJAMENTO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PostStatus" AS ENUM (
    'RASCUNHO',
    'PUBLICADO',
    'ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RecadoDestinatario" AS ENUM (
    'TODAS_PROFESSORAS',
    'TURMA_ESPECIFICA',
    'PROFESSOR_ESPECIFICO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. DevelopmentObservation ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "DevelopmentObservation" (
    "id"                    TEXT NOT NULL,
    "childId"               TEXT NOT NULL,
    "classroomId"           TEXT,
    "diaryEventId"          TEXT,
    "date"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category"              "ObservationCategory" NOT NULL DEFAULT 'GERAL',
    "behaviorDescription"   TEXT,
    "socialInteraction"     TEXT,
    "emotionalState"        TEXT,
    "motorSkills"           TEXT,
    "cognitiveSkills"       TEXT,
    "languageSkills"        TEXT,
    "healthNotes"           TEXT,
    "dietaryNotes"          TEXT,
    "sleepPattern"          TEXT,
    "learningProgress"      TEXT,
    "planningParticipation" TEXT,
    "interests"             TEXT,
    "challenges"            TEXT,
    "psychologicalNotes"    TEXT,
    "developmentAlerts"     TEXT,
    "recommendations"       TEXT,
    "nextSteps"             TEXT,
    "createdBy"             TEXT NOT NULL,
    "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevelopmentObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DevelopmentObservation_childId_idx"      ON "DevelopmentObservation"("childId");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_classroomId_idx"  ON "DevelopmentObservation"("classroomId");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_date_idx"         ON "DevelopmentObservation"("date");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_category_idx"     ON "DevelopmentObservation"("category");
CREATE INDEX IF NOT EXISTS "DevelopmentObservation_createdBy_idx"    ON "DevelopmentObservation"("createdBy");

DO $$ BEGIN
  ALTER TABLE "DevelopmentObservation"
    ADD CONSTRAINT "DevelopmentObservation_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. DevelopmentReport ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "DevelopmentReport" (
    "id"                  TEXT NOT NULL,
    "childId"             TEXT NOT NULL,
    "startDate"           TIMESTAMP(3) NOT NULL,
    "endDate"             TIMESTAMP(3) NOT NULL,
    "reportType"          "ReportType" NOT NULL DEFAULT 'BIMESTRAL',
    "behaviorSummary"     TEXT NOT NULL DEFAULT '',
    "developmentSummary"  TEXT NOT NULL DEFAULT '',
    "healthSummary"       TEXT NOT NULL DEFAULT '',
    "learningSummary"     TEXT NOT NULL DEFAULT '',
    "overallAssessment"   TEXT NOT NULL DEFAULT '',
    "recommendations"     TEXT NOT NULL DEFAULT '',
    "generatedBy"         TEXT NOT NULL,
    "generatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy"          TEXT,
    "approvedAt"          TIMESTAMP(3),
    CONSTRAINT "DevelopmentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DevelopmentReport_childId_idx"              ON "DevelopmentReport"("childId");
CREATE INDEX IF NOT EXISTS "DevelopmentReport_startDate_endDate_idx"    ON "DevelopmentReport"("startDate", "endDate");

DO $$ BEGIN
  ALTER TABLE "DevelopmentReport"
    ADD CONSTRAINT "DevelopmentReport_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 4. ClassroomPost ────────────────────────────────────────────────────────

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

-- ─── 5. ClassroomPostFile ────────────────────────────────────────────────────

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

-- ─── 6. StudentPostPerformance ───────────────────────────────────────────────

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

-- ─── 7. RecadoTurma ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "RecadoTurma" (
    "id"             TEXT NOT NULL,
    "mantenedoraId"  TEXT NOT NULL,
    "unitId"         TEXT NOT NULL,
    "classroomId"    TEXT,
    "destinatario"   "RecadoDestinatario" NOT NULL DEFAULT 'TODAS_PROFESSORAS',
    "professorId"    TEXT,
    "titulo"         VARCHAR(255) NOT NULL,
    "mensagem"       TEXT NOT NULL,
    "importante"     BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId"    TEXT NOT NULL,
    "criadoEm"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"      TIMESTAMP(3),
    CONSTRAINT "RecadoTurma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RecadoTurma_unitId_idx"     ON "RecadoTurma"("unitId");
CREATE INDEX IF NOT EXISTS "RecadoTurma_classroomId_idx" ON "RecadoTurma"("classroomId");
CREATE INDEX IF NOT EXISTS "RecadoTurma_criadoEm_idx"   ON "RecadoTurma"("criadoEm");

DO $$ BEGIN
  ALTER TABLE "RecadoTurma"
    ADD CONSTRAINT "RecadoTurma_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 8. RecadoLeitura ────────────────────────────────────────────────────────

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

-- ─── 9. MaterialRequestItem ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MaterialRequestItem" (
    "id"                TEXT NOT NULL,
    "materialRequestId" TEXT NOT NULL,
    "item"              VARCHAR(255) NOT NULL,
    "quantidade"        INTEGER NOT NULL DEFAULT 1,
    "unidade"           VARCHAR(50) NOT NULL DEFAULT 'unidade(s)',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaterialRequestItem_materialRequestId_idx" ON "MaterialRequestItem"("materialRequestId");

DO $$ BEGIN
  ALTER TABLE "MaterialRequestItem"
    ADD CONSTRAINT "MaterialRequestItem_materialRequestId_fkey"
    FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
