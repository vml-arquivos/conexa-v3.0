-- DropIndex: Remove a constraint de unicidade do DiaryEvent
-- Motivo: A constraint impedia múltiplos registros do mesmo tipo para a mesma
-- criança no mesmo dia, bloqueando o fluxo de microgestos e registros repetidos.
-- Os @@index de performance existentes são mantidos intactos.
DROP INDEX "DiaryEvent_mantenedoraId_unitId_classroomId_childId_eventDa_key";
