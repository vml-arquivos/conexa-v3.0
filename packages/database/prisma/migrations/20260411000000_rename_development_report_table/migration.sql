-- RenameTable: DevelopmentReport → development_report
-- Motivo: Único model com @@map em PascalCase; padronização para snake_case
-- consistente com todos os outros models do schema.
-- PRÉ-REQUISITO: tabela "DevelopmentReport" (PascalCase) existe no banco de produção.
ALTER TABLE "DevelopmentReport" RENAME TO "development_report";
