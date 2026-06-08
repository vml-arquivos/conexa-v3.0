# Correção V6 — Hidratação completa da ficha do aluno

## Objetivo

Corrigir a tela da Secretaria em `Editar Aluno`, onde o banco já possui os dados completos, mas vários campos aparecem vazios no formulário.

## Causa tratada

O formulário agora hidrata o estado usando:
- colunas nativas da tabela `Child`;
- `dadosResponsaveis`;
- `documentosMatricula`;
- `autorizadosRetirada`;
- `transporteEscolar`;
- `fichaAdministrativa`.

Também foi adicionado cache-busting em `/children/:id` para evitar resposta antiga do navegador.

## Arquivos alterados

- `apps/web/src/pages/MatriculaPage.tsx`
- `apps/api/src/children/children.service.ts`
- `apps/api/src/reports/reports.service.ts`

## Segurança

- Não altera banco.
- Não tem migration.
- Não altera alunos no banco.
- Não mexe em matriz pedagógica.
- Não mexe em plano de aula.
- Não mexe em diário.
- Não mexe em RDIC.
- Não mexe em histórico.
- Não mexe em matrícula ou turma.

## Teste obrigatório

1. Fazer deploy do frontend.
2. Se incluir backend no commit, fazer deploy do backend também.
3. Abrir Secretaria → Matrículas e Fichas.
4. Abrir a aluna `ALLYCIA ALVES DE OLIVEIRA`.
5. Verificar se carrega:
   - nacionalidade;
   - naturalidade;
   - UF;
   - endereço;
   - CEP;
   - mãe;
   - pai;
   - responsável legal;
   - autorizado de retirada.
