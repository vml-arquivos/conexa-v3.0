# Correção V7 — Carregamento real dos dados da ficha do aluno na Secretaria

## Objetivo
Corrigir a edição de aluno na Secretaria, onde os dados existem no banco/API, mas campos aparecem vazios no formulário.

## Arquivos alterados
- apps/web/src/pages/MatriculaPage.tsx
- apps/api/src/children/children.service.ts

## Correções
- Hidratação robusta do formulário com `buildFormularioFromChild`.
- Leitura de colunas nativas de Child.
- Leitura de `dadosResponsaveis`, `documentosMatricula`, `autorizadosRetirada`, `transporteEscolar` e `fichaAdministrativa`.
- Fallback para `responsavelPrincipal` quando `responsavelLegal` não existir.
- Cache-busting na chamada `/children/:id`.
- Correção de duplicidades acidentais no código-fonte.
- Mantém upload de foto/documentos.

## Segurança
- Sem migration.
- Sem SQL.
- Sem alteração direta no banco.
- Sem tocar em matriz pedagógica, diário, plano, RDIC, histórico, turma ou matrícula.

## Teste mínimo
Abrir na Secretaria:
- `cmlw6nz6400e97yvud8y55ybp` — ALLYCIA ALVES DE OLIVEIRA
- `cmlw6nywi008t7yvu8xzdd014` — ALICIA DE SOUSA RIBEIRO

Validar se carregam naturalidade, UF, endereço, CEP, mãe, pai, responsável legal e autorizados.
