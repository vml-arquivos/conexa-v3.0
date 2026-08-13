# Conexa V3.0 — Correção da auditoria técnica

**Data:** 13/08/2026  
**Base:** repositório `conexa-v3.0-main (8)`  
**Objetivo:** aplicar os achados críticos do relatório de auditoria com alteração mínima de comportamento, proteção contra schema drift e build reprodutível.

## Resultado executivo

Os cinco grupos de problemas apontados na auditoria foram tratados no código/repositório:

1. **Lockfile / Schedule** — o importador `apps/api` do `pnpm-lock.yaml` agora contém `@nestjs/schedule`, e `ScheduleModule.forRoot()` foi registrado no `AppModule`.
2. **Build do frontend** — corrigidos o callback inexistente, os usos antigos de `ChildAvatar`, as props antigas de `PageShell` e a tipagem de `user.unit`. O Dockerfile do web voltou a executar o script oficial `tsc -b && vite build` e exige lockfile congelado.
3. **Planning / 500** — o filtro usa `where.type`, foi adicionada cobertura de regressão e o startup/readiness agora valida o schema crítico de `Planning` antes de aceitar tráfego.
4. **Prisma duplicado** — `apps/api/prisma/schema.prisma` é a fonte canônica. O espelho de `packages/database` foi sincronizado; scripts de raiz e do pacote database apontam para o schema canônico da API. O histórico legado do pacote foi preservado sem ser usado por comandos de produção.
5. **Segredos em documentação** — URLs com credenciais, JWT e chaves Supabase em documentação foram substituídos por placeholders. **A rotação dos segredos no ambiente de produção continua obrigatória**, pois remover do working tree não invalida segredos já expostos em histórico Git ou cópias anteriores.

## Proteções adicionais aplicadas

### Banco e migrations

O `apps/api/entrypoint.sh` agora:

- exige `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET`;
- testa conexão nas duas URLs;
- bloqueia deploy se os nomes lógicos dos bancos divergirem;
- compara a presença e o fingerprint do histórico `_prisma_migrations` entre runtime e migrations;
- não usa `prisma migrate resolve --applied` automático em P3018/already-exists;
- aborta em inconsistência em vez de publicar uma API com schema incompleto;
- valida no banco de runtime as colunas críticas de `Planning`, o enum `QUINZENAL` e permissão de `UPDATE` sem alterar registros (`WHERE FALSE`).

### Readiness

`GET /health/ready` deixa de considerar apenas `SELECT 1`. Ele também verifica as colunas críticas do módulo de planejamento e o enum `PlanningType`. Assim, um banco conectado porém incompatível não é anunciado como pronto.

### Build determinístico

- `apps/api` gera Prisma Client antes do Nest build.
- `apps/web/Dockerfile` não possui fallback para `--no-frozen-lockfile`.
- `apps/web/Dockerfile` usa `pnpm run build`, portanto erro TypeScript interrompe o build antes da publicação.

## Correções funcionais de frontend

- Coordenação pedagógica: botão **Devolver planejamento** usa `devolverPlanejamento(id, motivoRejeicao)`.
- `ChildAvatar`: todos os call sites identificados pela auditoria usam a prop `child` e `sizeClassName`.
- `PageShell`: `titulo/subtitulo` migrados para `title/subtitle` nas páginas apontadas.
- `User`: `unit` possui tipagem explícita no contrato de autenticação.

## Correção funcional de Planning

Antes:

```ts
where.template = { type: query.type };
```

Depois:

```ts
where.type = query.type;
```

`PlanningTemplate` não é usado como origem do filtro de tipo.

## Validações executadas nesta revisão

- Parse sintático TypeScript/TSX de **639 arquivos** do repositório: **0 erros sintáticos**.
- Asserções específicas para todos os erros TypeScript descritos na auditoria: **aprovadas**.
- Validador permanente `pnpm audit:validate` / `node scripts/validate-audit-fixes.mjs`: **40 verificações aprovadas**.
- `pnpm-lock.yaml` parseado e comparado com os `package.json` dos workspaces: **0 divergências de importador**.
- Entrada de `@nestjs/schedule` confirmada no lockfile.
- `package.json` / `package-lock.json` parseados como JSON válido.
- `npm ci --ignore-scripts --dry-run --offline` do `apps/api`: resolução do lockfile concluída.
- `bash -n apps/api/entrypoint.sh`: aprovado.
- Busca por uso executável de `prisma migrate resolve --applied`: nenhum encontrado.
- `apps/api/prisma/schema.prisma` e o espelho de `packages/database/prisma/schema.prisma`: conteúdo idêntico.
- Varredura de documentação: os valores de segredo de produção não-placeholder identificados na base original não permanecem no working tree corrigido; os exemplos sensíveis usam placeholders. A rotação externa continua obrigatória.

### Limite do ambiente de validação

O sandbox desta revisão não possuía todas as dependências npm/pnpm em cache e não tinha acesso de rede suficiente para reinstalar o monorepo inteiro. Por isso o `pnpm build` integral não pôde ser reexecutado aqui. O próprio Dockerfile do web foi endurecido para tornar `pnpm install --frozen-lockfile` e `tsc -b` gates obrigatórios no build real do Coolify.

Isso não substitui o smoke test contra o PostgreSQL de produção. A validação final após deploy deve confirmar `/health/ready`, `GET /plannings`, salvar rascunho, editar, enviar para revisão, aprovar/devolver e carregar o Diário.

## Deploy recomendado

1. Fazer backup/snapshot do banco antes do deploy.
2. Atualizar o repositório completo por esta versão corrigida.
3. No Coolify, confirmar `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET` sem colar valores no Git.
4. Rotacionar senha do PostgreSQL e segredos JWT expostos anteriormente.
5. Fazer **rebuild sem cache** da API.
6. Conferir no log as validações de banco e migrations antes do início do NestJS.
7. Validar `GET /health/ready` — deve retornar `status: ready` e `planning: ready`.
8. Fazer rebuild sem cache do web.
9. Executar o smoke test funcional descrito acima.

## Regra de manutenção

Novas migrations devem ser criadas somente em `apps/api/prisma/migrations`. Não usar o histórico legado de `packages/database/prisma/migrations` em produção.
