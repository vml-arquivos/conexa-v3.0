# 🚀 Guia de Deploy - Apenas Subdomínios

**Configuração**: Todos os serviços em subdomínios  
**Domínio base**: `cocris.casadf.com.br`  
**PostgreSQL e Redis**: ✅ Já instalados

---

## 🌐 SUBDOMÍNIOS NECESSÁRIOS

Você precisa de **3 subdomínios**:

| Serviço | Subdomínio | Porta | Status |
|---------|------------|-------|--------|
| **Backend API** | `apicocris.casadf.com.br` | 3000 | ✅ Já configurado |
| **Frontend Web** | `appcocris.casadf.com.br` | 5173 | ⚠️ Precisa configurar |
| **Site Institucional** | `site.cocris.casadf.com.br` | 5174 | ⚠️ Precisa configurar |

---

## 📋 ONDE CONFIGURAR OS SUBDOMÍNIOS

### ❌ NÃO configure nas variáveis de ambiente!

### ✅ Configure em 2 lugares:

#### 1. No Coolify (Interface)
- Cada aplicação tem um campo **"Domains"**
- É onde você adiciona o subdomínio

#### 2. Nas Variáveis de Ambiente
- Apenas para **referenciar** os outros serviços
- Exemplo: `VITE_API_URL=https://apicocris.casadf.com.br`

---

## 🔧 PASSO A PASSO COMPLETO

### PARTE 1: Configurar Backend API (5 min)

#### 1.1 Domínio (Já está configurado!)

Na imagem que você enviou, vejo:
```
Domains: https://apicocris.casadf.com.br
```

✅ **Já está correto!** Não precisa mudar.

---

#### 1.2 Variáveis de Ambiente do Backend

Vá em **"Environment Variables"** e configure:

```bash
# ============================================================================
# DATABASE (OBRIGATÓRIO)
# ============================================================================
# Copie do PostgreSQL que você instalou no Coolify
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa

# DIRECT_URL (OPCIONAL - use se tiver connection pooling)
# Se não tiver, deixe igual ao DATABASE_URL
DIRECT_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa

# ============================================================================
# REDIS (OPCIONAL - se estiver usando)
# ============================================================================
REDIS_URL=redis://redis-conexa:6379

# ============================================================================
# JWT (OBRIGATÓRIO)
# ============================================================================
JWT_SECRET=sua-chave-secreta-super-segura-aqui-minimo-32-caracteres
JWT_EXPIRES_IN=7d

# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
NODE_ENV=production
PORT=3000
API_URL=https://apicocris.casadf.com.br

# ============================================================================
# CORS (OBRIGATÓRIO)
# ============================================================================
# IMPORTANTE: Adicione os subdomínios do frontend e site
CORS_ORIGIN=https://appcocris.casadf.com.br,https://cocris.casadf.com.br

# ============================================================================
# GEMINI AI (OBRIGATÓRIO)
# ============================================================================
GEMINI_API_KEY=sua-gemini-api-key-aqui
GEMINI_MODEL=gemini-1.5-flash

# ============================================================================
# FEATURES (OBRIGATÓRIO)
# ============================================================================
ENABLE_AI_ASSISTANT=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=false

# ============================================================================
# LOGGING (OBRIGATÓRIO)
# ============================================================================
LOG_LEVEL=info
LOG_FORMAT=json
```

**Total**: 14 variáveis

---

#### 1.3 Como Obter DATABASE_URL

**Opção 1: Copiar do PostgreSQL no Coolify**

1. Vá em **"Databases"** no menu lateral
2. Clique no seu PostgreSQL (`postgres-conexa` ou similar)
3. Procure por **"Connection String"** ou **"Internal URL"**
4. Copie a URL completa

**Formato**:
```
postgresql://[USUARIO]:[SENHA]@[CONTAINER]:5432/[BANCO]
```

**Exemplo**:
```
postgresql://postgres:minha_senha_forte@postgres-conexa:5432/conexa
```

**Opção 2: Construir manualmente**

Se você criou o PostgreSQL com:
- Usuário: `postgres`
- Senha: `sua_senha`
- Container: `postgres-conexa`
- Banco: `conexa`

Então:
```
DATABASE_URL=postgresql://postgres:sua_senha@postgres-conexa:5432/conexa
```

---

#### 1.4 O que é DIRECT_URL?

**DIRECT_URL** é usado quando você tem **connection pooling** (PgBouncer, Supabase, etc.).

**Você precisa?**
- ❌ **NÃO**, se instalou PostgreSQL direto no Coolify
- ✅ **SIM**, se usa Supabase ou PgBouncer

**Como configurar**:
- Se **NÃO** usa pooling: `DIRECT_URL` = `DATABASE_URL` (mesma URL)
- Se **USA** pooling: `DIRECT_URL` = URL direta (porta 5432), `DATABASE_URL` = URL pooled (porta 6543)

**Recomendação**: Deixe `DIRECT_URL` igual ao `DATABASE_URL` (ou nem adicione).

---

#### 1.5 Como Obter REDIS_URL

**Se você instalou Redis no Coolify**:

1. Vá em **"Databases"** no menu lateral
2. Clique no seu Redis (`redis-conexa` ou similar)
3. Copie a **"Connection String"**

**Formato**:
```
redis://[CONTAINER]:6379
```

**Exemplo**:
```
REDIS_URL=redis://redis-conexa:6379
```

**Se NÃO instalou Redis**: Não adicione `REDIS_URL` (o sistema funciona sem).

---

#### 1.6 Redeploy do Backend

Após configurar as variáveis:

1. Clique em **"Deploy"** (botão verde no canto superior direito)
2. Aguarde o build (3-5 minutos)
3. Verifique se o status fica **"Running"** (verde)

---

### PARTE 2: Configurar Frontend Web (10 min)

#### 2.1 Criar Aplicação no Coolify

1. Vá em **"Projects"** → Selecione seu projeto
2. Clique em **"+ Add Resource"** → **"Application"**
3. Selecione **"GitHub"**
4. Repositório: `vml-arquivos/conexa-v3.0`
5. Branch: `main`
6. Name: `conexa-v3-web`
7. Clique em **"Continue"**

---

#### 2.2 Configurar Build

Na aba **"Configuration"** → **"General"**:

**Build Pack**: `Dockerfile`

**Base Directory**: `/apps/web`

**Dockerfile Location**: `/Dockerfile` (se tiver Dockerfile na pasta `apps/web`)

**OU** se não tiver Dockerfile:

**Build Pack**: `nixpacks`  
**Build Command**:
```bash
cd /apps/web && pnpm install && pnpm build
```

**Start Command**:
```bash
cd /apps/web && pnpm preview --host 0.0.0.0 --port 5173
```

**Port**: `5173`

---

#### 2.3 Configurar Domínio

Na aba **"Configuration"** → **"General"** → **"Domains"**:

1. Clique em **"Generate Domain"** (ou adicione manualmente)
2. Digite: `appcocris.casadf.com.br`
3. Clique em **"Save"**

**IMPORTANTE**: Certifique-se de que o DNS está configurado!

---

#### 2.4 Configurar DNS (Se ainda não configurou)

No seu provedor DNS (Cloudflare, GoDaddy, etc.):

**Adicione registro A**:
- Type: `A`
- Name: `app`
- Value: `[IP da VPS]`
- TTL: `3600`

**Aguarde propagação** (15-30 minutos)

**Teste**:
```bash
nslookup appcocris.casadf.com.br
```

Deve retornar o IP da VPS.

---

#### 2.5 Variáveis de Ambiente do Frontend

Na aba **"Environment Variables"**:

```bash
# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
VITE_API_URL=https://apicocris.casadf.com.br

# ============================================================================
# APP CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

**Total**: 3 variáveis

---

#### 2.6 Deploy do Frontend

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Verifique se o status fica **"Running"** (verde)

---

#### 2.7 Configurar SSL

O Coolify vai gerar SSL automaticamente via Let's Encrypt.

**Aguarde 1-5 minutos** após o deploy.

**Teste**:
```bash
curl https://appcocris.casadf.com.br
```

Deve retornar HTML da página de login.

---

### PARTE 3: Configurar Site Institucional (10 min)

#### 3.1 Criar Aplicação no Coolify

1. Vá em **"Projects"** → Selecione seu projeto
2. Clique em **"+ Add Resource"** → **"Application"**
3. Selecione **"GitHub"**
4. Repositório: `vml-arquivos/conexa-v3.0`
5. Branch: `main`
6. Name: `conexa-v3-site`
7. Clique em **"Continue"**

---

#### 3.2 Configurar Build

Na aba **"Configuration"** → **"General"**:

**Build Pack**: `Dockerfile`

**Base Directory**: `/apps/site`

**Dockerfile Location**: `/Dockerfile` (se tiver Dockerfile na pasta `apps/site`)

**OU** se não tiver Dockerfile:

**Build Pack**: `nixpacks`  
**Build Command**:
```bash
cd /apps/site && pnpm install && pnpm build
```

**Start Command**:
```bash
cd /apps/site && node dist/index.js
```

**Port**: `5174`

---

#### 3.3 Configurar Domínio

Na aba **"Configuration"** → **"General"** → **"Domains"**:

1. Digite: `site.cocris.casadf.com.br`
2. Clique em **"Save"**

---

#### 3.4 Configurar DNS

No seu provedor DNS:

**Adicione registro A**:
- Type: `A`
- Name: `site`
- Value: `[IP da VPS]`
- TTL: `3600`

**Aguarde propagação** (15-30 minutos)

---

#### 3.5 Variáveis de Ambiente do Site

Na aba **"Environment Variables"**:

```bash
# ============================================================================
# DATABASE (OBRIGATÓRIO)
# ============================================================================
# Mesma do backend!
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa

# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
API_URL=https://apicocris.casadf.com.br
NODE_ENV=production
PORT=5174
```

**Total**: 4 variáveis

---

#### 3.6 Deploy do Site

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Verifique se o status fica **"Running"** (verde)

---

### PARTE 4: Executar Migrations (5 min)

**Após o backend estar rodando**:

1. Vá na aplicação **Backend API** no Coolify
2. Clique em **"Terminal"** (ou **"Console"**)
3. Execute:

```bash
cd /app
npx prisma migrate deploy
```

**Aguarde**:
```
✅ Migrations applied successfully
```

---

### PARTE 5: Criar Usuários (5 min)

#### 5.1 Criar Admin

No terminal do backend:

```bash
cd /app
node scripts/create-admin.js
```

**Credenciais**:
- Email: `admin@conexa.com`
- Senha: `Admin@123`

---

#### 5.2 Criar Usuários de Teste

No terminal do backend:

```bash
cd /app
node scripts/seed-test-users.js
```

**Resultado**: 13 usuários criados

---

### PARTE 6: Testar Sistema (5 min)

#### 6.1 Teste Health Check

```bash
curl https://apicocris.casadf.com.br/health
```

**Deve retornar**:
```json
{"status":"ok"}
```

---

#### 6.2 Teste Login

1. Acesse: `https://appcocris.casadf.com.br`
2. Login: `admin@conexa.com`
3. Senha: `Admin@123`
4. Deve entrar no dashboard

---

#### 6.3 Teste IA Assistiva

1. No dashboard, vá em **"Planejamentos"**
2. Clique em **"Gerar com IA"**
3. Deve aparecer sugestões (Gemini funcionando!)

---

#### 6.4 Teste Site

Acesse: `https://site.cocris.casadf.com.br`

Deve aparecer o site institucional.

---

## ✅ CHECKLIST FINAL

### Configuração DNS

- [ ] Registro A para `appcocris.casadf.com.br` → IP da VPS
- [ ] Registro A para `site.cocris.casadf.com.br` → IP da VPS
- [ ] DNS propagado (teste com `nslookup`)

### Backend API

- [ ] Domínio: `apicocris.casadf.com.br` (já configurado)
- [ ] 14 variáveis de ambiente configuradas
- [ ] `DATABASE_URL` copiada do PostgreSQL
- [ ] `REDIS_URL` copiada do Redis (opcional)
- [ ] `CORS_ORIGIN` com os 2 subdomínios (app e site)
- [ ] `GEMINI_API_KEY` configurada
- [ ] Deploy realizado
- [ ] Status: **Running** (verde)
- [ ] Migrations executadas
- [ ] Admin criado
- [ ] Usuários de teste criados

### Frontend Web

- [ ] Aplicação criada no Coolify
- [ ] Domínio: `appcocris.casadf.com.br`
- [ ] 3 variáveis de ambiente configuradas
- [ ] `VITE_API_URL=https://apicocris.casadf.com.br`
- [ ] Deploy realizado
- [ ] Status: **Running** (verde)
- [ ] SSL ativo (cadeado verde)

### Site Institucional

- [ ] Aplicação criada no Coolify
- [ ] Domínio: `site.cocris.casadf.com.br`
- [ ] 4 variáveis de ambiente configuradas
- [ ] Deploy realizado
- [ ] Status: **Running** (verde)
- [ ] SSL ativo (cadeado verde)

### Testes

- [ ] Health check: `https://apicocris.casadf.com.br/health` → `{"status":"ok"}`
- [ ] Frontend: `https://appcocris.casadf.com.br` → Tela de login
- [ ] Login funciona: `admin@conexa.com` / `Admin@123`
- [ ] Dashboard carrega
- [ ] IA funciona (teste "Gerar com IA")
- [ ] Site: `https://site.cocris.casadf.com.br` → Landing page

---

## 📝 RESUMO DAS VARIÁVEIS

### Backend API (14 variáveis)

```bash
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa
DIRECT_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa
REDIS_URL=redis://redis-conexa:6379
JWT_SECRET=sua-chave-secreta-super-segura-aqui-minimo-32-caracteres
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
API_URL=https://apicocris.casadf.com.br
CORS_ORIGIN=https://appcocris.casadf.com.br,https://cocris.casadf.com.br
GEMINI_API_KEY=sua-gemini-api-key-aqui
GEMINI_MODEL=gemini-1.5-flash
ENABLE_AI_ASSISTANT=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=false
LOG_LEVEL=info
LOG_FORMAT=json
```

### Frontend Web (3 variáveis)

```bash
VITE_API_URL=https://apicocris.casadf.com.br
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

### Site Institucional (4 variáveis)

```bash
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa
API_URL=https://apicocris.casadf.com.br
NODE_ENV=production
PORT=5174
```

---

## 💡 DICAS IMPORTANTES

### 1. DATABASE_URL vs DIRECT_URL

- **DATABASE_URL**: URL de conexão principal
- **DIRECT_URL**: URL direta (sem pooling)

**Se você NÃO usa connection pooling** (PgBouncer, Supabase):
- Deixe `DIRECT_URL` igual ao `DATABASE_URL`
- OU nem adicione `DIRECT_URL`

**Se você USA connection pooling**:
- `DATABASE_URL`: URL pooled (porta 6543)
- `DIRECT_URL`: URL direta (porta 5432)

### 2. Nome do Container PostgreSQL

O nome do container PostgreSQL no Coolify pode ser:
- `postgres-conexa`
- `conexa-postgres`
- `postgres`
- Ou outro nome que você definiu

**Como descobrir**:
1. Vá em "Databases" no Coolify
2. Clique no PostgreSQL
3. Veja o campo "Name" ou "Container Name"

### 3. CORS_ORIGIN

**MUITO IMPORTANTE**: Adicione os 2 subdomínios:

```bash
CORS_ORIGIN=https://appcocris.casadf.com.br,https://cocris.casadf.com.br
```

**Sem espaços após a vírgula!**

Se esquecer, o frontend não conseguirá se comunicar com a API (erro CORS).

### 4. SSL Automático

O Coolify gera SSL automaticamente via Let's Encrypt.

**Requisitos**:
- DNS deve estar propagado
- Porta 80 e 443 abertas no firewall
- Domínio configurado no Coolify

**Tempo**: 1-5 minutos após o deploy

### 5. Redeploy Após Mudar Variáveis

**IMPORTANTE**: Sempre que mudar variáveis de ambiente, faça redeploy:

1. Clique em "Deploy" novamente
2. Aguarde o rebuild
3. Verifique se está "Running"

---

## 🔧 TROUBLESHOOTING

### Problema: DNS não resolve

**Solução**:
1. Verifique se o registro A foi salvo
2. Aguarde mais tempo (até 48h)
3. Limpe cache DNS: `ipconfig /flushdns` (Windows)
4. Teste com: `nslookup appcocris.casadf.com.br`

### Problema: SSL não gera

**Solução**:
1. Verifique se DNS está propagado
2. Verifique se porta 80 e 443 estão abertas
3. Tente gerar manualmente no Coolify
4. Veja logs do Coolify

### Problema: CORS error

**Solução**:
1. Verifique `CORS_ORIGIN` no backend
2. Deve incluir `https://appcocris.casadf.com.br`
3. Sem espaços após vírgula
4. Redeploy do backend

### Problema: DATABASE_URL inválida

**Solução**:
1. Verifique nome do container PostgreSQL
2. Verifique senha
3. Teste conexão manualmente no terminal do backend:
   ```bash
   psql postgresql://postgres:senha@postgres-conexa:5432/conexa
   ```

### Problema: IA não funciona

**Solução**:
1. Verifique `GEMINI_API_KEY`
2. Verifique `ENABLE_AI_ASSISTANT=true`
3. Teste API Key em: https://makersuite.google.com/app/apikey
4. Veja logs do backend

---

## 🎯 RESULTADO FINAL

Após seguir este guia:

✅ **3 aplicações rodando**:
- Backend API: `https://apicocris.casadf.com.br`
- Frontend Web: `https://appcocris.casadf.com.br`
- Site: `https://site.cocris.casadf.com.br`

✅ **PostgreSQL e Redis conectados**

✅ **SSL ativo em todos** (cadeado verde)

✅ **Sistema 100% funcional**

✅ **IA Assistiva ativa** (Gemini)

✅ **13 usuários de teste criados**

**Tempo total**: 40-50 minutos

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0
