-- AlterTable
ALTER TABLE "child_profile_stats" ADD COLUMN "obs_ultimos_7_dias" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "obs_ultimos_30_dias" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "participacao_media" DOUBLE PRECISION,
ADD COLUMN "ultima_observacao" TIMESTAMP(3),
ADD COLUMN "tendencia_comportamento" TEXT;
