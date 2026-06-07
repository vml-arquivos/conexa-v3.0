# Correção V5 — Formulário de aluno, dados da planilha e selects

## Escopo

Correção somente de frontend para resolver inconsistências de carregamento dos dados da ficha administrativa do aluno no formulário da Secretaria.

## Arquivos alterados

- `apps/web/src/pages/MatriculaPage.tsx`
- `apps/web/src/pages/MatriculasListPage.tsx`

## O que foi corrigido

1. O modo edição agora carrega os dados do aluno usando leitura robusta dos campos nativos e dos JSONs administrativos:
   - `dadosResponsaveis`
   - `documentosMatricula`
   - `autorizadosRetirada`
   - `transporteEscolar`
   - `fichaAdministrativa`

2. Os campos da aba Responsáveis deixam de aparecer vazios quando os dados existem no banco em JSON.

3. Os campos de documentos, transporte, autorização de imagem, laudado, série anterior e responsáveis passam a usar aliases compatíveis com os dados das planilhas.

4. A lista de matrículas ganhou um select para escolher aluno já cadastrado, mantendo também o campo de busca por digitação.

5. A tela de matrícula/edição ganhou select de aluno já cadastrado em modo nova matrícula, para abrir/editar cadastro existente sem duplicar.

6. Pessoas autorizadas para retirada agora podem ser escolhidas por select a partir das pessoas já cadastradas em outros alunos da unidade, mantendo digitação manual.

7. Transporte escolar agora pode ser escolhido por select a partir dos transportadores já cadastrados em outros alunos da unidade, mantendo digitação manual.

## O que NÃO muda

- Não altera banco de dados.
- Não cria migration.
- Não altera alunos diretamente.
- Não altera matrícula.
- Não altera turma.
- Não altera diário.
- Não altera plano de aula.
- Não altera matriz pedagógica.
- Não altera RDIC.
- Não altera histórico.

## Deploy

Requer deploy do frontend.
Backend/banco não precisam de alteração para esta correção de tela.
