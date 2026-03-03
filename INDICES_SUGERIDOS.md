# Índices Sugeridos — Conexa v3.0

> **Atenção:** Estes índices devem ser aplicados manualmente no banco de dados de produção via Prisma Migration ou diretamente no PostgreSQL. Eles **não quebram** dados existentes e podem ser aplicados com `CREATE INDEX CONCURRENTLY` para zero downtime.

---

## Contexto

Com a ativação do módulo de Planejamento Pedagógico, Diário de Bordo e Alertas Operacionais, as queries mais frequentes passaram a envolver filtros por `unitId`, `classroomId`, `createdBy`, `status` e intervalos de data (`startDate`/`endDate`). Os índices abaixo eliminam sequential scans nas tabelas críticas.

---

## Índices Prioritários (P0 — aplicar imediatamente)

### Tabela `Planning`

```sql
-- Filtro por unidade + status (usado em /coordenacao/planejamentos e getDashboardUnidade)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_unit_status
  ON "Planning" ("unitId", "status");

-- Filtro por data de início e fim (usado em listarPlanejamentos com overlap)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_dates
  ON "Planning" ("startDate", "endDate");

-- Filtro por criador (usado em /plannings para professores)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_created_by
  ON "Planning" ("createdBy");

-- Filtro por turma (usado em torre de controle e dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_classroom
  ON "Planning" ("classroomId");

-- Índice composto para a query de planejamentos parados (updatedAt + status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_planning_updated_status
  ON "Planning" ("updatedAt", "status");
```

### Tabela `Enrollment`

```sql
-- Filtro por turma + status ATIVA (usado em getAccessibleChildren — chamado em toda chamada)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_classroom_status
  ON "Enrollment" ("classroomId", "status");

-- Filtro por criança (usado em histórico de matrículas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollment_child
  ON "Enrollment" ("childId");
```

### Tabela `DiaryEntry`

```sql
-- Filtro por turma + data (usado em getDashboardUnidade para diariosHoje)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diary_classroom_date
  ON "DiaryEntry" ("classroomId", "date");

-- Filtro por professor (usado em /diary-entries do professor)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_diary_created_by
  ON "DiaryEntry" ("createdBy");
```

---

## Índices Secundários (P1 — aplicar na próxima janela de manutenção)

### Tabela `MaterialRequest`

```sql
-- Filtro por unidade + status (usado em requisicoesPendentes do dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_request_unit_status
  ON "MaterialRequest" ("unitId", "status");
```

### Tabela `ClassroomTeacher`

```sql
-- Verificação de acesso do professor à turma (usado em getAccessibleChildren)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classroom_teacher_active
  ON "ClassroomTeacher" ("classroomId", "teacherId", "isActive");
```

### Tabela `Child`

```sql
-- Busca por nome (usado em lookup e busca de crianças)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_child_name
  ON "Child" ("firstName", "lastName");
```

### Tabela `DevelopmentObservation`

```sql
-- Filtro por criança + turma (usado em /development-observations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dev_obs_child_classroom
  ON "DevelopmentObservation" ("childId", "classroomId");
```

---

## Como aplicar via Prisma Migration

Adicione ao `schema.prisma` nos modelos correspondentes:

```prisma
model Planning {
  // ... campos existentes ...

  @@index([unitId, status])
  @@index([startDate, endDate])
  @@index([createdBy])
  @@index([classroomId])
  @@index([updatedAt, status])
}

model Enrollment {
  // ... campos existentes ...

  @@index([classroomId, status])
  @@index([childId])
}

model DiaryEntry {
  // ... campos existentes ...

  @@index([classroomId, date])
  @@index([createdBy])
}
```

Depois execute:

```bash
npx prisma migrate dev --name add_performance_indexes
```

---

## Estimativa de Impacto

| Query | Antes | Depois (estimado) |
|---|---|---|
| `listarPlanejamentos` com overlap de datas | Sequential scan | Index scan em `idx_planning_dates` |
| `getDashboardUnidade` — turmas sem chamada | Sequential scan em DiaryEntry | Index scan em `idx_diary_classroom_date` |
| `getAccessibleChildren` — matrículas ativas | Sequential scan em Enrollment | Index scan em `idx_enrollment_classroom_status` |
| Dashboard coordenação — planejamentos EM_REVISAO | Sequential scan | Index scan em `idx_planning_unit_status` |

---

*Gerado automaticamente em 02/03/2026 — Conexa v3.0 Super Ecossistema*
