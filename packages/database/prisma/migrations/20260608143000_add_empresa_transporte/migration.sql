-- CreateTable
-- Corrige erro 500 em /empresas-transporte quando o código já referencia o model,
-- mas a tabela ainda não existe no banco de produção.
CREATE TABLE IF NOT EXISTS "EmpresaTransporte" (
    "id" TEXT NOT NULL,
    "mantenedoraId" TEXT NOT NULL,
    "unitId" TEXT,
    "nome" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(20),
    "telefone" VARCHAR(20),
    "responsavel" VARCHAR(255),
    "placa" VARCHAR(20),
    "observacoes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(255),
    "updatedBy" VARCHAR(255),

    CONSTRAINT "EmpresaTransporte_pkey" PRIMARY KEY ("id")
);

-- AddColumn, caso a tabela tenha sido criada manualmente sem todos os campos usados pela tela.
ALTER TABLE "EmpresaTransporte" ADD COLUMN IF NOT EXISTS "cnpj" VARCHAR(20);
ALTER TABLE "EmpresaTransporte" ADD COLUMN IF NOT EXISTS "responsavel" VARCHAR(255);
ALTER TABLE "EmpresaTransporte" ADD COLUMN IF NOT EXISTS "placa" VARCHAR(20);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmpresaTransporte_mantenedoraId_idx" ON "EmpresaTransporte"("mantenedoraId");
CREATE INDEX IF NOT EXISTS "EmpresaTransporte_unitId_idx" ON "EmpresaTransporte"("unitId");
CREATE INDEX IF NOT EXISTS "EmpresaTransporte_isActive_idx" ON "EmpresaTransporte"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "EmpresaTransporte_mantenedoraId_unitId_nome_key" ON "EmpresaTransporte"("mantenedoraId", "unitId", "nome");

-- AddForeignKey de forma idempotente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmpresaTransporte_mantenedoraId_fkey'
    ) THEN
        ALTER TABLE "EmpresaTransporte" ADD CONSTRAINT "EmpresaTransporte_mantenedoraId_fkey"
        FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmpresaTransporte_unitId_fkey'
    ) THEN
        ALTER TABLE "EmpresaTransporte" ADD CONSTRAINT "EmpresaTransporte_unitId_fkey"
        FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
