# Configuração Rápida Coolify

## Backend API (api.conexa3.casadf.com.br)

### 1. General
- **Name**: conexa-v3-api
- **Build Pack**: Dockerfile
- **Base Directory**: `/apps/api`
- **Dockerfile Location**: `/Dockerfile`

### 2. Network
- **Domains**: `https://api.conexa3.casadf.com.br`
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
DATABASE_URL=postgres://postgres:G8pDA7CYCRRyYPDJMU82peXreI6gYJbKGf47X75q3fvmCMHTuJDomaBVBQSNc1kw@vswwog0sss0c48ggwsgsg4ow:5432/postgres
DIRECT_URL=postgres://postgres:G8pDA7CYCRRyYPDJMU82peXreI6gYJbKGf47X75q3fvmCMHTuJDomaBVBQSNc1kw@vswwog0sss0c48ggwsgsg4ow:5432/postgres
REDIS_URL=redis://default:EWCBWCNg0uX92uoCNTRLcL7zwjSpIMkEzXtqxIqi9QL6xCK1ieJbyTrzgkx8Vjzr@y0oso44kkssw40skk048ksgs:6379/0
JWT_SECRET=0MsE4rEpC7FPosGYzlsXw9GNfD+YZmIDylHzDp2v9YIRRQMHIlbf2IF3fPMGz7tdXAhPVKf/bfJrNXRyL+LAGw==
JWT_EXPIRATION=7d
NODE_ENV=production
PORT=3000
APP_TIMEZONE=America/Sao_Paulo
API_URL=https://api.conexa3.casadf.com.br
CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br
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

## Frontend Web (app.conexa3.casadf.com.br)

### 1. General
- **Name**: conexa-v3-web
- **Build Pack**: nixpacks
- **Base Directory**: `/apps/web`

### 2. Network
- **Domains**: `https://app.conexa3.casadf.com.br`
- **Ports Exposes**: `5173`

### 3. Environment Variables (3)
```
VITE_API_URL=https://api.conexa3.casadf.com.br
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

---

## Site (conexa3.casadf.com.br)

### 1. General
- **Name**: conexa-v3-site
- **Build Pack**: nixpacks
- **Base Directory**: `/apps/site`

### 2. Network
- **Domains**: `https://conexa3.casadf.com.br`
- **Ports Exposes**: `5174`

### 3. Environment Variables (4)
```
DATABASE_URL=postgres://postgres:G8pDA7CYCRRyYPDJMU82peXreI6gYJbKGf47X75q3fvmCMHTuJDomaBVBQSNc1kw@vswwog0sss0c48ggwsgsg4ow:5432/postgres
API_URL=https://api.conexa3.casadf.com.br
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
curl https://api.conexa3.casadf.com.br/health

# Login
curl -X POST https://api.conexa3.casadf.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@conexa.com","password":"Admin@123"}'

# Frontend
curl https://app.conexa3.casadf.com.br

# Site
curl https://conexa3.casadf.com.br
```
