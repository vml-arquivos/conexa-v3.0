-- AddColumn: campos estendidos para importação de unidade (CEPI)
-- Todos os campos são opcionais (nullable) — sem impacto em dados existentes.
-- Tabela "Child" sem @@map → nome PascalCase no banco.
ALTER TABLE "Child" ADD COLUMN "raca"      VARCHAR(50);
ALTER TABLE "Child" ADD COLUMN "peso"      VARCHAR(20);
ALTER TABLE "Child" ADD COLUMN "celPai"    VARCHAR(20);
ALTER TABLE "Child" ADD COLUMN "usoImagem" BOOLEAN;
ALTER TABLE "Child" ADD COLUMN "laudado"   BOOLEAN;
ALTER TABLE "Child" ADD COLUMN "nis"       VARCHAR(20);
