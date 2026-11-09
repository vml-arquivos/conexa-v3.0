# Prompt de execução — Deploy e teste do módulo Manutenção + Painel de Administração

Contexto: o Conexa V3 é um monorepo (apps/api NestJS+Prisma, apps/web React/Vite) publicado no Coolify.
O trabalho está na branch `feature/manutencao-paineis`. É 100% aditivo (novas tabelas, novo papel, novas rotas). Nada existente foi removido.

## Regras
- Não faça deploy direto na produção antes do passo 4 passar.
- Não rode seeds em produção sem ler o passo 3.
- Em qualquer falha, pare e avise; a reversão está no fim.

## Passos
1. **Backup**: faça backup do banco (snapshot ou pg_dump) antes de tudo.
2. **Deploy de teste**: no Coolify, faça deploy da branch `feature/manutencao-paineis` em um ambiente de teste (ou direto na branch, se for o único ambiente). O `entrypoint.sh` aplica a migration automaticamente (`prisma migrate deploy`). Confirme no log as migrations `20261109100000_add_service_orders_and_maintenance_role` e `20261109140000_add_user_home_path` aplicadas.
3. **Popular o piloto** (seguro: só cria dados na mantenedora `mant-piloto-001`, idempotente):
   `cd apps/api && npm run seed:piloto` (dentro do container da API). Opcional: `PILOTO_SENHA=outra npm run seed:piloto`.
   O fim do log lista os 18 logins.
4. **Aceite**: siga `docs/GUIA_ACESSOS_PILOTO.md` (tabela de logins e roteiro). Marque cada painel como OK/Falhou, com print em caso de falha. Verifique também que um login real existente (ex.: professor) continua funcionando como antes.
5. **Isolamento**: entre como `mantenedora@piloto.conexa.test` e confirme que NÃO aparece nenhuma unidade/criança real.
6. **Aprovação**: se tudo OK, abra o Pull Request para `main` e faça o merge. Crie os logins reais de manutenção em Administração > Usuários (papel "Manutenção").

## Tela de usuários (Painel Dev / Administração > Usuários)
Conferir: filtros por unidade, cargo, turma e status; agrupar por unidade/cargo; criar usuário com cargo + unidade + turma + "Painel de entrada"; botão "Novo da Manutenção"; entrar com o usuário criado e ver que abre no painel escolhido.

## Reversão
Redeploy do commit anterior no Coolify. As novas tabelas e valores de enum são inertes para a versão antiga (nada precisa ser desfeito no banco).
