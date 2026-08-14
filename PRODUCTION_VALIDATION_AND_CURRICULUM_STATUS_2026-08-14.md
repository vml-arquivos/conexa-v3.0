# COCRIS — validação de produção e enquadramento curricular

**Data da validação:** 14 de agosto de 2026  
**Repositório oficial:** `vml-arquivos/conexa-v3.0`  
**Ambiente consultado:** produção COCRIS, somente leitura para dados pedagógicos

## Situação final

A produção está operacional após a publicação dos ajustes de currículo, interface e cache. A API respondeu `status: ok` em `/health` e `status: ready`, `database: up` e `planning: ready` em `/health/ready`. A tela **Relatório da Criança** abre sem o erro observado anteriormente e apresenta as matrículas reais da turma consultada.

| Item | Resultado validado |
|---|---|
| API | Em execução após o rolling update do Coolify |
| Banco de dados | Pronto, sem migration nova, sem operação destrutiva e sem alteração de schema |
| Planejamentos | Módulo marcado como `ready` pelo endpoint de prontidão |
| RDIC técnico | Preservado em rotas, banco, payloads, estados e contratos |
| Nome visual | Exibido como **Relatório da Criança** nas telas revisadas |
| Lista de crianças no RDIC | Corrigida: a turma piloto voltou a exibir as 10 matrículas reais |
| Testes da API | 26 suítes e 210 testes aprovados |
| Build web | Concluído com sucesso; avisos Vite/PWA não bloqueantes |

## Como a faixa curricular é definida

A nomenclatura da turma, como “Maternal II C”, **não é uma fonte suficiente para definir a matriz pedagógica**. A referência segura é a data de nascimento das crianças com matrícula ativa na turma, na data do planejamento. Esta regra foi implementada no fluxo de matriz e planejamento para evitar que uma turma com composição diferente receba objetivos inadequados.

| Segmento técnico COCRIS | Faixa etária | Organização pedagógica correspondente |
|---|---:|---|
| EI01 | 0 a 18 meses | Bebês |
| EI02 | 19 a 47 meses | Crianças bem pequenas |
| EI03 | 48 a 71 meses | Crianças pequenas |

> No Currículo em Movimento do DF, a Educação Infantil organiza a aprendizagem por direitos e campos de experiência. A partir da seção indicada pelo usuário, a seleção de objetivos deve respeitar a etapa de desenvolvimento, e não apenas o nome administrativo da turma.

### Maternal II C

O Maternal II C **não ficou visível para os usuários de teste fornecidos**, que estavam vinculados somente ao CEPI Piloto. Portanto, não seria responsável atribuir uma faixa definitiva ao Maternal II C pelo nome.

A regra agora disponível no sistema resolve isso automaticamente pela composição real: se todas as matrículas estiverem em uma faixa, a matriz correspondente é usada; se houver crianças de mais de uma faixa, o formulário exige que professor ou coordenação escolha explicitamente um dos segmentos presentes antes de salvar ou enviar o planejamento. Essa escolha fica limitada às faixas realmente existentes na turma.

Como referência de validação, a turma **Maternal II — PILOTO** tinha 10 crianças entre **56 e 67 meses** na data da consulta. Todas pertencem a **EI03**, isto é, ao grupo de **crianças pequenas**. O cadastro administrativo dessa turma ainda indicava EI02, evidenciando por que a decisão baseada em matrículas reais é necessária.

## Correções publicadas

| Commit | Escopo |
|---|---|
| `5535e1d` | Apresentação visual de RDIC como **Relatório da Criança**, sem renomear identificadores técnicos |
| `ffd1322` | Resolução curricular por matrículas ativas; seleção explícita para turmas mistas; correção de build web |
| `544507c` | Proteção da tela de Relatório da Criança para nomes incompletos em dados existentes |
| `39d13a6` | Bypass de cache para rotas dinâmicas de crianças, impedindo reutilização indevida de resposta de turma |
| `71ce0bd` | Registro sanitizado da validação de produção na documentação de auditoria |

## Correção de produção mais recente

O erro restante na tela do relatório foi diagnosticado com precisão: a chamada automática do frontend para crianças recebia, de forma indevida, a lista cacheada de turmas. A mesma rota, quando consultada diretamente, retornava corretamente as 10 matrículas. O cache foi removido somente das rotas dinâmicas de crianças; listas de unidades, turmas e professores permanecem com cache multiunidade. Não houve alteração em banco, migração ou dados salvos.

## Limite e próximo dado necessário

Para informar a faixa do **Maternal II C** de forma definitiva, o sistema já dispõe da regra necessária, mas a unidade que contém essa turma precisa estar acessível ao perfil de consulta. Ao disponibilizar um usuário com escopo nessa instituição, a verificação pode retornar a distribuição exata de EI01/EI02/EI03 e confirmar a matriz indicada para o planejamento.

O relatório técnico completo da auditoria permanece em `docs/reference/matriz-2026/PRODUCTION_CLASSROOM_SEGMENT_AUDIT_2026-08-14.md`.
