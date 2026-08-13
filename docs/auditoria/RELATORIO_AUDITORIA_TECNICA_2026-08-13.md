# Auditoria técnica — Conexa V3.0 (erros de servidor e deploy)

**Data:** 13/08/2026
**Escopo:** `conexa-v3.0-main` (monorepo pnpm: `apps/api`, `apps/web`, `apps/site`, `packages/*`)
**Método:** leitura estática do código, reconstrução do `pnpm install`/build reais no mesmo lockfile do repositório, comparação entre os relatórios de correção já existentes no repo e o estado atual do código.

Resumo executivo: o repositório tem uma quantidade grande de documentação de "correções" (`RUNBOOK_CORRECOES.md`, `CORRECAO_PLANEJAMENTOS_500_2026-08-12.md`, vários `LEIA-ME-*.md`), mas ao reproduzir o build e ler o código-fonte constatei que **pelo menos duas dessas correções documentadas nunca foram de fato aplicadas ao código**, e existem **dois problemas novos, não documentados, que quebram o deploy de forma determinística** (lockfile desatualizado e build de TypeScript do frontend falhando). Estes são, com alta confiança, a causa dos erros de deploy e de vários 500 em produção.

---

## 1. Deploy falha de forma determinística — lockfile desatualizado (CRÍTICO)

`apps/api/package.json` declara a dependência `@nestjs/schedule: ^4.1.2` (usada em `apps/api/src/alertas/alertas.service.ts:2`, `import { Cron } from '@nestjs/schedule'`), mas essa dependência **não existe em `pnpm-lock.yaml`**.

Reproduzi isso rodando `pnpm install --frozen-lockfile` na raiz do monorepo (o mesmo comando padrão usado por qualquer pipeline de CI, e que o próprio pnpm ativa por padrão em ambientes de CI):

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml
is not up to date with apps/api/package.json
```

Comparei os specs exatos: a **única** diferença entre `package.json` e o lockfile é `@nestjs/schedule`. Ou seja, alguém adicionou essa dependência ao `package.json` (para os `@Cron` de `AlertasService`) e nunca rodou `pnpm install` para atualizar o `pnpm-lock.yaml` commitado.

**Efeito em produção:** qualquer pipeline (Coolify, Nixpacks, GitHub Actions etc.) que use `--frozen-lockfile` — prática padrão e recomendada para builds reprodutíveis — falha *antes* de instalar dependências. Isso por si só explica boa parte dos "erros de deploy".

**Correção:** rodar `pnpm install` localmente (sem `--frozen-lockfile`) para regenerar o lockfile com `@nestjs/schedule`, e commitar o `pnpm-lock.yaml` atualizado.

**Achado secundário relacionado:** mesmo corrigindo o lockfile, `ScheduleModule.forRoot()` nunca é importado em `apps/api/src/app.module.ts`. Sem isso, o NestJS não descobre os métodos decorados com `@Cron()` em `AlertasService` — os jobs agendados simplesmente nunca disparam (sem erro visível). Recomendo adicionar `ScheduleModule.forRoot()` aos imports do `AppModule` (ou do módulo de Alertas).

---

## 2. Build do frontend quebrado — `tsc -b` falha com 10 erros reais (CRÍTICO)

O script de build do `apps/web` é `tsc -b && vite build`. Rodei exatamente esse comando contra o código atual e ele falha com 10 erros de TypeScript — ou seja, **o frontend não builda hoje**, o que derruba qualquer deploy que dependa desse `build` (Coolify/Docker/Nixpacks todos usam esse script).

Os erros se dividem em três causas raiz:

### 2.1 Botão "Devolver planejamento" chama função inexistente (bug funcional real, não só de build)
`apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx:952`

```tsx
onClick={() => handleRejeitar(itemParaRejeitar.id, 'plan')}
```

`handleRejeitar` não existe em lugar nenhum do arquivo. A função correta, já implementada e funcional logo acima (linha ~458), é:

```tsx
async function devolverPlanejamento(id: string, motivo: string) { ... }
```

Isso não é só um erro de compilação: em runtime (se alguém buildar ignorando o TS) o clique no botão "Devolver" do modal de revisão de planejamento gera um `ReferenceError` no navegador — a funcionalidade de devolução de planejamento pelo coordenador pedagógico está quebrada.

**Correção:** trocar a linha 952 para `onClick={() => devolverPlanejamento(itemParaRejeitar.id, motivoRejeicao)}`.

### 2.2 `ChildAvatar` foi refatorado para receber `child`, mas 5 call sites ainda usam a API antiga
`apps/web/src/components/children/ChildAvatar.tsx` define hoje:

```ts
type ChildAvatarProps = {
  child?: ChildAvatarSource;
  alt?: string;
  sizeClassName?: string; imageClassName?: string; fallbackClassName?: string; ...
};
```

Mas estes arquivos ainda chamam o componente com a assinatura antiga (`firstName`, `lastName`, `photoUrl`, `size`), que não existe mais:

- `apps/web/src/pages/FaltasSecretariaPage.tsx:290` e `:332`
- `apps/web/src/pages/MatriculaPage.tsx:955`
- `apps/web/src/pages/MatriculasListPage.tsx:231`
- `apps/web/src/pages/MovimentacoesPage.tsx:223`

**Efeito:** além de quebrar o build, em runtime esses avatares provavelmente renderizam sem foto/iniciais (as props corretas nunca chegam ao componente).

**Correção:** atualizar as 5 chamadas para o novo formato, ex.: `<ChildAvatar child={{ firstName, lastName, photoUrl }} sizeClassName="w-10 h-10" />`.

### 2.3 `PageShellProps` foi renomeado (`titulo/subtitulo` → `title/subtitle`), 2 páginas não acompanharam
`apps/web/src/components/ui/PageShell.tsx` expõe `title` e `subtitle`, mas:

- `apps/web/src/pages/AtestadosDocumentosPage.tsx:207` e `:417`
- `apps/web/src/pages/TransporteRetiradaPage.tsx:166` e `:362`

ainda passam `titulo`/`subtitulo` (em português). **Correção:** renomear as props nesses 4 pontos de uso.

### 2.4 Tipo `unknown` em `user?.unit`
`apps/web/src/components/dashboard/UnifiedDashboard.tsx:556` — `user?.unit?.name` falha porque o tipo de `user.unit` no contexto de auth está como `unknown`. É preciso tipar `unit` corretamente na interface do usuário retornada por `useAuth()` (ou fazer um cast explícito documentado).

---

## 3. Bug de 500 documentado como "corrigido" mas presente no código (ALTO)

`RUNBOOK_CORRECOES.md` e `CORRECAO_PLANEJAMENTOS_500_2026-08-12.md` afirmam que o filtro por tipo de planejamento foi corrigido de `where.template = { type: query.type }` para `where.type = query.type`. **Isso não está no código.**

`apps/api/src/planning/planning.service.ts:441-443` hoje:

```ts
if (query.type) {
  where.template = { type: query.type };
```

Só que `PlanningTemplate` (ver `apps/api/prisma/schema.prisma:814+`) **não tem campo `type`**. Qualquer chamada a `GET /plannings?type=...` gera um erro de validação do Prisma Client (relação/campo inexistente) não tratado → **500**.

No momento o frontend (`apps/web/src/pages/PlanningsPage.tsx:76`) não envia esse parâmetro, então o bug está "adormecido" — mas `GetPlanningsParams` em `apps/web/src/api/plannings.ts` já expõe `type` como filtro válido, e é plausível que outra tela, integração ou uso futuro do filtro dispare o 500 de novo. É o tipo de bug que reaparece exatamente como o relatado em 12/08.

**Correção:** aplicar de fato o que o RUNBOOK já prescreve — `where.type = query.type` — e, já que existe um teste de regressão referenciado (`planning.service.spec.ts`) na documentação, verificar se ele foi commitado (não encontrei cobertura equivalente rodando/validando isso no service atual).

---

## 4. Dois `schema.prisma` divergentes no mesmo monorepo (MÉDIO — risco operacional)

Existem dois schemas Prisma:

- `apps/api/prisma/schema.prisma` — o que a API realmente usa (confirmado pelo `Dockerfile` e `entrypoint.sh`). Tem 74 models / 47 enums, inclui `QUINZENAL` e os campos do fluxo de revisão de planejamento.
- `packages/database/prisma/schema.prisma` — **não é importado por nenhum app** (`grep` por `@conexa/database` em `apps/*/src` não retorna nada), mas está bem mais desatualizado: 54 models / 34 enums, sem `QUINZENAL`.

O problema é que o `package.json` da raiz expõe scripts (`db:generate`, `db:migrate:deploy`, `db:studio`) que apontam para `packages/database`, e o `RUNBOOK.md` do repo chega a recomendar `pnpm --filter @conexa/api exec -- npx prisma migrate deploy` numa seção e `pnpm db:migrate:deploy` (que resolve para `@conexa/database`) em outra. Se alguém em uma operação de emergência rodar o comando errado contra o `DATABASE_URL` de produção, corre o risco de aplicar (ou tentar aplicar) um histórico de migrations desalinhado do schema real.

**Correção:** decidir se `packages/database` ainda tem propósito; se não tiver, removê-lo ou marcá-lo claramente como legado/não usado em produção. Se tiver, sincronizar os dois schemas via um único arquivo fonte (symlink ou geração automática) para eliminar a divergência.

---

## 5. Segredos reais commitados em texto puro no repositório (CRÍTICO — segurança, não deploy)

`CONFIGURACAO_COOLIFY_RAPIDA.md` linhas 25 e 28 contêm, ao que tudo indica, uma `DATABASE_URL` de produção real (usuário, senha e host internos, não um placeholder como `SUA_SENHA` usado nos demais `.md`) e um `JWT_SECRET` real em base64. O próprio `CORRECAO_PLANEJAMENTOS_500_2026-08-12.md` (seção "Achado de segurança separado") já sinalizava a existência de segredos em texto claro no repo e dizia que a rotação ainda precisava ser feita — continua pendente.

**Correção urgente, independente do resto:**
1. Rotacionar a senha do Postgres e o `JWT_SECRET` de produção agora (isso invalida todas as sessões ativas — avise a equipe).
2. Remover o conteúdo sensível do arquivo (usar placeholders como os outros `.md` já fazem).
3. Adicionar `*.md` com segredos ao processo de revisão, e considerar limpar o histórico do git (`git filter-repo`/BFG) já que o segredo permanece nos commits antigos mesmo depois de editar o arquivo atual.

---

## Priorização recomendada

1. Corrigir o lockfile (`pnpm install` + commit do `pnpm-lock.yaml`) — sem isso, nada mais importa, o deploy não sai do lugar.
2. Corrigir os 4 problemas de TypeScript do `apps/web` (seção 2) — sem isso, o build do frontend não completa.
3. Rotacionar os segredos vazados (seção 5) — independente e urgente.
4. Aplicar de fato o fix do filtro `type` em `planning.service.ts` (seção 3).
5. Resolver a divergência dos dois `schema.prisma` (seção 4) e decidir o destino de `packages/database`.

Depois desses 5 pontos, um redeploy limpo (build do zero, sem cache) deve eliminar tanto os "Internal Server Error" relatados quanto as falhas de pipeline. Recomendo repetir localmente `pnpm install --frozen-lockfile` e `pnpm build` como smoke test antes de cada deploy — é exatamente isso que teria pego os itens 1 e 2 antes de chegar em produção.
