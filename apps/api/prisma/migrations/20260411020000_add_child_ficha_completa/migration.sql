-- AlterTable: adiciona campos de ficha completa do aluno
ALTER TABLE "Child" ADD COLUMN "codigoAluno"    VARCHAR(20);
ALTER TABLE "Child" ADD COLUMN "inscricao"      VARCHAR(20);
ALTER TABLE "Child" ADD COLUMN "nomeMae"        VARCHAR(255);
ALTER TABLE "Child" ADD COLUMN "nomePai"        VARCHAR(255);
ALTER TABLE "Child" ADD COLUMN "tipoLaudo"      VARCHAR(100);
ALTER TABLE "Child" ADD COLUMN "cid"            VARCHAR(20);
ALTER TABLE "Child" ADD COLUMN "descricaoLaudo" TEXT;
ALTER TABLE "Child" ADD COLUMN "medicamentos"   TEXT;
