# Guia Completo de Deploy no Coolify - Conexa V3.0

**Data**: 19 de Fevereiro de 2026  
**Versão**: 3.0.0  
**Status**: ✅ **PRONTO PARA DEPLOY**

---

## 📋 Pré-requisitos

Antes de iniciar o deploy, certifique-se de ter:

- ✅ **VPS com Coolify instalado**
- ✅ **Acesso SSH ao servidor**
- ✅ **Conta no GitHub** com acesso ao repositório
- ✅ **Banco de dados PostgreSQL 17+** (Supabase recomendado)
- ✅ **Domínios configurados** (opcional, mas recomendado)

---

## 🎯 Arquitetura de Deploy

O Conexa V3.0 será deployado em **3 serviços separados** no Coolify:

```
┌─────────────────────────────────────────────────────┐
│                    COOLIFY VPS                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   API        │  │   WEB        │  │   SITE   │ │
│  │   (Backend)  │  │   (Frontend) │  │  (Inst.) │ │
│  │   Port 3000  │  │   Port 5173  │  │  Port    │ │
│  │              │  │              │  │  5174    │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                │       │
│         └─────────────────┴────────────────┘       │
│                           │                        │
│                           ▼                        │
│                  ┌─────────────────┐               │
│                  │   PostgreSQL    │               │
│                  │   (Supabase)    │               │
│                  └─────────────────┘               │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Passo 1: Configurar Banco de Dados (Supabase)

### 1.1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Escolha a região **South America (São Paulo)**
4. Anote as credenciais

### 1.2. Obter Connection Strings

No painel do Supabase, vá em **Settings** → **Database** e copie:

**Para runtime (Transaction Mode - Porta 6543)**:
```
postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
```

**Para migrations (Session Mode - Porta 5432)**:
```
postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
```

---

## 🔧 Passo 2: Deploy do Backend (API)

### 2.1. Criar Novo Serviço no Coolify

1. No Coolify, clique em **+ New Resource**
2. Escolha **Application**
3. Selecione **GitHub** como source
4. Conecte o repositório: `vml-arquivos/conexa-v3.0`
5. Configure:
   - **Branch**: `main`
   - **Build Pack**: `nixpacks`
   - **Base Directory**: `apps/api`

### 2.2. Configurar Build

**Build Command**:
```bash
pnpm install && pnpm --filter @conexa/database generate && pnpm --filter @conexa/api build
```

**Start Command**:
```bash
cd apps/api && node dist/src/main.js
```

**Port**: `3000`

### 2.3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente no Coolify:

```env
# Aplicação
NODE_ENV=production
PORT=3000
APP_TIMEZONE=America/Sao_Paulo

# Banco de Dados (OBRIGATÓRIAS)
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
DIRECT_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]

# JWT (OBRIGATÓRIAS - Gere com: openssl rand -base64 32)
JWT_SECRET=SEU_SECRET_AQUI
JWT_REFRESH_SECRET=SEU_REFRESH_SECRET_AQUI

# IA Assistiva - Google Gemini (RECOMENDADO)
GEMINI_API_KEY=SUA_CHAVE_GEMINI
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
GEMINI_MODEL=gemini-2.5-flash

# Redis (OPCIONAL)
# REDIS_URL=redis://seu-redis:6379

# AWS S3 (OPCIONAL)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=
```

### 2.4. Executar Migrations

**IMPORTANTE**: Antes de iniciar o serviço, execute as migrations.

No terminal do servidor (SSH):

```bash
# Clonar repositório temporariamente
git clone https://github.com/vml-arquivos/conexa-v3.0.git /tmp/conexa-v3
cd /tmp/conexa-v3

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
export DATABASE_URL="sua_connection_string_aqui"
export DIRECT_URL="sua_direct_url_aqui"

# Gerar Prisma Client
pnpm --filter @conexa/database generate

# Executar migrations
pnpm --filter @conexa/database migrate:deploy

# Limpar
cd ~ && rm -rf /tmp/conexa-v3
```

### 2.5. Configurar Domínio (Opcional)

No Coolify, configure o domínio:
- **Domain**: `api.conexa.com` (ou seu domínio)
- **HTTPS**: Ativado (Let's Encrypt automático)

### 2.6. Deploy!

Clique em **Deploy** e aguarde o build.

### 2.7. Verificar Health Check

Após o deploy, teste:

```bash
curl https://api.conexa.com/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" }
  }
}
```

---

## 🎨 Passo 3: Deploy do Frontend (Web)

### 3.1. Criar Novo Serviço no Coolify

1. No Coolify, clique em **+ New Resource**
2. Escolha **Application**
3. Selecione **GitHub** como source
4. Conecte o repositório: `vml-arquivos/conexa-v3.0`
5. Configure:
   - **Branch**: `main`
   - **Build Pack**: `nixpacks`
   - **Base Directory**: `apps/web`

### 3.2. Configurar Build

**Build Command**:
```bash
pnpm install && pnpm --filter @conexa/web build
```

**Start Command** (servir estático com Nginx):
```bash
# O Coolify detecta automaticamente que é um build estático
# e configura Nginx automaticamente
```

**Port**: `80` (Nginx padrão)

### 3.3. Configurar Variáveis de Ambiente

```env
# URL da API (use o domínio configurado no passo 2)
VITE_API_BASE_URL=https://api.conexa.com

# Ambiente
VITE_APP_ENV=production

# Nome da aplicação
VITE_APP_NAME=Conexa V3

# Versão
VITE_APP_VERSION=3.0.0
```

### 3.4. Configurar Domínio

- **Domain**: `app.conexa.com` (ou seu domínio)
- **HTTPS**: Ativado

### 3.5. Deploy!

Clique em **Deploy**.

### 3.6. Testar

Acesse `https://app.conexa.com` e faça login.

---

## 🌐 Passo 4: Deploy do Site Institucional

### 4.1. Criar Novo Serviço no Coolify

1. No Coolify, clique em **+ New Resource**
2. Escolha **Application**
3. Selecione **GitHub** como source
4. Conecte o repositório: `vml-arquivos/conexa-v3.0`
5. Configure:
   - **Branch**: `main`
   - **Build Pack**: `nixpacks`
   - **Base Directory**: `apps/site`

### 4.2. Configurar Build

**Build Command**:
```bash
pnpm install && pnpm --filter @conexa/site build
```

**Start Command**:
```bash
cd apps/site && NODE_ENV=production node dist/index.js
```

**Port**: `3001` (ou outra porta livre)

### 4.3. Configurar Variáveis de Ambiente

```env
# Aplicação
NODE_ENV=production

# Banco de Dados (mesmo do backend)
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]

# AWS S3 (OPCIONAL)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_S3_BUCKET=

# Stripe (OPCIONAL)
# STRIPE_SECRET_KEY=
# STRIPE_PUBLISHABLE_KEY=
```

### 4.4. Configurar Domínio

- **Domain**: `www.conexa.com` (ou seu domínio)
- **HTTPS**: Ativado

### 4.5. Deploy!

Clique em **Deploy**.

---

## ✅ Passo 5: Verificação Final

### 5.1. Checklist de Verificação

- [ ] **Backend API** está rodando em `https://api.conexa.com`
- [ ] **Health check** retorna `{"status": "ok"}`
- [ ] **Frontend Web** está acessível em `https://app.conexa.com`
- [ ] **Login** funciona corretamente
- [ ] **Site Institucional** está acessível em `https://www.conexa.com`
- [ ] **Migrations** foram aplicadas com sucesso
- [ ] **SSL/HTTPS** está ativo em todos os domínios

### 5.2. Testar Endpoints da API

```bash
# Health check
curl https://api.conexa.com/health

# Login
curl -X POST https://api.conexa.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@cocris.org", "password": "dev123"}'

# Listar unidades (com token)
curl https://api.conexa.com/lookup/units \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 5.3. Verificar Logs

No Coolify, acesse cada serviço e verifique os logs:

**Backend API**:
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
[Nest] INFO [RoutesResolver] AuthController {/auth}
[Nest] INFO [NestApplication] Nest application successfully started
```

**Frontend Web**:
```
Nginx serving static files from /dist
```

**Site**:
```
Server listening on port 3001
```

---

## 🔄 Passo 6: Seed do Banco de Dados (Opcional)

Se quiser popular o banco com dados de teste:

```bash
# No servidor (SSH)
cd /tmp
git clone https://github.com/vml-arquivos/conexa-v3.0.git
cd conexa-v3.0

# Configurar .env
export DATABASE_URL="sua_connection_string"
export DIRECT_URL="sua_direct_url"

# Instalar e seed
pnpm install
pnpm --filter @conexa/database generate
pnpm --filter @conexa/database seed

# Limpar
cd ~ && rm -rf /tmp/conexa-v3.0
```

---

## 🚨 Troubleshooting

### Erro: "Cannot connect to database"

**Solução**:
1. Verifique se a `DATABASE_URL` está correta
2. Teste a conexão: `psql $DATABASE_URL`
3. Verifique se o IP do servidor está na whitelist do Supabase

### Erro: "Prisma Client not generated"

**Solução**:
Adicione ao **Build Command**:
```bash
pnpm --filter @conexa/database generate
```

### Erro: "Migration failed"

**Solução**:
Execute as migrations manualmente no servidor antes do deploy.

### Erro: "Port already in use"

**Solução**:
Mude a porta no Coolify ou mate o processo:
```bash
lsof -ti:3000 | xargs kill -9
```

### Erro: "CORS blocked"

**Solução**:
Verifique se a `VITE_API_BASE_URL` está correta no frontend.

---

## 📊 Monitoramento

### Logs em Tempo Real

No Coolify, acesse cada serviço e clique em **Logs**.

### Health Checks

Configure health checks no Coolify:

**Backend API**:
- **Path**: `/health`
- **Interval**: 30s
- **Timeout**: 5s

**Site**:
- **Path**: `/`
- **Interval**: 30s
- **Timeout**: 5s

---

## 🔐 Segurança

### Checklist de Segurança

- [x] **HTTPS** ativado em todos os domínios
- [x] **JWT secrets** gerados com segurança
- [x] **Variáveis de ambiente** não commitadas
- [x] **CORS** configurado corretamente
- [x] **Rate limiting** ativado (configurar no NestJS)
- [x] **Firewall** configurado no VPS
- [x] **Backups** automáticos do banco de dados

---

## 📈 Escalabilidade

### Horizontal Scaling

Para escalar horizontalmente:

1. **Backend API**: Crie múltiplas instâncias no Coolify
2. **Load Balancer**: Configure Nginx ou Caddy
3. **Redis**: Adicione Redis para sessões compartilhadas
4. **Database**: Use read replicas no Supabase

### Vertical Scaling

Recursos mínimos recomendados:

**Desenvolvimento**:
- 2 vCPU
- 4 GB RAM
- 20 GB SSD

**Produção (pequeno porte)**:
- 4 vCPU
- 8 GB RAM
- 50 GB SSD

**Produção (médio porte)**:
- 8 vCPU
- 16 GB RAM
- 100 GB SSD

---

## 🎉 Conclusão

Parabéns! O Conexa V3.0 está deployado e rodando no Coolify! 🚀

**URLs de Acesso**:
- Backend API: `https://api.conexa.com`
- Frontend Web: `https://app.conexa.com`
- Site Institucional: `https://www.conexa.com`

**Credenciais de Teste** (se fez seed):
- Email: `dev@cocris.org`
- Senha: `dev123`

---

## 📞 Suporte

Para problemas de deploy:
- 📧 Email: contato@cocris.org
- 💻 GitHub Issues: [vml-arquivos/conexa-v3.0](https://github.com/vml-arquivos/conexa-v3.0/issues)

---

**Deploy concluído com sucesso! 🎉**

*Feito com ❤️ para a Educação Infantil*
