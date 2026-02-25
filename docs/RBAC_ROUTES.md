# Mapa de Acesso por Perfil (RBAC)

Este documento detalha os menus, rotas e principais endpoints da API associados a cada perfil de usuário no Conexa V3.0. O objetivo é alinhar a navegação da UI (menus) com as permissões de acesso já definidas no backend e no roteador do frontend.

---

## 1. Professor & Professor Auxiliar

**ID do Role:** `PROFESSOR`, `PROFESSOR_AUXILIAR`

**Descrição:** Foco total nas ferramentas de sala de aula, planejamento e registro do desenvolvimento infantil.

| Menu | Rota | Principais Endpoints (API) |
|---|---|---|
| **Painel do Professor** | `/app/teacher-dashboard` | `analytics/classroom/daily-summary`, `coordenacao/planejamentos`, `coordenacao/diarios` |
| **Plano de Aula** | `/app/plano-de-aula` | `plannings`, `curriculum-matrix` |
| **Planejamento Diário** | `/app/planejamento-diario` | `plannings`, `calendar` |
| **Diário de Bordo** | `/app/diario-de-bordo` | `diary-event`, `development-observations` |
| **RDIC por Criança** | `/app/rdic-crianca` | `reports/rdic`, `children/:id` |
| **Chamada Diária** | `/app/chamada` | `attendance/register`, `attendance/today` |
| **Fotos da Turma (RDX)** | `/app/rdx` | `rdx/upload`, `rdx/feed` |
| **Requisições de Materiais** | `/app/material-requests` | `material-requests` |
| **Atendimentos aos Pais** | `/app/atendimentos-pais` | `atendimento-pais` |
| **Matriz Pedagógica 2026** | `/app/matriz-pedagogica` | `curriculum-matrix` |

---

## 2. Coordenação de Unidade

**ID do Role:** `UNIDADE` (e subtipos como `UNIDADE_COORDENADOR_PEDAGOGICO`, `UNIDADE_DIRETOR`)

**Descrição:** Visão de gestão da unidade e supervisão pedagógica. Herda todas as ferramentas do professor e adiciona painéis de gestão e aprovação.

| Menu | Rota | Principais Endpoints (API) |
|---|---|---|
| **Painel da Unidade** | `/app/unidade` | `analytics/unit/dashboard` |
| **Coord. Pedagógica** | `/app/coordenacao-pedagogica` | `coordenacao/dashboard/unidade`, `coordenacao/planejamentos` |
| **Turmas & Reuniões** | `/app/coordenacao` | `coordenacao/reunioes`, `classrooms` |
| **RDIC — Revisão** | `/app/rdic-coord` | `reports/rdic/review`, `reports/rdic/approve` |
| **Requisições Pendentes** | `/app/material-requests` | `material-requests/pending`, `material-requests/approve` |
| **Consumo de Materiais** | `/app/relatorio-consumo-materiais` | `reports/materials` |
| **Dashboard de Consumo** | `/app/dashboard-consumo-materiais` | `analytics/materials` |
| **Alergias e Dietas** | `/app/painel-alergias` | `children/dietary-restrictions/unidade` |
| **Pedidos de Compra** | `/app/pedidos-compra` | `pedidos-compra` |
| _(herda menus de Professor)_ | _(várias)_ | _(vários)_ |

---

## 3. Staff Central

**ID do Role:** `STAFF_CENTRAL` (e subtipos como `STAFF_CENTRAL_PEDAGOGICO`)

**Descrição:** Visão macro da rede, focada em análise de dados pedagógicos, relatórios consolidados e gestão da Matriz Curricular.

| Menu | Rota | Principais Endpoints (API) |
|---|---|---|
| **Análises Centrais** | `/app/central` | `analytics/global-stats` |
| **Coordenação Geral** | `/app/coordenacao-geral` | `coordenacao/dashboard/geral` |
| **RDICs Publicados** | `/app/rdic-geral` | `reports/rdic/published` |
| **Pedidos de Compra** | `/app/pedidos-compra` | `pedidos-compra` |
| **Matriz Pedagógica 2026** | `/app/matriz-pedagogica` | `curriculum-matrix` |
| **Relatórios Gerais** | `/app/reports` | `reports/global` |

---

## 4. Mantenedora

**ID do Role:** `MANTENEDORA` (e subtipos)

**Descrição:** Acesso de mais alto nível, focado em gestão global, administração de unidades e visualização de todos os dados da rede.

| Menu | Rota | Principais Endpoints (API) |
|---|---|---|
| **Dashboard Global** | `/app/dashboard` | `analytics/global-stats` |
| **Coordenação Geral** | `/app/coordenacao-geral` | `coordenacao/dashboard/geral` |
| **Análises Centrais** | `/app/central` | `analytics/global-stats` |
| **Gestão de Unidades** | `/app/admin/unidades` | `admin/units` |
| **Pedidos de Compra** | `/app/pedidos-compra` | `pedidos-compra` |
| **Matriz Pedagógica 2026** | `/app/matriz-pedagogica` | `curriculum-matrix` |
| **Relatórios Gerais** | `/app/reports` | `reports/global` |

---

## 5. Administração (Comum a Unidade, Central e Mantenedora)

| Menu | Rota | Principais Endpoints (API) |
|---|---|---|
| **Gestão de Usuários** | `/app/admin/usuarios` | `admin/users` |
| **Gestão de Turmas** | `/app/admin/turmas` | `admin/classrooms` |
| **Gestão de Unidades** | `/app/admin/unidades` | `admin/units` |

---

## 6. Itens Globais (Todos os Perfis)

| Menu | Rota | Principais Endpoints (API) |
|---|---|---|
| **Meu Perfil** | `/app/meu-perfil` | `auth/me` |
| **Configurações** | `/app/configuracoes` | `auth/me/password` |
