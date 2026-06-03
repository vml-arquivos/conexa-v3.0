-- Torna mantenedoraId opcional no AuditLog para permitir logs de sistema
-- e requisições onde a mantenedora não esteja disponível no contexto JWT.

ALTER TABLE "AuditLog" ALTER COLUMN "mantenedoraId" DROP NOT NULL;
