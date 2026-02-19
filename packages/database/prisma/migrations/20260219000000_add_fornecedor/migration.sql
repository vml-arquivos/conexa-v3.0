-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "inscricaoEstadual" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "celular" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "contato" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "mantenedoraId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fornecedor_mantenedoraId_idx" ON "Fornecedor"("mantenedoraId");

-- CreateIndex
CREATE INDEX "Fornecedor_cnpj_idx" ON "Fornecedor"("cnpj");

-- AddForeignKey
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_mantenedoraId_fkey" FOREIGN KEY ("mantenedoraId") REFERENCES "Mantenedora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
