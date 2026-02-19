# Conexa V3.0 - Plataforma SaaS Educacional

**Plataforma SaaS multi-tenant para gestão pedagógica e documental da Educação Infantil**

## 📋 Visão Geral

O Conexa V3.0 é uma plataforma educacional completa que centraliza, estrutura, valida e audita todo o ciclo pedagógico da Educação Infantil — desde a **Matriz Curricular oficial** (baseada na BNCC e Currículo em Movimento DF), passando pelo **planejamento pedagógico**, até o **registro diário (Diário de Bordo)**.

### Características Principais

- ✅ **Multi-tenant nativo** - Isolamento completo de dados por Mantenedora
- ✅ **RBAC granular** - 5 níveis de acesso (Developer, Mantenedora, Staff Central, Unidade, Professor)
- ✅ **Conformidade BNCC** - Alinhamento rigoroso com Base Nacional Comum Curricular
- ✅ **Auditoria completa** - Rastreabilidade de todas as ações
- ✅ **IA Assistiva** - Suporte inteligente para relatórios e análises (não decisória)
- ✅ **Modo Offline** - App mobile com sincronização posterior
- ✅ **Personalização total** - Site institucional, dashboards e módulos customizáveis por tenant

---

## 🏗️ Arquitetura do Monorepo

Este projeto utiliza **pnpm workspaces** para gerenciar um monorepo com múltiplos apps e pacotes compartilhados.

```
conexa-v3.0/
├── apps/
│   ├── api/              # Backend (NestJS + Prisma + PostgreSQL)
│   ├── web/              # Frontend Web (React + Vite + TailwindCSS)
│   └── site/             # Site Institucional (Full-stack)
├── packages/
│   ├── ui/               # Componentes UI compartilhados (shadcn/ui)
│   ├── types/            # Tipos TypeScript compartilhados
│   ├── utils/            # Funções utilitárias
│   ├── database/         # Schema Prisma + Migrations
│   └── config/           # Configurações compartilhadas
├── docker-compose.yml    # Orquestração de containers
├── package.json          # Workspace root
└── pnpm-workspace.yaml   # Configuração do workspace
```

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **Docker** (opcional, para desenvolvimento local)
- **PostgreSQL** 17+ (ou usar Supabase)

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/vml-arquivos/conexa-v3.0.git
cd conexa-v3.0

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/site/.env.example apps/site/.env

# Gerar Prisma Client
pnpm db:generate

# Executar migrations
pnpm db:migrate:dev

# Seed do banco de dados
pnpm db:seed
```

### Desenvolvimento

```bash
# Iniciar todos os apps em paralelo
pnpm dev

# Ou iniciar apps individualmente
pnpm dev:api    # Backend na porta 3000
pnpm dev:web    # Frontend na porta 5173
pnpm dev:site   # Site na porta 5174
```

### Build

```bash
# Build de todos os apps
pnpm build

# Ou build individual
pnpm build:api
pnpm build:web
pnpm build:site
```

---

## 📦 Apps

### API (Backend)

**Stack**: NestJS + Prisma + PostgreSQL + Redis (opcional)

**Porta**: 3000

**Principais Funcionalidades**:
- Autenticação JWT + RBAC
- Gestão de Matrizes Curriculares
- Planejamento Pedagógico
- Diário de Bordo
- Relatórios Oficiais (RIA/RDIC)
- IA Assistiva (OpenAI/Gemini)
- Importação de PDF curricular
- Sistema de cache Redis
- Auditoria completa

**Scripts**:
```bash
cd apps/api
pnpm dev              # Desenvolvimento
pnpm build            # Build
pnpm start:prod       # Produção
pnpm db:studio        # Prisma Studio
pnpm test             # Testes
```

---

### Web (Frontend)

**Stack**: React 19 + Vite + TypeScript + TailwindCSS

**Porta**: 5173

**Principais Funcionalidades**:
- Dashboard por nível de acesso
- Registro rápido de microgestos (1 toque)
- Planejamento pedagógico
- Visualização de relatórios
- Gráficos e analytics
- Interface responsiva

**Scripts**:
```bash
cd apps/web
pnpm dev              # Desenvolvimento
pnpm build            # Build
pnpm preview          # Preview do build
pnpm lint             # Linter
```

---

### Site (Institucional)

**Stack**: Vite + React + Drizzle ORM + AWS S3 + Stripe

**Porta**: 5174

**Principais Funcionalidades**:
- Site institucional personalizável
- Blog/Notícias
- Páginas customizáveis
- Formulários de contato
- Trabalhe Conosco
- Integração com Stripe (doações)
- Upload de arquivos (S3)
- SEO otimizado

**Scripts**:
```bash
cd apps/site
pnpm dev              # Desenvolvimento
pnpm build            # Build
pnpm start            # Produção
pnpm test             # Testes
```

---

## 📚 Pacotes Compartilhados

### @conexa/ui

Biblioteca completa de componentes UI baseada em **shadcn/ui** e **Radix UI**.

**Componentes disponíveis**: 50+ componentes (button, card, dialog, form, table, etc.)

**Uso**:
```tsx
import { Button, Card, Dialog } from '@conexa/ui';
```

---

### @conexa/types

Tipos TypeScript compartilhados entre todos os apps.

**Principais tipos**:
- Enums (RoleLevel, RoleType, CampoDeExperiencia, etc.)
- DTOs (LoginDto, AuthResponse, PlanningDto, etc.)
- Interfaces (UserPayload, TenantConfig, etc.)

**Uso**:
```typescript
import { RoleLevel, UserPayload, ApiResponse } from '@conexa/types';
```

---

### @conexa/utils

Funções utilitárias compartilhadas.

**Principais funções**:
- `cn()` - Combina classes CSS com Tailwind Merge
- `formatDate()`, `formatDateTime()` - Formatação de datas
- `validateCPF()`, `validateCNPJ()` - Validação de documentos
- `formatCPF()`, `formatCNPJ()`, `formatPhone()` - Formatação
- `formatCurrency()` - Formatação de moeda
- `calculateAge()` - Cálculo de idade
- `debounce()` - Debounce function

**Uso**:
```typescript
import { cn, formatDate, validateCPF } from '@conexa/utils';
```

---

### @conexa/database

Schema Prisma e migrations compartilhados.

**Scripts**:
```bash
pnpm db:generate       # Gerar Prisma Client
pnpm db:migrate:dev    # Criar e aplicar migration
pnpm db:migrate:deploy # Aplicar migrations em produção
pnpm db:studio         # Abrir Prisma Studio
pnpm db:seed           # Seed do banco
```

---

## 🔐 Autenticação e RBAC

### Níveis de Acesso

| Nível | Descrição |
|-------|-----------|
| **DEVELOPER** | Acesso sistêmico total (debug, manutenção) |
| **MANTENEDORA** | Gestão administrativa global |
| **STAFF_CENTRAL** | Coordenação pedagógica geral (multi-unidade) |
| **UNIDADE** | Gestão local (direção, coordenação) |
| **PROFESSOR** | Execução pedagógica (acesso às suas turmas) |

### Papéis Específicos

- `DEVELOPER`
- `MANTENEDORA_ADMIN`, `MANTENEDORA_FINANCEIRO`
- `STAFF_CENTRAL_PEDAGOGICO`, `STAFF_CENTRAL_PSICOLOGIA`
- `UNIDADE_DIRETOR`, `UNIDADE_COORDENADOR_PEDAGOGICO`, `UNIDADE_ADMINISTRATIVO`, `UNIDADE_NUTRICIONISTA`
- `PROFESSOR`, `PROFESSOR_AUXILIAR`

---

## 🎨 Personalização Multi-tenant

Cada **Mantenedora** (tenant) pode personalizar:

### Branding
- Logo personalizado
- Paleta de cores
- Fontes customizadas
- Domínio próprio

### Módulos
- Dashboards ativáveis/desativáveis
- Relatórios customizados
- Integrações opcionais (S3, Stripe, IA)
- Features premium

### Site Institucional
- Layout totalmente personalizável
- Páginas customizadas
- Blog/notícias próprio
- SEO por tenant

---

## 🐳 Docker

### Desenvolvimento Local

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### Build de Imagens

```bash
# Build de todas as imagens
docker-compose build

# Build de um serviço específico
docker-compose build api
```

---

## 🧪 Testes

```bash
# Testes do backend
cd apps/api && pnpm test

# Testes do site
cd apps/site && pnpm test
```

---

## 📖 Documentação Adicional

- [Escopo Mestre](./docs/ESCOPO_MESTRE.md)
- [Sequência Pedagógica Piloto 2026](./docs/SEQUENCIA_PEDAGOGICA.md)
- [Guia de Autenticação](./apps/api/AUTH_GUIDE.md)
- [Guia de Diário de Bordo](./apps/api/DIARY_EVENT_GUIDE.md)
- [Guia de Planejamento](./apps/api/PLANNING_GUIDE.md)
- [Guia de Deploy](./docs/DEPLOY.md)

---

## 🤝 Contribuindo

Este é um projeto open-source. Contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

---

## 👥 Autores

**COCRIS - Associação Beneficente Coração de Cristo**

- Website: [www.cocris.org](https://www.cocris.org)
- Email: contato@cocris.org

---

## 🙏 Agradecimentos

- Equipe pedagógica da COCRIS
- Professores e coordenadores das unidades
- Comunidade open-source

---

**Feito com ❤️ para a Educação Infantil**
