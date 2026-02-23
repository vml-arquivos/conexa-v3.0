-- ============================================================================
-- Migration: sala_virtual_recados_observacoes
-- Criada em: 2026-02-23
-- Adiciona:
--   1. DevelopmentObservation  — observações individuais por aluno (professor)
--   2. DevelopmentReport       — relatório consolidado de desenvolvimento
--   3. ClassroomPost           — sala de aula virtual (tarefas/posts por turma)
--   4. ClassroomPostFile       — arquivos anexados a posts da sala virtual
--   5. RecadoTurma             — recados da coordenadora para professoras/turma
--   6. MaterialRequestItem     — itens detalhados de requisição de material
--   7. Enums novos             — ObservationCategory, ReportType, PostType
-- ============================================================================

-- ─── 1. Enums ────────────────────────────────────────────────────────────────

CREATE TYPE "ObservationCategory" AS ENUM (
  'COMPORTAMENTO',
  'DESENVOLVIMENTO',
  'SAUDE',
  'APRENDIZAGEM',
  'GERAL'
);

CREATE TYPE "ReportType" AS ENUM (
  'RDI',
  'RIA',
  'RDIC',
  'BIMESTRAL',
  'SEMESTRAL',
  'ANUAL'
);

CREATE TYPE "PostType" AS ENUM (
  'TAREFA',
  'AVISO',
  'ATIVIDADE',
  'MATERIAL',
  'REGISTRO',
  'PLANEJAMENTO'
);

CREATE TYPE "PostStatus" AS ENUM (
  'RASCUNHO',
  'PUBLICADO',
  'ARQUIVADO'
);

CREATE TYPE "RecadoDestinatario" AS ENUM (
  'TODAS_PROFESSORAS',
  'TURMA_ESPECIFICA',
  'PROFESSOR_ESPECIFICO'
);

-- ─── 2. DevelopmentObservation ───────────────────────────────────────────────
-- Observações individuais por aluno registradas pelo professor no diário

CREATE TABLE "DevelopmentObservation" (
    "id"                  TEXT NOT NULL,
    "childId"             TEXT NOT NULL,
    "classroomId"         TEXT,
    "diaryEventId"        TEXT,
    "date"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category"            "ObservationCategory" NOT NULL DEFAULT 'GERAL',
    -- Comportamento
    "behaviorDescription" TEXT,
    "socialInteraction"   TEXT,
    "emotionalState"      TEXT,
    -- Desenvolvimento físico/motor
    "motorSkills"         TEXT,
    "cognitiveSkills"     TEXT,
    "languageSkills"      TEXT,
    -- Saúde e bem-estar
    "healthNotes"         TEXT,
    "dietaryNotes"        TEXT,
    "sleepPattern"        TEXT,
    -- Pedagógico
    "learningProgress"    TEXT,
    "planningParticipation" TEXT,
    "interests"           TEXT,
    "challenges"          TEXT,
    -- Psicológico / desenvolvimento integral
    "psychologicalNotes"  TEXT,
    "developmentAlerts"   TEXT,
    -- Recomendações
    "recommendations"     TEXT,
    "nextSteps"           TEXT,
    -- Metadados
    "createdBy"           TEXT NOT NULL,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DevelopmentObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DevelopmentObservation_childId_idx" ON "DevelopmentObservation"("childId");
CREATE INDEX "DevelopmentObservation_classroomId_idx" ON "DevelopmentObservation"("classroomId");
CREATE INDEX "DevelopmentObservation_date_idx" ON "DevelopmentObservation"("date");
CREATE INDEX "DevelopmentObservation_category_idx" ON "DevelopmentObservation"("category");
CREATE INDEX "DevelopmentObservation_createdBy_idx" ON "DevelopmentObservation"("createdBy");

ALTER TABLE "DevelopmentObservation"
  ADD CONSTRAINT "DevelopmentObservation_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. DevelopmentReport ────────────────────────────────────────────────────
-- Relatório consolidado de desenvolvimento (gerado periodicamente)

CREATE TABLE "DevelopmentReport" (
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

CREATE INDEX "DevelopmentReport_childId_idx" ON "DevelopmentReport"("childId");
CREATE INDEX "DevelopmentReport_startDate_endDate_idx" ON "DevelopmentReport"("startDate", "endDate");

ALTER TABLE "DevelopmentReport"
  ADD CONSTRAINT "DevelopmentReport_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 4. ClassroomPost ────────────────────────────────────────────────────────
-- Sala de Aula Virtual: posts/tarefas criados pelo professor por turma

CREATE TABLE "ClassroomPost" (
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

CREATE INDEX "ClassroomPost_classroomId_idx" ON "ClassroomPost"("classroomId");
CREATE INDEX "ClassroomPost_mantenedoraId_idx" ON "ClassroomPost"("mantenedoraId");
CREATE INDEX "ClassroomPost_createdAt_idx" ON "ClassroomPost"("createdAt");

ALTER TABLE "ClassroomPost"
  ADD CONSTRAINT "ClassroomPost_classroomId_fkey"
  FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 5. ClassroomPostFile ────────────────────────────────────────────────────
-- Arquivos anexados a posts da sala virtual

CREATE TABLE "ClassroomPostFile" (
    "id"           TEXT NOT NULL,
    "postId"       TEXT NOT NULL,
    "nomeOriginal" VARCHAR(255) NOT NULL,
    "url"          VARCHAR(500) NOT NULL,
    "mimeType"     VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    "tamanhoBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassroomPostFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassroomPostFile_postId_idx" ON "ClassroomPostFile"("postId");

ALTER TABLE "ClassroomPostFile"
  ADD CONSTRAINT "ClassroomPostFile_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "ClassroomPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 6. StudentPostPerformance ───────────────────────────────────────────────
-- Desempenho individual de cada aluno em um post/tarefa

CREATE TABLE "StudentPostPerformance" (
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

CREATE INDEX "StudentPostPerformance_postId_idx" ON "StudentPostPerformance"("postId");
CREATE INDEX "StudentPostPerformance_childId_idx" ON "StudentPostPerformance"("childId");

ALTER TABLE "StudentPostPerformance"
  ADD CONSTRAINT "StudentPostPerformance_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "ClassroomPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentPostPerformance"
  ADD CONSTRAINT "StudentPostPerformance_childId_fkey"
  FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 7. RecadoTurma ──────────────────────────────────────────────────────────
-- Recados da coordenadora para professoras (por turma, por unidade ou geral)

CREATE TABLE "RecadoTurma" (
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

CREATE INDEX "RecadoTurma_unitId_idx" ON "RecadoTurma"("unitId");
CREATE INDEX "RecadoTurma_classroomId_idx" ON "RecadoTurma"("classroomId");
CREATE INDEX "RecadoTurma_criadoEm_idx" ON "RecadoTurma"("criadoEm");

ALTER TABLE "RecadoTurma"
  ADD CONSTRAINT "RecadoTurma_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 8. RecadoLeitura ────────────────────────────────────────────────────────
-- Controle de leitura dos recados por professor

CREATE TABLE "RecadoLeitura" (
    "id"         TEXT NOT NULL,
    "recadoId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "lidoEm"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecadoLeitura_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RecadoLeitura_recadoId_userId_key" UNIQUE ("recadoId", "userId")
);

CREATE INDEX "RecadoLeitura_recadoId_idx" ON "RecadoLeitura"("recadoId");
CREATE INDEX "RecadoLeitura_userId_idx" ON "RecadoLeitura"("userId");

ALTER TABLE "RecadoLeitura"
  ADD CONSTRAINT "RecadoLeitura_recadoId_fkey"
  FOREIGN KEY ("recadoId") REFERENCES "RecadoTurma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 9. MaterialRequestItem ──────────────────────────────────────────────────
-- Itens individuais de uma requisição de material (já existe no schema, adiciona tabela)

CREATE TABLE "MaterialRequestItem" (
    "id"               TEXT NOT NULL,
    "materialRequestId" TEXT NOT NULL,
    "item"             VARCHAR(255) NOT NULL,
    "quantidade"       INTEGER NOT NULL DEFAULT 1,
    "unidade"          VARCHAR(50) NOT NULL DEFAULT 'unidade(s)',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaterialRequestItem_materialRequestId_idx" ON "MaterialRequestItem"("materialRequestId");

ALTER TABLE "MaterialRequestItem"
  ADD CONSTRAINT "MaterialRequestItem_materialRequestId_fkey"
  FOREIGN KEY ("materialRequestId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
