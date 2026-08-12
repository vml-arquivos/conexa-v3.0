# RUNBOOK DE CORREÇÕES — Conexa v3.0
**Data:** 2026-08-12  
**Bugs corrigidos:**
1. `Internal Server Error` ao salvar/enviar plano de aula (500)
2. Objetivos pedagógicos iguais para todas as faixas etárias (clonagem EI01 → EI02/EI03)
3. `AuditLogEntity` passado como string literal em vez de enum
4. Turmas com `ageGroupMin` incorreto (Maternal 1 com 12 meses → EI01 errado)

---

## ETAPA 1 — Fix imediato do 500 (schema.prisma + prisma generate)

**Causa:** `QUINZENAL` foi adicionado ao banco pela migration `20260228120000`  
mas não estava no `schema.prisma`, quebrando a desserialização pelo Prisma Client.

```bash
# Dentro do container da API:
# 1. Substituir o schema.prisma
cp /app/prisma/schema.prisma /app/prisma/schema.prisma.bak
# (copiar o arquivo fixes/api/prisma/schema.prisma para /app/prisma/schema.prisma)

# 2. Gerar o Prisma Client com o enum correto
npx prisma generate

# 3. Reiniciar o container (Coolify: redeploy ou restart)
```

**Arquivos alterados:**
- `apps/api/prisma/schema.prisma` — adicionado `QUINZENAL` ao enum `PlanningType`

---

## ETAPA 2 — Fix do planning.service.ts (AuditLogEntity)

**Causa:** `entity: 'Planning'` como string literal viola o enum Prisma.

```bash
# Substituir o arquivo:
# fixes/api/src/planning/planning.service.ts → apps/api/src/planning/planning.service.ts
```

**O que mudou:**
- `import { RoleLevel, PlanningStatus, AuditLogAction, AuditLogEntity } from '@prisma/client'`
- Todas as ocorrências de `entity: 'Planning'` e `entity: 'PLANNING' as any` → `entity: AuditLogEntity.PLANNING`

---

## ETAPA 3 — Corrigir ageGroupMin das turmas (SQL)

**Causa:** Turmas "Maternal 1" com `ageGroupMin=12` caem em EI01 (≤18),  
recebendo objetivos de bebês. Maternal deve ser EI02 (19–47 meses).

```bash
# Executar no PostgreSQL:
psql $DATABASE_URL -f scripts/fix-classroom-age-groups.sql

# OU via Coolify → banco → SQL editor
```

**O que muda:**
- Berçário I: 4–12 meses
- Berçário II: 12–18 meses  
- Maternal I / Maternal 1: 19–35 meses → EI02
- Maternal II / Maternal 2: 36–47 meses → EI02
- I Período / Primeiro Período: 48–60 meses → EI03

---

## ETAPA 4 — Limpar clonagem indevida EI02/EI03

**Causa:** Script `ensure-matriz-segments.js` v1 clonava objetivos EI01 para EI02 e EI03.  
Resultado: professoras de Maternal e Primeiro Período viam objetivos de bebês.

```bash
# 1. Detectar e remover entries erradas:
psql $DATABASE_URL -f scripts/fix-matriz-segment-objectives.sql

# 2. Popular EI02 com objetivos corretos (Crianças Bem Pequenas):
SEGMENT=EI02 node /app/scripts/seed-curriculum-by-segment.js

# 3. Popular EI03 com objetivos corretos (Crianças Pequenas):
SEGMENT=EI03 node /app/scripts/seed-curriculum-by-segment.js

# 4. Verificar estado final:
node /app/scripts/ensure-matriz-segments.js
```

---

## ETAPA 5 — Substituir ensure-matriz-segments.js

```bash
# Substituir o script para evitar regressão futura:
# fixes/api/scripts/ensure-matriz-segments.js → apps/api/scripts/ensure-matriz-segments.js
```

**O que mudou:**
- Detecta clonagem indevida e alerta
- Valida faixas etárias de todas as turmas
- Nunca mais clona EI01 para EI02/EI03

---

## Verificação final

```bash
# Testar salvamento de plano de aula:
# 1. Logar como professor (RAQUEL Silva)
# 2. Acessar /app/planejamento/novo
# 3. Selecionar turma (MATERNAL II A)
# 4. Preencher campos e clicar "Salvar Rascunho"
# → Deve salvar sem erro 500

# Verificar objetivos por turma:
node /app/scripts/ensure-matriz-segments.js
# → EI02 deve mostrar códigos EI02xx
# → EI03 deve mostrar códigos EI03xx

# Verificar faixas etárias:
psql $DATABASE_URL -c "
  SELECT name, \"ageGroupMin\", \"ageGroupMax\",
    CASE WHEN \"ageGroupMin\" <= 18 THEN 'EI01'
         WHEN \"ageGroupMin\" <= 47 THEN 'EI02'
         WHEN \"ageGroupMin\" <= 71 THEN 'EI03'
    END segment
  FROM \"Classroom\" WHERE \"isActive\" = TRUE
  ORDER BY \"ageGroupMin\", name;
"
```

---

## Faixas etárias — referência

| Turma | ageGroupMin | ageGroupMax | Segmento BNCC | Designação |
|---|---|---|---|---|
| Berçário I | 4 | 12 | EI01 | Bebês |
| Berçário II | 12 | 18 | EI01 | Bebês |
| Maternal I | 19 | 35 | EI02 | Crianças Bem Pequenas |
| Maternal II | 36 | 47 | EI02 | Crianças Bem Pequenas |
| I Período | 48 | 60 | EI03 | Crianças Pequenas |
| II Período | 60 | 71 | EI03 | Crianças Pequenas |

Fonte: BNCC (2017) + Currículo em Movimento da Educação Infantil do DF (2018).

---

## Zero regressão — garantias

- `schema.prisma`: apenas adição de `QUINZENAL`, nenhum campo removido
- `planning.service.ts`: apenas substituição de string por enum, zero lógica alterada
- SQL de turmas: apenas UPDATE, nenhum DELETE, idempotente
- SQL de matriz: DELETE apenas de entries com código errado (EI01 em EI02/EI03)
- Seed EI02/EI03: `skipDuplicates: true`, idempotente
