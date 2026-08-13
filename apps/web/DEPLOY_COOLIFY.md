# 🚀 Deploy Frontend no Coolify - Conexa V3.0

## 📋 Pré-requisitos

- ✅ Backend API deployado e funcionando em `https://apicocris.casadf.com.br`
- ✅ Banco de dados populado com seed
- ✅ Domínio configurado: `appcocris.casadf.com.br`

---

## 🔧 Passo 1: Criar Aplicação no Coolify

1. Acesse Coolify → **+ New Resource** → **Application**
2. Selecione o repositório: `vml-arquivos/conexa-v3.0`
3. Configurações:
   - **Name**: `Conexa V3 - Frontend`
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Dockerfile Location**: `apps/web/Dockerfile`
   - **Base Directory**: `apps/web`
   - **Port**: `80`

---

## 🌐 Passo 2: Configurar Domínio

1. Na aplicação criada → **Domains**
2. Adicionar domínio: `appcocris.casadf.com.br`
3. Habilitar **HTTPS** (Let's Encrypt)

---

## 🔐 Passo 3: Configurar Variáveis de Ambiente

Na aba **Environment Variables**, adicionar:

```bash
# API Backend
VITE_API_URL=https://apicocris.casadf.com.br

# App Configuration
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
VITE_APP_ENV=production

# Features
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_DEBUG=false

# UI/UX
VITE_DEFAULT_THEME=dark
VITE_DEFAULT_LANGUAGE=pt-BR

# Storage
VITE_STORAGE_PREFIX=conexa_

# API Timeout
VITE_API_TIMEOUT=30000
```

**⚠️ IMPORTANTE**: Marcar todas as variáveis como **Build Time** (não Runtime), pois Vite precisa delas durante o build.

---

## 🚀 Passo 4: Deploy

1. Clique em **Deploy**
2. Aguardar build completar (~3-5 minutos)
3. Verificar logs para garantir sucesso

---

## ✅ Passo 5: Testar Acesso

1. Acesse: `https://appcocris.casadf.com.br`
2. Tela de login deve aparecer
3. Testar login com:
   - **Email**: `developer@conexa.com`
   - **Senha**: `Teste@123`

---

## 🔍 Verificações

### Build bem-sucedido:
```
✓ building client + server bundles...
✓ built in XXXms
```

### Container saudável:
```bash
docker ps
# STATUS deve mostrar: Up X seconds (healthy)
```

### Logs do Nginx:
```bash
docker logs [CONTAINER_ID]
# Deve mostrar: nginx started successfully
```

---

## 🐛 Troubleshooting

### Erro: "API URL not defined"
- Verificar se `VITE_API_URL` está configurada
- Verificar se variável está marcada como **Build Time**
- Fazer redeploy

### Erro 404 em rotas
- Verificar se `nginx.conf` está copiado corretamente
- Deve ter `try_files $uri $uri/ /index.html;`

### Erro de CORS
- Verificar se backend permite origem `appcocris.casadf.com.br`
- Verificar configuração de CORS no NestJS

---

## 📊 Logins Disponíveis

Após deploy, testar com estes usuários:

| Email | Senha | Nível |
|-------|-------|-------|
| developer@conexa.com | Teste@123 | Developer |
| admin@cocris.org.br | Teste@123 | Admin Mantenedora |
| pedagogico@cocris.org.br | Teste@123 | Staff Central |
| coordenador@cepi.com.br | Teste@123 | Coordenador |
| nonata@cepi.com.br | Teste@123 | Professora |
| elisangela@cepi.com.br | Teste@123 | Professora |
| jessica@cepi.com.br | Teste@123 | Professora |

---

## 🎯 Próximos Passos

Após frontend funcionando:

1. ✅ Testar todos os dashboards por nível de acesso
2. ✅ Verificar listagem de alunos (170 alunos reais)
3. ✅ Verificar listagem de turmas (9 turmas)
4. ✅ Testar funcionalidades de CRUD
5. ✅ Deploy do site institucional (apps/site)

---

**Última atualização**: 2026-02-20
