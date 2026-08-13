# Guia de Início Rápido - Conexa V3.0

Este guia vai te ajudar a ter o Conexa V3.0 rodando em **menos de 10 minutos**! ⚡

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- ✅ **Node.js** 20+ ([Download](https://nodejs.org/))
- ✅ **pnpm** 8+ (instale com: `npm install -g pnpm`)
- ✅ **Git** ([Download](https://git-scm.com/))
- ✅ **PostgreSQL** 17+ ([Download](https://www.postgresql.org/download/)) ou conta no [Supabase](https://supabase.com)

---

## Passo 1: Clonar o Repositório

```bash
git clone https://github.com/vml-arquivos/conexa-v3.0.git
cd conexa-v3.0
```

---

## Passo 2: Instalar Dependências

```bash
pnpm install
```

Isso vai instalar todas as dependências de todos os apps e pacotes.

---

## Passo 3: Configurar Banco de Dados

### Opção A: PostgreSQL Local

```bash
# Criar banco de dados
createdb conexa_v3

# Configurar .env
cp apps/api/.env.example apps/api/.env
```

Edite `apps/api/.env` e configure:

```env
DATABASE_URL=postgresql://seu_usuario:sua_senha@localhost:5432/conexa_v3
DIRECT_URL=postgresql://seu_usuario:sua_senha@localhost:5432/conexa_v3
```

### Opção B: Supabase (Recomendado)

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie a connection string
3. Configure no `.env`:

```env
DATABASE_URL=postgresql://postgres.SEU_PROJECT_REF:SENHA@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
DIRECT_URL=postgresql://postgres.SEU_PROJECT_REF:SENHA@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## Passo 4: Configurar JWT Secrets

Gere secrets seguros:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Adicione no `.env`:

```env
JWT_SECRET=seu_secret_gerado_aqui
JWT_REFRESH_SECRET=outro_secret_gerado_aqui
```

---

## Passo 5: Executar Migrations

```bash
pnpm db:generate
pnpm db:migrate:dev
```

---

## Passo 6: Seed do Banco (Opcional)

```bash
pnpm db:seed
```

Isso vai criar:
- 1 Mantenedora (COCRIS)
- 2 Unidades (Arara Canindé, Arara Azul)
- Usuários de teste
- Matriz Curricular 2026

**Credenciais de teste**:
- Email: `dev@cocris.org`
- Senha: `dev123`

---

## Passo 7: Configurar Frontend

```bash
cp apps/web/.env.example apps/web/.env
```

Edite `apps/web/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Passo 8: Rodar o Projeto! 🚀

### Opção A: Rodar Tudo de Uma Vez

```bash
pnpm dev
```

Isso vai iniciar:
- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Site**: http://localhost:5174

### Opção B: Rodar Apps Individualmente

```bash
# Terminal 1 - Backend
pnpm dev:api

# Terminal 2 - Frontend
pnpm dev:web

# Terminal 3 - Site
pnpm dev:site
```

---

## Passo 9: Acessar a Aplicação

Abra seu navegador em:

- **Frontend Web**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Site Institucional**: http://localhost:5174

Faça login com:
- **Email**: `dev@cocris.org`
- **Senha**: `dev123`

---

## Comandos Úteis

### Desenvolvimento

```bash
# Rodar todos os apps
pnpm dev

# Rodar apenas o backend
pnpm dev:api

# Rodar apenas o frontend
pnpm dev:web

# Rodar apenas o site
pnpm dev:site
```

### Build

```bash
# Build de todos os apps
pnpm build

# Build individual
pnpm build:api
pnpm build:web
pnpm build:site
```

### Banco de Dados

```bash
# Gerar Prisma Client
pnpm db:generate

# Criar migration
pnpm db:migrate:dev -- --name nome_da_migration

# Aplicar migrations
pnpm db:migrate:deploy

# Abrir Prisma Studio
pnpm db:studio

# Seed do banco
pnpm db:seed
```

### Linting e Formatação

```bash
# Lint
pnpm lint

# Format
pnpm format
```

### Docker

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

---

## Troubleshooting

### Erro: "Cannot connect to database"

**Solução**: Verifique se o PostgreSQL está rodando e se a `DATABASE_URL` está correta.

```bash
# Testar conexão
psql $DATABASE_URL
```

### Erro: "Prisma Client not generated"

**Solução**: Execute:

```bash
pnpm db:generate
```

### Erro: "Port already in use"

**Solução**: Mate o processo na porta:

```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Erro: "pnpm not found"

**Solução**: Instale o pnpm:

```bash
npm install -g pnpm
```

---

## Próximos Passos

Agora que você tem o Conexa rodando, explore:

1. 📚 [README Principal](./README.md) - Visão geral completa
2. 🚀 [Guia de Deploy](./docs/DEPLOY.md) - Como fazer deploy
3. 🤝 [Guia de Contribuição](./CONTRIBUTING.md) - Como contribuir
4. 📖 [Documentação da API](./apps/api/README.md) - Endpoints disponíveis
5. 🎨 [Componentes UI](./packages/ui/) - Biblioteca de componentes

---

## Precisa de Ajuda?

- 📧 Email: contato@cocris.org
- 🐛 [Reportar Bug](https://github.com/vml-arquivos/conexa-v3.0/issues)
- 💬 [Discussões](https://github.com/vml-arquivos/conexa-v3.0/discussions)

---

**Pronto! Você está rodando o Conexa V3.0! 🎉**

*Feito com ❤️ para a Educação Infantil*
