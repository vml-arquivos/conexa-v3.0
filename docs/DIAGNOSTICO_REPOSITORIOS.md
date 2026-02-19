# Diagnóstico Completo dos Repositórios

## Resumo Executivo

Foram clonados e analisados três repositórios que compõem o sistema Conexa:

1. **Conexa-V2** - Back-end (API REST)
2. **font-conexa-v2** - Front-end (Interface Web)
3. **site-cocris** - Site Institucional (Landing page + CMS)

---

## 1. Repositório: Conexa-V2 (Back-end)

### Informações Gerais
- **URL**: vml-arquivos/Conexa-V2
- **Branch Principal**: main
- **Último Commit**: `8d0bfe7` - Merge pull request #17 (RBAC para reports)
- **Total de Objetos**: 842

### Branches Remotas (14 branches)
- `main` (principal)
- `codex/implementar-rbac-para-reports`
- `feat/cocris-import-lookup-templates`
- `feat/cocris-seed-data-logins`
- `feat/dashboard-mantenedora`
- `feat/lookup-accessible-units-classrooms`
- `feat/pr-002-seed-ei02-2026`
- `feat/pr-019-premium-modules-atendimento-rdix`
- `feat/sprint-1-pedagogico`
- `feat/sprint-2-analytics-dashboards` ⭐
- `feat/sprint-3-performance-redis`
- `feat/sprint-4-robustez-cqrs`
- `feat/sprint-5-admin-final`
- `fix/seed-dataset-in-image`
- `fix/seed-json-in-image`
- `security/p0-isolation-lockdown`

### Pull Requests Abertas (1)
| ID | Título | Branch | Criada há |
|----|--------|--------|-----------|
| #3 | Sprint 2: Analytics Dashboards | feat/sprint-2-analytics-dashboards | 9 dias |

### Stack Tecnológica
**Framework**: NestJS (Node.js)

**Principais Dependências**:
- `@nestjs/core` v11.1.13 - Framework back-end
- `@prisma/client` v5.22.0 - ORM para banco de dados
- `@nestjs/jwt` v11.0.2 - Autenticação JWT
- `@nestjs/passport` v11.0.5 - Estratégias de autenticação
- `bcrypt` v6.0.0 - Hash de senhas
- `cache-manager-redis-yet` v5.1.5 - Cache Redis
- `openai` v6.22.0 - Integração com IA
- `xlsx` v0.18.5 - Processamento de planilhas
- `pdf-parse` v2.4.5 - Processamento de PDFs
- `class-validator` v0.14.3 - Validação de dados
- `date-fns` v4.1.0 - Manipulação de datas

### Estrutura de Diretórios
```
Conexa-V2/
├── data/                    # Dados de seed (XLSX, JSON)
├── docs/                    # Documentação e evidências
├── ops/                     # Operações e evidências
├── prisma/                  # Schema e migrations do banco
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── scripts/                 # Scripts de automação
├── src/                     # Código-fonte principal
│   ├── admin/              # Módulo administrativo
│   ├── atendimento-pais/   # Atendimento aos pais
│   ├── auth/               # Autenticação
│   ├── cache/              # Sistema de cache
│   ├── classrooms/         # Salas de aula
│   ├── curriculum-matrix/  # Matriz curricular
│   ├── diary-event/        # Eventos de diário
│   ├── ia-assistiva/       # IA assistiva
│   ├── lookup/             # Lookups/consultas
│   ├── material-request/   # Requisição de materiais
│   ├── metrics/            # Métricas
│   ├── pedido-compra/      # Pedidos de compra
│   ├── planning/           # Planejamento
│   ├── reports/            # Relatórios
│   └── main.ts
└── test/                    # Testes E2E
```

### Funcionalidades Identificadas
- Sistema de autenticação com JWT e RBAC
- Gestão de matrizes curriculares
- Importação de dados (XLSX, CSV, PDF)
- Dashboards analíticos
- Sistema de cache com Redis
- IA assistiva integrada
- Relatórios e métricas
- Gestão de salas de aula e turmas
- Planejamento pedagógico
- Atendimento aos pais
- Pedidos de compra e materiais

---

## 2. Repositório: font-conexa-v2 (Front-end)

### Informações Gerais
- **URL**: vml-arquivos/font-conexa-v2
- **Branch Principal**: main
- **Último Commit**: `e8811de` - Merge pull request #11 (atendimento pais dashboard central)
- **Total de Objetos**: 363

### Branches Remotas (8 branches)
- `main` (principal)
- `core/sprint-6-lint-zero`
- `feat/dashboards-with-selects-no-uuid`
- `feature/pr-1.1-corrections`
- `feature/pr-2-professor-dashboard-product`
- `feature/pr-4-ux-premium-foundation` ⭐
- `feature/teacher-dashboard-final` ⭐
- `feature/teacher-dashboard-today`
- `fix/frontend-align-backend-lookup-seed-2026`

### Pull Requests Abertas (2)
| ID | Título | Branch | Criada há |
|----|--------|--------|-----------|
| #5 | feat(teacher): Final Teacher Dashboard | feature/teacher-dashboard-final | 12 dias |
| #4 | PR #4 - UX Premium Foundation | feature/pr-4-ux-premium-foundation | 12 dias |

### Stack Tecnológica
**Framework**: React 19 + Vite + TypeScript

**Principais Dependências**:
- `react` v19.2.0 - Biblioteca UI
- `react-dom` v19.2.0
- `react-router-dom` v7.13.0 - Roteamento
- `@radix-ui/*` - Componentes UI acessíveis
- `axios` v1.13.4 - Cliente HTTP
- `recharts` v3.7.0 - Gráficos e visualizações
- `lucide-react` v0.563.0 - Ícones
- `tailwind-merge` v3.4.0 - Utilitários CSS
- `class-variance-authority` v0.7.1 - Variantes de componentes

### Estrutura de Diretórios
```
font-conexa-v2/
├── public/
├── src/
│   ├── api/                # Integração com API
│   ├── app/                # Configuração da aplicação
│   ├── assets/             # Recursos estáticos
│   ├── components/         # Componentes reutilizáveis
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Bibliotecas e utilitários
│   ├── pages/              # Páginas da aplicação
│   ├── types/              # Definições TypeScript
│   ├── utils/              # Funções utilitárias
│   └── main.tsx
├── Dockerfile
├── nginx.conf
└── vite.config.ts
```

### Funcionalidades Identificadas
- Dashboard de professores
- Dashboard de análises
- Sistema de autenticação integrado
- Componentes UI premium (Radix UI)
- Gráficos e visualizações de dados
- Interface responsiva com TailwindCSS

---

## 3. Repositório: site-cocris (Site Institucional)

### Informações Gerais
- **URL**: vml-arquivos/site-cocris
- **Branch Principal**: main
- **Último Commit**: `0bee3e2` - feat: adiciona Trabalhe Conosco completo e Compliance
- **Total de Objetos**: 331

### Branches Remotas (1 branch)
- `main` (principal)

### Pull Requests Abertas
Nenhuma PR aberta.

### Stack Tecnológica
**Framework**: Vite + React + TypeScript + Drizzle ORM

**Principais Dependências**:
- `@aws-sdk/client-s3` v3.693.0 - Upload de arquivos
- `@aws-sdk/s3-request-presigner` v3.693.0
- `@stripe/stripe-js` v8.7.0 - Pagamentos
- `@radix-ui/*` - Componentes UI completos
- `@hookform/resolvers` v5.2.2 - Validação de formulários
- Drizzle ORM - Banco de dados

### Estrutura de Diretórios
```
site-cocris/
├── client/                  # Front-end do site
│   ├── public/
│   ├── src/
│   └── index.html
├── drizzle/                 # ORM e migrations
│   ├── migrations/
│   ├── schema.ts
│   └── relations.ts
├── server/                  # Back-end do site
│   ├── _core/
│   ├── auth.logout.test.ts
│   ├── db.ts
│   ├── routers.ts
│   ├── sitemap.ts
│   ├── storage.ts
│   └── stripe.ts
├── shared/                  # Código compartilhado
│   ├── _core/
│   ├── const.ts
│   └── types.ts
└── seed-units.mjs
```

### Funcionalidades Identificadas
- Site institucional completo
- Sistema de autenticação próprio
- Integração com Stripe (pagamentos)
- Upload de arquivos (S3)
- Página "Trabalhe Conosco"
- Compliance
- Sitemap dinâmico
- Banco de dados próprio (Drizzle ORM)

---

## Análise Consolidada

### Arquitetura Atual
**Modelo**: Três repositórios independentes (Multi-repo)

1. **Back-end** (Conexa-V2): NestJS + Prisma + PostgreSQL/Supabase
2. **Front-end** (font-conexa-v2): React + Vite + TailwindCSS
3. **Site** (site-cocris): Full-stack (Vite + Drizzle + S3 + Stripe)

### Desafios Identificados

#### 1. **Fragmentação de Código**
- Três repositórios separados dificultam sincronização
- Dependências duplicadas entre projetos
- Dificuldade de manter consistência de versões

#### 2. **Deploy Fragmentado**
- Três pipelines de deploy independentes
- Sincronização manual entre releases
- Maior complexidade operacional

#### 3. **Duplicação de Funcionalidades**
- Site tem autenticação própria (diferente do sistema principal)
- Site tem banco de dados próprio (Drizzle vs Prisma)
- Componentes UI duplicados (Radix UI em ambos)

#### 4. **Falta de Multi-tenancy**
- Sistema atual não possui isolamento por tenant
- Sem personalização por empresa/cliente
- Dados compartilhados sem segregação

### Oportunidades para Transformação SaaS

#### 1. **Monorepo Unificado**
- Consolidar três repositórios em um único monorepo
- Usar workspaces (pnpm/npm) para gerenciar pacotes
- Compartilhar código comum (types, utils, components)

#### 2. **Multi-tenancy Nativo**
- Adicionar campo `tenant_id` em todas as tabelas
- Implementar middleware de isolamento de tenant
- Criar sistema de onboarding de novos clientes

#### 3. **Personalização por Tenant**
- **Site**: Temas personalizáveis (cores, logos, domínios)
- **Dashboards**: Módulos ativáveis por tenant
- **Permissões**: RBAC granular por tenant
- **Features**: Feature flags por tenant

#### 4. **Deploy Unificado**
- Dockerfile multi-stage único
- Orquestração com Docker Compose ou Kubernetes
- CI/CD unificado (GitHub Actions)

---

## Próximos Passos Sugeridos

### Fase 1: Planejamento
1. ✅ Clonar e diagnosticar repositórios
2. ⏳ Solicitar arquivos de configuração e variáveis de ambiente
3. ⏳ Mapear funcionalidades críticas e dependências
4. ⏳ Definir arquitetura do monorepo

### Fase 2: Estruturação
5. Criar estrutura de monorepo (pnpm workspaces)
6. Migrar código dos três repositórios
7. Consolidar dependências compartilhadas
8. Implementar camada de multi-tenancy

### Fase 3: Personalização
9. Sistema de temas para site institucional
10. Feature flags e módulos ativáveis
11. RBAC granular por tenant
12. Dashboard de administração de tenants

### Fase 4: Deploy
13. Configurar Docker Compose para desenvolvimento
14. Configurar CI/CD unificado
15. Documentar processo de onboarding de clientes
16. Testes de integração end-to-end

---

## Informações Necessárias

Para prosseguir com a transformação em SaaS, preciso dos seguintes arquivos e informações:

### 1. Arquivos de Configuração
- [ ] `.env` ou `.env.example` de cada repositório
- [ ] Configurações de banco de dados (connection strings)
- [ ] Configurações de Redis
- [ ] Credenciais AWS S3
- [ ] Chaves Stripe
- [ ] Configurações OpenAI

### 2. Documentação
- [ ] Fluxo de autenticação atual
- [ ] Modelo de dados (ERD ou schema visual)
- [ ] Requisitos de personalização por cliente
- [ ] Módulos/features que devem ser ativáveis

### 3. Infraestrutura
- [ ] Ambiente de deploy atual (Coolify, AWS, etc.)
- [ ] Requisitos de escalabilidade
- [ ] Estratégia de backup e disaster recovery

### 4. Regras de Negócio
- [ ] Como será feito o onboarding de novos clientes?
- [ ] Quais dados são compartilhados vs isolados?
- [ ] Modelo de precificação (por usuário, por módulo, etc.)
- [ ] SLA e requisitos de disponibilidade

---

**Status**: ✅ Diagnóstico completo realizado
**Próxima Ação**: Aguardando arquivos de configuração e definições de negócio
