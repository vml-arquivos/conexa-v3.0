# CONEXA — Atualização Secretaria Completa

Este repositório ZIP já está com as alterações aplicadas nos caminhos originais.

## Arquivos alterados/substituídos

- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/pages/SecretariaPage.tsx`
- `apps/web/src/pages/MatriculaPage.tsx`
- `apps/api/src/children/dto/create-child.dto.ts`
- `apps/api/prisma/schema.prisma`
- `packages/database/prisma/schema.prisma`

## Arquivos novos adicionados

- `apps/api/prisma/migrations/20260603040000_child_secretaria_administrative_fields/migration.sql`
- `packages/database/prisma/migrations/20260603040000_child_secretaria_administrative_fields/migration.sql`

## O que foi feito

1. Secretaria passa a ter identidade própria no menu.
2. Painel da Secretaria deixa de parecer Coordenação.
3. Secretaria passa a funcionar como cockpit administrativo da unidade.
4. Nova Matrícula passa a acompanhar os campos reais exigidos na ficha da criança e responsáveis.
5. DTO de criança passa a aceitar os campos administrativos da matrícula.
6. Model `Child` recebe campos opcionais para dados administrativos completos.
7. Migration aditiva com `ADD COLUMN IF NOT EXISTS` para não apagar dados existentes.

## Importante

Esta atualização TEM migration, porque novos dados de matrícula precisam ser armazenados no banco.

A migration é aditiva:
- não apaga dados;
- não renomeia tabelas;
- não remove colunas;
- não altera diário, planejamento, nutrição ou RDIC.

## Commit sugerido

`feat(secretaria): estrutura cockpit administrativo e matrícula completa`

## Deploy sugerido

1. Subir commit.
2. Deploy backend.
3. Executar migration, se o Coolify não executar automaticamente.
4. Deploy frontend.
5. Testar login de secretaria e nova matrícula.
