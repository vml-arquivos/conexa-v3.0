# Auditoria agregada da composição de turmas em produção

**Origem:** terminal do servidor localhost no Coolify, URL `https://coolifysaas.permupay.com.br/server/moiss1vwyztojrlk3u9g11c2/terminal`  
**Banco consultado:** banco operacional `postgres`, somente leitura, em 14 de agosto de 2026.  
**Privacidade:** a consulta retornou apenas nome da turma, faixa configurada e contagens agregadas por segmento; não foram exibidos nomes, IDs ou datas de nascimento de crianças.

A consulta confirmou que as tabelas `Child`, `Classroom` e `Enrollment` existem no banco operacional. A composição foi calculada pela idade em meses na data atual, filtrando matrículas `ATIVA`, `enrollmentDate <= CURRENT_DATE` e `withdrawalDate` nulo ou posterior à data atual.

Formato da saída: `turma | ageGroupMin | ageGroupMax | matrículas ativas | EI01 | EI02 | EI03 | fora da referência`.

```text
MATERNAL I C|19|35|14|0|14|0|0
MATERNAL I C|19|35|18|0|18|0|0
MATERNAL II A|36|47|23|0|13|10|0
MATERNAL II A|36|47|24|0|19|5|0
MATERNAL II B|36|47|24|1|14|9|0
MATERNAL II B|36|47|24|0|16|8|0
MATERNAL II C|36|47|14|0|6|8|0
MATERNAL II C|36|47|24|0|10|14|0
Maternal 1 - Adriana|19|35|20|0|20|0|0
Maternal 1 - Apoliana|19|35|20|0|20|0|0
Maternal 1 - Cida|19|35|20|0|20|0|0
Maternal 1 - Fernanda|19|35|20|0|20|0|0
Maternal 2 - Ada|36|47|20|0|14|6|0
Maternal 2 - Miriam|36|47|20|0|10|10|0
Maternal 2 - Sabrina|36|47|24|0|13|11|0
Maternal 2 - Salete|36|47|20|0|12|8|0
Maternal 2 - Shirlene|36|47|20|0|11|9|0
Maternal I — CÁTIA|19|35|24|0|24|0|0
Maternal I — MARLENE|19|35|22|0|22|0|0
Maternal I — NELCI|19|35|14|0|14|0|0
Maternal II — ELENICE|36|47|24|0|12|12|0
Maternal II — MARIA|36|47|23|0|14|9|0
Maternal II — PILOTO (Turma de Teste)|36|47|10|0|0|10|0
Maternal II — TATILA|36|47|24|0|18|6|0
```

O resultado confirma diretamente o risco descrito na auditoria: há várias turmas rotuladas como Maternal II cuja composição ativa inclui simultaneamente EI02 e EI03, e algumas turmas Maternal II B incluem também EI01. Não é seguro selecionar a matriz apenas pelo nome da turma, `ageGroupMin` ou midpoint. A primeira versão da regra deve identificar essas turmas como **composição etária mista**, manter o planejamento histórico intacto e exigir uma decisão pedagógica explícita para novos planejamentos.

A consulta foi somente leitura; não houve `INSERT`, `UPDATE`, `DELETE`, migration, alteração de variável ou reinício de serviço.

## Consulta complementar em produção — 2026-08-14

Acesso realizado com o perfil `professor@testepiloto.com.br` (senha não registrada neste documento). O painel exibiu a turma **Maternal II — PILOTO (Turma de Teste)**, com 10 crianças e idades entre **57 e 67 meses**. Pela segmentação adotada no sistema, todas essas idades pertencem a **EI03 / crianças pequenas (48–71 meses)**. Essa consulta confirma que o nome “Maternal II” não determina sozinho o segmento curricular; é necessário considerar as idades reais das matrículas.

A consulta foi somente de leitura: não foram criados, editados ou excluídos planejamentos, diários, matrículas ou relatórios.

O acesso com `coordenador@testepiloto.com.br` confirmou a unidade **CEPI PILOTO — Ambiente de Testes** e a turma exibida no painel foi apenas **Maternal II — PILOTO (Turma de Teste)**. A listagem de coordenação ainda precisa ser aberta para verificar se o ambiente de teste contém especificamente o **Maternal II C**; não se deve inferir a composição de Maternal II C a partir da turma piloto.

Na aba **Currículo 2026**, a mesma turma aparece configurada como **EI02 — Crianças Bem Pequenas (1 ano e 7 meses a 3 anos e 11 meses)** e os objetivos carregados possuem códigos `EI02`. Isso é inconsistente com o painel do professor, que mostrou as dez crianças da turma entre **57 e 67 meses**, faixa **EI03 — crianças pequenas (48–71 meses)**. A inconsistência é reproduzível na interface de produção e reforça que a seleção do currículo deve usar as matrículas reais, não apenas a configuração histórica da turma.

## Publicação visual — 2026-08-14

O commit `5535e1d` (`feat(web): apresentar RDIC como Relatório da Criança`) foi publicado em `main`. Foram alterados somente textos visíveis do frontend em sete arquivos; rotas `/rdic/*`, estados, payloads e identificadores técnicos permaneceram intactos. O redeploy da aplicação no Coolify foi iniciado e está sendo acompanhado.

O log do Coolify confirmou que o redeploy importou `5535e1dde40d34b91b330e8f1c851f82b9498bde` (commit `5535e1d`) da branch `main`. A construção passou pela geração do Prisma Client v5.22.0 e chegou ao estágio `npm run build` do builder; até a última leitura, não havia erro de migration ou de inicialização registrado.

Fonte do acompanhamento: `https://coolifysaas.permupay.com.br/project/m10akryxy9b4h99ff97ftm9l/environment/bvbi6y787c7ckfabihfc1r5y/application/jdt46ga2sp4qh2y6mtgeq9uq/deployment/lj36j929d8uyxev8qid4c8qv`. O deployment seguia em progresso na última consulta, já tendo importado a revisão `5535e1d` e executado `prisma generate` e o início do `npm run build` no builder. A aplicação anterior continuava indicada como Running enquanto a nova imagem era construída.

O acompanhamento posterior mostrou o build avançando até `RUN npm prune --omit=dev`, após concluir a cópia dos datasets e a compilação. O npm exibiu o aviso já conhecido de 5 vulnerabilidades em dependências (1 low, 1 moderate, 3 high), sem interromper o deployment; não apareceu falha de TypeScript, Prisma ou build.

O log avançou para `Building docker image completed` e `Rolling update started`. O novo container foi criado, iniciado e marcado como `Started`. O único aviso operacional observado foi do kernel sobre `memory swappiness`, sem impedir a inicialização; não houve erro de aplicação, migration ou banco nessa etapa.

Na última leitura do deployment, o log já mostrava a imagem nomeada com a revisão `5535e1d`, `Building docker image completed`, `Rolling update started` e o novo container em estado `Started`. O painel ainda exibia o deployment como `In Progress`, portanto a validação definitiva deve ser feita pelo endpoint de saúde e pela aplicação após a conclusão do rolling update.

Validação pós-redeploy em `2026-08-14T05:13:57Z–05:14:00Z`: `GET https://apicocris.casadf.com.br/health` retornou `status: ok`; `GET https://apicocris.casadf.com.br/health/ready` retornou `status: ready`, `database: up` e `planning: ready`. A API está respondendo normalmente após a troca de container.

Após a validação da API, o painel `https://appcocris.casadf.com.br/app/dashboard` abriu autenticado como `COORDENADORA PILOTO`, unidade `CEPI PILOTO — Ambiente de Testes`. A interface ainda exibiu `RDIC — Revisão` e `RDIC por Criança`, mostrando que o commit visual foi aplicado no repositório, mas o aplicativo frontend ainda não recebeu seu redeploy separado. Nenhuma ação de escrita foi executada no painel.

A aplicação frontend foi localizada no Coolify: `conexa-frontend`, ID `os38nu06r9j3bsts3vglfixc`, domínio `https://appcocris.casadf.com.br`, base `/`, Dockerfile `/apps/web/Dockerfile`, porta 80. Ela estava `Running (healthy)` na revisão anterior `ee7f1d6c`, mas o Coolify indicou `16 unapplied configuration changes` e ainda não havia aplicado o commit visual `5535e1d`. O redeploy será revisado e iniciado separadamente.

A revisão das mudanças pendentes do frontend mostrou 16 alterações exclusivamente nas variáveis `VITE_*`, todas de `Available at runtime: enabled` para `Available at runtime: disabled`. Isso é compatível com o frontend Vite estático: essas variáveis devem ser injetadas no build e não dependem de runtime no container. O primeiro acionamento do botão de redeploy não abriu uma página de deployment, então a ação ainda precisa ser confirmada pelo estado do Coolify.

Após nova atualização, a aplicação frontend continuou `Running (healthy)` e ainda exibiu `16 unapplied configuration changes`; o acionamento pelo índice do botão não abriu o log de deployment. A próxima tentativa será feita diretamente na área visível do botão, sem alterar nenhuma configuração manual.

Como os acionamentos visuais não mudaram a página, o DOM do Coolify foi consultado de forma controlada: o botão `Redeploy` foi encontrado, estava habilitado (`disabled: false`) e recebeu o acionamento. O próximo estado será verificado no painel de deployment.

O redeploy do frontend foi efetivamente iniciado no deployment `h6y6j3rn76jju6sqwlobujm2`, importando a revisão `5535e1dde40d34b91b330e8f1c851f82b9498bde` e o commit `feat(web): apresentar RDIC como Relatório da Criança`. O build avançou pelo `pnpm install` com lockfile atualizado; houve somente o aviso de que a configuração `pnpm` está em `apps/site/package.json` em vez da raiz, sem falha do processo.

O frontend continuou em construção no deployment `h6y6j3rn76jju6sqwlobujm2`; o `pnpm install` avançou na resolução de aproximadamente 1.704 pacotes. Os avisos exibidos foram informativos (atualização disponível do pnpm e configuração de workspace), sem erro de dependência ou interrupção.

O build do frontend segue em progresso, com o `pnpm install` avançando de forma contínua na resolução e download das dependências; não há falha de compilação ou infraestrutura registrada até a última atualização.

O deployment do frontend `h6y6j3rn76jju6sqwlobujm2` terminou como `Deployment Failed` durante a etapa `pnpm install`; o log visível ainda mostrava o download progressivo de dependências, mas a causa exata está nas linhas finais que precisam ser extraídas antes de qualquer nova tentativa.

Na sessão autenticada como `COORDENADORA PILOTO`, a unidade `CEPI PILOTO — Ambiente de Testes` mostrou somente uma turma: `Maternal II — PILOTO (Turma de Teste)`, configurada como `EI02 — Crianças Bem Pequenas (1a 7m a 3a 11m)`, com 10 crianças. O `Maternal II C` não está disponível nessa unidade/perfil, portanto não é possível atribuir sua faixa etária usando apenas essa sessão.

O perfil `DIRETORA PILOTO` também está limitado à unidade `CEPI PILOTO — Ambiente de Testes` e informa 1 turma, 10 crianças e 1 professor. O `Maternal II C` não aparece nesse escopo de teste. Portanto, o sistema não deve inferir a faixa etária pelo nome “Maternal II C”; deve usar as datas de nascimento das matrículas ativas e, quando houver composição mista, solicitar a decisão pedagógica explícita.

Após o push de `ffd1322`, a aplicação `conexa-frontend` no Coolify ainda estava `Running (healthy)` na revisão anterior `ee7f1d6c`, com `16 unapplied configuration changes` referentes às variáveis `VITE_*` sendo retiradas do runtime. O frontend precisa ser redeployado para importar a nova revisão e usar o Dockerfile com instalação filtrada.

Em 14/08/2026 às 05:34:24, o Coolify iniciou o redeploy do frontend no deployment `wcomrq842zp2nrfqt597hwgy` a partir de `vml-arquivos/conexa-v3.0:main`. O processo entrou em `Deployment is In Progress`; o aviso `No such container` refere-se apenas ao helper efêmero que não existia antes do `docker run` e não é falha da aplicação.

No segundo redeploy, o Coolify importou corretamente `ffd13223987643472bb82a1b648116420afa3d8c` e iniciou `pnpm install --filter @conexa/web --frozen-lockfile`. O pnpm emitiu apenas o aviso de `pnpm` configurado em `apps/site/package.json`; a etapa seguia baixando dependências, sem a falha imediata observada no primeiro deployment.

O redeploy do frontend continuou sem erro: a instalação filtrada já havia resolvido 1.704 pacotes e avançava até adicionar as dependências necessárias. O aviso de atualização do pnpm permanece não bloqueante; a compilação Vite ainda não havia iniciado no último acompanhamento.

O build do frontend avançou além da resolução de dependências e chegou aos postinstall de `@prisma/client`, `prisma`, `esbuild` e `@nestjs/core`. O log mostrou avisos de detecção de `libssl`/binários opcionais do Prisma, que precisam ser distinguidos do resultado final do processo antes de qualquer nova alteração.

Os postinstall de Prisma concluíram com `Generated Prisma Client (v5.22.0)` e `Done`, e o deployment avançou para `COPY packages/`. Os avisos de OpenSSL/libssl no Alpine são não bloqueantes neste estágio; não houve falha de código ou de migração.

O deployment avançou para `RUN pnpm build` e `vite v7.2.0 building client environment for production`, confirmando que a instalação filtrada não falhou. Os avisos de OpenSSL/libssl ficaram limitados aos postinstall de Prisma e não impediram o build.

O redeploy do frontend `wcomrq842zp2nrfqt597hwgy` terminou com sucesso. O Coolify criou o novo container, marcou-o `Started`, executou o healthcheck HTTP em `localhost:80` com retorno 0 e estado `healthy`, e removeu os containers antigos. O aviso sobre `swappiness` do kernel é não bloqueante.

Após o redeploy, o login público e o painel de coordenação abriram normalmente. No menu lateral, os rótulos passaram a aparecer como `Relatório — Revisão Coord` e `Relatório da Criança`, enquanto as rotas técnicas permaneceram `/app/rdic-coord` e `/app/rdic-crianca`.

O redeploy do hotfix `544507c0d5d68d1c3c12fe493a9275a4a655fbf2` foi importado corretamente pelo Coolify. As camadas do Dockerfile, incluindo `pnpm install --filter @conexa/web --frozen-lockfile`, foram recuperadas do cache nesta execução, sem erro de preparação até o último acompanhamento.

O deployment do hotfix `544507c` concluiu a construção da imagem e iniciou o rolling update. O novo container foi criado e marcado como `Started`; o Coolify manteve a aplicação `conexa-frontend` em `Running (healthy)`. Os avisos de `swappiness` do kernel e do helper efêmero são não bloqueantes.

O hotfix `544507c` foi importado no Coolify e o build avançou até `vite v7.3.0`, transformação de módulos e cálculo de gzip, sem erro de compilação. A aplicação permaneceu saudável durante o rolling update; a validação funcional da rota RDIC continua sendo feita separadamente.

Após o redeploy de `544507c`, a rota pública `/app/rdic-crianca` deixou de exibir o Erro 500 e passou a carregar a interface `Relatório da Criança`. Entretanto, a reprodução em produção ainda mostra `1 alunos na turma` e um cartão com o nome da turma. A chamada manual autenticada por XHR ao endpoint `https://apicocris.casadf.com.br/lookup/classrooms/cmnu5ey2v000pa10psdzqgmox/children` retorna HTTP 200 com 10 crianças; a captura da chamada automática do app registrou uma resposta de 1 item com formato de turma, indicando possível discrepância de runtime/cache ou de chamada automática que precisa ser isolada antes de novo commit.
