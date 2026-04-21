-- Migration additive: MicrogestoRegistro, ChildProfileStats, AlertaAluno
-- feat/diario-zero-digitacao-agente-proativo
-- ZERO DROP/DELETE/ALTER COLUMN destrutivo

-- Enums
DO $$ BEGIN
  CREATE TYPE "MicrogestoCategoria" AS ENUM (
    'DESENVOLVIMENTO_MOTOR',
    'LINGUAGEM_COMUNICACAO',
    'INTERACAO_SOCIAL',
    'REGULACAO_EMOCIONAL',
    'COGNICAO_EXPLORACAO',
    'CUIDADO_SAUDE',
    'ALIMENTACAO',
    'AUTONOMIA'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MicrogestoNivel" AS ENUM (
    'ALCANCADO',
    'EM_DESENVOLVIMENTO',
    'REQUER_ATENCAO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertaTipo" AS ENUM (
    'EVASAO_RISCO',
    'FALTAS_CONSECUTIVAS',
    'FALTAS_FREQUENTES',
    'PADRAO_COMPORTAMENTO_NEGATIVO',
    'PADRAO_ALIMENTACAO_NEGATIVO',
    'PADRAO_SAUDE_NEGATIVO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertaStatus" AS ENUM (
    'ATIVO',
    'LIDO',
    'RESOLVIDO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Tabela microgesto_registro
CREATE TABLE IF NOT EXISTS "microgesto_registro" (
  "id"               TEXT NOT NULL,
  "childId"          TEXT NOT NULL,
  "classroomId"      TEXT NOT NULL,
  "diaryEventId"     TEXT,
  "professorId"      TEXT NOT NULL,
  "unitId"           TEXT NOT NULL,
  "mantenedoraId"    TEXT NOT NULL,
  "data"             TIMESTAMP(3) NOT NULL,
  "categoria"        "MicrogestoCategoria" NOT NULL,
  "nivel"            "MicrogestoNivel" NOT NULL,
  "tags"             JSONB NOT NULL DEFAULT '[]',
  "descricao"        VARCHAR(500),
  "campoExperiencia" VARCHAR(100),
  "horario"          VARCHAR(10),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "microgesto_registro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "microgesto_registro_childId_idx"       ON "microgesto_registro"("childId");
CREATE INDEX IF NOT EXISTS "microgesto_registro_classroomId_idx"   ON "microgesto_registro"("classroomId");
CREATE INDEX IF NOT EXISTS "microgesto_registro_unitId_idx"        ON "microgesto_registro"("unitId");
CREATE INDEX IF NOT EXISTS "microgesto_registro_mantenedoraId_idx" ON "microgesto_registro"("mantenedoraId");
CREATE INDEX IF NOT EXISTS "microgesto_registro_data_idx"          ON "microgesto_registro"("data");

-- Tabela child_profile_stats
CREATE TABLE IF NOT EXISTS "child_profile_stats" (
  "id"                      TEXT NOT NULL,
  "childId"                 TEXT NOT NULL,
  "unitId"                  TEXT NOT NULL,
  "mantenedoraId"           TEXT NOT NULL,
  "totalDiasRegistrados"    INTEGER NOT NULL DEFAULT 0,
  "totalFaltas"             INTEGER NOT NULL DEFAULT 0,
  "faltasUltimos30Dias"     INTEGER NOT NULL DEFAULT 0,
  "faltasConsecutivas"      INTEGER NOT NULL DEFAULT 0,
  "ultimaPresenca"          TIMESTAMP(3),
  "totalMicrogestos"        INTEGER NOT NULL DEFAULT 0,
  "microgestosCategoria"    JSONB NOT NULL DEFAULT '{}',
  "microgestosNivel"        JSONB NOT NULL DEFAULT '{}',
  "totalObservacoes"        INTEGER NOT NULL DEFAULT 0,
  "observacoesPorCategoria" JSONB NOT NULL DEFAULT '{}',
  "alertasAtivos"           INTEGER NOT NULL DEFAULT 0,
  "ultimaAtualizacao"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "child_profile_stats_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "child_profile_stats_childId_key" UNIQUE ("childId")
);

CREATE INDEX IF NOT EXISTS "child_profile_stats_unitId_idx"        ON "child_profile_stats"("unitId");
CREATE INDEX IF NOT EXISTS "child_profile_stats_mantenedoraId_idx" ON "child_profile_stats"("mantenedoraId");

-- Tabela alerta_aluno
CREATE TABLE IF NOT EXISTS "alerta_aluno" (
  "id"            TEXT NOT NULL,
  "childId"       TEXT NOT NULL,
  "classroomId"   TEXT NOT NULL,
  "unitId"        TEXT NOT NULL,
  "mantenedoraId" TEXT NOT NULL,
  "tipo"          "AlertaTipo" NOT NULL,
  "status"        "AlertaStatus" NOT NULL DEFAULT 'ATIVO',
  "titulo"        VARCHAR(255) NOT NULL,
  "descricao"     TEXT NOT NULL,
  "dados"         JSONB NOT NULL DEFAULT '{}',
  "geradoEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lidoEm"        TIMESTAMP(3),
  "resolvidoEm"   TIMESTAMP(3),
  "resolvidoPor"  TEXT,

  CONSTRAINT "alerta_aluno_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "alerta_aluno_childId_idx"     ON "alerta_aluno"("childId");
CREATE INDEX IF NOT EXISTS "alerta_aluno_classroomId_idx" ON "alerta_aluno"("classroomId");
CREATE INDEX IF NOT EXISTS "alerta_aluno_unitId_idx"      ON "alerta_aluno"("unitId");
CREATE INDEX IF NOT EXISTS "alerta_aluno_status_idx"      ON "alerta_aluno"("status");

-- Foreign keys (additive — não destrutivo)
ALTER TABLE "microgesto_registro"
  ADD CONSTRAINT IF NOT EXISTS "microgesto_registro_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "microgesto_registro_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "microgesto_registro_professorId_fkey"
    FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "child_profile_stats"
  ADD CONSTRAINT IF NOT EXISTS "child_profile_stats_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alerta_aluno"
  ADD CONSTRAINT IF NOT EXISTS "alerta_aluno_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS "alerta_aluno_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
