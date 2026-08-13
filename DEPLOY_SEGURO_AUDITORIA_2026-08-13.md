# Deploy seguro — Conexa 13/08/2026

Use **este repositório completo corrigido** como a nova base.

## Antes do deploy

1. Faça snapshot/backup do PostgreSQL.
2. No Coolify da API, confirme que existem `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET`.
3. `DATABASE_URL` e `DIRECT_URL` precisam apontar para o mesmo banco lógico. Host/porta podem ser diferentes (pooler x conexão direta).
4. Rotacione os segredos que já estiveram em arquivos do repositório. Não commite os novos valores.

## Validação local rápida

Antes do deploy, execute `pnpm audit:validate` (ou `node scripts/validate-audit-fixes.mjs`). O comando não precisa de banco e protege os 40 invariantes corrigidos pela auditoria.

## Ordem

1. Deploy da **API**, preferencialmente sem cache.
2. A API só deverá iniciar depois de migrations e validação do schema de Planning.
3. Abra `/health/ready` e confirme `status = ready` e `planning = ready`.
4. Deploy do **web**, sem ignorar falhas de TypeScript.

## Smoke test obrigatório

- entrar com usuário professor;
- abrir Plano de Aula / Planejamentos;
- carregar calendário sem 500;
- criar planejamento;
- salvar rascunho;
- reabrir e editar;
- enviar para revisão;
- entrar como coordenação;
- aprovar um planejamento de teste;
- devolver outro com motivo;
- confirmar que o Diário carrega os planejamentos;
- confirmar que os cron jobs de Alertas são inicializados no boot.

Se `/health/ready` retornar 503, **não force a publicação**. Leia o log da API: o novo gate indica se o problema é conexão, divergência entre URLs, histórico Prisma ou schema de Planning.
