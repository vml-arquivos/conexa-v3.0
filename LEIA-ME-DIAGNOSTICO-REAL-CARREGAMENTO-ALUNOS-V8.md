# Diagnóstico real e correção V8 — carregamento de dados dos alunos

## Diagnóstico confirmado

O problema atual não é rota de banco nem ausência total de API. O pacote atual ainda tinha `MatriculaPage.tsx` com hidratação parcial do aluno:

- lia diretamente `c.dadosResponsaveis.mae`, `pai` e `responsavelLegal`;
- não considerava `responsavelPrincipal`;
- não fazia fallback para `fichaAdministrativa.raw`;
- não fazia fallback de endereço/CEP/naturalidade/UF a partir dos dados administrativos;
- não fazia cache-busting em `/children/:id`;
- mantinha um erro de JSX com `onClick` duplicado.

Com isso, alguns campos básicos carregavam, mas muitos campos administrativos ficavam vazios.

## Correção aplicada

Arquivo alterado:

- `apps/web/src/pages/MatriculaPage.tsx`

Correções:

- adicionada função `buildFormularioFromChild(child)`;
- hidratação por colunas nativas de `Child`;
- hidratação por `dadosResponsaveis`;
- fallback para `responsavelPrincipal`;
- fallback para `fichaAdministrativa.raw`;
- hidratação de documentos;
- hidratação de autorizados;
- hidratação de transporte;
- hidratação de matrícula/turma ativa;
- cache-busting em `/children/:id`;
- removido `onClick` duplicado.

## Segurança

- Sem migration.
- Sem SQL.
- Sem alteração direta no banco.
- Sem alteração em matriz pedagógica.
- Sem alteração em plano de aula.
- Sem alteração em diário.
- Sem alteração em RDIC.
- Sem alteração em histórico.
- Sem alteração em matrícula/turma.

## Observação importante

Se depois desta correção um campo continuar vazio, existem apenas duas possibilidades:

1. O campo não existe no banco nem nos JSONs administrativos daquele aluno.
2. A versão implantada no container não corresponde ao commit correto.

Nesse caso, validar diretamente `/children/:id` e a tabela `Child` para o aluno específico.
