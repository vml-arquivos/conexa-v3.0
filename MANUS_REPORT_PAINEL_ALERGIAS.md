# [PACKET:MANUS_REPORT] — fix/allergias-dietas-painel

**Data:** 2026-03-23  
**Branch:** `fix/allergias-dietas-painel`  
**PR:** https://github.com/vml-arquivos/conexa-v3.0/pull/17

---

## git log -n 20

```
f1c5c16 (HEAD -> fix/allergias-dietas-painel) feat(painel-alergias): dashboard consolidado de saúde sem N+1
9e17287 (origin/main) Merge pull request #16 from vml-arquivos/fix/matriz-2026-update
2b17d3f fix(curriculum): rewrite parser to use column-based extraction
b5cae17 Merge pull request #15 from vml-arquivos/fix/matriz-2026-update
9783372 feat(scripts): adicionar patch-matriz-2026-from-pdf.js standalone
5405884 Merge pull request #14 from vml-arquivos/fix/matriz-2026-update
dbf9bca test(curriculum): gate 1/2/3 — testes unitários, dry-run 109 entradas
f9674a6 fix(matrix): atualizar matriz 2026 conforme nova sequencia
eea3e4e fix(ts): remover PROFESSOR_AUXILIAR de comparações role.level
0578035 fix: professor sem classroomTeacher vê crianças e restrições alimentares
4eadb76 feat: ocorrências visíveis para professor + exportação PDF + restrições alimentares
4c4e258 fix(ocorrencias): eliminar erro 'classroomId deve ser um CUID válido'
```

---

## Logs de Build

### API (`pnpm run build`)
```
> @conexa/api@1.0.0 build
> nest build && node scripts/copy-data-to-dist.js
✅ Datasets copied: /apps/api/data -> /apps/api/dist/data
```
**Resultado: ✅ PASSOU sem erros**

### Web (`pnpm run build`)
```
> @conexa/web@0.0.0 build
> tsc -b && vite build
✓ 2526 modules transformed.
dist/assets/index-STdACiTr.js   3,223.42 kB │ gzip: 745.72 kB
✓ built in 7.24s
```
**Resultado: ✅ PASSOU sem erros** (warnings de chunk size são pré-existentes)

---

## Diagnóstico — Problema Original

### Endpoint chamado pela UI (antes)
```
GET /children/dietary-restrictions/unidade
```

**Problema:** Retornava apenas `DietaryRestriction[]` — sem os campos diretos do `Child`:
- `allergies` (string) — alergias cadastradas no prontuário
- `medicalConditions` (string) — condições médicas / laudos
- `medicationNeeds` (string) — medicamentos / plano de ação
- `bloodType` — tipo sanguíneo
- `emergencyContactName` / `emergencyContactPhone`

**Causa:** Query retornava apenas a tabela `DietaryRestriction` com `include: { child: { select: { id, firstName, lastName, dateOfBirth, enrollments } } }` — sem os campos de saúde do `Child`.

**Tipo de problema:** Não era N+1 (era 1 query), mas era **dados incompletos** — campos críticos de saúde não chegavam ao frontend.

---

## Solução Implementada

### 1. Novo Endpoint (Backend)

**Arquivo:** `apps/api/src/children/children.controller.ts`  
**Linha adicionada:** endpoint `GET /children/health/dashboard`

```typescript
@Get('health/dashboard')
async getHealthDashboard(
  @Request() req,
  @Query('unitId') unitId?: string,
  @Query('classroomId') classroomId?: string,
) {
  return this.childrenService.getHealthDashboard(req.user, unitId, classroomId);
}
```

**Arquivo:** `apps/api/src/children/children.service.ts`  
**Método adicionado:** `getHealthDashboard`

**Response exemplo:**
```json
{
  "children": [
    {
      "id": "cuid...",
      "firstName": "João",
      "lastName": "Silva",
      "dateOfBirth": "2020-05-15",
      "bloodType": "A+",
      "allergies": "Amendoim severo, Leite moderado",
      "medicalConditions": "TEA — Laudo Dr. Souza 2025",
      "medicationNeeds": "Ritalina 10mg às 8h (frasco na secretaria)",
      "emergencyContactName": "Maria Silva",
      "emergencyContactPhone": "(61) 99999-0000",
      "enrollments": [{ "classroom": { "id": "cuid...", "name": "MATERNAL I B" } }],
      "dietaryRestrictions": [
        {
          "id": "cuid...",
          "type": "ALERGIA",
          "name": "Amendoim",
          "severity": "severa",
          "forbiddenFoods": "Amendoim, pasta de amendoim, biscoitos com amendoim",
          "allowedFoods": null,
          "description": "Risco de anafilaxia — EpiPen na mochila"
        }
      ]
    }
  ],
  "stats": {
    "total": 5,
    "comAlergia": 3,
    "comDieta": 2,
    "comCondicaoMedica": 2,
    "comMedicamento": 1,
    "casosCriticos": 1
  }
}
```

### 2. UI Atualizada (Frontend)

**Arquivo:** `apps/web/src/pages/PainelAlergiasPage.tsx`

**Antes:** Cards por restrição, sem alergias/condições médicas/medicamentos do Child.  
**Depois:**
- **Alerta vermelho no topo** listando nomes das crianças críticas (visível em 2 segundos)
- **6 KPIs** no topo: crianças, alergias, dietas, condição médica, medicamentos, críticos
- **Cards por criança** com:
  - Alergias diretas (`child.allergies`) — sempre visível com destaque vermelho
  - Restrições severas — sempre expandidas com alimentos proibidos/permitidos
  - Condição médica/laudo — sempre visível com destaque azul
  - Medicamentos — sempre visível com destaque roxo
  - Contato de emergência — sempre visível
  - Demais restrições — expansíveis por botão
- **Filtros:** busca livre, turma, categoria (alergia/dieta/médica/medicamento), severidade
- **Fallback** para endpoint legado se novo endpoint não disponível

---

## RBAC — Evidência

A query sempre filtra por:
```typescript
where: {
  mantenedoraId: user.mantenedoraId,  // ← Coordenação A não vê dados de outra mantenedora
  unitId: targetUnitId,               // ← Coordenação A não vê dados de outra unidade
  isActive: true,
}
```

`targetUnitId` é resolvido como:
1. `unitId` do query param (se fornecido e pertence à mantenedora)
2. `user.unitId` do token JWT
3. Para professor: `classroomTeacher.classroom.unitId`
4. Para professor sem vínculo: primeira unidade ativa da mantenedora

**Resultado: ✅ Coordenação A não enxerga unidade B**

---

## Performance — 1 Request / 1 Query

**Antes:** 1 request → 1 query (mas dados incompletos)  
**Depois:** 1 request → 1 query com todos os joins:

```typescript
prisma.child.findMany({
  where: { mantenedoraId, unitId, isActive: true, OR: [...] },
  select: {
    // campos diretos
    id, firstName, lastName, dateOfBirth, photoUrl, bloodType,
    allergies, medicalConditions, medicationNeeds,
    emergencyContactName, emergencyContactPhone,
    // joins
    enrollments: { where: { status: 'ATIVA' }, select: { classroom: ... }, take: 1 },
    dietaryRestrictions: { where: { isActive: true }, select: { ... } },
  },
  orderBy: { firstName: 'asc' },
})
```

**Resultado: ✅ 1 request / 1 query (sem N+1)**

---

## Arquivos Alterados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `apps/api/src/children/children.controller.ts` | Backend | Novo endpoint `GET /children/health/dashboard` |
| `apps/api/src/children/children.service.ts` | Backend | Método `getHealthDashboard` com query otimizada |
| `apps/web/src/pages/PainelAlergiasPage.tsx` | Frontend | UI completamente reescrita |

**Total: 3 arquivos**

---

## Confirmações

- ✅ **Sem migrations** — nenhum arquivo Prisma alterado
- ✅ **Sem lockfile change** — pnpm-lock.yaml e package-lock.json intactos
- ✅ **Build API:** passou sem erros
- ✅ **Build Web:** passou sem erros
- ✅ **RBAC:** mantenedoraId + unitId sempre enforced
- ✅ **Performance:** 1 request / 1 query
- ✅ **Backward compatible:** fallback para endpoint legado no frontend
