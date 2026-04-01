# Auditoria Conexa V3

## Veredito
O repositório apresenta um bom estado de estabilização nas frentes prioritárias (Planejamento e Requisição de Materiais), com as entregas recentes (PRs #30, #31 e #32) resolvendo a maioria dos gargalos de UX e regras de negócio. No entanto, a frente de **Catálogo de materiais (integração)** foi entregue de forma *parcial* devido a uma falha silenciosa na persistência do vínculo relacional (`materialId`), e a frente de **CID** não se refere a diagnósticos médicos, mas sim a um acrônimo interno para `classroomId` ou `childId`.

## Evidências
1. **Fluxo de planejamento / revisão**: O PR #30 removeu o bloqueio indevido de envio para revisão por data passada (`endDate`), permitindo o fluxo correto para planos DEVOLVIDOS ou retroativos. O RBAC está preservado (apenas donos enviam, coordenação de unidade vê `EM_REVISAO`, coordenação geral vê `APROVADO`).
2. **Requisição de materiais**: O PR #32 integrou o catálogo oficial ao formulário do professor. A UX de "categoria + produto na mesma página via Select" foi implementada com sucesso no `MaterialRequestForm.tsx`. O PR #31 garantiu que o motivo de rejeição (`notes`) seja enviado no PATCH e exibido para o professor.
3. **Catálogo de materiais**: O seed foi corrigido no PR #32 (inserindo `mantenedoraId`), e os CSVs foram ampliados (57 itens normalizados).
4. **Persistência do materialId**: No `MaterialRequestForm.tsx`, o `materialId` é capturado do catálogo, mas o DTO `CreateMaterialRequestDto` e a tipagem `MaterialRequestItem` no frontend não incluem esse campo. Consequentemente, o backend não recebe nem insere o `materialId` na tabela legada ou na nova `MaterialRequestItem` (linha 385 do `material-request.service.ts`).
5. **CID**: A busca no código revelou que "CID" é usado exclusivamente como variável local para `classroomId` (ex: `const cid = classroomId;` em `DiarioBordoPage.tsx`) ou `childId` (em `development-observations.service.ts`). Não há referências a CID-10 ou diagnósticos médicos estruturados.

## Hipóteses
- O desenvolvedor anterior focou na UX (exibição do nome do produto preenchido no input) e esqueceu de propagar a chave estrangeira (`materialId`) até a camada de persistência.
- Como a tabela legada `material_request_item` não possuía a coluna `material_id` originalmente, o mapeamento ficou incompleto quando a tabela nova foi criada na migration `20260307`.

## Causa raiz provável
A interface `MaterialRequestItem` (usada no frontend e backend) define apenas `item`, `quantidade` e `unidade`. O `CreateMaterialRequestDto` valida apenas esses campos. O método `create` do `material-request.service.ts` extrai apenas esses 3 campos para os arrays de persistência, ignorando silenciosamente qualquer `materialId` que porventura chegue no payload.

## Matriz curta das frentes
- **Fluxo de planejamento / revisão**: entregue (PRs #30, #2)
- **Requisição de materiais do professor para a turma**: entregue (PR #32)
- **Catálogo de materiais (PEDAGOGICO e HIGIENE_PESSOAL)**: parcial (UX entregue, persistência relacional pendente)
- **UX da requisição com categoria + produto na mesma página via Select**: entregue (PR #32)
- **Quaisquer mudanças de dados/catalogo/CSV/import**: parcial (seed corrigido, mas importação manual `CatalogImportPage` ainda usa `StockItem` em vez de `Material`)
- **Qualquer frente relacionada a "CID"**: inconclusiva/falso-positivo (CID é apenas alias de variável para `classroomId`/`childId`)

## Próximo passo mínimo
Corrigir a persistência relacional do `materialId` nas requisições de materiais:
1. Adicionar `materialId` (opcional) no `MaterialRequestItemDto` do backend.
2. Atualizar o `material-request.service.ts` para mapear e inserir o `materialId` (tanto no `description` JSON quanto no INSERT da tabela `MaterialRequestItem`).
3. Adicionar `materialId` na interface `MaterialRequestItem` do frontend.

## Gates
- O formulário deve continuar funcionando para itens manuais (sem catálogo, `materialId` nulo).
- A listagem deve exibir corretamente o nome do item, venha ele do catálogo ou da digitação livre.

## Riscos residuais
- O módulo de importação de catálogo (`CatalogImportPage` / `catalog.controller.ts`) ainda insere dados em `StockItem` (por unidade), enquanto o novo fluxo de requisição consome de `Material` (por mantenedora). Essa dualidade precisará ser unificada no futuro, mas não quebra a produção atual.
