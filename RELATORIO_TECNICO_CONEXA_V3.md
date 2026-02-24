# Relatório Técnico Mestre: Conexa V3.0 - Análise Completa

Este documento fornece uma análise cirúrgica e minuciosa do sistema Conexa V3.0, consolidando todas as funcionalidades implementadas, o roadmap de desenvolvimento, a arquitetura, os níveis de acesso e as credenciais de teste. O objetivo é garantir uma transferência de contexto completa e permitir a continuidade do projeto com máxima performance.

---

## 🚀 1. Arquitetura Geral do Sistema

O Conexa V3.0 é um monorepo (`vml-arquivos/conexa-v3.0`) estruturado com as seguintes camadas:

| Camada | Tecnologia Principal | Descrição |
| :--- | :--- | :--- |
| **Frontend Web** | React, Vite, TypeScript, TailwindCSS | Interface do usuário, dashboards e formulários interativos. Utiliza `axios` para comunicação com a API. |
| **Backend API** | NestJS, TypeScript | API RESTful que gerencia a lógica de negócio, autenticação (JWT) e comunicação com o banco de dados. |
| **Banco de Dados** | PostgreSQL (via Prisma ORM) | Gerenciamento de dados relacional, com schema definido pelo Prisma. |
| **ORM** | Prisma | Camada de abstração para o banco de dados, gerando o client para TypeScript. |

---

## 🛠️ 2. Funcionalidades Implementadas (Status: ✅ Concluído)

As seguintes funcionalidades foram desenvolvidas e integradas ao sistema, com builds validados e commits no repositório `main`:

### 2.1. Fluxo RDIC (Relatório de Desenvolvimento Individual da Criança) em 3 Níveis

Um fluxo robusto de criação, revisão e publicação de relatórios individuais de desenvolvimento da criança, com controle de acesso baseado em perfis:

| Funcionalidade | Descrição | Acesso | Rota Frontend | Backend API |
|---|---|---|---|---|
| **Criação/Edição RDIC (Professor)** | Professor cria e edita RDICs no status `RASCUNHO`. Formulário completo com 25 indicadores BNCC, observações e próximos passos. Botão "Gerar Rascunho IA" integrado. | Professor | `/app/rdic-crianca` | `POST /rdic`, `PATCH /rdic/:id` |
| **Revisão/Aprovação RDIC (Coordenação Unidade)** | Coordenadora Pedagógica da Unidade visualiza todos os RDICs da unidade, pode editar, adicionar parecer, devolver ao professor (`RASCUNHO`) ou aprovar (`FINALIZADO` / `PUBLICADO`). | Coordenação Unidade | `/app/rdic-coord` | `POST /rdic/:id/enviar-revisao`, `POST /rdic/:id/devolver`, `POST /rdic/:id/aprovar` |
| **Visualização RDIC (Coordenação Geral)** | Coordenadora Geral tem acesso somente leitura aos RDICs com status `PUBLICADO`. | Coordenação Geral | `/app/rdic-geral` | `GET /rdic` (filtrado por status) |

### 2.2. Motor de IA Assistiva LGPD

Integrado para auxiliar na geração de conteúdo e garantir a privacidade dos dados:

| Funcionalidade | Descrição | Backend API |
|---|---|---| 
| **Geração de Rascunho LGPD** | A IA busca dados do `DiaryEvent`, anonimiza nomes reais (ex: `C-XXXXXX`) e gera um rascunho para os campos de observação e próximos passos do RDIC. | `POST /ia/relatorio-consolidado-lgpd` |

### 2.3. Gestão de Alergias e Dietas Restritivas

Sistema para registro e notificação de restrições alimentares:

| Funcionalidade | Descrição | Acesso | Rota Frontend | Backend API |
|---|---|---|---|---|
| **Painel de Alergias** | Tela dedicada para nutricionistas com lista de todas as restrições ativas da unidade, destaque para casos severos, filtros e botão de impressão. | Nutricionista / Coordenação | `/app/painel-alergias` | `GET /children/dietary-restrictions/unidade` |
| **Notificação Automática** | Ao registrar uma restrição alimentar, o sistema cria automaticamente um `AlertaOperacional` e uma `Notificacao` para a coordenação e nutricionista. | Automático (Backend) | N/A | `children.service.ts` (interno) |

### 2.4. Dashboard de Consumo de Materiais

Visualização analítica do consumo de materiais por unidade:

| Funcionalidade | Descrição | Acesso | Rota Frontend | Backend API |
|---|---|---|---|---|
| **Dashboard Interativo** | Gráficos de barras por categoria (Pedagógico, Higiene Pessoal, Outros), gráfico horizontal por turma (Top 10), gráfico de pizza por status (Aprovado, Pendente, Rejeitado) e taxa de aprovação. Filtros por período e turma. | Coordenação | `/app/dashboard-consumo-materiais` | `GET /material-requests/relatorio-consumo` |

### 2.5. Exportação de RDIC em PDF

Funcionalidade para gerar documentos formais do RDIC:

| Funcionalidade | Descrição | Acesso | Rota Frontend |
|---|---|---|---|
| **Exportar RDIC** | Botão "Exportar PDF" no histórico do RDIC da criança. Gera um documento PDF formatado com todos os bimestres, indicadores BNCC com cores por nível, observações e próximos passos. Utiliza a função nativa de impressão do navegador (`window.print()`) com CSS otimizado para impressão. | Professor | `/app/rdic-crianca` |

### 2.6. Outras Melhorias e Correções

| Funcionalidade | Descrição |
|---|---|
| **Pautas de Coordenação** | Nova aba na `CoordenacaoPedagogicaPage` com templates para reuniões semanais (unidade) e mensais (geral), com modal de criação, lista e ata. |
| **Campo de Avaliação do Professor** | Campo de texto rico no `PlanoDeAulaPage` para registro pós-aula. |
| **Calendário Pedagógico Mensal** | Modo visual clicável no `PlanoDeAulaPage` com navegação por mês. |
| **Requisição de Materiais Simplificada** | Professor agora vê apenas 3 categorias: Pedagógico, Higiene Pessoal e Outros. |
| **Correções de Build Backend** | Diversos erros pré-existentes no backend foram corrigidos para garantir um build limpo (ex: `photoUrl` inexistente, `curriculumEntryId` opcional, `prisma.material` substituído por `prisma.stockItem`). |

---

## 🛤️ 3. Roadmap de Próximos Passos (Funcionalidades em Implantação)

Os seguintes itens estão planejados para as próximas fases de desenvolvimento:

1.  **RIA (Relatório de Intervenção e Acompanhamento):** Implementar a visualização em linha do tempo cronológica por criança para a coordenação, mostrando o histórico de intervenções de forma clara e organizada.
2.  **Notificações em Tempo Real:** Desenvolver um sistema de badges no Sidebar para mostrar alertas pendentes (ex: novas alergias registradas, RDICs aguardando revisão), melhorando a visibilidade de ações urgentes.
3.  **Exportação de Relatórios Avançada:** Expandir as opções de exportação para incluir o Relatório de Consumo em formatos como PDF e Excel, e a Pauta de Coordenação em PDF, para facilitar o compartilhamento e arquivamento.
4.  **Tela de RDIC por criança (Professor):** Implementar a visualização do histórico de RDICs por criança com barra de progresso e status.
5.  **Tela de RIA por criança (Coordenação):** Visualização do histórico de intervenções por criança com linha do tempo.

---

## 🔒 4. Níveis de Acesso e Permissões (Roles)

O sistema utiliza um controle de acesso baseado em roles, com os seguintes níveis hierárquicos e suas permissões gerais:

| Nível de Acesso (RoleLevel) | Descrição | Permissões Chave |
|---|---|---|
| **PROFESSOR (10)** | Usuário básico, responsável direto pelas crianças. | Acesso ao Diário de Bordo, Plano de Aula, RDIC (criação/edição RASCUNHO), Requisição de Materiais. |
| **UNIDADE (30)** | Coordenadores pedagógicos e gestores de unidade. | Todas as permissões de Professor, mais: Revisão/Aprovação de RDIC, Painel de Alergias, Dashboard de Consumo, Pautas de Coordenação. |
| **STAFF_CENTRAL (40)** | Coordenadores gerais e equipe administrativa central. | Acesso de leitura a todos os dados da plataforma, visualização de RDICs PUBLICADOS, dashboards consolidados. |
| **DEVELOPER (99)** | Acesso total para desenvolvimento e manutenção. | Todas as permissões do sistema, acesso a funcionalidades em desenvolvimento. |

---

## 🔑 5. Credenciais de Teste

Para facilitar o teste e a validação das funcionalidades implementadas, as seguintes credenciais podem ser utilizadas:

| Perfil | Email | Senha | Observações |
|---|---|---|---|
| **Professor** | `professor@conexa.com` | `123456` | Acesso à `RdicCriancaPage`, `TeacherDashboardPage`, `DiarioBordoPage`. |
| **Coordenadora Unidade** | `coordenadora@conexa.com` | `123456` | Acesso à `RdicCoordPage`, `PainelAlergiasPage`, `DashboardConsumoMateriaisPage`. Pode aprovar RDICs. |
| **Coordenadora Geral** | `geral@conexa.com` | `123456` | Acesso à `RdicGeralPage` (somente leitura de RDICs PUBLICADOS). |
| **Nutricionista** | `nutricionista@conexa.com` | `123456` | Acesso ao `PainelAlergiasPage`. |

**Nota:** As senhas são genéricas para ambiente de teste. Em produção, senhas seguras e políticas de rotação devem ser aplicadas.

---

## ✅ 6. Considerações Finais

O sistema Conexa V3.0 está em um estágio avançado de desenvolvimento, com uma arquitetura bem definida e um conjunto robusto de funcionalidades já em operação. A continuidade do projeto é facilitada pela documentação detalhada e pela clareza dos próximos passos. A integração com N8N e agentes de IA é totalmente suportada pela estrutura de dados existente, permitindo a expansão para automação e inteligência de dados.

Este relatório serve como a base para qualquer intervenção futura, garantindo que o conhecimento técnico e de negócio seja preservado e acessível. 

**Autor:** Manus AI
**Data:** 22 de Fevereiro de 2026
