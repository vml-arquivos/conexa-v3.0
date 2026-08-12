# Correção cirúrgica — Planejamentos 500

Data: 12/08/2026

## Sintoma confirmado

A tela `/app/planejamentos` e o Diário exibem **“Erro ao carregar planejamentos”**. No DevTools, a requisição abaixo chega corretamente à API, mas retorna **HTTP 500**:

`GET /plannings?startDate=2026-08-01&endDate=2026-08-31`

Isso confirma que o erro não está no calendário visual nem no toast do frontend; a falha está no caminho de runtime da API/Prisma/banco ao listar `Planning`.

## Diagnóstico técnico

O repositório tinha três pontos capazes de manter o 500 mesmo após um redeploy aparentemente correto:

1. **Prisma Client potencialmente stale/cacheado no deploy**
   - `apps/api/prisma/schema.prisma` já contém `QUINZENAL`.
   - A migration também adiciona `QUINZENAL` ao PostgreSQL.
   - Porém o script `build` da API executava apenas `nest build`, sem forçar `prisma generate`.
   - Em deploys com cache de dependências/Nixpacks, isso permite subir um Prisma Client gerado antes da alteração do enum.

2. **Duas fontes de schema divergentes**
   - `apps/api/prisma/schema.prisma` continha `QUINZENAL`.
   - `packages/database/prisma/schema.prisma` não continha `QUINZENAL`.
   - Dependendo do comando de build/migration usado, o projeto podia gerar clients diferentes.

3. **Possibilidade de schema drift no banco**
   - O histórico do projeto possui várias migrations incrementais do modelo `Planning`.
   - Se uma migration tiver sido parcialmente aplicada ou marcada como resolvida, o Prisma pode tentar selecionar uma coluna que não existe e devolver 500.

Também foi encontrado um erro adicional independente: o filtro `query.type` tentava filtrar `PlanningTemplate.type`, campo que não existe. O correto é filtrar `Planning.type`. Esse erro poderia gerar outro 500 quando o filtro por tipo fosse usado.

## Correções aplicadas

### 1. Prisma é regenerado obrigatoriamente em todo build da API

Arquivo: `apps/api/package.json`

O build agora executa:

`prisma generate --schema=./prisma/schema.prisma`

antes do `nest build`.

### 2. Guard de build contra Prisma Client antigo

Novo arquivo:

`apps/api/scripts/assert-prisma-planning-schema.js`

O deploy falha antes de publicar caso o Prisma Client não contenha:

- `PlanningType.QUINZENAL`
- statuses do fluxo de revisão
- campos críticos atuais do modelo `Planning`

Isso impede que o mesmo problema seja mascarado por cache em deploys futuros.

### 3. Schema secundário sincronizado

Arquivo:

`packages/database/prisma/schema.prisma`

Foi adicionado apenas `QUINZENAL` ao enum `PlanningType`, alinhando-o ao schema efetivamente usado pela API.

### 4. Migration de autorreparo aditiva e idempotente

Novas migrations:

- `apps/api/prisma/migrations/20260812164500_repair_planning_runtime_schema/migration.sql`
- `packages/database/prisma/migrations/20260812164500_repair_planning_runtime_schema/migration.sql`

Elas garantem, sem remover dados:

- enum `QUINZENAL`
- statuses `EM_REVISAO`, `APROVADO`, `DEVOLVIDO`
- `submittedAt`
- `reviewedAt`
- `reviewedBy`
- `reviewComment`
- `anoLetivo`
- `professorId`
- `observacoes_template`
- índices de `professorId` e `anoLetivo`

### 5. Correção do filtro por tipo

Arquivo:

`apps/api/src/planning/planning.service.ts`

Antes:

`where.template = { type: query.type }`

Agora:

`where.type = query.type`

### 6. Teste de regressão

Arquivo:

`apps/api/src/planning/planning.service.spec.ts`

Foi incluído teste para garantir que a listagem por período/tipo continue filtrando diretamente o modelo `Planning`.

## Escopo preservado

A correção não altera layout, autenticação, fluxo de diário, regras pedagógicas, matriz curricular, permissões ou conteúdos já salvos. A migration é exclusivamente aditiva/idempotente.

Nenhuma análise séria permite prometer literalmente “zero regressão” antes de executar o build/testes no mesmo ambiente de produção, mas esta correção foi desenhada para reduzir o risco ao mínimo: alterações pequenas, sem remoção de campos/dados, guard de build e migration de autorreparo.

## Deploy recomendado

### Se o backend está configurado no Coolify com Dockerfile e Base Directory `/apps/api`

Faça o redeploy da API. O `entrypoint.sh` executará as migrations e o Dockerfile/build regenerará o Prisma Client.

Nos logs devem aparecer sinais equivalentes a:

- `Prisma Client do módulo Planning validado.`
- aplicação da migration `20260812164500_repair_planning_runtime_schema`
- migrations concluídas

### Se o backend estiver usando Nixpacks/monorepo

O novo script `build` também força `prisma generate`, eliminando o client cacheado. Garanta adicionalmente que `prisma migrate deploy` seja executado antes de iniciar a API.

## Validação pós-deploy

1. Abrir `/app/planejamentos`.
2. Confirmar que o request `/plannings?startDate=...&endDate=...` retorna `200`.
3. Confirmar que desapareceu o toast “Erro ao carregar planejamentos”.
4. Abrir `/app/diario-calendario` e confirmar que ele também deixa de falhar ao buscar planejamentos.
5. Criar/salvar um planejamento e testar o fluxo Rascunho → Em revisão.

## Achado de segurança separado

Existem documentos de configuração no repositório contendo credenciais/segredos em texto claro. Eles não foram alterados nesta correção para não misturar escopos, mas devem ser removidos do Git e os segredos correspondentes devem ser rotacionados em uma etapa controlada.
