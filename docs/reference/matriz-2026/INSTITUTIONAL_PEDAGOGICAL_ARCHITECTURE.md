# Arquitetura pedagógica institucional do Conexa

**Status:** desenho aprovado para análise e implementação gradual  
**Escopo:** Cocris/SEDF e futuras instituições com políticas pedagógicas próprias

## Princípio central

O Conexa deve deixar de tratar uma instituição como apenas um conjunto de turmas e planejamentos. Ele deve representar a forma como cada rede educacional trabalha, preservando uma camada comum de dados e permitindo que currículo, temas, calendários, relatórios, nomenclaturas, fluxos de revisão e alertas sejam configurados por mantenedora e, quando necessário, por unidade.

A Cocris utilizará o **RDIC — Relatório de Desenvolvimento Individual da Criança**, conforme a exigência da Secretaria de Educação do Distrito Federal. O nome RDIC não será removido nem substituído. Outras instituições poderão usar outro template e outro nome, mas compartilharão a mesma base de observações, evidências e evolução, desde que seus contratos e regras sejam configurados separadamente.

> O sistema pode organizar, resumir e relacionar evidências pedagógicas. Ele não deve transformar registros escolares em diagnóstico médico, psicológico, psiquiátrico ou de transtorno. Alertas serão sinais de acompanhamento pedagógico e encaminhamentos possíveis, nunca conclusões clínicas.

## Camadas do produto

| Camada | Função | Exemplo na Cocris |
|---|---|---|
| Núcleo comum | Criança, família, matrícula, turma, profissionais, presença, diário, atividades, anexos, auditoria e permissões | Dados multiunidade isolados por mantenedora e unidade |
| Política institucional | Define currículo, faixa de referência, calendário, temas, relatórios, vocabulário e fluxo de revisão | SEDF/BNCC + Currículo em Movimento + RDIC trimestral |
| Prática pedagógica | Planejamentos, objetivos, temas livres, atividades, materiais, experiências e avaliação formativa | Matriz 2026 combinada com temas da turma e decisões de coordenação |
| Acompanhamento individual | Observações datadas, evidências, evolução, participação, interesses, necessidades de apoio e próximos passos | Dados reais colhidos do diário, atividades e observações para compor o RDIC |
| Inteligência assistiva | Busca, correlação, resumo, lembretes e alertas explicáveis, com anonimização e revisão humana | Sinalizar ausência de observações no período ou sugerir continuidade de experiências |
| Apresentação e integração | Relatórios, infográficos, exportações, telas por perfil e APIs | RDIC oficial para Cocris; template próprio para outra creche |

## Perfil institucional

A modelagem atual de `Mantenedora` e `Unit` já garante o isolamento dos dados, e a `Mantenedora` já é a dona das matrizes curriculares e dos RDIC templates. A evolução deve ser aditiva, preferencialmente por um perfil versionado, sem substituir campos existentes:

```text
InstitutionalPedagogicalProfile
  mantenedoraId / unitId opcional
  profileKey: COCRIS_SEDF | CUSTOM
  curriculumPolicy: SEDF_BNCC | BNCC | CHILE | CUSTOM
  reportPolicy: RDIC_SEDF | CUSTOM
  reportLabel: texto exibido
  academicCalendarPolicy
  ageBandPolicy
  themePolicy
  terminologyJson
  featureFlagsJson
  version / isActive
```

O perfil da Cocris apontará para `RDIXTemplate`/`RDIXInstancia` e manterá os status já existentes: rascunho, revisão, aprovado, devolvido, finalizado e publicado. A interface poderá exibir “RDIC” com contexto institucional, enquanto o código interno legado continua compatível. Para outras instituições, a seleção de relatório será feita pelo perfil ativo, sem esconder ou misturar registros da Cocris.

## Conteúdo além da matriz

A matriz curricular fornece objetivos e intencionalidades. Ela não deve impedir que a instituição trabalhe temas, projetos, acontecimentos do cotidiano e propostas autorais. O planejamento deve separar claramente:

| Tipo | Origem | Deve aparecer no planejamento |
|---|---|---|
| Objetivo normativo | BNCC/Currículo institucional | Código, transcrição e campo de experiência, somente leitura |
| Intencionalidade pedagógica | Matriz ou autoria docente | Editável com justificativa e vínculo aos objetivos |
| Tema/projeto | Turma, unidade ou mantenedora | Nome, período, contexto, perguntas e experiências |
| Atividade/experiência | Professor ou equipe | Materiais, organização, acessibilidade e descrição do que será feito |
| Decisão de coordenação | Reunião, pauta ou ata | Encaminhamento, responsável, prazo e turmas impactadas |
| Evidência da criança | Diário, foto, produção ou observação | Registro datado, autoria, contexto e vínculo opcional ao objetivo/tema |

A coordenação pedagógica já possui `CoordenacaoReuniao`, `CoordenacaoParticipante`, `CoordenacaoAta`, `Formacao` e `Arquivo`. A primeira evolução deve reutilizar essas entidades e acrescentar apenas vínculos de encaminhamento, proposta ou material quando o contrato atual não comportar o caso. Não se deve criar um segundo módulo de reuniões paralelo.

## Geração progressiva do RDIC

O RDIC não deve ser preenchido por uma geração única e opaca. O ciclo recomendado é:

1. O professor registra fatos no diário, nas atividades e nas observações de desenvolvimento.
2. O sistema organiza cada registro por data, criança, turma, campo de experiência, tema, objetivo e fonte.
3. O professor ou coordenação revisa os registros e marca o que pode compor o relatório.
4. O sistema consolida tendências e lacunas de evidência, mostrando as fontes utilizadas.
5. A IA pode sugerir redação pedagógica neutra a partir de dados anonimizados, sempre com revisão humana.
6. O RDIC permanece em rascunho até ser revisado e segue o workflow oficial de aprovação/publicação.

O relatório deve apresentar evolução ao longo do período, experiências vivenciadas, participação, interesses, conquistas observadas, aspectos em desenvolvimento, estratégias que funcionaram, próximos passos e diálogo com família. Uma ausência de registro não pode ser interpretada como ausência de habilidade.

## Alertas e diagnósticos

O sistema pode ter diagnósticos **operacionais e pedagógicos do próprio sistema**, como “faltam evidências no período”, “há planejamento pendente”, “o relatório está incompleto” ou “há necessidade de revisar um objetivo”. Não deve emitir diagnóstico clínico sobre a criança.

Alertas individuais devem conter: motivo observável, período, fontes, nível de atenção, responsável pela revisão, prazo e histórico de resolução. Mensagens como “pode ser útil observar novamente em outro contexto” são aceitáveis; mensagens como “a criança tem transtorno” não são aceitáveis.

Campos legados como `psychologicalNotes`, `medicalConditions`, `cid`, `tipoLaudo` e `developmentAlerts` exigem controle de acesso e não devem ser alimentados por geração automática. Eles podem permanecer para compatibilidade administrativa, mas o novo fluxo deve priorizar observação pedagógica, contexto, evidência e encaminhamento profissional.

## Coleta real a partir de agora

A coleta começará com dados reais já produzidos no Conexa, sem gerar dados artificiais: diário de bordo, planejamentos, atividades, presença, observações de desenvolvimento, microgestos, produções/anexos e coordenações. Cada registro deve manter autoria, data, unidade, turma, criança e fonte para que o relatório seja auditável.

O sistema não deve “saber tudo” de forma indiscriminada. Deve saber apenas o necessário para a finalidade pedagógica, com escopo por função, retenção definida, trilha de auditoria e possibilidade de correção. A inteligência do produto deve vir da qualidade das relações entre os dados, não da coleta ilimitada ou sem propósito.

## Ordem segura de implementação

| Fase | Entrega | Risco controlado |
|---|---|---|
| 1 | Perfil institucional e resolver único de matriz | Remove divergência sem reclassificar histórico |
| 2 | Temas, projetos e encaminhamentos de coordenação vinculados ao planejamento | Reutiliza reuniões e arquivos existentes |
| 3 | Evidências pedagógicas e composição progressiva do RDIC | Começa a gerar relatórios com dados reais |
| 4 | Alertas explicáveis e lembretes auditáveis | Evita diagnósticos automáticos |
| 5 | Consolidação diária idempotente | Automatiza sem duplicar registros |
| 6 | Modelos opcionais de IA com dados minimizados | Controla custo, privacidade e revisão humana |

Nenhuma destas fases deve alterar registros históricos automaticamente. Migrations deverão ser aditivas, idempotentes e acompanhadas por testes de escopo multi-tenant, autorização, seleção de matriz, composição do RDIC e ausência de diagnóstico clínico em textos gerados.
