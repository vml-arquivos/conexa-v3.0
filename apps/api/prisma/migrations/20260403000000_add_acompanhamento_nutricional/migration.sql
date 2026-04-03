-- Migration: Acompanhamento Individual Nutricional da Criança
-- Fase: feat/nutri-acompanhamento-individual
-- Estratégia: 100% aditiva — nenhuma coluna existente alterada, sem DROP, sem ALTER
-- Justificativa: feature nova que não pode ser implementada apenas com DevelopmentObservation
--   pois requer: status de caso, plano de cuidado estruturado, unicidade por criança,
--   orientações para professor/cozinha, próxima reavaliação e ativo/inativo.

-- CreateEnum: Status do caso nutricional
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusCasoNutricional') THEN
    CREATE TYPE "StatusCasoNutricional" AS ENUM (
      'MONITORAMENTO',
      'ATENCAO_MODERADA',
      'ATENCAO_ALTA',
      'CRITICO'
    );
  END IF;
END $$;

-- CreateTable: Acompanhamento nutricional individual
CREATE TABLE IF NOT EXISTS "acompanhamento_nutricional" (
    "id"                      TEXT          NOT NULL,
    "mantenedora_id"          TEXT          NOT NULL,
    "unit_id"                 TEXT          NOT NULL,
    "child_id"                TEXT          NOT NULL,
    "criado_por_id"           VARCHAR(255)  NOT NULL,
    "motivo_acompanhamento"   TEXT          NOT NULL,
    "status_caso"             "StatusCasoNutricional" NOT NULL DEFAULT 'MONITORAMENTO',
    "ativo"                   BOOLEAN       NOT NULL DEFAULT true,
    "objetivos"               TEXT,
    "conduta_atual"           TEXT,
    "restricoes_operacionais" TEXT,
    "substituicoes_seguras"   TEXT,
    "orientacoes_prof_cozinha" TEXT,
    "frequencia_revisao"      VARCHAR(100),
    "proxima_reavaliacao"     TIMESTAMP(3),
    "criado_em"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "acompanhamento_nutricional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "acompanhamento_nutricional_child_id_key"
  ON "acompanhamento_nutricional"("child_id");

CREATE INDEX IF NOT EXISTS "acompanhamento_nutricional_mantenedora_id_idx"
  ON "acompanhamento_nutricional"("mantenedora_id");

CREATE INDEX IF NOT EXISTS "acompanhamento_nutricional_unit_id_idx"
  ON "acompanhamento_nutricional"("unit_id");

CREATE INDEX IF NOT EXISTS "acompanhamento_nutricional_child_id_idx"
  ON "acompanhamento_nutricional"("child_id");

CREATE INDEX IF NOT EXISTS "acompanhamento_nutricional_status_caso_idx"
  ON "acompanhamento_nutricional"("status_caso");

CREATE INDEX IF NOT EXISTS "acompanhamento_nutricional_ativo_idx"
  ON "acompanhamento_nutricional"("ativo");

CREATE INDEX IF NOT EXISTS "acompanhamento_nutricional_proxima_reavaliacao_idx"
  ON "acompanhamento_nutricional"("proxima_reavaliacao");

-- AddForeignKey: child_id → child.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'acompanhamento_nutricional_child_id_fkey'
  ) THEN
    ALTER TABLE "acompanhamento_nutricional"
      ADD CONSTRAINT "acompanhamento_nutricional_child_id_fkey"
      FOREIGN KEY ("child_id") REFERENCES "child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: mantenedora_id → mantenedora.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'acompanhamento_nutricional_mantenedora_id_fkey'
  ) THEN
    ALTER TABLE "acompanhamento_nutricional"
      ADD CONSTRAINT "acompanhamento_nutricional_mantenedora_id_fkey"
      FOREIGN KEY ("mantenedora_id") REFERENCES "mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
