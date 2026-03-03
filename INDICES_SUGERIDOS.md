# Índices sugeridos para performance dos dashboards

Execute no PostgreSQL após validação em staging:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_unit_status_dates
ON "Planning" ("unitId", "status", "startDate", "endDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_unit_updated
ON "Planning" ("unitId", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diary_event_unit_date
ON "DiaryEvent" ("classroomId", "date");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_classroom_date
ON "Attendance" ("classroomId", "date", "present");
```

---

## Índices adicionais recomendados (P1)

```sql
-- Filtro por criador (professores buscando seus próprios planejamentos)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_created_by
ON "Planning" ("createdBy");

-- Matrículas ativas por turma (getAccessibleChildren — chamado em toda chamada)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_classroom_status
ON "Enrollment" ("classroomId", "status");

-- Acesso do professor à turma
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classroom_teacher_active
ON "ClassroomTeacher" ("classroomId", "teacherId", "isActive");

-- Requisições pendentes por unidade
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_request_unit_status
ON "MaterialRequest" ("unitId", "status");
```

---

## Instrução de deploy

Aplicar com `CREATE INDEX CONCURRENTLY` para zero downtime — não bloqueia leituras nem escritas durante a criação.

*Gerado automaticamente — Conexa v3.0 Super Ecossistema — 02/03/2026*
