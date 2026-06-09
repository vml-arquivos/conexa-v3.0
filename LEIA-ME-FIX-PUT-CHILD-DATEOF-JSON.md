# Correção PUT /children/:id — dateOfBirth e JSONs administrativos

## Diagnóstico real

O backend estava retornando erro 500 ao salvar aluno porque o frontend envia `dateOfBirth` em formato `YYYY-MM-DD`, por exemplo:

```json
"dateOfBirth": "2024-02-17"
```

O Prisma Client, no `child.update`, estava recebendo essa string diretamente para um campo `DateTime` e rejeitando com:

```text
Invalid value for argument `dateOfBirth`: premature end of input. Expected ISO-8601 DateTime.
```

## Correção aplicada

Arquivo alterado:

```text
apps/api/src/children/children.service.ts
```

Alterações:

1. Normaliza `dateOfBirth` antes de enviar ao Prisma:
   - aceita `YYYY-MM-DD`;
   - converte para `Date` com `T00:00:00.000Z`;
   - remove `dateOfBirth` vazio em update;
   - lança `BadRequestException` se a data for inválida.

2. Preserva JSONs administrativos no update:
   - `dadosResponsaveis`;
   - `documentosMatricula`;
   - `autorizadosRetirada`;
   - `transporteEscolar`;
   - `fichaAdministrativa`.

3. Evita apagar arrays/objetos existentes quando o frontend envia `{}` ou `[]` vazio.

## Sem alterações perigosas

- Sem migration.
- Sem SQL.
- Sem alteração direta no banco.
- Sem alteração em matrícula, turma, plano, diário, RDIC ou histórico.
- Sem seed.
