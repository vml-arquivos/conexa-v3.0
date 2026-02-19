# Análise Detalhada da Estrutura dos Projetos

## 1. Análise de Build e Deploy

### 1.1 Back-end (Conexa-V2)

**Framework**: NestJS + Prisma

**Scripts de Build**:
```json
{
  "build": "nest build && node scripts/copy-data-to-dist.js",
  "start:prod": "node dist/main",
  "prisma:generate": "prisma generate",
  "db:migrate:deploy": "prisma migrate deploy"
}
```

**Dockerfile**: Multi-stage (builder + runner)
- **Stage 1 (builder)**: Instala deps, gera Prisma Client, faz build, remove devDeps
- **Stage 2 (runner)**: Runtime otimizado com healthcheck
- **Porta**: 3000
- **Dependências de sistema**: openssl, ca-certificates

**Características**:
- ✅ Já possui multi-tenancy nativo (`mantenedoraId` em todas as tabelas)
- ✅ RBAC completo implementado
- ✅ Auditoria automática
- ✅ Sistema de cache Redis (opcional)
- ✅ Integração com IA (OpenAI/Gemini)
- ⚠️ Migrations via Prisma (PostgreSQL/Supabase)

---

### 1.2 Front-end (font-conexa-v2)

**Framework**: React 19 + Vite + TypeScript

**Scripts de Build**:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

**Dockerfile**: Multi-stage (builder + nginx)
- **Stage 1 (builder)**: Build do Vite
- **Stage 2 (nginx)**: Serve arquivos estáticos
- **Porta**: 80
- **Configuração**: nginx.conf para SPA fallback

**Características**:
- ✅ SPA (Single Page Application)
- ✅ Componentes UI com Radix UI
- ✅ TailwindCSS para estilização
- ✅ Integração com API via Axios
- ⚠️ Poucos componentes UI (apenas 4: button, card, toast, toaster)
- ⚠️ Configuração de API hardcoded: `https://apiconexa.casadf.com.br`

---

### 1.3 Site Institucional (site-cocris)

**Framework**: Vite + React + Drizzle ORM (Full-stack)

**Scripts de Build**:
```json
{
  "dev": "tsx watch server/_core/index.ts",
  "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "node dist/index.js",
  "db:push": "drizzle-kit generate && drizzle-kit migrate"
}
```

**Características**:
- ✅ Full-stack (client + server)
- ✅ Banco de dados próprio (Drizzle ORM)
- ✅ Autenticação própria
- ✅ Upload de arquivos (AWS S3)
- ✅ Pagamentos (Stripe)
- ✅ Componentes UI completos (shadcn/ui - 40+ componentes)
- ⚠️ **NÃO possui Dockerfile**
- ⚠️ Usa Nixpacks para deploy (Coolify/Railway)
- ⚠️ Sistema de autenticação separado do back-end principal

---

## 2. Análise de Componentes UI

### 2.1 Comparação de Bibliotecas UI

| Componente | font-conexa-v2 | site-cocris |
|------------|----------------|-------------|
| **Base** | Radix UI | Radix UI |
| **Estilização** | TailwindCSS | TailwindCSS |
| **Componentes** | 4 básicos | 40+ completos |
| **Padrão** | Custom | shadcn/ui |

**Componentes no site-cocris** (shadcn/ui completo):
- accordion, alert-dialog, alert, aspect-ratio, avatar
- badge, breadcrumb, button-group, button, calendar
- card, carousel, chart, checkbox, collapsible
- command, context-menu, dialog, drawer, dropdown-menu
- form, hover-card, input, label, menubar
- navigation-menu, pagination, popover, progress
- radio-group, scroll-area, select, separator, sheet
- skeleton, slider, sonner, switch, table
- tabs, textarea, toast, toggle-group, toggle
- tooltip

**Oportunidade**: Consolidar biblioteca UI do site-cocris como padrão para todo o monorepo.

---

## 3. Análise de Autenticação

### 3.1 Back-end (Conexa-V2)

**Sistema**: JWT + RBAC + Multi-tenant

**Fluxo**:
1. Login → `POST /auth/login`
2. Validação de credenciais
3. Geração de tokens:
   - `accessToken` (15 min)
   - `refreshToken` (7 dias)
4. Renovação → `POST /auth/refresh`

**Guards**:
- `JwtAuthGuard` (global)
- `RolesGuard` (níveis de acesso)
- `PermissionsGuard` (permissões específicas)
- `ScopeGuard` (isolamento multi-tenant)

**Níveis de Acesso (RoleLevel)**:
- `DEVELOPER` - Acesso sistêmico total
- `MANTENEDORA` - Gestão administrativa global
- `STAFF_CENTRAL` - Coordenação pedagógica geral
- `UNIDADE` - Direção e coordenação local
- `PROFESSOR` - Acesso às suas turmas

**Papéis (RoleType)**:
- DEVELOPER
- MANTENEDORA_ADMIN, MANTENEDORA_FINANCEIRO
- STAFF_CENTRAL_PEDAGOGICO, STAFF_CENTRAL_PSICOLOGIA
- UNIDADE_DIRETOR, UNIDADE_COORDENADOR_PEDAGOGICO, UNIDADE_ADMINISTRATIVO, UNIDADE_NUTRICIONISTA
- PROFESSOR, PROFESSOR_AUXILIAR

---

### 3.2 Site (site-cocris)

**Sistema**: Autenticação própria (separada)

**Problema**: Duplicação de lógica de autenticação

**Solução proposta**: Unificar autenticação usando o sistema do back-end principal.

---

## 4. Análise de Banco de Dados

### 4.1 Back-end (Conexa-V2)

**ORM**: Prisma
**Banco**: PostgreSQL (Supabase)
**Schema**: 1677 linhas (complexo e completo)

**Estrutura Multi-tenant**:
```
Mantenedora (tenant raiz)
  ├── Units (unidades/creches)
  │   ├── Classrooms (turmas)
  │   │   └── Children (crianças)
  │   └── Users (usuários)
  └── CurriculumMatrix (matrizes curriculares)
```

**Principais Modelos**:
- `Mantenedora` - Organização raiz (tenant)
- `Unit` - Unidades/creches
- `User` - Usuários do sistema
- `Role` - Papéis e permissões
- `Child` - Crianças matriculadas
- `Classroom` - Turmas
- `CurriculumMatrix` - Matrizes curriculares
- `Planning` - Planejamentos pedagógicos
- `DiaryEvent` - Diário de bordo
- `Attendance` - Frequência
- `MaterialRequest` - Requisições de materiais
- `AuditLog` - Logs de auditoria

**Características**:
- ✅ Multi-tenancy nativo (`mantenedoraId` em todas as tabelas)
- ✅ Auditoria completa (createdAt, updatedAt, createdBy, updatedBy)
- ✅ Soft delete em registros críticos
- ✅ Índices otimizados para performance
- ✅ Conformidade BNCC e Currículo em Movimento DF

---

### 4.2 Site (site-cocris)

**ORM**: Drizzle
**Banco**: Próprio (separado)

**Schema**: Básico para site institucional
- Unidades (CEPIs e Creches)
- Notícias/Blog
- Formulários de contato
- Uploads (S3)

**Problema**: Duplicação de dados de unidades

**Solução proposta**: Migrar para o banco principal (Prisma) e adicionar tabelas específicas do site.

---

## 5. Análise de Funcionalidades

### 5.1 Funcionalidades Compartilhadas

| Funcionalidade | Back-end | Front-end | Site |
|----------------|----------|-----------|------|
| **Autenticação** | ✅ JWT + RBAC | ✅ Integrado | ⚠️ Próprio |
| **Gestão de Unidades** | ✅ Completo | ✅ Dashboard | ⚠️ Listagem estática |
| **Dashboards** | ✅ API | ✅ UI | ❌ |
| **Relatórios** | ✅ Geração | ✅ Visualização | ❌ |
| **IA Assistiva** | ✅ Backend | ⚠️ Parcial | ❌ |
| **Upload de Arquivos** | ⚠️ Local | ❌ | ✅ S3 |
| **Pagamentos** | ❌ | ❌ | ✅ Stripe |

---

### 5.2 Funcionalidades Exclusivas do Back-end

- Gestão de matrizes curriculares
- Importação de dados (XLSX, CSV, PDF)
- Planejamento pedagógico
- Diário de bordo
- Frequência (attendance)
- Requisições de materiais
- Pedidos de compra
- Relatórios oficiais (RIA/RDIC)
- Sistema de cache Redis
- Auditoria completa
- RBAC granular

---

### 5.3 Funcionalidades Exclusivas do Site

- Site institucional personalizável
- Blog/Notícias
- Páginas estáticas (Sobre, Compliance, Transparência)
- Formulários de contato
- Trabalhe Conosco
- Ouvidoria
- Canal de denúncia
- Doações (integração Stripe)
- SEO otimizado
- Sitemap dinâmico

---

## 6. Oportunidades de Consolidação

### 6.1 Código Compartilhável

**Tipos TypeScript**:
- Interfaces de API
- Enums (RoleLevel, RoleType, etc.)
- DTOs (Data Transfer Objects)
- Validadores (Zod schemas)

**Componentes UI**:
- Biblioteca shadcn/ui completa do site
- Componentes de dashboard
- Formulários reutilizáveis
- Layouts responsivos

**Utilitários**:
- Formatação de datas
- Validação de CPF/CNPJ
- Máscaras de input
- Helpers de API

---

### 6.2 Infraestrutura Unificada

**Proposta de Monorepo**:
```
conexa-saas/
├── apps/
│   ├── api/              # Back-end (NestJS)
│   ├── web/              # Front-end (React)
│   └── site/             # Site institucional (React)
├── packages/
│   ├── ui/               # Componentes UI compartilhados
│   ├── types/            # Tipos TypeScript
│   ├── utils/            # Utilitários
│   ├── config/           # Configurações (ESLint, TS, etc.)
│   └── database/         # Schema Prisma + migrations
├── docker-compose.yml    # Orquestração local
├── package.json          # Workspace root
└── pnpm-workspace.yaml   # Configuração pnpm
```

---

## 7. Desafios Técnicos Identificados

### 7.1 Migração de ORM

**Problema**: Site usa Drizzle, back-end usa Prisma

**Soluções possíveis**:
1. **Migrar site para Prisma** (recomendado)
   - ✅ Unifica ORM
   - ✅ Aproveita schema existente
   - ⚠️ Requer reescrita de queries do site

2. **Manter ambos**
   - ✅ Sem reescrita
   - ⚠️ Duplicação de lógica
   - ⚠️ Dois bancos de dados

**Recomendação**: Opção 1 (migrar para Prisma)

---

### 7.2 Autenticação Unificada

**Problema**: Site tem autenticação própria

**Solução**:
1. Usar JWT do back-end principal
2. Adicionar endpoints específicos do site no back-end
3. Compartilhar guards e middlewares
4. Manter sessões sincronizadas

---

### 7.3 Deploy Unificado

**Problema**: Três pipelines de deploy separados

**Solução**:
1. Docker Compose para desenvolvimento local
2. Dockerfile multi-stage para cada app
3. CI/CD unificado (GitHub Actions)
4. Deploy orquestrado (Coolify/Kubernetes)

---

## 8. Arquitetura Multi-tenant Proposta

### 8.1 Estrutura de Tenants

```
Tenant (Mantenedora)
  ├── Configurações
  │   ├── Branding (logo, cores, domínio)
  │   ├── Módulos ativos (dashboards, relatórios, etc.)
  │   ├── Permissões customizadas
  │   └── Integrações (S3, Stripe, etc.)
  ├── Unidades
  │   ├── Dados operacionais
  │   └── Configurações locais
  ├── Usuários
  │   ├── Roles e permissões
  │   └── Acessos por unidade
  └── Site Institucional
      ├── Tema personalizado
      ├── Conteúdo (páginas, blog)
      └── Domínio próprio
```

---

### 8.2 Personalização por Tenant

**Nível 1: Branding**
- Logo personalizado
- Paleta de cores
- Fontes customizadas
- Domínio próprio (ex: `cliente.conexa.app` ou `www.cliente.com.br`)

**Nível 2: Módulos**
- Dashboards ativáveis/desativáveis
- Relatórios customizados
- Integrações opcionais (S3, Stripe, etc.)
- Features premium (IA assistiva, analytics avançado)

**Nível 3: Permissões**
- RBAC customizável por tenant
- Permissões granulares por módulo
- Workflows personalizados

**Nível 4: Site Institucional**
- Layout totalmente personalizável
- Páginas customizadas
- Blog/notícias próprio
- SEO por tenant

---

## 9. Próximos Passos Técnicos

### 9.1 Preparação do Monorepo

1. ✅ Análise completa dos repositórios
2. ⏳ Criar estrutura de monorepo (pnpm workspaces)
3. ⏳ Migrar código dos três repositórios
4. ⏳ Consolidar dependências compartilhadas
5. ⏳ Criar pacote `@conexa/ui` com componentes
6. ⏳ Criar pacote `@conexa/types` com tipos
7. ⏳ Criar pacote `@conexa/utils` com utilitários

---

### 9.2 Implementação Multi-tenant

1. ⏳ Adicionar tabela `TenantConfig` no schema Prisma
2. ⏳ Implementar middleware de tenant no back-end
3. ⏳ Criar sistema de temas no front-end
4. ⏳ Implementar feature flags por tenant
5. ⏳ Criar dashboard de administração de tenants

---

### 9.3 Migração do Site

1. ⏳ Migrar schema Drizzle para Prisma
2. ⏳ Unificar autenticação com back-end principal
3. ⏳ Migrar componentes para pacote compartilhado
4. ⏳ Implementar sistema de temas personalizáveis
5. ⏳ Criar Dockerfile para o site

---

### 9.4 Deploy Unificado

1. ⏳ Criar Docker Compose para desenvolvimento
2. ⏳ Configurar CI/CD no GitHub Actions
3. ⏳ Implementar health checks
4. ⏳ Configurar reverse proxy (Traefik/Nginx)
5. ⏳ Documentar processo de deploy

---

## 10. Estimativa de Esforço

| Fase | Tarefas | Complexidade | Tempo Estimado |
|------|---------|--------------|----------------|
| **1. Estruturação do Monorepo** | Criar workspaces, migrar código | Média | 2-3 dias |
| **2. Pacotes Compartilhados** | UI, types, utils | Média | 3-4 dias |
| **3. Multi-tenancy** | TenantConfig, middleware, feature flags | Alta | 5-7 dias |
| **4. Migração do Site** | Drizzle→Prisma, auth unificada | Alta | 4-5 dias |
| **5. Personalização** | Temas, branding, domínios | Alta | 5-6 dias |
| **6. Deploy Unificado** | Docker Compose, CI/CD | Média | 3-4 dias |
| **7. Testes e Documentação** | E2E, docs, guias | Média | 3-4 dias |
| **TOTAL** | - | - | **25-33 dias** |

---

## 11. Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| **Breaking changes na migração** | Alto | Média | Testes E2E completos, rollback plan |
| **Perda de dados na migração do site** | Alto | Baixa | Backup completo, dry-run |
| **Conflitos de dependências** | Médio | Média | Usar pnpm workspaces, lock versions |
| **Performance degradada** | Médio | Baixa | Benchmarks, cache Redis |
| **Complexidade de deploy** | Médio | Média | Documentação detalhada, automação |

---

**Status**: ✅ Análise estrutural completa
**Próxima Ação**: Planejar arquitetura detalhada do monorepo e sistema multi-tenant
