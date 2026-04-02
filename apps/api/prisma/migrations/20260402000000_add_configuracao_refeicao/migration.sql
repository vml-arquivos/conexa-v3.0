-- Migration: Fase 2 - Refeições Configuráveis por Unidade
-- Criação da tabela configuracao_refeicao e adição da FK em cardapio_refeicao
-- Estratégia: 100% backward-compatible (dados existentes não são afetados)

-- CreateTable: Configurações de refeição personalizadas por unidade
CREATE TABLE IF NOT EXISTS "configuracao_refeicao" (
    "id"        TEXT          NOT NULL,
    "unitId"    TEXT          NOT NULL,
    "nome"      VARCHAR(100)  NOT NULL,
    "horario"   VARCHAR(5),
    "ordem"     INTEGER       NOT NULL DEFAULT 0,
    "ativo"     BOOLEAN       NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)  NOT NULL,

    CONSTRAINT "configuracao_refeicao_pkey" PRIMARY KEY ("id")
);

-- AddColumn: Referência opcional à configuração customizada em cardapio_refeicao
-- (coluna opcional — não afeta refeições existentes)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cardapio_refeicao' AND column_name = 'configuracaoRefeicaoId'
  ) THEN
    ALTER TABLE "cardapio_refeicao" ADD COLUMN "configuracaoRefeicaoId" TEXT;
  END IF;
END $$;

-- CreateIndex em configuracao_refeicao
CREATE INDEX IF NOT EXISTS "configuracao_refeicao_unitId_idx" ON "configuracao_refeicao"("unitId");
CREATE INDEX IF NOT EXISTS "configuracao_refeicao_ativo_idx" ON "configuracao_refeicao"("ativo");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracao_refeicao_unitId_nome_key'
  ) THEN
    ALTER TABLE "configuracao_refeicao"
      ADD CONSTRAINT "configuracao_refeicao_unitId_nome_key" UNIQUE ("unitId", "nome");
  END IF;
END $$;

-- CreateIndex em cardapio_refeicao
CREATE INDEX IF NOT EXISTS "cardapio_refeicao_configuracaoRefeicaoId_idx"
  ON "cardapio_refeicao"("configuracaoRefeicaoId");

-- AddForeignKey: configuracao_refeicao -> Unit
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracao_refeicao_unitId_fkey'
  ) THEN
    ALTER TABLE "configuracao_refeicao"
      ADD CONSTRAINT "configuracao_refeicao_unitId_fkey"
      FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: cardapio_refeicao -> configuracao_refeicao (opcional, SET NULL ao deletar)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cardapio_refeicao_configuracaoRefeicaoId_fkey'
  ) THEN
    ALTER TABLE "cardapio_refeicao"
      ADD CONSTRAINT "cardapio_refeicao_configuracaoRefeicaoId_fkey"
      FOREIGN KEY ("configuracaoRefeicaoId") REFERENCES "configuracao_refeicao"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
