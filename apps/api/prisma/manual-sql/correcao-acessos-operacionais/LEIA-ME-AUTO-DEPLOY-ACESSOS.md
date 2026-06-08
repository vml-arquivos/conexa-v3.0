# Auto deploy de correção de acessos operacionais

Este diretório contém o script `04_auto_deploy_corrigir_acessos_operacionais.sql`, que foi criado para rodar automaticamente durante o startup do container da API no Coolify.

O `entrypoint.sh` executa o arquivo por meio de `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ...` logo depois de `npx prisma migrate deploy` e antes do seed de alimentos. A execução é **idempotente**, portanto pode ser repetida em novos redeploys sem criar duplicidades.

## O que o redeploy passa a fazer

| Etapa | Ação |
|---|---|
| 1 | Aplica migrations Prisma com `npx prisma migrate deploy`. |
| 2 | Executa a correção operacional de acessos em `04_auto_deploy_corrigir_acessos_operacionais.sql`. |
| 3 | Regenera o Prisma Client. |
| 4 | Executa o seed idempotente de alimentos. |
| 5 | Inicia a aplicação NestJS. |

## Escopo da correção automática

A correção automática usa a matriz oficial de colaboradores operacionais por unidade e garante, quando possível, os seguintes pontos:

| Área | Tratamento |
|---|---|
| Usuários oficiais | Atualiza `User.unitId`, `User.mantenedoraId`, `User.status = ATIVO` e `User.emailVerified = true`. |
| Usuários ausentes | Cria usuário apenas se houver hash de senha reaproveitável no banco. |
| Roles esperadas | Garante `UserRole` ativo para a role oficial de cada e-mail. |
| Escopo de unidade | Garante `UserRoleUnitScope` para a unidade resolvida. |
| Roles divergentes | Desativa roles operacionais divergentes da matriz oficial para os e-mails mapeados. |
| Perfis sem acesso | Desativa `UserRole` de monitores e demais e-mails listados como sem acesso. |

## Segurança e limites

O script **não usa `DELETE`** e **não altera** as tabelas pedagógicas `Planning`, `Diary`, `DiaryEvent`, `Enrollment`, `Child`, `Classroom` ou `ClassroomTeacher`.

A resolução da unidade procura o registro que possui mais dados pedagógicos vinculados, usando contagem de crianças, turmas e matrículas ativas. Isso reduz o risco de vincular usuários a uma unidade duplicada ou sem dados.

Se a correção falhar, o `entrypoint.sh` registra o erro nos logs do deploy e mantém a aplicação subindo para evitar indisponibilidade. Para desativar temporariamente essa execução automática, defina a variável de ambiente abaixo no serviço da API:

```bash
RUN_ACCESS_FIX_ON_DEPLOY=false
```

## Arquivo principal

```text
apps/api/prisma/manual-sql/correcao-acessos-operacionais/04_auto_deploy_corrigir_acessos_operacionais.sql
```
