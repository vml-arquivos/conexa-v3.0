# 🔐 Variáveis de Ambiente - Deploy Conexa V3.0

**Data**: 19 de Fevereiro de 2026  
**Status**: ✅ PRONTO PARA DEPLOY  
**IA**: Gemini API (Google)

---

## 📋 Visão Geral

Este documento contém **TODAS as variáveis de ambiente** necessárias para o deploy do Conexa V3.0 no Coolify.

**3 Serviços**:
1. **Backend API** (NestJS) - 15 variáveis obrigatórias
2. **Frontend Web** (React) - 3 variáveis obrigatórias
3. **Site Institucional** (Full-stack) - 4 variáveis obrigatórias

---

## 🚀 BACKEND API (NestJS)

### Variáveis OBRIGATÓRIAS (15)

Copie e cole no Coolify (aba "Environment Variables"):

```bash
# ============================================================================
# DATABASE (OBRIGATÓRIO)
# ============================================================================
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]

# ============================================================================
# JWT (OBRIGATÓRIO)
# ============================================================================
JWT_SECRET=[CONFIGURE_NO_AMBIENTE]
JWT_EXPIRES_IN=7d

# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
NODE_ENV=production
PORT=3000
API_URL=https://api.conexa.seu-dominio.com

# ============================================================================
# CORS (OBRIGATÓRIO)
# ============================================================================
CORS_ORIGIN=https://app.conexa.seu-dominio.com,https://conexa.seu-dominio.com

# ============================================================================
# GEMINI AI - IA ASSISTIVA (OBRIGATÓRIO)
# ============================================================================
# API Key do Google Gemini
# Obtenha em: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=sua-gemini-api-key-aqui

# Modelo a ser usado (recomendado: gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash

# ============================================================================
# FEATURES FLAGS (OBRIGATÓRIO)
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

### Como Obter Cada Variável

#### 1. DATABASE_URL

**Onde obter**: No Coolify, após criar o PostgreSQL

**Formato**:
```
postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
```

**Exemplo**:
```
postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
```

**Passo a passo**:
1. No Coolify, vá em "Databases"
2. Clique no banco `conexa-v3-db`
3. Copie a "Connection String"
4. Cole aqui

---

#### 2. JWT_SECRET

**O que é**: Chave secreta para assinar tokens de autenticação

**Como gerar** (no seu computador):
```bash
openssl rand -base64 32
```

**Exemplo de saída**:
```
Kx9mN2vR5tY8wA1bC4dE6fG7hJ9kL0mN3pQ5rS8tU1vW4xY7zA0bC3dE6fG9hJ2k
```

**Requisitos**:
- Mínimo 32 caracteres
- Use letras, números e símbolos
- Mantenha em segredo
- Nunca commite no Git

---

#### 3. JWT_EXPIRES_IN

**O que é**: Tempo de expiração do token

**Valores sugeridos**:
- `7d` - 7 dias (recomendado para produção)
- `1d` - 1 dia (mais seguro)
- `30d` - 30 dias (menos seguro, mais conveniente)

**Use**: `7d`

---

#### 4. NODE_ENV

**O que é**: Ambiente de execução

**Valor**: `production`

**Não mude!**

---

#### 5. PORT

**O que é**: Porta da API

**Valor**: `3000`

**Não mude!** O Coolify espera porta 3000.

---

#### 6. API_URL

**O que é**: URL pública da API

**Formato**: `https://api.conexa.seu-dominio.com`

**Substitua**:
- `seu-dominio.com` pelo seu domínio real

**Exemplos**:
- `https://api.conexa.com.br`
- `https://api.conexa.org`
- `https://api-conexa.meudominio.com`

---

#### 7. CORS_ORIGIN

**O que é**: Domínios permitidos para fazer requisições à API

**Formato**: URLs separadas por vírgula (sem espaços)

**Valor**:
```
https://app.conexa.seu-dominio.com,https://conexa.seu-dominio.com
```

**Substitua**:
- `seu-dominio.com` pelo seu domínio real

**Importante**:
- Use HTTPS (não HTTP)
- Sem espaços após a vírgula
- Inclua frontend e site

---

#### 8. GEMINI_API_KEY ⭐

**O que é**: Chave de API do Google Gemini para IA Assistiva

**Como obter**:

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Selecione um projeto (ou crie um novo)
5. Copie a API Key

**Formato**:
```
AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Funcionalidades que usam Gemini**:
- ✅ Análise de diários de bordo
- ✅ Geração de planejamentos pedagógicos
- ✅ Sugestões de atividades baseadas em BNCC
- ✅ Geração de diagnósticos
- ✅ Geração de relatórios RDIC (Relatório de Desenvolvimento Individual da Criança)
- ✅ Geração de relatórios RIA (Relatório de Informações de Acompanhamento)
- ✅ Identificação de padrões de desenvolvimento
- ✅ Sugestões de intervenções pedagógicas
- ✅ Análise de desempenho de turmas

**Custo**:
- Gemini 1.5 Flash: **GRATUITO** até 15 requisições/minuto
- Suficiente para uso normal do sistema

**Importante**:
- Mantenha em segredo
- Não compartilhe
- Não commite no Git
- Configure limites de uso no Google Cloud Console

---

#### 9. GEMINI_MODEL

**O que é**: Modelo de IA a ser usado

**Valores disponíveis**:
- `gemini-1.5-flash` - **Recomendado** (rápido, gratuito, eficiente)
- `gemini-1.5-pro` - Mais avançado (pago)
- `gemini-1.0-pro` - Versão anterior (gratuito)

**Use**: `gemini-1.5-flash`

**Por quê?**:
- ✅ Gratuito até 15 req/min
- ✅ Rápido (< 2 segundos)
- ✅ Suficiente para todas as funcionalidades
- ✅ Suporta até 1 milhão de tokens

---

#### 10-12. FEATURES FLAGS

**O que são**: Habilitar/desabilitar funcionalidades

**Valores**:
```bash
ENABLE_AI_ASSISTANT=true        # Habilitar IA Assistiva (Gemini)
ENABLE_OFFLINE_MODE=true        # Habilitar modo offline para professores
ENABLE_PUSH_NOTIFICATIONS=false # Notificações push (desabilitado por enquanto)
```

**Recomendação**:
- `ENABLE_AI_ASSISTANT=true` - **OBRIGATÓRIO** para usar Gemini
- `ENABLE_OFFLINE_MODE=true` - **RECOMENDADO** para professores
- `ENABLE_PUSH_NOTIFICATIONS=false` - Deixe desabilitado por enquanto

---

#### 13-14. LOGGING

**O que são**: Configurações de logs

**Valores**:
```bash
LOG_LEVEL=info    # Nível de log (error, warn, info, debug, verbose)
LOG_FORMAT=json   # Formato (json, pretty)
```

**Recomendação**:
- `LOG_LEVEL=info` - Balanceado (não muito verboso)
- `LOG_FORMAT=json` - Melhor para produção (estruturado)

---

### Variáveis OPCIONAIS (Não obrigatórias)

Se você quiser adicionar depois:

```bash
# AWS S3 (Upload de Arquivos)
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=conexa-uploads

# Redis (Cache)
REDIS_URL=redis://conexa-v3-redis:6379
REDIS_TTL=3600

# Email (Notificações)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
EMAIL_FROM=noreply@conexa.com

# Sentry (Monitoramento de Erros)
SENTRY_DSN=https://sua-key@sentry.io/projeto
SENTRY_ENVIRONMENT=production

# N8N (Webhooks)
N8N_WEBHOOK_URL=https://n8n.seu-dominio.com/webhook
N8N_WEBHOOK_TOKEN=sua-token
```

**Não adicione agora!** Adicione apenas quando precisar.

---

## 🎨 FRONTEND WEB (React)

### Variáveis OBRIGATÓRIAS (3)

Copie e cole no Coolify (aba "Environment Variables"):

```bash
# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
VITE_API_URL=https://api.conexa.seu-dominio.com

# ============================================================================
# APP CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

---

### Como Obter Cada Variável

#### 1. VITE_API_URL

**O que é**: URL da API backend

**Valor**: `https://api.conexa.seu-dominio.com`

**Importante**:
- Deve ser a mesma URL configurada em `API_URL` no backend
- Use HTTPS
- Sem barra no final

---

#### 2-3. VITE_APP_NAME e VITE_APP_VERSION

**O que são**: Nome e versão da aplicação

**Valores**:
```bash
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

**Não mude!** (ou mude para o nome da sua instituição)

---

## 🌐 SITE INSTITUCIONAL (Full-stack)

### Variáveis OBRIGATÓRIAS (4)

Copie e cole no Coolify (aba "Environment Variables"):

```bash
# ============================================================================
# DATABASE (OBRIGATÓRIO)
# ============================================================================
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]

# ============================================================================
# API CONFIGURATION (OBRIGATÓRIO)
# ============================================================================
API_URL=https://api.conexa.seu-dominio.com
NODE_ENV=production
PORT=5174
```

---

### Como Obter Cada Variável

#### 1. DATABASE_URL

**Mesma** do backend! Copie e cole.

#### 2. API_URL

**Mesma** do backend! Copie e cole.

#### 3. NODE_ENV

**Valor**: `production`

#### 4. PORT

**Valor**: `5174`

**Não mude!** O Coolify espera porta 5174.

---

## 📝 Resumo: Copie e Cole

### BACKEND API

```bash
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
JWT_SECRET=[CONFIGURE_NO_AMBIENTE]
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
API_URL=https://api.conexa.seu-dominio.com
CORS_ORIGIN=https://app.conexa.seu-dominio.com,https://conexa.seu-dominio.com
GEMINI_API_KEY=sua-gemini-api-key-aqui
GEMINI_MODEL=gemini-1.5-flash
ENABLE_AI_ASSISTANT=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=false
LOG_LEVEL=info
LOG_FORMAT=json
```

**Total**: 14 variáveis

---

### FRONTEND WEB

```bash
VITE_API_URL=https://api.conexa.seu-dominio.com
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
```

**Total**: 3 variáveis

---

### SITE INSTITUCIONAL

```bash
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
API_URL=https://api.conexa.seu-dominio.com
NODE_ENV=production
PORT=5174
```

**Total**: 4 variáveis

---

## ✅ Checklist de Validação

Antes de fazer deploy, verifique:

### Backend API
- [ ] `DATABASE_URL` copiada do Coolify (após criar PostgreSQL)
- [ ] `JWT_SECRET` gerada com `openssl rand -base64 32`
- [ ] `JWT_EXPIRES_IN` configurada (recomendado: `7d`)
- [ ] `API_URL` com seu domínio real
- [ ] `CORS_ORIGIN` com seus domínios reais (frontend + site)
- [ ] `GEMINI_API_KEY` obtida em https://makersuite.google.com/app/apikey
- [ ] `GEMINI_MODEL` configurada (`gemini-1.5-flash`)
- [ ] `ENABLE_AI_ASSISTANT=true`
- [ ] Todas as 14 variáveis configuradas

### Frontend Web
- [ ] `VITE_API_URL` com URL da API (mesma do backend)
- [ ] `VITE_APP_NAME` configurada
- [ ] `VITE_APP_VERSION` configurada
- [ ] Todas as 3 variáveis configuradas

### Site Institucional
- [ ] `DATABASE_URL` (mesma do backend)
- [ ] `API_URL` (mesma do backend)
- [ ] `NODE_ENV=production`
- [ ] `PORT=5174`
- [ ] Todas as 4 variáveis configuradas

---

## 🎯 Funcionalidades da IA (Gemini)

Com `ENABLE_AI_ASSISTANT=true` e `GEMINI_API_KEY` configurada, o sistema terá:

### 1. Análise de Diários de Bordo
- ✅ Lê diários de professores
- ✅ Identifica padrões de desenvolvimento
- ✅ Sugere intervenções pedagógicas
- ✅ Alerta sobre comportamentos atípicos

### 2. Geração de Planejamentos
- ✅ Cria planejamentos semanais baseados em BNCC
- ✅ Sugere atividades por faixa etária
- ✅ Alinha com Currículo DF
- ✅ Personaliza por turma

### 3. Relatórios RDIC (Desenvolvimento Individual)
- ✅ Analisa histórico da criança
- ✅ Identifica avanços e dificuldades
- ✅ Gera relatório estruturado
- ✅ Sugere próximos passos

### 4. Relatórios RIA (Informações de Acompanhamento)
- ✅ Consolida informações de múltiplas fontes
- ✅ Analisa desenvolvimento global
- ✅ Identifica necessidades especiais
- ✅ Sugere encaminhamentos

### 5. Diagnósticos de Turma
- ✅ Analisa desempenho coletivo
- ✅ Identifica padrões de grupo
- ✅ Sugere ajustes no planejamento
- ✅ Alerta sobre necessidades gerais

### 6. Sugestões de Atividades
- ✅ Baseadas em BNCC
- ✅ Personalizadas por idade
- ✅ Alinhadas com objetivos
- ✅ Práticas e aplicáveis

---

## 🔐 Segurança

### Boas Práticas

1. **Nunca commite secrets no Git**
   - Use variáveis de ambiente do Coolify
   - Não crie arquivos `.env` com valores reais

2. **Use senhas fortes**
   - `JWT_SECRET`: mínimo 32 caracteres
   - `DATABASE_URL`: senha forte no banco

3. **Proteja a Gemini API Key**
   - Configure limites de uso no Google Cloud Console
   - Monitore uso regularmente
   - Revogue se comprometida

4. **Configure CORS corretamente**
   - Apenas domínios confiáveis
   - Use HTTPS
   - Sem wildcards (`*`)

5. **Monitore logs**
   - Verifique erros regularmente
   - Configure alertas
   - Investigue anomalias

---

## 🚀 Pronto para Deploy!

Com todas as variáveis configuradas:

1. ✅ Backend terá IA Assistiva funcionando
2. ✅ Frontend se conectará à API
3. ✅ Site funcionará corretamente
4. ✅ Professores poderão usar modo offline
5. ✅ Sistema gerará relatórios automaticamente

**Pode fazer o deploy com confiança!** 🎉

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0
