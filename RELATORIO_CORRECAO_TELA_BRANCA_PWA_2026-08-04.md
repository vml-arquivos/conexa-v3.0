# Relatório da correção da tela branca e do PWA no computador

**Sistema:** Conexa / COCRIS Pedagógico

**Data:** 4 de agosto de 2026

**Pacote analisado:** `conexa-v3.0-main (4).zip`

## Resumo em linguagem simples

O servidor estava respondendo, mas o navegador não conseguia iniciar a interface. A tela ficava branca porque dois arquivos JavaScript dependiam um do outro em círculo e eram executados na ordem errada. Ao mesmo tempo, o PWA estava habilitado também no computador e continuava entregando arquivos antigos pelo cache após novos deploys.

A correção removeu o ciclo entre os arquivos JavaScript, retirou o PWA dos computadores, preservou o PWA nos celulares e criou recuperação automática para navegadores que ainda estejam presos no cache antigo.

Nenhuma tabela, dado, rota de API, endpoint, regra de acesso, matriz pedagógica, plano de aula ou requisição de material foi alterado nesta correção.

## Evidência encontrada no ambiente real

Na captura enviada do Chrome em `appcocris.casadf.com.br`:

- o documento e os arquivos JavaScript retornavam status `200`;
- o documento, o manifest e o script do PWA eram entregues pelo **Service Worker**;
- os arquivos JavaScript eram lidos do cache de memória;
- a exceção passava alternadamente pelos arquivos `vendor` e `vendor-react`;
- o navegador exibia a integração de aplicativo no desktop.

O build original confirmou a mesma causa ao emitir o aviso:

`Circular chunk: vendor-react -> vendor -> vendor-react`

Portanto, a tela branca não era causada por indisponibilidade do HTML. O JavaScript falhava antes de o React conseguir desenhar a primeira tela.

## Causas técnicas

1. A separação manual de dependências colocava partes do React no arquivo `vendor` e outras partes no `vendor-react`. Os dois arquivos passavam a importar um ao outro.
2. O manifest e o Service Worker eram registrados automaticamente em qualquer aparelho, inclusive computadores.
3. O `index.html` e os arquivos do Service Worker não tinham uma política explícita de `no-cache` no Nginx.
4. Um erro antes do primeiro render não possuía uma proteção global e resultava em tela totalmente vazia.
5. A ausência de `VITE_API_URL` podia lançar uma exceção durante a importação do módulo HTTP, antes de qualquer mensagem aparecer.

## Correções realizadas

### Inicialização e tela branca

- Todas as dependências principais do React passaram a permanecer no mesmo grupo de build.
- A regra genérica que criava o ciclo `vendor` ↔ `vendor-react` foi removida.
- Foi adicionada uma barreira global de erro acima da autenticação e do roteador.
- Foi adicionado um mecanismo de recuperação do primeiro carregamento:
  - ignora falhas de imagens e recursos decorativos;
  - detecta falha de script ou módulo essencial;
  - limpa somente caches técnicos do PWA;
  - tenta uma recarga automática uma única vez;
  - se ainda houver falha, mostra uma tela explicativa com botão de recarga, em vez de deixar a página branca.
- `VITE_API_URL` continua sendo a configuração oficial. Se estiver ausente, o sistema usa `/api` como fallback e apresenta a falha de conexão normalmente, sem derrubar toda a tela.

### PWA exclusivo para celular

- O manifest deixou de ser inserido automaticamente no HTML de todos os aparelhos.
- Celulares iPhone e Android recebem o manifest e registram o Service Worker.
- Computadores e tablets não recebem manifest nem oferta de instalação.
- Registros antigos do PWA no desktop são removidos automaticamente.
- O novo Service Worker também contém uma migração de emergência: quando uma versão antiga consegue atualizá-lo em um PC, ele se remove, limpa os caches técnicos e recarrega a mesma página pela rede.
- O PWA móvel continua com app shell, arquivos estáticos e funcionamento offline já existentes.
- Cache de respostas autenticadas da API continua proibido.

### Cache e redeploy

- `index.html`, `sw.js`, arquivos do Workbox, manifest móvel e scripts de recuperação agora recebem `Cache-Control: no-store, no-cache, must-revalidate` no Nginx.
- Arquivos estáticos com hash continuam com cache longo e imutável, como recomendado.
- Os scripts de recuperação não entram no precache do PWA e sempre podem ser atualizados pela rede.

## O que foi preservado

- banco de dados e schema Prisma;
- migrations;
- dados de usuários, alunos, funcionários e instituições COCRIS;
- rotas e endpoints da API;
- autenticação, papéis e permissões;
- matriz pedagógica 2026;
- planos de aula e avaliações;
- inteligência artificial interna e integração Gemini;
- materiais, compras e requisições;
- secretaria, nutrição, psicologia, direção e demais módulos;
- layout e fluxos funcionais existentes.

## Validações executadas

| Validação | Resultado |
|---|---:|
| Testes específicos de inicialização e PWA | **7 de 7 aprovados** |
| Política desktop: sem manifest e sem registro PWA | **Aprovada** |
| Política iPhone/Android celular: PWA mantido | **Aprovada** |
| Remoção automática de Service Worker antigo no PC | **Aprovada** |
| Recuperação de falha de script sem reagir a imagem quebrada | **Aprovada** |
| TypeScript do frontend | **Aprovado** |
| Build Vite de produção | **Aprovado** |
| Ciclo entre chunks `vendor` e `vendor-react` | **Eliminado** |
| Validador do pacote gerado | **Aprovado** |
| Lint apenas dos arquivos TypeScript alterados | **Aprovado** |
| Testes da API | **198 de 198 aprovados** |
| Suítes da API | **23 de 23 aprovadas** |
| Typecheck da API | **Aprovado** |
| Build da API | **Aprovado** |
| Build do site institucional | **Aprovado** |
| Alteração de banco/migration | **Nenhuma** |

## Pendências antigas encontradas, não criadas por esta correção

Estas pendências não impediram o build da aplicação corrigida e foram mantidas fora do escopo para evitar alterações amplas:

- o lint global do frontend já possui 832 erros e 28 avisos em arquivos antigos; os arquivos alterados nesta entrega passam no lint;
- o site institucional possui quatro erros antigos de typecheck e um lockfile próprio desatualizado;
- sete testes do site precisam de `SITE_DATABASE_URL` e não puderam acessar um banco neste ambiente; nenhum banco de produção foi usado;
- a auditoria de dependências não encontrou vulnerabilidade classificada como crítica, mas ainda aponta vulnerabilidades altas e moderadas preexistentes. A atualização de dependências deve ser feita em uma etapa separada, com bateria própria de regressão.

## Como publicar com segurança

1. Faça backup do código atualmente publicado e mantenha o último deploy disponível para rollback.
2. Substitua o conteúdo do repositório pelo conteúdo do ZIP entregue.
3. Confirme no frontend do Coolify a variável de build:
   - `VITE_API_URL=https://apicocris.casadf.com.br`
4. Faça o redeploy do **frontend web** usando `apps/web/Dockerfile` e contexto na raiz do repositório.
5. No primeiro acesso em um computador que possuía PWA/cache antigo, a página pode se recarregar automaticamente uma vez. Isso é esperado.
6. Confirme:
   - tela de login no computador;
   - ausência de pop-up de instalação no computador;
   - login e abertura do painel;
   - navegação entre duas ou três páginas principais;
   - instalação e abertura do PWA em um celular;
   - uma leitura e uma gravação simples em ambiente controlado.

Não é necessário executar migration nem modificar o banco de dados para esta entrega.

## Rollback

Se o ambiente apresentar comportamento inesperado:

1. restaure o commit ou pacote anterior no frontend;
2. redeploye o frontend;
3. não reverta banco de dados, pois esta correção não realizou alterações nele.

## Conclusão

A causa demonstrada na captura foi corrigida no código e no processo de carregamento. O novo build não possui o ciclo JavaScript que interrompia a inicialização, não habilita PWA no desktop e consegue retirar automaticamente caches antigos sem apagar dados de negócio.

Em engenharia de software não existe promessa honesta de risco absoluto zero em um ambiente ainda não redeployado. O que esta entrega oferece é isolamento de escopo, ausência de mudança no banco e nas regras de negócio, testes automatizados, builds completos, recuperação automática e rollback simples para reduzir o risco ao menor nível praticável.
