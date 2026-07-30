# Relatório de correção — persistência de usuários do Conexa/COCRIS

**Data:** 30 de julho de 2026  
**Base analisada:** `conexa-v3.0-main (3).zip`  
**Objetivo:** corrigir usuários que aparentavam salvar, mas voltavam a mostrar dados anteriores.

## Resumo simples

O banco PostgreSQL e as tabelas existentes estavam preparados para persistir os dados. O problema estava entre a API, o token de sessão e o cache do aplicativo.

Uma alteração podia ser gravada no banco, mas a tela recebia novamente uma cópia antiga. Em mudanças de perfil ou unidade, também existiam partes do vínculo que não eram atualizadas juntas.

Agora o Conexa:

- atualiza usuário, papel e unidade na mesma transação;
- só responde sucesso depois de reler o dado confirmado no banco;
- retorna somente o papel ativo;
- não guarda mais a listagem de usuários no cache offline;
- renova o token usando a unidade e o papel atuais do banco;
- nunca substitui uma falha da API por usuários fictícios.

Não foi necessário alterar a estrutura do banco nem criar migração.

## Motivos encontrados

### 1. Papel anterior aparecia novamente

Ao trocar o perfil de um usuário, o vínculo antigo era desativado corretamente, mas a rota `GET /admin/users` devolvia papéis ativos e desativados no mesmo array.

A tela usava o primeiro papel recebido. Como a ordem não era garantida, muitas vezes mostrava o papel antigo e dava a impressão de que o salvamento tinha sido perdido.

### 2. O PWA guardava usuários antigos por 24 horas

O service worker armazenava respostas da API, inclusive `GET /admin/users`, em um cache chamado `api-cache`.

Depois de salvar, a tela podia receber essa cópia antiga quando a rede estivesse lenta ou instável.

### 3. Refresh token preservava a unidade antiga

A renovação do token relia os papéis atuais do banco, mas copiava a unidade do refresh token anterior.

Assim, uma pessoa movida de unidade podia continuar navegando com a unidade antiga até realizar um novo login.

### 4. Troca de perfil não limpava toda a unidade anterior

Ao mudar de professor ou gestor local para equipe central, o frontend não informava explicitamente que a unidade deveria ser removida.

O campo `User.unitId` e os registros de `UserRoleUnitScope` podiam ficar inconsistentes.

### 5. Existiam rotas divergentes nas telas

A tela principal usava `/admin/users`, mas a tela de Configurações ainda chamava `/users`, rota que não existe nesta API.

A tela de Funcionários também procurava a unidade dentro de um formato que a API não devolvia. Ao editar, podia selecionar a primeira unidade da lista no lugar da unidade real.

### 6. Falha da API era escondida por usuários de demonstração

Quando a listagem falhava, a tela administrativa colocava quatro usuários fictícios no lugar dos dados reais. Isso escondia o erro e podia levar o operador a tentar editar registros que não vieram do banco.

## Correções implantadas

### Persistência transacional

O endpoint de atualização agora trata, na mesma transação Prisma:

1. dados pessoais e status em `User`;
2. unidade local em `User.unitId`;
3. papel ativo em `UserRole`;
4. unidades autorizadas em `UserRoleUnitScope`.

Se qualquer etapa falhar, nenhuma alteração parcial é confirmada.

Depois do `commit`, a API consulta o usuário novamente e devolve:

- `persisted: true`;
- nome, e-mail, telefone, CPF e status atuais;
- unidade atual;
- somente o papel ativo;
- escopos atuais;
- `updatedAt` atualizado.

### Contrato das rotas

| Operação | Rota final | Comportamento |
| --- | --- | --- |
| Listar usuários | `GET /admin/users` | Somente dados atuais e papéis ativos |
| Criar usuário | `POST /admin/users` | Criação transacional com papel e escopo |
| Atualizar usuário | `PUT /admin/users/:id` | Atualização completa ou parcial |
| Atualizar parcialmente | `PATCH /admin/users/:id` | Mesmo contrato seguro do PUT |
| Listar unidades | `GET /admin/units` | Unidades permitidas para o operador |
| Usuário autenticado | `GET /auth/me` | Dados atuais, sem cache |
| Renovar sessão | `POST /auth/refresh` | Relê e-mail, unidade e papéis do banco |

As respostas de usuários e de `/auth/me` recebem `Cache-Control: no-store`.

### Segurança entre instituições e unidades

- Toda consulta e alteração continua limitada à mesma mantenedora.
- Gestores locais só editam e criam usuários da própria unidade.
- Gestor de unidade não pode promover alguém para equipe central, mantenedora ou desenvolvedor.
- Equipe central não pode promover alguém para mantenedora ou desenvolvedor.
- Somente um desenvolvedor pode atribuir o papel `DEVELOPER`.
- Alterar unidade atualiza também o escopo do papel.

### Frontend

- A tela atualiza imediatamente com o objeto confirmado pela API.
- Em seguida, faz uma nova leitura do banco com marcador anticache.
- Perfis que precisam de unidade não podem ser salvos sem selecionar uma.
- Perfis centrais enviam explicitamente a remoção da unidade anterior.
- A tela de Configurações passou a usar `/admin/users`.
- A tela de Funcionários usa a unidade real do usuário.
- Usuários fictícios foram removidos do tratamento de erro.
- Ações sem endpoint real de redefinição por e-mail ou exclusão foram retiradas; alteração de senha permanece disponível na edição, e desativação permanece pelo status.

### Cache offline

- Respostas autenticadas da API não são mais armazenadas pelo PWA.
- O cache legado `api-cache` é apagado automaticamente ao abrir a nova versão.
- Arquivos públicos, imagens e a estrutura offline continuam funcionando.

### Build e redeploy

- Lockfiles da API e do frontend foram sincronizados.
- Docker da API passou a usar `npm ci`.
- Docker do frontend passou a usar o lockfile validado do próprio frontend.
- O Docker do frontend executa TypeScript, Vite e geração do PWA.
- Corrigidos dois ícones ausentes que bloqueavam o TypeScript.
- Corrigido o encerramento antecipado do gerador do service worker.

## Validação realizada

- **23 suítes de testes aprovadas.**
- **198 testes aprovados.**
- **7 testes específicos novos para persistência, refresh e segurança.**
- TypeScript da API aprovado.
- Build de produção da API aprovado.
- TypeScript e build de produção do frontend aprovados.
- PWA e service worker gerados.
- Service worker verificado sem cache de API.
- Instalação limpa da API e do frontend aprovada pelos lockfiles.
- Comparação contra o ZIP original realizada.
- Nenhuma migração destrutiva criada.
- Nenhuma vulnerabilidade crítica encontrada nas auditorias.

Os logs de erro do Gemini exibidos durante os testes são casos simulados pela própria suíte para confirmar que falhas externas são tratadas. As 23 suítes terminaram aprovadas.

## Limite da validação

O banco de produção não foi alterado durante esta correção. Isso evita risco sobre os dados reais.

Os testes validaram o comportamento da API, Prisma, transação, token, escopos e builds. Depois do redeploy ainda é obrigatório realizar um teste autenticado com uma conta controlada no ambiente publicado.

As auditorias de dependências ainda possuem avisos antigos sem nível crítico. Eles não foram a causa da persistência e devem ser tratados em uma atualização de segurança separada para não misturar uma troca ampla de bibliotecas com esta correção.

## Como fazer o redeploy

1. Faça backup do PostgreSQL.
2. Descompacte o ZIP entregue.
3. Substitua o conteúdo do repositório pelo conteúdo da pasta `conexa-v3.0-main`.
4. Revise o `git diff`.
5. Faça o commit:

   `fix: persistência transacional de usuários e remoção de cache antigo`

6. Envie para a branch usada pelo Coolify.
7. Faça o deploy da API primeiro.
8. Confirme que a API iniciou sem erro.
9. Faça o deploy do frontend.

### Configuração da API no Coolify

- Contexto: `apps/api`
- Dockerfile: `Dockerfile`
- Mantenha `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN` e demais segredos no Coolify.

### Configuração do frontend no Coolify

- Contexto: raiz do repositório
- Dockerfile: `apps/web/Dockerfile`
- Build argument obrigatório:

  `VITE_API_URL=https://apicocris.casadf.com.br`

## Teste obrigatório após o deploy

Use um usuário controlado e execute:

- [ ] editar nome e telefone;
- [ ] atualizar a página e confirmar que continuam iguais;
- [ ] alterar status, atualizar a página e confirmar;
- [ ] trocar de professor para outro papel local;
- [ ] trocar a unidade e confirmar o novo vínculo;
- [ ] trocar um usuário local para equipe central e confirmar que não aparece unidade local;
- [ ] entrar com a conta editada e confirmar o painel correto;
- [ ] aguardar uma renovação silenciosa do token e confirmar que a unidade não volta;
- [ ] fechar e abrir o navegador e confirmar novamente;
- [ ] verificar os logs da API e confirmar ausência de erros 500.

Na primeira abertura após o novo frontend, recomenda-se atualizar a página uma vez. O sistema apaga automaticamente o cache antigo; fechar e reabrir a aba também garante que o novo service worker assumiu o controle.

## Resultado

A persistência de usuários passou a ter uma única fonte de verdade: o PostgreSQL. A API confirma o dado depois do commit, as telas exibem somente o papel ativo e o PWA não pode mais reapresentar uma listagem antiga.
