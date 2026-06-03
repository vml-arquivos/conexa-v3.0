-- Campos administrativos aditivos para ficha completa de matrícula da Secretaria.
-- Migração segura: apenas adiciona colunas opcionais ao model Child.

ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "nacionalidade" VARCHAR(100);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "naturalidade" VARCHAR(100);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "uf_nascimento" VARCHAR(2);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "endereco" VARCHAR(255);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "cep" VARCHAR(10);
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "dados_responsaveis" JSONB;
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "documentos_matricula" JSONB;
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "autorizados_retirada" JSONB;
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "transporte_escolar" JSONB;
ALTER TABLE "Child" ADD COLUMN IF NOT EXISTS "ficha_administrativa" JSONB;
