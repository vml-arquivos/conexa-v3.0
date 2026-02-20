# ✅ CONFIGURAÇÃO FINAL - Conexa V3.0

**DNS Configurado**: ✅ Todos apontando para `34.26.204.248`

---

## 🌐 SEUS SUBDOMÍNIOS (TODOS USAM CONEXA3)

| Serviço | Subdomínio | IP | Porta |
|---------|------------|-----|-------|
| **Backend API** | `api.conexa3.casadf.com.br` | 34.26.204.248 | 3000 |
| **Frontend Web** | `app.conexa3.casadf.com.br` | 34.26.204.248 | 5173 |
| **Site** | `conexa3.casadf.com.br` | 34.26.204.248 | 5174 |

✅ **DNS já configurado e apontando para o IP correto!**

---

## 🔐 VARIÁVEIS DE AMBIENTE

### 🚀 BACKEND API

**Domínio no Coolify**: `api.conexa3.casadf.com.br`

**Variáveis** (14):

```bash
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa
DIRECT_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa
REDIS_URL=redis://redis-conexa:6379
JWT_SECRET=[gere com: openssl rand -base64 32]
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
API_URL=https://api.conexa3.casadf.com.br
CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br
GEMINI_API_KEY=[obtenha em: https://makersuite.google.com/app/apikey]
GEMINI_MODEL=gemini-1.5-flash
ENABLE_AI_ASSISTANT=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=false
LOG_LEVEL=info
LOG_FORMAT=json
```

---

### 🎨 FRONTEND WEB

**Domínio no Coolify**: `app.conexa3.casadf.com.br`

**Variáveis** (3):

```bash
VITE_API_URL=https://api.conexa3.casadf.com.br
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

---

### 🌐 SITE INSTITUCIONAL

**Domínio no Coolify**: `conexa3.casadf.com.br`

**Variáveis** (4):

```bash
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa
API_URL=https://api.conexa3.casadf.com.br
NODE_ENV=production
PORT=5174
```

---

## 🚀 PASSO A PASSO RÁPIDO (20 MIN)

### 1. Configure Backend (5 min)

1. Vá na aplicação **Backend API** no Coolify
2. Aba **"Environment Variables"**
3. Copie e cole as 14 variáveis acima
4. **Substitua**:
   - `SUA_SENHA` → Senha do PostgreSQL
   - `[gere com...]` → Execute `openssl rand -base64 32`
   - `[obtenha em...]` → Obtenha em https://makersuite.google.com/app/apikey
5. Clique em **"Save"**
6. Clique em **"Deploy"** (redeploy)

---

### 2. Execute Migrations (2 min)

Após o backend estar **"Running"**:

1. Clique em **"Terminal"** na aplicação Backend
2. Execute:

```bash
cd /app
npx prisma migrate deploy
```

Aguarde: `✅ Migrations applied`

---

### 3. Crie Usuário Admin (1 min)

No terminal do backend:

```bash
cd /app
node scripts/create-admin.js
```

**Credenciais**:
- Email: `admin@conexa.com`
- Senha: `Admin@123`

---

### 4. Crie Usuários de Teste (1 min)

No terminal do backend:

```bash
cd /app
node scripts/seed-test-users.js
```

**Resultado**: 13 usuários criados (5 níveis de acesso)

---

### 5. Configure Frontend (5 min)

1. Crie nova aplicação no Coolify
2. **GitHub**: `vml-arquivos/conexa-v3.0`
3. **Branch**: `main`
4. **Name**: `conexa-v3-web`
5. **Domínio**: `app.conexa3.casadf.com.br`
6. **Environment Variables**: Adicione as 3 variáveis acima
7. **Deploy**

---

### 6. Configure Site (5 min)

1. Crie nova aplicação no Coolify
2. **GitHub**: `vml-arquivos/conexa-v3.0`
3. **Branch**: `main`
4. **Name**: `conexa-v3-site`
5. **Domínio**: `conexa3.casadf.com.br`
6. **Environment Variables**: Adicione as 4 variáveis acima
7. **Deploy**

---

### 7. Teste Sistema (1 min)

```bash
# 1. Backend
curl https://api.conexa3.casadf.com.br/health
# Deve retornar: {"status":"ok"}

# 2. Frontend
curl https://app.conexa3.casadf.com.br
# Deve retornar HTML

# 3. Site
curl https://conexa3.casadf.com.br
# Deve retornar HTML
```

---

## 📋 COMO OBTER CADA VARIÁVEL

### DATABASE_URL

**Copiar do Coolify**:
1. Vá em **"Databases"**
2. Clique no seu PostgreSQL
3. Copie a **"Connection String"**

**Formato**:
```
postgresql://postgres:SUA_SENHA@postgres-conexa:5432/conexa
```

---

### REDIS_URL

**Copiar do Coolify**:
1. Vá em **"Databases"**
2. Clique no seu Redis
3. Copie a **"Connection String"**

**Formato**:
```
redis://redis-conexa:6379
```

---

### JWT_SECRET

**Gerar no terminal** (seu computador):

```bash
openssl rand -base64 32
```

**Exemplo de saída**:
```
Kx9mN2vR5tY8wA1bC4dE6fG7hJ9kL0mN3pQ5rS8tU1vW4xY7zA0bC3dE6fG9hJ2k
```

Copie e cole nas variáveis.

---

### GEMINI_API_KEY

**Obter no Google**:

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login
3. Clique em **"Create API Key"**
4. Copie a chave

**Formato**:
```
AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## ✅ CHECKLIST COMPLETO

### Backend API (`api.conexa3.casadf.com.br`)

- [ ] Domínio configurado no Coolify
- [ ] 14 variáveis de ambiente adicionadas
- [ ] `DATABASE_URL` copiada do PostgreSQL
- [ ] `REDIS_URL` copiada do Redis
- [ ] `JWT_SECRET` gerada com openssl
- [ ] `API_URL=https://api.conexa3.casadf.com.br`
- [ ] `CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br`
- [ ] `GEMINI_API_KEY` obtida no Google
- [ ] Redeploy realizado
- [ ] Status: **Running** (verde)
- [ ] Migrations executadas
- [ ] Admin criado (`admin@conexa.com`)
- [ ] Usuários de teste criados (13 usuários)
- [ ] Health check funciona: `curl https://api.conexa3.casadf.com.br/health`

### Frontend Web (`app.conexa3.casadf.com.br`)

- [ ] Aplicação criada no Coolify
- [ ] Domínio configurado: `app.conexa3.casadf.com.br`
- [ ] 3 variáveis de ambiente adicionadas
- [ ] `VITE_API_URL=https://api.conexa3.casadf.com.br`
- [ ] Deploy realizado
- [ ] Status: **Running** (verde)
- [ ] SSL ativo (cadeado verde)
- [ ] Tela de login acessível

### Site (`conexa3.casadf.com.br`)

- [ ] Aplicação criada no Coolify
- [ ] Domínio configurado: `conexa3.casadf.com.br`
- [ ] 4 variáveis de ambiente adicionadas
- [ ] `DATABASE_URL` (mesma do backend)
- [ ] `API_URL=https://api.conexa3.casadf.com.br`
- [ ] Deploy realizado
- [ ] Status: **Running** (verde)
- [ ] SSL ativo (cadeado verde)
- [ ] Site acessível

### Testes Finais

- [ ] Login funciona: `https://app.conexa3.casadf.com.br` → `admin@conexa.com` / `Admin@123`
- [ ] Dashboard carrega após login
- [ ] IA funciona: Teste "Gerar com IA" em Planejamentos
- [ ] Site institucional carrega: `https://conexa3.casadf.com.br`

---

## ⚠️ PONTOS CRÍTICOS

### 1. CORS_ORIGIN

**MUITO IMPORTANTE**: Sem espaços após a vírgula!

✅ **CORRETO**:
```bash
CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br
```

❌ **ERRADO**:
```bash
CORS_ORIGIN=https://app.conexa3.casadf.com.br, https://conexa3.casadf.com.br
```

---

### 2. Todos os Subdomínios Usam CONEXA3

✅ `api.conexa3.casadf.com.br`  
✅ `app.conexa3.casadf.com.br`  
✅ `conexa3.casadf.com.br`

❌ ~~`api.conexa.casadf.com.br`~~ (ERRADO)

---

### 3. DATABASE_URL

**Mesma URL** para:
- ✅ Backend
- ✅ Site

**NÃO precisa** para:
- ❌ Frontend

---

### 4. Redeploy Após Mudar Variáveis

**SEMPRE** que mudar variáveis de ambiente:
1. Clique em **"Deploy"** novamente
2. Aguarde rebuild
3. Verifique status **"Running"**

---

## 🎯 RESUMO FINAL

### Configuração DNS
✅ **Já está pronta!** Todos os 3 subdomínios apontam para `34.26.204.248`

### Próximos Passos
1. Configure variáveis do backend (5 min)
2. Redeploy do backend (3 min)
3. Execute migrations (2 min)
4. Crie admin e usuários (2 min)
5. Configure frontend (5 min)
6. Configure site (5 min)
7. Teste tudo (3 min)

**Tempo total**: 25 minutos

### URLs Finais
- Backend API: `https://api.conexa3.casadf.com.br`
- Frontend Web: `https://app.conexa3.casadf.com.br`
- Site: `https://conexa3.casadf.com.br`

---

## 🔧 TROUBLESHOOTING

### Problema: CORS error

**Solução**:
1. Verifique `CORS_ORIGIN` no backend
2. Deve ter os 2 subdomínios
3. Sem espaços após vírgula
4. Redeploy do backend

### Problema: Login não funciona

**Solução**:
1. Verifique se migrations foram executadas
2. Verifique se admin foi criado
3. Verifique `JWT_SECRET`
4. Veja logs do backend

### Problema: IA não funciona

**Solução**:
1. Verifique `GEMINI_API_KEY`
2. Verifique `ENABLE_AI_ASSISTANT=true`
3. Teste API Key no Google
4. Veja logs do backend

---

## 🎉 RESULTADO ESPERADO

Após seguir este guia:

✅ **3 aplicações rodando**  
✅ **SSL ativo em todas** (cadeado verde)  
✅ **Login funcionando**  
✅ **Dashboards carregando**  
✅ **IA Assistiva ativa** (Gemini)  
✅ **13 usuários de teste** prontos  
✅ **Sistema 100% funcional**  

**Tempo**: 25 minutos  
**Dificuldade**: Fácil  
**Sucesso**: Garantido! 🎉

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0
