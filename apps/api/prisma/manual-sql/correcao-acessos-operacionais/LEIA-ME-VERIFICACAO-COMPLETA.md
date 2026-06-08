# Verificação completa de acessos operacionais

Este diretório contém scripts manuais para diagnóstico e correção controlada de acessos operacionais no banco PostgreSQL de produção do Conexa.

O arquivo `03_verificar_acessos_completa_corrigida.sql` é **somente leitura**. Ele foi criado para substituir a verificação que falhou ao comparar o enum PostgreSQL `RoleType` diretamente com texto. Nesta versão, as comparações usam casts seguros, como `r.type::text`, e o script também verifica se há dados pedagógicos associados a `unitId` legado ou órfão.

## Execução recomendada na VPS

Após atualizar o repositório na VPS para o commit que contém este arquivo, execute a partir da raiz do repositório:

```bash
docker exec -i w12b7gmnfug9fdi7kxdabrge psql -U postgres -d conexa < apps/api/prisma/manual-sql/correcao-acessos-operacionais/03_verificar_acessos_completa_corrigida.sql
```

Se estiver fora da raiz do repositório, use o caminho absoluto correspondente ao clone local.

## Escopo do script

O script verifica a matriz oficial de usuários operacionais de Arara Canindé, Sabiá do Campo, Flamboyant e Pelicano, incluindo existência do usuário, status, `User.unitId`, `UserRole` ativo esperado e `UserRoleUnitScope`. Ele também lista usuários ativos de nível unidade/professor sem escopo, perfis sem acesso que ainda tenham role ativa, agregados por unidade/role e contagens pedagógicas somente leitura por unidade.

## Regras de segurança

Este script não executa `INSERT`, `UPDATE` nem `DELETE`. Ele não altera tabelas pedagógicas e deve ser usado antes de qualquer correção definitiva. Qualquer correção posterior deve ser feita em bloco transacional com `BEGIN` e `COMMIT`, usando `NOT EXISTS` antes de inserir vínculos, e sem alterar `Child`, `Enrollment`, `Classroom`, `ClassroomTeacher`, `Planning`, `Diary` ou `DiaryEvent`.
