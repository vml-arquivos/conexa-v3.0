# Correção de acessos operacionais V2

A versão anterior falhou por erro de sintaxe em `PROCEDURE` dentro de `DO $$`.
Nenhuma alteração foi aplicada, pois a execução parou dentro da transação.

Esta V2 remove a declaração de procedure interna e usa um loop PL/pgSQL simples.

## Arquivos

- `01_corrigir_acessos_operacionais_V2.sql`
- `02_conferir_acessos_operacionais_V2.sql`

## Execução

Faça backup antes.

```bash
docker exec -t w12b7gmnfug9fdi7kxdabrge pg_dump -U postgres -d postgres > backup_conexa_antes_correcao_acessos_v2_$(date +%Y%m%d_%H%M%S).sql
```

Depois:

```bash
docker cp /root/01_corrigir_acessos_operacionais_V2.sql w12b7gmnfug9fdi7kxdabrge:/tmp/01_corrigir_acessos_operacionais_V2.sql
docker cp /root/02_conferir_acessos_operacionais_V2.sql w12b7gmnfug9fdi7kxdabrge:/tmp/02_conferir_acessos_operacionais_V2.sql
docker exec -it w12b7gmnfug9fdi7kxdabrge psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/01_corrigir_acessos_operacionais_V2.sql
docker exec -it w12b7gmnfug9fdi7kxdabrge psql -U postgres -d postgres -f /tmp/02_conferir_acessos_operacionais_V2.sql
```
