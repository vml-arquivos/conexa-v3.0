
# Correção segura de acessos operacionais — Conexa

## Diagnóstico usado

O diagnóstico mostrou:

- Arara Canindé ainda tinha apenas os logins antigos de direção, coordenação e nutrição.
- Arara não tinha secretaria cadastrada.
- Não há usuário operacional sem unidade.
- Não há usuário com múltiplas roles.
- STAFF_CENTRAL aparece apenas nos usuários centrais/piloto.
- Flamboyant foi importado com monitoria, cozinha, limpeza, porteiro, patrimonial e aprendiz com acesso ao sistema.
- Alunos estão corretamente vinculados às suas unidades.
- Não há aluno com unitId diferente da turma.
- Não há matrícula ativa duplicada por aluno.
- Existe apenas 1 aluno sem matrícula na Sabiá do Campo, que deve ser tratado separadamente.

## Scripts

1. `01_corrigir_acessos_operacionais.sql`
   - Faz a correção.
   - Não altera alunos, matrículas, turmas, histórico, diário, planejamento ou RDIC.
   - Atualiza/cria apenas usuários e UserRole.

2. `02_conferir_acessos_operacionais.sql`
   - Conferência pós-correção.
   - Somente leitura.

## Antes de executar

Faça backup:

```bash
docker exec -t w12b7gmnfug9fdi7kxdabrge pg_dump -U postgres -d postgres > backup_conexa_antes_correcao_acessos_$(date +%Y%m%d_%H%M%S).sql
```

## Execução

Copiar para o container:

```bash
docker cp /root/01_corrigir_acessos_operacionais.sql w12b7gmnfug9fdi7kxdabrge:/tmp/01_corrigir_acessos_operacionais.sql
docker cp /root/02_conferir_acessos_operacionais.sql w12b7gmnfug9fdi7kxdabrge:/tmp/02_conferir_acessos_operacionais.sql
```

Executar correção:

```bash
docker exec -it w12b7gmnfug9fdi7kxdabrge psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/01_corrigir_acessos_operacionais.sql
```

Conferir:

```bash
docker exec -it w12b7gmnfug9fdi7kxdabrge psql -U postgres -d postgres -f /tmp/02_conferir_acessos_operacionais.sql
```

## Logins reais da Arara após correção

- Direção: `ddacruz385@gmail.com`
- Coordenação: `coordenadoracaarol@gmail.com`
- Nutrição: `ds.viana@yahoo.com.br`
- Secretaria: `adriel-souza11@hotmail.com`

Senha operacional esperada: mesma senha hash usada como padrão de teste, se esse hash existir no banco.
