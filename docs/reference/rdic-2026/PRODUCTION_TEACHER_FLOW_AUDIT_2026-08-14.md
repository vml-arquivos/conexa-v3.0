# Auditoria do fluxo do professor em produção

**Origem:** `https://appcocris.casadf.com.br/app/teacher-dashboard`  
**Perfil usado:** professor de teste autenticado, sem alteração de registros nesta etapa.  
**Data exibida no sistema:** 14/08/2026.

## Painel inicial

O painel apresenta perfil ativo, unidade, turma, data e cockpit do dia. Para a turma de teste, foram exibidas 24 crianças, faixa visível aproximada de 41 a 52 meses, zero presenças registradas no dia, zero registros pedagógicos no dia e um planejamento no período. O painel informa presença, ausências, registros do dia, cobertura pedagógica semanal e planejamento ativo.

A tela lista atalhos para Plano de Aula, Diário, RDIC por Criança, Fotos da Turma, Atendimentos aos Pais, Matriz 2026, Alergias e Dietas, aplicativo móvel/PWA, requisições de materiais, chamada, IA Pedagógica e Progresso.

Cada cartão de criança oferece ações de **Registrar** e **Fotos**, além de acesso a microgestos. Isso confirma que já existe uma superfície adequada para coleta rápida, mas a auditoria de campos e persistência de cada fluxo ainda precisa ser concluída navegando individualmente por cada módulo.

## Implicações para o Relatório da Criança/RDIC

O painel já tem a arquitetura de navegação para transformar coleta diária em evidências: presença, diário, microgestos, fotos, planejamento, atividades, alergias/dietas, atendimentos familiares e relatório individual. O próximo passo deve conectar essas fontes por criança, data, contexto, campo de experiência, objetivo, autoria e unidade, sem duplicar o cadastro administrativo.

A visualização geral deve continuar mostrando somente indicadores necessários ao papel do professor. Dados sensíveis como alergias, medicamentos, tipo sanguíneo, laudos, CID e condições médicas devem possuir controles específicos e não devem aparecer em cards gerais nem ser copiados automaticamente para texto narrativo.

A navegação desta etapa foi somente de leitura. Nenhum planejamento, diário, chamada, foto, microgesto, relatório ou dado infantil foi criado, atualizado ou excluído.

## Diário de Bordo

O calendário mostra o status por dia — publicado, rascunho, pendente ou sem diário — e indica dias letivos futuros. O formulário do dia exige a realização da chamada oficial antes de guardar o diário; a presença pode ser ajustada manualmente, mas a guarda permanece bloqueada até a chamada.

O formulário atual coleta: registro rápido da acolhida; clima emocional da turma; momentos da rotina (acolhida, roda de conversa, atividade dirigida, brincadeira livre, higiene, refeição, repouso, atividade complementar e encerramento); microgestos pedagógicos com tipo, campo de experiência, crianças envolvidas, horário e descrição; execução do plano; resposta da turma; fatores como engajamento, tempo, materiais, intervenção, adaptações e ocorrências; materiais utilizados; adaptações; retomadas; fechamento geral; momento de destaque; encaminhamentos e próximos passos.

A seção de observações individuais oferece marcadores para aprendizagem e participação, autonomia, recusa, retomada, comportamento agitado, concentração, agressividade, instabilidade emocional/choro, isolamento/interação, comunicação, atenção especial e recusa de alimentação. A própria tela informa que essa seção **alimenta o RDIC**.

Há um campo de avaliação do plano gerado por IA e a tela informa que o texto alimenta o RIA e o RDIC, exigindo revisão antes de salvar. O sistema, portanto, já possui uma coleta rica, mas precisa de governança para distinguir observação objetiva, interpretação pedagógica, alerta de cuidado, informação sensível e texto narrativo final.

A navegação foi somente de leitura. Não houve chamada, registro, microgesto, foto, IA, rascunho ou publicação.

## RDIC por criança

A tela atual apresenta o título técnico **RDIC — Registro de Desenvolvimento Individual da Criança** e informa que a avaliação é bimestral por dimensões baseadas nos cinco Campos de Experiência da BNCC. No fluxo observado, o professor escolhe a criança, o trimestre e pode consultar o histórico.

O relatório atual organiza 25 indicadores, cinco por campo de experiência, com quatro estados: **Não Observado**, **Em Desenvolvimento**, **Consolidado** e **Ampliado**. Os campos exibidos abrangem relações sociais e afetivas; desenvolvimento motor; expressão artística; linguagem, narrativa e letramento emergente; e raciocínio lógico-matemático, ciências e exploração do mundo.

Há um bloco de evidências do período, progresso percentual e contagem por estado. Quando não existem diários no trimestre, a tela informa isso explicitamente. Há campos de Observação Geral do Professor e Próximos passos e encaminhamentos.

A tela possui um Motor de IA Assistiva LGPD que promete gerar rascunho de observação geral e próximos passos a partir do Diário de Bordo, declarando que os dados são anonimizados antes do envio à IA. Esse fluxo precisa ser auditado no código e nos logs para comprovar a anonimização, limitar os dados enviados e manter revisão humana obrigatória.

O RDIC atual é uma boa base, mas ainda está mais próximo de uma avaliação por indicadores do que do documento oficial semestral da SEEDF. A evolução correta é manter esse workflow técnico e acrescentar uma camada de consolidação oficial, sem trocar rotas, tabelas ou estados existentes.

A navegação foi somente de leitura; não foram selecionados indicadores, preenchidos textos, gerados rascunhos ou salvos relatórios.

## Saúde, alimentação e família

O painel de Saúde — Alergias e Dietas existe e oferece filtros por turma, categoria e severidade. As categorias visíveis são alergias, dietas especiais, condição médica e medicamentos, com severidades severa/crítica, moderada e leve. Para a unidade/perfil observado, o painel retornou zero registros de saúde. O módulo deve ser tratado como área sensível, com acesso mínimo e sem exposição em cards gerais.

O módulo Atendimentos aos Pais existe para registrar e acompanhar atendimentos com pais e responsáveis. Possui status Agendado, Realizado, Cancelado e Pendente Retorno, além de atualização e novo atendimento. A tela não exibiu registros para o perfil observado. Esse histórico poderá alimentar contexto e encaminhamentos do RDIC, mas não deve ser incorporado automaticamente ao texto sem seleção e revisão do responsável pedagógico.

A navegação foi somente de leitura; nenhum atendimento, alerta, alteração de saúde ou impressão foi executado.

## Matriz Pedagógica 2026

A Matriz 2026 informa que é baseada na Sequência Pedagógica Piloto 2026, alinhada à BNCC, distribuída em quatro bimestres e três segmentos. A tela exibe 164 objetivos totais: 52 para EI01/Bebês, 72 para EI02/Crianças Bem Pequenas e 40 para EI03/Crianças Pequenas.

Os filtros disponíveis são busca por objetivo/código BNCC/tema/atividade, segmento EI01/EI02/EI03, bimestre e cinco Campos de Experiência. A visualização da coordenação também possui controle para exemplos de atividades.

A matriz já é uma fonte estruturada para relacionar planejamento, diário e RDIC. Para os temas complementares solicitados pela Cocris, a evolução deve adicionar uma camada de tema/projeto/intencionalidade da unidade sem apagar nem misturar os objetivos oficiais da matriz.

A navegação foi somente de leitura.

## PWA/App Mobile

O PWA abre diretamente na Chamada do dia, com turma selecionável, contadores de presentes/faltas/pendentes, ação de marcar todos presentes, limpeza e cartões individuais. A própria tela indica que toque marca presença/falta e toque longo registra comportamento individual. Há navegação inferior para Chamada, Diário, Observação, Ocorrência e Alunos.

O Diário do Dia em modo móvel possui abas de diário da turma e individuais. A coleta rápida inclui clima emocional da turma, rotina, tipo de atividade, texto sobre o que aconteceu, momento de destaque, retomadas e até quatro fotos. O rascunho é salvo automaticamente e existe publicação do diário.

Esse fluxo atende ao requisito de poucos cliques e é um bom ponto de partida para micro-registros. A evolução necessária é criar ações estruturadas e opcionais para evidência individual, alimentação, repouso, higiene, interação, participação, comunicação e encaminhamento, evitando transformar cada clique em um rótulo fixo ou em diagnóstico.

A navegação foi somente de leitura; não foram marcadas presenças, selecionados comportamentos, adicionadas fotos, publicados diários ou criados registros.

## Observação individual no PWA

O fluxo móvel começa pela seleção de turma e criança e apresenta os cinco Campos de Experiência: O eu, o outro e o nós; Corpo, gestos e movimentos; Traços, sons, cores e formas; Escuta, fala e imaginação; Espaços, quantidades e transformações. A tela também permite adicionar até duas evidências fotográficas e salvar a observação.

Esse formulário é uma base adequada para evidência vinculada a contexto, mas a auditoria deve verificar se o registro inclui texto observacional, data/hora, atividade, autoria e revisão. A evolução deve permitir registrar observação sem obrigar o professor a escolher um rótulo de desenvolvimento ou um diagnóstico.

A navegação foi somente de leitura; nenhuma evidência ou observação foi salva.

## Ocorrências no PWA

O módulo de ocorrências é descrito como Saúde, acidentes e situações especiais. Os tipos disponíveis incluem mal-estar, queda/acidente, alergia, vômito, febre, choro excessivo, medicação e outro. O registro pode ser geral da turma ou vinculado a uma criança, exige descrição do que aconteceu, quando, atendimento e estado atual, permite até duas fotos e possui indicação de que o responsável já foi contactado.

Esses registros são importantes para o cuidado e para a continuidade do acompanhamento, mas devem permanecer separados entre: fato/ocorrência; atendimento prestado; comunicação familiar; informação de saúde; e encaminhamento. Apenas dados pertinentes e necessários devem ser reutilizados no RDIC, com controle de acesso e revisão humana.

A navegação foi somente de leitura; nenhuma ocorrência, foto ou contato foi registrado.

## Fotos e evidências visuais

O módulo Registros de Atividades organiza fotos e memórias da turma por título da atividade, data, quantidade de fotos e campo de experiência. Cada registro possui ações Ver e Compartilhar; a tela de detalhe oferece o botão explícito **Compartilhar com as famílias**.

Esse controle explícito é importante. A foto não deve entrar automaticamente no RDIC narrativo nem ser compartilhada por padrão. A evolução deve manter consentimento/uso de imagem, vínculo da foto com atividade e crianças envolvidas, visibilidade, autoria, data e possibilidade de retirada ou revisão.

A navegação foi somente de leitura; nenhum compartilhamento, download, upload ou alteração foi executado.
