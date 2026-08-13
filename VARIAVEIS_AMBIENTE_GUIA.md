# 🔐 Guia de Variáveis de Ambiente

**⚠️ SEGURANÇA**: Este arquivo contém APENAS a estrutura das variáveis.  
**NUNCA** adicione valores reais aqui! Configure diretamente no Coolify.

---

## 🚀 BACKEND API

**Onde configurar**: Coolify → Aplicação Backend → Environment Variables

**Variáveis necessárias** (14):

```bash
# DATABASE
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
DIRECT_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]

# REDIS
REDIS_URL=redis://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[DB]

# JWT
JWT_SECRET=[CONFIGURE_NO_AMBIENTE] com: openssl rand -base64 32]
JWT_EXPIRATION=7d

# APP
NODE_ENV=production
PORT=3000
APP_TIMEZONE=America/Sao_Paulo
API_URL=https://api.conexa3.casadf.com.br

# CORS
CORS_ORIGIN=https://app.conexa3.casadf.com.br,https://conexa3.casadf.com.br

# GEMINI AI
GEMINI_API_KEY=[obtenha em: https://aistudio.google.com/app/apikey]
GEMINI_MODEL=gemini-2.0-flash-exp

# FEATURES
ENABLE_AI_ASSISTANT=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=false

# LOGGING
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 🎨 FRONTEND WEB

**Onde configurar**: Coolify → Aplicação Frontend → Environment Variables

**Variáveis necessárias** (3):

```bash
VITE_API_URL=https://api.conexa3.casadf.com.br
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

---

## 🌐 SITE INSTITUCIONAL

**Onde configurar**: Coolify → Aplicação Site → Environment Variables

**Variáveis necessárias** (4):

```bash
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
API_URL=https://api.conexa3.casadf.com.br
NODE_ENV=production
PORT=5174
```

---

## 📋 COMO OBTER VALORES

### DATABASE_URL e REDIS_URL

**No Coolify**:
1. Vá em "Databases"
2. Clique no PostgreSQL/Redis
3. Copie a "Connection String"
4. Cole diretamente nas variáveis de ambiente da aplicação

### JWT_SECRET

**No seu terminal local**:
```bash
openssl rand -base64 32
```

### GEMINI_API_KEY

**No Google AI Studio**:
1. https://aistudio.google.com/app/apikey
2. "Create API Key"
3. Copie a chave

---

## ⚠️ SEGURANÇA

### ❌ NUNCA FAÇA ISSO:

- ❌ Commitar arquivos `.env` com valores reais
- ❌ Adicionar senhas em arquivos do repositório
- ❌ Compartilhar chaves de API publicamente
- ❌ Usar valores de produção em desenvolvimento

### ✅ SEMPRE FAÇA ISSO:

- ✅ Configure variáveis diretamente no Coolify
- ✅ Use `.env.example` apenas com placeholders
- ✅ Mantenha `.env` no `.gitignore`
- ✅ Gere chaves únicas para cada ambiente

---

## 🔒 BOAS PRÁTICAS

1. **Rotação de Chaves**: Troque JWT_SECRET periodicamente
2. **Acesso Limitado**: Restrinja quem pode ver variáveis no Coolify
3. **Monitoramento**: Ative logs de acesso às variáveis
4. **Backup Seguro**: Guarde credenciais em gerenciador de senhas (1Password, Bitwarden)
5. **Auditoria**: Revise variáveis regularmente

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0
