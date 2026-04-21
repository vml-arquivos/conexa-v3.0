-- Migration additive: adicionar campos de imagem, tags e indicadores ao DevelopmentObservation
-- Regra de Ouro: ZERO DROP, ZERO DELETE FROM, apenas ADD COLUMN IF NOT EXISTS

ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "atividade_arquivo_url" TEXT;
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "atividade_arquivo_nome" VARCHAR(255);
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "DevelopmentObservation" ADD COLUMN IF NOT EXISTS "indicadores" JSONB NOT NULL DEFAULT '{}';
