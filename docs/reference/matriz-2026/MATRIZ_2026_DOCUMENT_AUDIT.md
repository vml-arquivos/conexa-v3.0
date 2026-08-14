# Auditoria documental inicial — Matriz 2026 e Currículo em Movimento

**Data da análise:** 14 de agosto de 2026  
**Documentos analisados:**

| Documento | Arquivo preservado | Conteúdo identificado |
|---|---|---|
| Currículo em Movimento do Distrito Federal — Educação Infantil, 2ª edição, 2018 | `curriculo-em-movimento-df-educacao-infantil.pdf` | Organização oficial da Educação Infantil, periodização, direitos de aprendizagem, campos de experiência, avaliação e inclusão |
| Matriz Curricular 2026 — Associação Beneficente Coração de Cristo | `sequencia-pedagogica-matriz-2026.pdf` | Sequência anual por data, segmentos EI01/EI02/EI03, campos, objetivos BNCC, objetivos do Currículo em Movimento e intencionalidades |

## Achados normativos relevantes

O Currículo em Movimento define três referências etárias: **bebês**, de 0 a 1 ano e 6 meses; **crianças bem pequenas**, de 1 ano e 7 meses a 3 anos e 11 meses; e **crianças pequenas**, de 4 anos a 5 anos e 11 meses. O próprio documento afirma que esses marcos não devem ser tratados como enturmação seriada por idades estanques. O sistema, portanto, deve usar a faixa etária como referência curricular, não como diagnóstico ou classificação rígida da criança.

O documento também determina que a organização considere, além da faixa etária, as diferentes infâncias, o contexto sociocultural, o desenvolvimento físico, social, cognitivo, motor e emocional de cada criança, a maneira como cada criança aprende e a relação com as famílias. Os grupos etários são referências gerais; ritmos de aprendizagem e desenvolvimento devem ser considerados na prática pedagógica.

A avaliação indicada é contínua, formativa e processual. Ela deve apoiar decisões educativas, acompanhar o desenvolvimento e reorganizar situações pedagógicas. A base recomendada é a observação sistemática, crítica e criativa em diferentes momentos, com múltiplos registros — relatos, fotografias, desenhos, álbuns e outros — e não uma conclusão clínica automática.

A matriz deve preservar os seis direitos de aprendizagem — conviver, brincar, participar, explorar, expressar e conhecer-se — e os cinco campos de experiência: **O eu, o outro e o nós; Corpo, gestos e movimentos; Traços, sons, cores e formas; Escuta, fala, pensamento e imaginação; Espaços, tempos, quantidades, relações e transformações**.

## Achados na Matriz Curricular 2026

A matriz fornecida está organizada explicitamente em três segmentos: `EI01` — Bebês, `EI02` — Crianças Bem Pequenas e `EI03` — Crianças Pequenas. Ela descreve sequências por datas letivas e informa que os objetivos BNCC e do Currículo em Movimento devem ser transcritos de forma literal, enquanto a criação da experiência/atividade é responsabilidade pedagógica do professor, respeitando turma, interesses, contexto, materiais e singularidades.

A auditoria textual identificou 616 ocorrências de códigos de objetivos, 139 códigos distintos e distribuição por segmento conforme a tabela abaixo. Esses números são contagens do PDF, não uma certificação normativa de cobertura; a conferência final deve comparar cada código contra a fonte oficial BNCC/SEEDF e contra o calendário letivo aprovado.

| Segmento | Ocorrências de objetivos | EO | CG | TS | EF | ET |
|---|---:|---:|---:|---:|---:|---:|
| EI01 | 196 | 37 | 41 | 38 | 42 | 38 |
| EI02 | 215 | 42 | 43 | 39 | 43 | 48 |
| EI03 | 205 | 37 | 43 | 40 | 44 | 41 |
| **Total** | **616** | **116** | **127** | **117** | **129** | **127** |

A checagem automática não encontrou código de segmento (`EI01`, `EI02` ou `EI03`) deslocado para a seção de outro segmento. Entretanto, encontrou três possíveis inconsistências entre o texto do campo de experiência e o prefixo do código. Elas precisam de validação pedagógica antes de qualquer patch:

| Linha do texto extraído | Código | Campo escrito | Campo indicado pelo código | Situação |
|---:|---|---|---|---|
| 354 | `EI01EF01` | O eu, o outro e o nós | Escuta, fala, pensamento e imaginação | Revisar na fonte original |
| 2703 | `EI02ET04` | O eu, o outro e o nós | Espaços, tempos, quantidades, relações e transformações | Revisar na fonte original |
| 3066 | `EI02CG05` | O eu, o outro e o nós | Corpo, gestos e movimentos | Revisar na fonte original |

A extração textual de PDF pode quebrar colunas e misturar a leitura visual; por isso esses três casos não serão corrigidos automaticamente. A próxima etapa deve verificar as páginas correspondentes visualmente e confrontá-las com a BNCC/SEEDF.

## Conclusão de produto

A tela e o backend não devem continuar inferindo o currículo apenas pelo rótulo da turma, como “Maternal”. A referência correta deve ser a combinação de **unidade/mantenedora, ano letivo, data do planejamento, turma, composição etária da turma e segmento curricular aplicável**. Turmas homogêneas podem resolver um segmento automaticamente. Turmas mistas devem ser identificadas explicitamente e encaminhadas para uma escolha pedagógica da coordenação, ou para uma composição de objetivos, sem copiar silenciosamente a matriz EI01 para todos os segmentos.

A idade relevante para planejamento deve ser calculada na data de referência do planejamento, e não somente na data atual. Para não quebrar históricos, a regra deve ser versionada: planejamentos já salvos preservam a matriz/entrada originalmente utilizada; mudanças futuras aplicam-se apenas a novos planejamentos ou a um replanejamento explicitamente autorizado.

A futura evolução de relatórios deve usar termos como **observação**, **registro**, **trajetória**, **indicador pedagógico** e **sinal de atenção para acompanhamento**. Não deve usar “diagnóstico psicológico”, “diagnóstico clínico” ou afirmações de transtorno. Alertas devem apontar os registros que os motivaram, informar incerteza e recomendar conversa com a coordenação, família e profissional habilitado quando necessário.

## Próxima etapa aprovada tecnicamente

Antes de qualquer migration, commit ou deploy, será feita uma auditoria do código e do banco atual para documentar todas as heurísticas de segmentação. Em particular, devem ser confrontadas: a regra de `Classroom.ageGroupMin/ageGroupMax`, a resolução de matriz em `PlanningService`, a regra de `CurriculumMatrixEntryService.byClassroomDay`, o fallback `MATRIZ_2026` no frontend e os scripts de seed/patch. A meta é substituir divergências por uma única regra versionada e testável, mantendo compatibilidade com planejamentos existentes.

## Referências internas

- Currículo em Movimento extraído: `curriculo-em-movimento-df-educacao-infantil.txt`, linhas 731–735, 936–966, 2147–2174, 2251–2279 e 2299–2375.
- Matriz 2026 extraída: `sequencia-pedagogica-matriz-2026.txt`, linhas 6–44, 48–98 e estrutura diária por segmentos.
- Resultado da auditoria estrutural: `matrix-structure-audit.json` e `matrix-structure-audit.out`.

## Auditoria do código e do schema atual

A modelagem já possui os dados necessários para uma primeira versão segura da seleção por composição da turma: `Child.dateOfBirth`, `Enrollment.enrollmentDate/withdrawalDate/status`, `Classroom.ageGroupMin/ageGroupMax`, `CurriculumMatrix.year/segment/version` e `Planning.curriculumMatrixId`. Portanto, não é necessário apagar ou reclassificar planejamentos históricos para começar a corrigir a regra.

O problema principal é de **regra duplicada e inconsistente**, não de ausência completa de dados. Foram encontradas as seguintes decisões paralelas:

| Local | Regra atual | Risco |
|---|---|---|
| `ClassroomsController` | Segmento pelo `ageGroupMin`: `<=18` EI01, `<=47` EI02, restante EI03; cria turmas nos intervalos 0–18, 19–47 e 48–71 meses | Ignora a composição real das matrículas |
| `PlanningService.create` e `createFromTemplate` | Segmento e matriz ativa resolvidos novamente pelo `ageGroupMin` | Pode salvar o planejamento ligado à matriz errada quando a faixa da turma é imprecisa ou mista |
| `CurriculumMatrixEntryService.byClassroomDay` | Segmento pelo ponto médio de `ageGroupMin` e `ageGroupMax` | Diverge do `PlanningService`; por exemplo, 18–24 meses gera EI02 no carregamento diário e EI01 na criação |
| `DiaryEventService` | Também usa ponto médio | Cria uma terceira dependência implícita da regra de segmento |
| `PlanoDeAulaNovoPage` | Primeiro usa nome da turma; depois usa cortes locais `<=6` EI01 e `<=42` EI02; mantém fallback `MATRIZ_2026` quando o backend retorna vazio | Pode apresentar objetivos de outro segmento e salvá-los no JSON V2 mesmo quando o backend selecionou outro segmento |
| Scripts de importação/seed/migrations antigas | Há intervalos adicionais, como 0–12, 12–18, 19–35, 36–47, 48–60 e 60–71, além de scripts que clonaram EI01 para EI02/EI03 | Dificulta saber qual é a fonte de verdade e pode perpetuar dados clonados |

A conclusão operacional é que a primeira correção não deve ser uma migration destrutiva nem uma alteração em lote nas turmas. O caminho de menor risco é criar uma função central de resolução curricular, usá-la no backend e remover a inferência/fallback local do fluxo de planejamento. A função deve retornar estado explícito, por exemplo: `HOMOGENEOUS` com um segmento resolvido, `MIXED` com os segmentos presentes e `UNCONFIGURED` quando faltarem dados.

A composição etária deve ser calculada a partir das matrículas ativas na data de referência do planejamento. Para cada criança, a idade em meses deve ser calculada considerando `dateOfBirth` e a data do planejamento. A associação ativa deve respeitar `enrollmentDate`, `withdrawalDate` e `status`. A turma cadastrada continua sendo um fallback operacional e uma configuração pedagógica, mas não pode substituir silenciosamente a composição real quando houver matrículas válidas.

Para uma turma homogênea, o sistema pode selecionar automaticamente a matriz do segmento predominante. Para uma turma com crianças em mais de um segmento, a criação deve retornar uma resposta clara para escolha da coordenação ou oferecer uma matriz composta explicitamente. Não se deve usar o ponto médio para esconder heterogeneidade, pois isso produz uma falsa sensação de precisão.

O vínculo `Planning.curriculumMatrixId` deve continuar sendo preenchido no momento da criação. Depois de salvo, ele funciona como fotografia da matriz utilizada e preserva a reprodutibilidade do histórico. Alterações futuras na regra de seleção só devem afetar novos planejamentos, salvo ação explícita de replanejamento.

A página `PlanoDeAulaNovoPage` declara que os dados vêm exclusivamente do backend, mas ainda executa `buildFallback` quando a API devolve objetivos vazios, e o fallback possui cortes e inferência próprios. Esse fallback deve ser convertido em erro/estado de sincronização para coordenação, ou no mínimo ser protegido por uma configuração explícita de desenvolvimento; não deve inventar objetivos curriculares em produção. A remoção deve ser acompanhada por testes de que a tela não apresenta conteúdo de segmento diferente do retorno da API.

O script `patch-matriz-2026-from-pdf.js` é útil como base de importação idempotente, mas usa limites fixos de coordenadas do PDF e aceita o texto extraído do campo antes de validar o código BNCC. A auditoria de produção deve executar primeiro em `--dry-run`, gerar relatório de duplicatas, códigos inválidos, campos incompatíveis e datas fora do calendário, e só então aplicar entradas normativas. Entradas com `DiaryEvent` não devem ser sobrescritas automaticamente; a preservação histórica já é uma premissa correta.

## Auditoria direta do PDF e risco do importador atual

Foi executado um parser somente leitura sobre o PDF original após ajustar as coordenadas à geometria real do arquivo. O documento tem 152 páginas. A extração identificou 297 linhas com código BNCC reconhecível, distribuídas em 110 entradas EI01, 81 EI02 e 106 EI03. Esses totais devem ser tratados como resultado de extração inicial, não como contagem definitiva da matriz, porque o PDF usa células quebradas em várias linhas e alguns campos não ficam completos em uma única linha visual.

A extração encontrou uma incompatibilidade de campo/código em uma linha: na página 57, a linha de 17/03 aparece visualmente como `Corpo, gestos`, mas o código é `EI02ET01`. Também encontrou a mesma data `16/10` duas vezes para EI03, nas páginas 91 e 142, o que exige conferência se é duplicidade intencional de calendário ou erro de extração/edição. Oito linhas apresentaram objetivo normativo vazio na coluna capturada, incluindo páginas 28, 36, 43, 82, 85, 87, 90 e 91.

A conclusão técnica mais importante é que o script atual `patch-matriz-2026-from-pdf.js` **não pode ser usado diretamente com este PDF**. O parser embutido nele usa limites de coluna que não capturam de modo confiável o código (o PDF posiciona códigos a partir de aproximadamente X=223, enquanto o script inicia a coluna em X=245) e valida o código com regex sem remover os parênteses `(EI01EO03)`. Em teste equivalente, o parser inicial não encontrou nenhuma linha válida. Qualquer importação automática sem corrigir e testar essa etapa poderia esvaziar a sincronização ou gravar campos deslocados.

Antes de importar uma nova matriz, o processo seguro precisa gerar um relatório de pré-validação com: páginas e segmento detectado, datas, códigos, campo derivado do código, texto integral de cada célula, objetivos normativos não vazios, duplicatas por segmento/data, códigos fora do segmento, dias fora do calendário e uma amostra visual das linhas suspeitas. Só após a revisão dos casos suspeitos deve ser criado um snapshot versionado da matriz e executado um patch idempotente em modo dry-run.

## Desenho seguro recomendado

### Seleção da matriz por turma e data

A aplicação deve ter uma única função de domínio, compartilhada por criação de planejamento, carregamento de objetivos, diário e relatórios:

```text
resolveCurriculumContext(classroomId, referenceDate, optionalSegmentOverride)
  -> referenceDate
  -> enrolledChildren
  -> ageInMonths(child.dateOfBirth, referenceDate)
  -> segmentByChild
  -> resolutionStatus: HOMOGENEOUS | MIXED | NO_ACTIVE_ENROLLMENT | CONFIGURATION_FALLBACK
  -> resolvedSegment, candidateSegments, counts, source
```

A função deve ser determinística e baseada em idade cronológica apenas como referência curricular, nunca como avaliação clínica. O cálculo precisa usar a data do planejamento, porque a idade pode mudar entre o início e o fim do ano letivo. Matrículas válidas devem ser filtradas por `enrollmentDate`, `withdrawalDate` e `status`.

| Situação na data do planejamento | Comportamento recomendado |
|---|---|
| Todas as matrículas ativas estão no mesmo segmento | Selecionar automaticamente a matriz ativa da mantenedora, ano e segmento; mostrar no formulário a origem da seleção |
| Há matrículas ativas em mais de um segmento | Mostrar “turma com composição etária mista”, listar os segmentos e exigir escolha pedagógica explícita ou planejamento composto; não escolher pelo ponto médio |
| Não há matrícula ativa | Usar a faixa configurada na turma apenas como fallback identificado e permitir revisão pela coordenação |
| A faixa da turma está fora das referências | Não falhar silenciosamente; retornar configuração inválida e impedir seleção automática até a coordenação corrigir |

A primeira migration deve ser aditiva e opcional. Uma evolução mínima pode adicionar ao `Planning` campos como `curriculumSegment`, `curriculumResolutionSource` e `curriculumResolutionSnapshot` nullable, registrando o segmento utilizado, a fonte da decisão e a fotografia resumida da composição no momento da criação. O campo `curriculumMatrixId` atual permanece como vínculo histórico principal. Nenhum planejamento existente deve ser regravado.

### Frontend

O formulário deve parar de inferir o segmento pelo nome da turma ou por cortes locais. Ele deve consumir exclusivamente o contexto retornado pelo backend. Quando a API não possuir entrada para a data, a tela deve exibir “matriz não sincronizada para esta data” e oferecer ação de diagnóstico à coordenação; não deve carregar silenciosamente `MATRIZ_2026` local de outro segmento. O fallback local pode continuar em ambiente de desenvolvimento com uma flag explícita, mas não em produção.

### Relatório individual e observações

O sistema já possui `DevelopmentObservation`, `DevelopmentReport`, `RDIXInstancia`, `MicrogestoRegistro`, `ChildProfileStats` e `AlertaAluno`. Não é recomendável criar uma nova tabela paralela nesta primeira etapa. O caminho mais seguro é manter os contratos internos e os status existentes, mas apresentar na interface um nome novo, ainda a ser confirmado, e criar rotas/serializadores compatíveis.

A estrutura de relatório deve separar quatro camadas: fatos observados com data e fonte; interpretação pedagógica vinculada a campo de experiência/objetivo; progressão de experiências ao longo do tempo; e próximos passos pedagógicos. Termos clínicos legados como `psychologicalNotes` e `developmentAlerts` não devem receber novos preenchimentos automáticos. Eles devem ser tratados como campos legados sensíveis, visíveis somente a perfis autorizados, com migração futura para linguagem de observação pedagógica.

Qualquer alerta deve ser um **sinal de acompanhamento**, nunca um diagnóstico. O registro deve indicar evidências, período observado, frequência, contexto, autoria e ação recomendada. A IA, se utilizada, deve apenas organizar textos já registrados, sugerir perguntas de observação ou resumir evidências anonimizadas; a decisão profissional continua com professor, coordenação, família e profissional habilitado quando necessário.

### Coleta diária e relatórios automáticos

A automação diária deve começar com dados internos do próprio Conexa: matrículas, frequência, planejamentos, diário, observações, microgestos e avaliações pedagógicas. A rotina deve ser idempotente, registrar `runId`, janela de processamento, contagens e falhas, e nunca transformar ausência de registro em evidência de atraso ou condição.

Há duas opções viáveis para a execução recorrente:

| Abordagem | Trade-offs | Custo | Complexidade de configuração |
|---|---|---|---|
| Rotina determinística dentro da API/infraestrutura atual, executada uma vez ao dia | Mais previsível, auditável e barata; exige controlar lock, retry e observabilidade no ambiente de produção | Baixo custo operacional adicional | Média |
| Serviço agendado separado que consulta a API e gera resumos com IA | Isola carga e facilita trocar o modelo; aumenta superfície de segurança, gestão de credenciais e risco de enviar dados infantis para fora | Variável conforme volume e modelo | Alta |

A opção mais leve para a primeira entrega é a rotina determinística interna, com IA opcional apenas em uma etapa posterior e com dados minimizados. Não deve ser criado um agendamento permanente nesta fase sem a escolha explícita da arquitetura e sem definir retenção, consentimento, perfis que recebem alertas e canal de entrega.

## Referências

[1]: ./curriculo-em-movimento-df-educacao-infantil.pdf "Currículo em Movimento do Distrito Federal — Educação Infantil"

[2]: ./sequencia-pedagogica-matriz-2026.pdf "Sequência Pedagógica — Matriz 2026"

[3]: ./curriculo-em-movimento-df-educacao-infantil.txt "Texto extraído do Currículo em Movimento para auditoria"

[4]: ./sequencia-pedagogica-matriz-2026.txt "Texto extraído da Matriz 2026 para auditoria"

## Complemento documental — Currículo em Movimento a partir da página 58

A partir da página 58 do documento, o Currículo em Movimento explicita que, na **Educação Infantil**, as aprendizagens e o desenvolvimento têm como eixos estruturantes **educar e cuidar**, bem como **brincar e interagir**. O texto também reforça que essa etapa não deve ser organizada com base em conteúdos disciplinares fragmentados, mas sim em experiências concretas da vida cotidiana das crianças.

Nas páginas seguintes, o documento organiza a proposta a partir de três princípios formativos — **éticos, políticos e estéticos** — e deles deriva os **seis direitos de aprendizagem e desenvolvimento**: **conviver, brincar, participar, explorar, expressar e conhecer-se**. Em seguida, o currículo afirma que desses direitos emergem os **cinco campos de experiência**: **O eu, o outro e o nós; Corpo, gestos e movimentos; Traços, sons, cores e formas; Escuta, fala, pensamento e imaginação; Espaços, tempos, quantidades, relações e transformações**.

Esse trecho reforça tecnicamente que a organização curricular da Educação Infantil no COCRIS não pode depender apenas do nome histórico da turma. A matriz e os objetivos precisam respeitar a etapa da infância atendida e a experiência real das crianças matriculadas, porque a própria arquitetura curricular do DF é definida por desenvolvimento, interação, brincadeira e campos de experiência, e não por uma etiqueta fixa de turma.


## Complemento documental — páginas 63 a 67

Nas páginas seguintes, o Currículo em Movimento aprofunda que os **campos de experiência** funcionam como organização curricular voltada a evitar a fragmentação dos conhecimentos e a considerar a **multidimensionalidade** das crianças. O documento afirma que uma única atividade pode explorar várias linguagens ao mesmo tempo e que a instituição deve organizar espaço e tempo para interações socioculturais, brincadeiras, atividades expressivas, artísticas, jogos e música.

No início da seção **16.1. O eu, o outro e o nós**, o currículo esclarece que esse campo ajuda a criança a descobrir a si mesma, aos grupos dos quais faz parte e aos outros coletivos, fortalecendo identidade, alteridade, autonomia, autorregulação, autocuidado, reciprocidade, pertencimento e responsabilidade com pessoas, animais, natureza e planeta. O texto também vincula esse campo às relações sociais, à história, à cultura e às manifestações da vida comunitária.

A tabela da página 65 é especialmente relevante para o COCRIS porque distribui objetivos do campo **O eu, o outro e o nós** por três grupos etários: **bebês (0 a 1 ano e 6 meses)**, **crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)** e **crianças pequenas (4 anos a 5 anos e 11 meses)**. Isso confirma documentalmente que a expectativa pedagógica muda conforme a etapa da infância e que o sistema precisa selecionar objetivos compatíveis com a composição etária real das matrículas ativas, em vez de depender apenas do nome da turma.
