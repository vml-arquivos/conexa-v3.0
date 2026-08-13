> ⚠️ **AÇÃO OBRIGATÓRIA — CREDENCIAIS**: este arquivo continha a senha real do Postgres, do Redis e o `JWT_SECRET` de produção em texto puro. Foram substituídos por placeholders, mas continuam recuperáveis no histórico do Git — rotacione-os agora no Coolify e trate os valores antigos como comprometidos.
>
> ⚠️ **AÇÃO OBRIGATÓRIA — CORS/DOMÍNIO**: os valores de `CORS_ORIGIN` abaixo ainda podem estar desatualizados (domínio antigo `cocris.casadf.com.br`). O sistema migrou para os domínios `appcocris.casadf.com.br` (frontend) e `apicocris.casadf.com.br` (API). Confirme no Coolify, na aba de variáveis de ambiente do serviço `conexa-v3-api`, que `CORS_ORIGIN` inclui `https://appcocris.casadf.com.br,https://cocris.casadf.com.br` — foi esta divergência que causava "Network Error" ao fazer login.

# Configuração Rápida Coolify

## Backend API (apicocris.casadf.com.br)

### 1. General
- **Name**: conexa-v3-api
- **Build Pack**: Dockerfile
- **Base Directory**: `/apps/api`
- **Dockerfile Location**: `/Dockerfile`

### 2. Network
- **Domains**: `https://apicocris.casadf.com.br`
- **Ports Exposes**: `3000`
- **Port Mappings**: `3000:3000`

### 3. Healthcheck
- **Path**: `/health`
- **Port**: `3000`
- **Interval**: `30`
- **Timeout**: `10`
- **Retries**: `3`

### 4. Environment Variables (14)
```
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]]@[HOST_INTERNO_COOLIFY]:5432/postgres
DIRECT_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]]@[HOST_INTERNO_COOLIFY]:5432/postgres
REDIS_URL=redis://default:[REDACTED_ROTACIONAR]@[HOST_INTERNO_COOLIFY]:6379/0
JWT_SECRET=[REDACTED_ROTACIONAR — gerar novo com openssl rand -base64 48]
JWT_EXPIRATION=7d
NODE_ENV=production
PORT=3000
APP_TIMEZONE=America/Sao_Paulo
API_URL=https://apicocris.casadf.com.br
CORS_ORIGIN=https://appcocris.casadf.com.br,https://cocris.casadf.com.br
GEMINI_API_KEY=[SUA_CHAVE_AQUI]
GEMINI_MODEL=gemini-2.0-flash-exp
ENABLE_AI_ASSISTANT=true
ENABLE_OFFLINE_MODE=true
```

### 5. Após Deploy
Execute no terminal do container:
```bash
cd /app
node scripts/seed-admin.js
```

---

## Frontend Web (appcocris.casadf.com.br)

### 1. General
- **Name**: conexa-v3-web
- **Build Pack**: nixpacks
- **Base Directory**: `/apps/web`

### 2. Network
- **Domains**: `https://appcocris.casadf.com.br`
- **Ports Exposes**: `5173`

### 3. Environment Variables (3)
```
VITE_API_URL=https://apicocris.casadf.com.br
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

---

## Site (cocris.casadf.com.br)

### 1. General
- **Name**: conexa-v3-site
- **Build Pack**: nixpacks
- **Base Directory**: `/apps/site`

### 2. Network
- **Domains**: `https://cocris.casadf.com.br`
- **Ports Exposes**: `5174`

### 3. Environment Variables (4)
```
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]]@[HOST_INTERNO_COOLIFY]:5432/postgres
API_URL=https://apicocris.casadf.com.br
NODE_ENV=production
PORT=5174
```

---

## Ordem de Deploy

1. ✅ Backend API (já feito)
2. ⏳ Criar admin (execute seed-admin.js)
3. ⏳ Frontend Web
4. ⏳ Site

## Teste Final

```bash
# API
curl https://apicocris.casadf.com.br/health

# Login
curl -X POST https://apicocris.casadf.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@conexa.com","password":"Admin@123"}'

# Frontend
curl https://appcocris.casadf.com.br

# Site
curl https://cocris.casadf.com.br
```
