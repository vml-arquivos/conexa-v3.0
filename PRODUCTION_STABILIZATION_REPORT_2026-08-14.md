# Relatório de estabilização de produção — COCRIS/Conexa V3

**Data:** 14 de agosto de 2026  
**Repositório oficial:** [vml-arquivos/conexa-v3.0](https://github.com/vml-arquivos/conexa-v3.0)  
**Branch publicada:** `main`  
**Commit final:** [`1e1fe2b`](https://github.com/vml-arquivos/conexa-v3.0/commit/1e1fe2b006e8cc360bd12f22829e970d6368546f)  
**Ambiente:** Coolify, servidor `localhost`, projeto Conexa V3, ambiente `production`

## Resultado executivo

A API Conexa foi estabilizada em produção. O container está em estado **Running** no commit `1e1fe2b`, o NestJS concluiu a inicialização e os endpoints de saúde confirmam que a aplicação está pronta, com o banco operacional acessível e o schema de Planning validado.

O incidente teve duas causas independentes. A primeira foi uma divergência entre a senha efetiva do role PostgreSQL e a senha que estava nos URLs de conexão da API. A segunda foi uma comparação excessivamente restritiva no `entrypoint.sh`: o PostgreSQL retornou corretamente `true|true|true|true`, mas o script aceitava somente `t|t|t|t` e abortava o deploy mesmo com as quatro verificações aprovadas.

> Nenhuma tabela, migration, usuário, criança ou planejamento existente foi apagado. Não foi executado `DROP`, `DELETE` de dados, `prisma migrate resolve` ou operação equivalente no banco.

## Diagnóstico e correções aplicadas

| Área | Evidência | Correção realizada | Estado |
|---|---|---|---|
| Conectividade | O host `w12b7gmnfug9fdi7kxdabrge` resolveu na rede Docker `coolify` e o PostgreSQL respondeu pela porta `5432`. | Mantido o host interno do recurso PostgreSQL operacional. | Confirmado |
| Autenticação PostgreSQL | O teste inicial retornava `password authentication failed`; após sincronização controlada, retornou `postgres|postgres` e `AUTH_EXIT=0`. | DATABASE_URL e DIRECT_URL foram alinhados ao recurso PostgreSQL e o role `postgres` foi sincronizado com a senha do recurso. | Confirmado |
| Banco utilizado | O entrypoint passou a informar `Banco consistente: postgres`. | Mantido o banco lógico operacional `postgres`; o banco separado `conexa` não foi utilizado. | Confirmado |
| Migrations | O runtime informou `44 migrations found`, `No pending migrations to apply` e `Migrations aplicadas com sucesso`. | A migration falhada foi preservada como `ROLLED-BACK`; a recuperação temporária foi usada somente de forma explícita e depois removida. | Confirmado |
| Schema | O PostgreSQL retornava `true|true|true|true`, embora o script aceitasse apenas `t|t|t|t`. | `apps/api/entrypoint.sh` passou a aceitar ambos os formatos booleanos válidos. | Publicado |
| Repositório | Testes e validações locais passaram. | Commit `1e1fe2b006e8cc360bd12f22829e970d6368546f` publicado diretamente na `main`. | Confirmado |
| Zelari | O repositório de referência permaneceu somente leitura. | Nenhum arquivo ou commit foi alterado no Zelari. | Confirmado |

## Validação do deployment

O Coolify buscou explicitamente o commit `1e1fe2b006e8cc360bd12f22829e970d6368546f`. O build da imagem foi concluído, o novo container foi publicado e os logs do runtime registraram `Nest application successfully started`. O status atual mostrado pelo Coolify é **Running**.

O endpoint [`/health`](https://apicocris.casadf.com.br/health) respondeu com `{"status":"ok"}`. O endpoint [`/health/ready`](https://apicocris.casadf.com.br/health/ready) respondeu com `{"status":"ready","database":"up","planning":"ready"}`. A resposta de prontidão foi repetida após a limpeza da variável temporária e continuou normal.

Uma chamada não autenticada para [`GET /plannings`](https://apicocris.casadf.com.br/plannings) respondeu `401 Unauthorized`, que é o comportamento esperado de uma rota protegida e comprova que a rota não está mais falhando com HTTP 500 antes mesmo da autorização.

Com a sessão autenticada da professora de teste, a tela de planejamentos carregou normalmente. O planejamento de integração foi salvo pelo fluxo real do aplicativo como rascunho, redirecionando para a tela de edição e exibindo o toast **“Rascunho salvo”**. Em seguida, a listagem exibiu **1 planejamento no mês**, com o título `Planejamento MATERNAL II A — 13/08/2026`, status **Rascunho** e a indicação de que havia um rascunho não enviado. Isso valida o fluxo autenticado de leitura e gravação associado a `/plannings`.

O registro criado para a validação possui o identificador `cmsse4ajt000tytzfqssnnomz` e o título `Planejamento MATERNAL II A — 13/08/2026`. Ele foi deliberadamente mantido como rascunho para não afetar publicação, revisão ou execução pedagógica. A remoção desse registro não foi realizada, pois seria uma operação adicional de dados e não é necessária para manter o sistema funcional.

## Validações locais e repositório

A validação `bash -n apps/api/entrypoint.sh` passou, assim como `git diff --check`. A suíte da API passou integralmente: **23 suítes, 199 testes, 0 falhas e 0 snapshots alterados**. A branch local está em `main`, sem alterações pendentes, e o SHA remoto de `origin/main` coincide com `1e1fe2b006e8cc360bd12f22829e970d6368546f`.

## Configuração operacional pós-correção

DATABASE_URL e DIRECT_URL foram mantidos no banco `postgres`, host interno `w12b7gmnfug9fdi7kxdabrge`, porta `5432`, com disponibilidade em Runtime e sem necessidade de disponibilidade em Buildtime. As variáveis temporárias de recuperação foram removidas do Coolify após a confirmação de que a migration estava em estado `ROLLED-BACK` e não havia linhas FAILED ativas. O Coolify confirmou **“Environment variable deleted successfully”** para `PRISMA_ROLLBACK_MIGRATION`.

Foram preservados os backups realizados antes das alterações operacionais: `/root/conexa-backups/20260814-015444/postgres.dump` e `/root/conexa-backups/20260814-015444/conexa.dump`. O banco operacional confirmado nos logs e endpoints é `postgres`; o dump `conexa` foi mantido apenas como backup e não foi utilizado pela API.

## Recomendações pós-apresentação

A estabilização foi concluída sem rotacionar os segredos, para não invalidar sessões ou introduzir indisponibilidade antes da apresentação. Depois da apresentação, recomenda-se uma janela controlada para rotacionar JWT_SECRET, JWT_REFRESH_SECRET, credenciais PostgreSQL, Redis e a chave de IA, atualizando os valores apenas no Runtime e fazendo um redeploy acompanhado pelos mesmos testes de saúde e Planning.

Também é recomendável decidir, com autorização explícita, se o rascunho de integração `cmsse4ajt000tytzfqssnnomz` deve permanecer como evidência de teste ou ser removido em uma operação posterior. Essa decisão é independente da correção do HTTP 500 e não deve ser misturada com migrations ou ajustes de infraestrutura.

## Referências

[1]: https://github.com/vml-arquivos/conexa-v3.0/commit/1e1fe2b006e8cc360bd12f22829e970d6368546f "Commit final publicado na main"

[2]: https://apicocris.casadf.com.br/health "COCRIS API — health"

[3]: https://apicocris.casadf.com.br/health/ready "COCRIS API — health/ready"

[4]: https://apicocris.casadf.com.br/plannings "COCRIS API — rota protegida de plannings"
