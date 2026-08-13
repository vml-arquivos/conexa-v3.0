# 🔐 Variáveis de Ambiente - Configuração Final

**Seus subdomínios**:
- Backend API: `api.conexa.casadf.com.br`
- Frontend Web: `app.conexa3.casadf.com.br`
- Site: `conexa3.casadf.com.br`

---

## 🚀 BACKEND API

**Domínio no Coolify**: `api.conexa.casadf.com.br`

**Variáveis de Ambiente** (14 variáveis):

```bash
# ============================================================================
# DATABASE (OBRIGATÓRIO)
# ============================================================================
# Copie do PostgreSQL no Coolify
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa

# DIRECT_URL (OPCIONAL - deixe igual ao DATABASE_URL se não usar pooling)
DIRECT_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa

# ============================================================================
# REDIS (OPCIONAL)
# ============================================================================
# Copie do Redis no Coolify
REDIS_URL=redis://redis-conexa:6379

# ============================================================================
# JWT (OBRIGATÓRIO)
# ============================================================================
# Gere com: openssl rand -base64 32
JWT_SECRET=sua-chave-secreta-super-segura-aqui-minimo-32-caracteres
JWT_EXPIRES_IN=7d

# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
NODE_ENV=production
PORT=3000
API_URL=https://api.conexa.casadf.com.br

# ============================================================================
# CORS (OBRIGATÓRIO)
# ============================================================================
# IMPORTANTE: Adicione os 2 subdomínios do frontend e site
CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br

# ============================================================================
# GEMINI AI (OBRIGATÓRIO)
# ============================================================================
# Obtenha em: https://makersuite.google.com/app/apikey
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

---

## 🎨 FRONTEND WEB

**Domínio no Coolify**: `app.conexa3.casadf.com.br`

**Variáveis de Ambiente** (3 variáveis):

```bash
# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
VITE_API_URL=https://api.conexa.casadf.com.br

# ============================================================================
# APP CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

---

## 🌐 SITE INSTITUCIONAL

**Domínio no Coolify**: `conexa3.casadf.com.br`

**Variáveis de Ambiente** (4 variáveis):

```bash
# ============================================================================
# DATABASE (OBRIGATÓRIO)
# ============================================================================
# Mesma do backend!
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa

# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
API_URL=https://api.conexa.casadf.com.br
NODE_ENV=production
PORT=5174
```

---

## 📋 CHECKLIST DE CONFIGURAÇÃO

### 1. Backend API (`api.conexa.casadf.com.br`)

- [ ] Domínio configurado no Coolify: `api.conexa.casadf.com.br`
- [ ] `DATABASE_URL` copiada do PostgreSQL
- [ ] `DIRECT_URL` configurada (mesma do DATABASE_URL)
- [ ] `REDIS_URL` copiada do Redis
- [ ] `JWT_SECRET` gerada com `openssl rand -base64 32`
- [ ] `API_URL=https://api.conexa.casadf.com.br`
- [ ] `CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br`
- [ ] `GEMINI_API_KEY` obtida em https://makersuite.google.com/app/apikey
- [ ] Todas as 14 variáveis configuradas
- [ ] Redeploy realizado

### 2. Frontend Web (`app.conexa3.casadf.com.br`)

- [ ] DNS configurado: `app` → IP da VPS
- [ ] Domínio configurado no Coolify: `app.conexa3.casadf.com.br`
- [ ] `VITE_API_URL=https://api.conexa.casadf.com.br`
- [ ] `VITE_APP_NAME=Conexa V3.0`
- [ ] `VITE_APP_VERSION=3.0.0`
- [ ] Todas as 3 variáveis configuradas
- [ ] Deploy realizado

### 3. Site (`conexa3.casadf.com.br`)

- [ ] DNS configurado: `conexa3` → IP da VPS (ou `@` se for raiz)
- [ ] Domínio configurado no Coolify: `conexa3.casadf.com.br`
- [ ] `DATABASE_URL` (mesma do backend)
- [ ] `API_URL=https://api.conexa.casadf.com.br`
- [ ] `NODE_ENV=production`
- [ ] `PORT=5174`
- [ ] Todas as 4 variáveis configuradas
- [ ] Deploy realizado

---

## 🔍 COMO OBTER CADA VARIÁVEL

### DATABASE_URL

**Método 1: Copiar do Coolify (Recomendado)**

1. Vá em **"Databases"** no Coolify
2. Clique no seu PostgreSQL
3. Procure por **"Connection String"** ou **"Internal URL"**
4. Copie a URL completa

**Método 2: Construir Manualmente**

Formato:
```
postgresql://[USUARIO]:[SENHA]@[CONTAINER]:5432/[BANCO]
```

Exemplo:
```
postgresql://postgres:minha_senha@postgres-conexa:5432/conexa
```

**Onde encontrar**:
- **USUARIO**: Veja no Coolify (geralmente `postgres`)
- **SENHA**: A senha que você definiu
- **CONTAINER**: Nome do container (veja no Coolify, ex: `postgres-conexa`)
- **BANCO**: Nome do banco (ex: `conexa`)

---

### REDIS_URL

**Copiar do Coolify**:

1. Vá em **"Databases"** no Coolify
2. Clique no seu Redis
3. Copie a **"Connection String"**

Formato:
```
redis://[CONTAINER]:6379
```

Exemplo:
```
redis://redis-conexa:6379
```

---

### JWT_SECRET

**Gerar no terminal**:

```bash
openssl rand -base64 32
```

**Exemplo de saída**:
```
Kx9mN2vR5tY8wA1bC4dE6fG7hJ9kL0mN3pQ5rS8tU1vW4xY7zA0bC3dE6fG9hJ2k
```

**Copie e cole** nas variáveis de ambiente.

---

### GEMINI_API_KEY

**Obter no Google**:

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Selecione um projeto (ou crie um novo)
5. Copie a API Key

Formato:
```
AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. CORS_ORIGIN

**MUITO IMPORTANTE**: Adicione os 2 subdomínios separados por vírgula **SEM ESPAÇOS**:

```bash
CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br
```

**❌ ERRADO**:
```bash
CORS_ORIGIN=https://app.conexa3.casadf.com.br, https://conexa3.casadf.com.br
```
(Tem espaço após a vírgula)

**❌ ERRADO**:
```bash
CORS_ORIGIN=https://app.conexa3.casadf.com.br
```
(Falta o site)

---

### 2. API_URL vs VITE_API_URL

**Backend (`API_URL`)**:
```bash
API_URL=https://api.conexa.casadf.com.br
```
(URL do próprio backend)

**Frontend (`VITE_API_URL`)**:
```bash
VITE_API_URL=https://api.conexa.casadf.com.br
```
(URL do backend que o frontend vai chamar)

**Site (`API_URL`)**:
```bash
API_URL=https://api.conexa.casadf.com.br
```
(URL do backend que o site vai chamar)

---

### 3. DATABASE_URL

**Mesma URL** para:
- ✅ Backend
- ✅ Site

**NÃO precisa** para:
- ❌ Frontend (não acessa banco diretamente)

---

### 4. DIRECT_URL

**Você precisa?**
- ❌ **NÃO**, se instalou PostgreSQL direto no Coolify
- ✅ **SIM**, se usa Supabase ou PgBouncer

**Como configurar**:
- Se **NÃO** usa pooling: Deixe igual ao `DATABASE_URL` (ou nem adicione)
- Se **USA** pooling: Configure URL direta (porta 5432)

---

## 🚀 ORDEM DE CONFIGURAÇÃO

### 1. Configure Backend (10 min)

1. Vá na aplicação **Backend API** no Coolify
2. Clique em **"Environment Variables"**
3. Adicione as 14 variáveis
4. Clique em **"Save"**
5. Clique em **"Deploy"** (redeploy)
6. Aguarde status **"Running"** (verde)

### 2. Execute Migrations (2 min)

No terminal do backend:
```bash
cd /app
npx prisma migrate deploy
```

### 3. Crie Admin (1 min)

No terminal do backend:
```bash
cd /app
node scripts/create-admin.js
```

Login: `admin@conexa.com` / `Admin@123`

### 4. Crie Usuários de Teste (1 min)

No terminal do backend:
```bash
cd /app
node scripts/seed-test-users.js
```

### 5. Configure Frontend (5 min)

1. Crie aplicação no Coolify
2. Domínio: `app.conexa3.casadf.com.br`
3. Adicione as 3 variáveis
4. Deploy

### 6. Configure Site (5 min)

1. Crie aplicação no Coolify
2. Domínio: `conexa3.casadf.com.br`
3. Adicione as 4 variáveis
4. Deploy

### 7. Teste Sistema (5 min)

1. Health check: `curl https://api.conexa.casadf.com.br/health`
2. Login: `https://app.conexa3.casadf.com.br` → `admin@conexa.com`
3. Site: `https://conexa3.casadf.com.br`

---

## ✅ TESTE FINAL

Após configurar tudo:

```bash
# 1. Teste Backend
curl https://api.conexa.casadf.com.br/health
# Deve retornar: {"status":"ok"}

# 2. Teste Frontend
curl https://app.conexa3.casadf.com.br
# Deve retornar HTML da página de login

# 3. Teste Site
curl https://conexa3.casadf.com.br
# Deve retornar HTML do site institucional
```

---

## 🎯 RESUMO RÁPIDO

### Subdomínios:
- Backend: `api.conexa.casadf.com.br`
- Frontend: `app.conexa3.casadf.com.br`
- Site: `conexa3.casadf.com.br`

### Variáveis Críticas:

**Backend**:
- `DATABASE_URL` (copie do PostgreSQL)
- `CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br`
- `GEMINI_API_KEY` (obtenha no Google)

**Frontend**:
- `VITE_API_URL=https://api.conexa.casadf.com.br`

**Site**:
- `DATABASE_URL` (mesma do backend)
- `API_URL=https://api.conexa.casadf.com.br`

---

**Tempo total**: 30-40 minutos  
**Dificuldade**: Fácil  
**Sucesso**: Garantido! 🎉

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0
