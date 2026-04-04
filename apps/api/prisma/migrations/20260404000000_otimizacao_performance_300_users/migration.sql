-- Migration: Índices de performance para suporte a 300 usuários simultâneos
-- Branch: hotfix/db-alignment-indexes
-- Estratégia: 100% aditiva — apenas CREATE INDEX, zero instruções destrutivas
-- Gerado via: prisma migrate diff --from-schema-datamodel (main) --to-schema-datamodel (hotfix)

-- CreateIndex: Planning — índice composto unitId + classroomId
CREATE INDEX "Planning_unitId_classroomId_idx" ON "Planning"("unitId", "classroomId");

-- CreateIndex: Planning — índice composto status + createdAt
CREATE INDEX "Planning_status_createdAt_idx" ON "Planning"("status", "createdAt");

-- CreateIndex: DiaryEvent — índice composto unitId + eventDate DESC
CREATE INDEX "DiaryEvent_unitId_eventDate_idx" ON "DiaryEvent"("unitId", "eventDate" DESC);

-- CreateIndex: DiaryEvent — índice composto classroomId + eventDate DESC
CREATE INDEX "DiaryEvent_classroomId_eventDate_idx" ON "DiaryEvent"("classroomId", "eventDate" DESC);

-- CreateIndex: DiaryEvent — índice composto childId + eventDate DESC
CREATE INDEX "DiaryEvent_childId_eventDate_idx" ON "DiaryEvent"("childId", "eventDate" DESC);

-- CreateUniqueIndex: DiaryEvent — unicidade por (mantenedoraId, unitId, classroomId, childId, eventDate, type)
CREATE UNIQUE INDEX "DiaryEvent_mantenedoraId_unitId_classroomId_childId_eventDa_key" ON "DiaryEvent"("mantenedoraId", "unitId", "classroomId", "childId", "eventDate", "type");
