# Auditoria do Módulo da Nutricionista — Conexa V3

**Data:** 01/04/2026  
**Repositório:** `vml-arquivos/conexa-v3.0`  
**Branch:** `main` (atualizado)

---

## Veredito

O módulo da nutricionista está **parcialmente implementado** com dashboard funcional, dietas/restrições operacionais e pedidos de alimentação integrados ao fluxo genérico de compra. **Não há modelagem de cardápio, alimentos ou cálculo nutricional** no sistema atual.

---

## Evidências

### 1. Dashboard da Nutricionista

**Arquivo:** `apps/web/src/pages/DashboardNutricionistaPage.tsx` (617 linhas)

**Estado:** ✅ **Entregue** — funcional com 3 abas:
- **Dietas/Restrições:** lista crianças com restrições alimentares, filtros por tipo e busca, cards expandíveis com severidade, alimentos permitidos/proibidos
- **Pedidos de Alimentação:** integrado ao endpoint `/pedidos-compra` com filtro `categoria=ALIMENTACAO`, permite adicionar itens de alimentação ao pedido do mês
- **Resumo por Turma:** mostra % de crianças com restrição por turma

**Endpoint usado:** `GET /dietary-restrictions` → **bug identificado** — deveria ser `GET /children/dietary-restrictions/unidade`

**RBAC:** rota protegida por `allowedRoles: ['UNIDADE', 'MANTENEDORA', 'DEVELOPER']` — **UNIDADE_NUTRICIONISTA é mapeado para UNIDADE** via `normalizeRoles` + `normalizeRoleTypes`, então o acesso funciona.

---

### 2. Dietas, Alergias e Restrições Alimentares

**Schema Prisma:** `model DietaryRestriction` (linha 946)

**Campos:**
- `type` (enum: ALERGIA, INTOLERANCIA, PREFERENCIA, RELIGIOSA, MEDICA, OUTRA)
- `name`, `description`, `severity` (leve/moderada/severa)
- `allowedFoods`, `forbiddenFoods` (Text)
- `isActive`, `createdAt`, `updatedAt`, `createdBy`
- Relação: `child` (Child)

**Backend:** módulo `children` gerencia restrições alimentares
- `POST /children/:id/dietary-restriction` — adicionar restrição
- `GET /children/:id/dietary-restrictions` — listar restrições de uma criança
- `GET /children/dietary-restrictions/unidade` — listar todas as restrições da unidade (usado pelo dashboard)

**Frontend:**
- `DashboardNutricionistaPage` — aba Dietas/Restrições
- `PainelAlergiasPage` (571 linhas) — painel dedicado de alergias e dietas com dashboard de saúde, cards de crianças, filtros avançados

**Estado:** ✅ **Entregue** — operacional, com campos críticos (tipo, severidade, alimentos permitidos/proibidos)

---

### 3. Pedido de Compra de Alimentos

**Schema Prisma:** não há modelo específico para alimentos — usa o fluxo genérico de `PedidoCompra` com `categoria=ALIMENTACAO` nos itens

**Backend:** módulo `pedido-compra`
- `POST /pedidos-compra` — criar pedido (idempotente por unidade+mês)
- `PATCH /pedidos-compra/:id/itens` — adicionar itens ao pedido
- `GET /pedidos-compra?mesReferencia=&categoria=ALIMENTACAO` — listar pedidos de alimentação

**Frontend:** `DashboardNutricionistaPage` — aba Pedidos de Alimentação
- Permite adicionar itens de alimentação (descrição, quantidade, unidade, custo estimado)
- Cria ou atualiza pedido RASCUNHO do mês automaticamente
- Exibe tabela de itens com total estimado

**Estado:** ✅ **Entregue** — funcional, mas **não separado do fluxo genérico** — itens de alimentação são apenas `categoria=ALIMENTACAO` no mesmo modelo de pedido de materiais pedagógicos/higiene

---

### 4. Cardápios

**Schema Prisma:** ❌ **Não existe** — nenhum modelo `Menu`, `Meal`, `MealPlan`, `Cardapio`, `Refeicao`

**Backend:** ❌ **Não existe** — nenhum controller/service de cardápio

**Frontend:** ❌ **Não existe** — nenhuma página de cardápio

**Estado:** ❌ **Não iniciado**

---

### 5. Alimentos e Cálculo Nutricional

**Schema Prisma:** ❌ **Não existe** — nenhum modelo `Food`, `Alimento`, `NutritionalInfo`, `Recipe`

**Backend:** ❌ **Não existe** — nenhum controller/service de alimentos ou cálculo nutricional

**Frontend:** ❌ **Não existe** — nenhuma página de alimentos ou cálculo nutricional

**Estado:** ❌ **Não iniciado**

---

## Matriz das Frentes

| Frente | Estado | Evidência | Necessita Migration? |
|---|---|---|---|
| **Dashboard da Nutricionista** | ✅ Entregue | `DashboardNutricionistaPage.tsx` (617 linhas), 3 abas funcionais | NÃO |
| **Dietas/Restrições/Alergias** | ✅ Entregue | `DietaryRestriction` no schema, endpoints em `children`, `PainelAlergiasPage` | NÃO |
| **Pedido de Compra de Alimentos** | 🟡 Parcial | Integrado ao fluxo genérico via `categoria=ALIMENTACAO`, não separado | NÃO (para manter atual) / SIM (para separar) |
| **Cardápios** | ❌ Não iniciado | Nenhum modelo, controller, service ou página | **SIM** |
| **Alimentos e Cálculo Nutricional** | ❌ Não iniciado | Nenhum modelo, controller, service ou página | **SIM** |

---

## Causa Raiz Provável

O módulo da nutricionista foi iniciado com foco em **gestão de restrições alimentares** (alergias, dietas) e **pedidos de alimentação** (compra de insumos), mas **não avançou para a operação nutricional** (cardápios, alimentos, cálculo nutricional).

---

## Hipóteses

1. **Dashboard funcional mas endpoint incorreto:** `DashboardNutricionistaPage` usa `GET /dietary-restrictions` (não existe) em vez de `GET /children/dietary-restrictions/unidade` — pode estar retornando 404 silenciosamente ou o backend tem um endpoint raiz não documentado
2. **Pedido de alimentação não separado:** itens de alimentação são apenas `categoria=ALIMENTACAO` no mesmo modelo de materiais — pode causar confusão operacional e dificultar relatórios específicos de nutrição
3. **Cardápio e cálculo nutricional não modelados:** não há estrutura de dados para refeições, alimentos, composição nutricional — **precisa de modelagem completa antes de implementar**

---

## Próximo Passo Mínimo (FASE 1)

**PR 1 — Correção de escopo da Nutricionista:**

1. **Corrigir o endpoint de dietas** no `DashboardNutricionistaPage`:
   - Trocar `GET /dietary-restrictions` por `GET /children/dietary-restrictions/unidade`
   - Testar se o dashboard carrega corretamente

2. **Revisar o menu da nutricionista** no `Sidebar`:
   - Remover "Requisições Alimentação" (link para `/app/material-requests` genérico)
   - Manter apenas:
     - Painel da Nutricionista
     - Alergias e Dietas

3. **Validar RBAC:**
   - Confirmar que `UNIDADE_NUTRICIONISTA` acessa `/app/nutricionista` corretamente
   - Confirmar que não acessa páginas de professor, coordenação ou diretor

**Arquivos a alterar:**
- `apps/web/src/pages/DashboardNutricionistaPage.tsx` (1 linha — endpoint)
- `apps/web/src/components/layout/Sidebar.tsx` (remover 1 item do `NUTRI_ITEMS`)

**Sem migration, sem lockfile, sem breaking changes.**

---

## Gates

- ✅ FASE 1 pode ser executada agora — correção mínima, sem modelagem
- ⚠️ FASE 2 (consolidar dietas/restrições) depende de FASE 1 mergeada
- 🔴 FASE 3 (pedido de alimentação separado) **requer decisão:** manter integrado ou separar? Se separar, precisa migration
- 🔴 FASE 4 (cardápios) **requer modelagem completa** — migration obrigatória
- 🔴 FASE 5 (cálculo nutricional) **requer modelagem completa** — migration obrigatória

---

## Riscos Residuais

1. **Endpoint `/dietary-restrictions` pode não existir** — se o dashboard atual funciona, pode haver um endpoint raiz não documentado ou o frontend está falhando silenciosamente
2. **Pedido de alimentação misturado com materiais** — relatórios e aprovações podem não distinguir corretamente
3. **Cardápio e cálculo nutricional são frentes grandes** — precisam de modelagem cuidadosa para não quebrar produção
