-- Ordens de Serviço (Manutenção) — migration ADITIVA: não altera nem remove dados existentes.

-- Novos valores de enum (idempotentes)
ALTER TYPE "RoleLevel" ADD VALUE IF NOT EXISTS 'MANUTENCAO';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'MANUTENCAO_EXECUTOR';

-- Enums novos
DO $$ BEGIN
  CREATE TYPE "ServiceOrderStatus" AS ENUM ('ABERTA','ACEITA','EM_EXECUCAO','AGUARDANDO_AVALIACAO','ENCERRADA','CANCELADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ServiceOrderPriority" AS ENUM ('BAIXA','MEDIA','ALTA','URGENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ServiceOrderCategory" AS ENUM ('ELETRICA','HIDRAULICA','ALVENARIA_PINTURA','MOBILIARIO','PORTAS_JANELAS','AREA_EXTERNA','EQUIPAMENTOS','TI_REDES','LIMPEZA_DEDETIZACAO','SEGURANCA','OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ServiceOrderResult" AS ENUM ('EXECUTADO','PARCIAL','NAO_EXECUTADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ServiceOrder" (
  "id" TEXT NOT NULL,
  "number" SERIAL NOT NULL,
  "mantenedoraId" VARCHAR(255) NOT NULL,
  "unitId" TEXT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" TEXT NOT NULL,
  "category" "ServiceOrderCategory" NOT NULL DEFAULT 'OUTRO',
  "priority" "ServiceOrderPriority" NOT NULL DEFAULT 'MEDIA',
  "location" VARCHAR(200) NOT NULL,
  "status" "ServiceOrderStatus" NOT NULL DEFAULT 'ABERTA',
  "requestedById" VARCHAR(255) NOT NULL,
  "assignedToId" VARCHAR(255),
  "dueDate" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "executionReport" TEXT,
  "executionResult" "ServiceOrderResult",
  "evaluationResult" "ServiceOrderResult",
  "evaluationNotes" TEXT,
  "evaluatedById" VARCHAR(255),
  "evaluatedAt" TIMESTAMP(3),
  "reopenCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ServiceOrderEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" VARCHAR(40) NOT NULL,
  "fromStatus" "ServiceOrderStatus",
  "toStatus" "ServiceOrderStatus",
  "message" TEXT,
  "authorId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ServiceOrderAttachment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kind" VARCHAR(20) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "path" VARCHAR(500) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedById" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceOrderAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceOrder_number_key" ON "ServiceOrder"("number");
CREATE INDEX IF NOT EXISTS "ServiceOrder_mantenedoraId_status_idx" ON "ServiceOrder"("mantenedoraId","status");
CREATE INDEX IF NOT EXISTS "ServiceOrder_unitId_status_idx" ON "ServiceOrder"("unitId","status");
CREATE INDEX IF NOT EXISTS "ServiceOrder_assignedToId_status_idx" ON "ServiceOrder"("assignedToId","status");
CREATE INDEX IF NOT EXISTS "ServiceOrder_requestedById_idx" ON "ServiceOrder"("requestedById");
CREATE INDEX IF NOT EXISTS "ServiceOrder_dueDate_idx" ON "ServiceOrder"("dueDate");
CREATE INDEX IF NOT EXISTS "ServiceOrderEvent_orderId_createdAt_idx" ON "ServiceOrderEvent"("orderId","createdAt");
CREATE INDEX IF NOT EXISTS "ServiceOrderAttachment_orderId_idx" ON "ServiceOrderAttachment"("orderId");

DO $$ BEGIN
  ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ServiceOrderEvent" ADD CONSTRAINT "ServiceOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ServiceOrderAttachment" ADD CONSTRAINT "ServiceOrderAttachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
