# 🚀 Guia Completo de Deploy - Conexa V3.0 no Coolify

**Data**: 19 de Fevereiro de 2026  
**Versão**: 3.0.0  
**Tempo estimado**: 30-45 minutos

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Acesso ao painel do Coolify (URL e credenciais)
- ✅ VPS configurada e conectada ao Coolify
- ✅ Repositório GitHub: `vml-arquivos/conexa-v3.0`
- ✅ Credenciais do GitHub configuradas no Coolify
- ✅ Domínio (opcional, mas recomendado)

---

## 🎯 Visão Geral do Deploy

Vamos fazer o deploy de **3 aplicações**:

1. **Backend API** (NestJS) - Porta 3000
2. **Frontend Web** (React + Vite) - Porta 5173
3. **Site Institucional** (Full-stack) - Porta 5174

E **1 banco de dados**:

4. **PostgreSQL** - Porta 5432

---

## 📦 PARTE 1: Criar Banco de Dados PostgreSQL

### Passo 1.1: Acessar Coolify

1. Abra seu navegador
2. Acesse o painel do Coolify: `https://seu-coolify.com`
3. Faça login com suas credenciais

### Passo 1.2: Criar Novo Banco de Dados

1. No menu lateral, clique em **"Databases"**
2. Clique no botão **"+ Add Database"**
3. Selecione **"PostgreSQL"**

### Passo 1.3: Configurar PostgreSQL

Preencha os campos:

```
Name: conexa-v3-db
PostgreSQL Version: 16 (ou mais recente)
Database Name: conexa
Username: conexa_user
Password: [GERE UMA SENHA FORTE - ANOTE!]
```

**⚠️ IMPORTANTE**: Anote a senha gerada! Você vai precisar dela.

### Passo 1.4: Configurações Avançadas

Clique em **"Advanced Settings"** e configure:

```
Port: 5432
Volume Path: /var/lib/postgresql/data
Max Connections: 100
Shared Buffers: 256MB
```

### Passo 1.5: Criar Banco de Dados

1. Clique em **"Create Database"**
2. Aguarde a criação (1-2 minutos)
3. Status deve ficar **"Running"** (verde)

### Passo 1.6: Obter Connection String

Após criado, copie a **Connection String**:

```
postgresql://conexa_user:[SENHA]@conexa-v3-db:5432/conexa
```

**⚠️ ANOTE**: Você vai usar essa string nas variáveis de ambiente!

---

## 🔧 PARTE 2: Deploy do Backend API

### Passo 2.1: Criar Novo Projeto

1. No menu lateral, clique em **"Projects"**
2. Clique no botão **"+ New Project"**
3. Selecione **"GitHub Repository"**

### Passo 2.2: Conectar Repositório

1. Selecione a organização: **"vml-arquivos"**
2. Selecione o repositório: **"conexa-v3.0"**
3. Branch: **"main"**
4. Clique em **"Continue"**

### Passo 2.3: Configurar Aplicação

Preencha os campos:

```
Name: conexa-v3-api
Type: Node.js
Build Command: pnpm install && pnpm --filter @conexa/api build
Start Command: pnpm --filter @conexa/api start:prod
Port: 3000
Root Directory: /
```

### Passo 2.4: Configurar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```bash
# Database
DATABASE_URL=postgresql://conexa_user:[SUA_SENHA]@conexa-v3-db:5432/conexa

# JWT
JWT_SECRET=sua-chave-secreta-super-segura-aqui-min-32-caracteres
JWT_EXPIRES_IN=7d

# API
NODE_ENV=production
PORT=3000
API_URL=https://api.conexa.seu-dominio.com

# CORS
CORS_ORIGIN=https://app.conexa.seu-dominio.com,https://conexa.seu-dominio.com

# AWS S3 (opcional)
AWS_ACCESS_KEY_ID=sua-key-aqui
AWS_SECRET_ACCESS_KEY=sua-secret-aqui
AWS_REGION=us-east-1
AWS_S3_BUCKET=conexa-uploads

# Gemini AI (opcional)
GEMINI_API_KEY=sua-key-aqui

# Stripe (opcional)
STRIPE_SECRET_KEY=sua-key-aqui
STRIPE_WEBHOOK_SECRET=sua-secret-aqui
```

**⚠️ IMPORTANTE**: 
- Substitua `[SUA_SENHA]` pela senha do banco
- Substitua `seu-dominio.com` pelo seu domínio real
- Gere uma JWT_SECRET forte (mínimo 32 caracteres)

### Passo 2.5: Configurar Build

Clique em **"Build Settings"**:

```
Install Command: pnpm install
Build Command: pnpm --filter @conexa/api build
Output Directory: apps/api/dist
```

### Passo 2.6: Configurar Health Check

Clique em **"Health Check"**:

```
Health Check Path: /health
Health Check Interval: 30s
Health Check Timeout: 10s
Health Check Retries: 3
```

### Passo 2.7: Deploy!

1. Clique em **"Deploy"**
2. Aguarde o build (3-5 minutos)
3. Acompanhe os logs em tempo real

### Passo 2.8: Executar Migrations

**⚠️ CRÍTICO**: Após o primeiro deploy, você PRECISA executar as migrations!

1. No painel do Coolify, vá em **"Console"** da aplicação
2. Execute o comando:

```bash
cd apps/api && npx prisma migrate deploy
```

3. Aguarde a execução (1-2 minutos)
4. Deve aparecer: **"✓ All migrations have been successfully applied"**

### Passo 2.9: Validar Backend

1. Acesse: `https://api.conexa.seu-dominio.com/health`
2. Deve retornar: `{"status":"ok"}`
3. Status no Coolify deve estar **"Running"** (verde)

---

## 🎨 PARTE 3: Deploy do Frontend Web

### Passo 3.1: Criar Nova Aplicação

1. No mesmo projeto, clique em **"+ Add Application"**
2. Selecione **"Same Repository"**

### Passo 3.2: Configurar Aplicação

Preencha os campos:

```
Name: conexa-v3-web
Type: Static Site (Vite)
Build Command: pnpm install && pnpm --filter @conexa/web build
Output Directory: apps/web/dist
Port: 5173
Root Directory: /
```

### Passo 3.3: Configurar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```bash
# API
VITE_API_URL=https://api.conexa.seu-dominio.com
VITE_API_TIMEOUT=30000

# App
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0

# Features
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_NOTIFICATIONS=true
```

### Passo 3.4: Configurar Build

Clique em **"Build Settings"**:

```
Install Command: pnpm install
Build Command: pnpm --filter @conexa/web build
Output Directory: apps/web/dist
```

### Passo 3.5: Deploy!

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Status deve ficar **"Running"** (verde)

### Passo 3.6: Validar Frontend

1. Acesse: `https://app.conexa.seu-dominio.com`
2. Deve carregar a tela de login
3. Verifique se não há erros no console do navegador

---

## 🌐 PARTE 4: Deploy do Site Institucional

### Passo 4.1: Criar Nova Aplicação

1. No mesmo projeto, clique em **"+ Add Application"**
2. Selecione **"Same Repository"**

### Passo 4.2: Configurar Aplicação

Preencha os campos:

```
Name: conexa-v3-site
Type: Node.js
Build Command: pnpm install && pnpm --filter @conexa/site build
Start Command: pnpm --filter @conexa/site start
Port: 5174
Root Directory: /
```

### Passo 4.3: Configurar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

```bash
# Database
DATABASE_URL=postgresql://conexa_user:[SUA_SENHA]@conexa-v3-db:5432/conexa

# API
API_URL=https://api.conexa.seu-dominio.com

# App
NODE_ENV=production
PORT=5174
```

### Passo 4.4: Deploy!

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Status deve ficar **"Running"** (verde)

### Passo 4.5: Validar Site

1. Acesse: `https://conexa.seu-dominio.com`
2. Deve carregar o site institucional
3. Verifique se não há erros

---

## 🔒 PARTE 5: Configurar Domínios e SSL

### Passo 5.1: Configurar Domínio do Backend

1. Na aplicação **conexa-v3-api**, clique em **"Domains"**
2. Adicione o domínio: `api.conexa.seu-dominio.com`
3. Clique em **"Add Domain"**
4. Aguarde a configuração do SSL (1-2 minutos)
5. Status deve ficar **"Active"** com cadeado verde

### Passo 5.2: Configurar Domínio do Frontend

1. Na aplicação **conexa-v3-web**, clique em **"Domains"**
2. Adicione o domínio: `app.conexa.seu-dominio.com`
3. Clique em **"Add Domain"**
4. Aguarde a configuração do SSL (1-2 minutos)
5. Status deve ficar **"Active"** com cadeado verde

### Passo 5.3: Configurar Domínio do Site

1. Na aplicação **conexa-v3-site**, clique em **"Domains"**
2. Adicione o domínio: `conexa.seu-dominio.com`
3. Clique em **"Add Domain"**
4. Aguarde a configuração do SSL (1-2 minutos)
5. Status deve ficar **"Active"** com cadeado verde

### Passo 5.4: Configurar DNS

No seu provedor de DNS (Cloudflare, GoDaddy, etc.), adicione os registros:

```
Tipo: A
Nome: api.conexa
Valor: [IP da sua VPS]
TTL: Auto

Tipo: A
Nome: app.conexa
Valor: [IP da sua VPS]
TTL: Auto

Tipo: A
Nome: conexa (ou @)
Valor: [IP da sua VPS]
TTL: Auto
```

**⏱️ Aguarde**: Propagação DNS pode levar de 5 minutos a 24 horas.

---

## ✅ PARTE 6: Validação Final

### Checklist de Validação

Execute cada teste abaixo:

#### 6.1 Banco de Dados
- [ ] PostgreSQL está **"Running"** (verde)
- [ ] Connection string está correta
- [ ] Migrations foram executadas

#### 6.2 Backend API
- [ ] Status está **"Running"** (verde)
- [ ] Health check retorna `{"status":"ok"}`
- [ ] Logs não mostram erros críticos
- [ ] Domínio com SSL ativo (cadeado verde)

#### 6.3 Frontend Web
- [ ] Status está **"Running"** (verde)
- [ ] Tela de login carrega corretamente
- [ ] Console do navegador sem erros
- [ ] Domínio com SSL ativo (cadeado verde)

#### 6.4 Site Institucional
- [ ] Status está **"Running"** (verde)
- [ ] Homepage carrega corretamente
- [ ] Domínio com SSL ativo (cadeado verde)

### 6.5 Teste de Integração

1. **Criar Usuário Administrador**:

Acesse o console do backend e execute:

```bash
cd apps/api && node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@conexa.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Sistema',
      roleLevel: 'DEVELOPER',
      isActive: true,
    },
  });
  console.log('✅ Admin criado:', admin.email);
}

createAdmin().catch(console.error).finally(() => prisma.\$disconnect());
"
```

2. **Testar Login**:
   - Acesse: `https://app.conexa.seu-dominio.com`
   - Email: `admin@conexa.com`
   - Senha: `Admin@123`
   - Deve fazer login com sucesso

3. **Testar Dashboard**:
   - Após login, deve carregar o dashboard
   - Gráficos devem aparecer
   - Sem erros no console

---

## 🔧 PARTE 7: Troubleshooting

### Problema 1: Backend não inicia

**Sintomas**: Status "Crashed" ou "Restarting"

**Soluções**:

1. Verifique os logs:
   - No Coolify, clique em **"Logs"**
   - Procure por erros

2. Verifique variáveis de ambiente:
   - `DATABASE_URL` está correto?
   - `JWT_SECRET` está definido?

3. Verifique migrations:
   ```bash
   cd apps/api && npx prisma migrate status
   ```

### Problema 2: Frontend não carrega

**Sintomas**: Tela branca ou erro 404

**Soluções**:

1. Verifique build:
   - No Coolify, clique em **"Build Logs"**
   - Procure por erros de build

2. Verifique variáveis de ambiente:
   - `VITE_API_URL` está correto?

3. Limpe cache e rebuild:
   - Clique em **"Rebuild"**

### Problema 3: Erro de CORS

**Sintomas**: Erro no console: "CORS policy"

**Soluções**:

1. Verifique `CORS_ORIGIN` no backend:
   ```
   CORS_ORIGIN=https://app.conexa.seu-dominio.com
   ```

2. Certifique-se de que o domínio está correto (com https://)

### Problema 4: Migrations falham

**Sintomas**: Erro ao executar `prisma migrate deploy`

**Soluções**:

1. Verifique conexão com banco:
   ```bash
   cd apps/api && npx prisma db pull
   ```

2. Reset e re-execute (⚠️ CUIDADO: apaga dados):
   ```bash
   cd apps/api && npx prisma migrate reset --force
   ```

### Problema 5: SSL não ativa

**Sintomas**: Domínio sem cadeado verde

**Soluções**:

1. Aguarde 5-10 minutos
2. Verifique DNS:
   ```bash
   nslookup api.conexa.seu-dominio.com
   ```
3. Force renovação do certificado no Coolify

---

## 📊 PARTE 8: Monitoramento

### 8.1 Logs em Tempo Real

Para acompanhar os logs:

1. No Coolify, clique na aplicação
2. Clique em **"Logs"**
3. Ative **"Auto-scroll"**

### 8.2 Métricas de Performance

Monitore:

- **CPU**: Deve ficar abaixo de 70%
- **RAM**: Deve ficar abaixo de 80%
- **Disco**: Deve ter pelo menos 20% livre

### 8.3 Health Checks

Configure alertas:

1. No Coolify, vá em **"Notifications"**
2. Adicione webhook ou email
3. Configure para alertar se status mudar para "Down"

---

## 🔄 PARTE 9: Atualizações Futuras

### Como Fazer Deploy de Novas Versões

1. **Fazer commit no GitHub**:
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```

2. **Deploy automático** (se configurado):
   - Coolify detecta o push e faz deploy automaticamente

3. **Deploy manual**:
   - No Coolify, clique em **"Redeploy"**
   - Aguarde o build

### Rollback em Caso de Erro

1. No Coolify, clique em **"Deployments"**
2. Selecione a versão anterior
3. Clique em **"Rollback"**

---

## 📝 PARTE 10: Checklist Final

Antes de considerar o deploy concluído:

### Infraestrutura
- [ ] PostgreSQL está rodando
- [ ] Backend API está rodando
- [ ] Frontend Web está rodando
- [ ] Site está rodando
- [ ] Todos com SSL ativo

### Configuração
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas
- [ ] Domínios configurados
- [ ] DNS propagado

### Funcionalidades
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Seleção de crianças funciona
- [ ] Seleção de materiais funciona
- [ ] Micro-gestos funcionam
- [ ] Replicação de planejamentos funciona

### Segurança
- [ ] HTTPS ativo em todos os domínios
- [ ] JWT_SECRET forte configurado
- [ ] Senhas do banco seguras
- [ ] CORS configurado corretamente

### Monitoramento
- [ ] Logs acessíveis
- [ ] Health checks configurados
- [ ] Alertas configurados
- [ ] Backup do banco configurado

---

## 🎉 Parabéns!

Se você chegou até aqui e todos os checkboxes estão marcados, **seu deploy está completo e funcionando!** 🚀

O Conexa V3.0 está pronto para revolucionar a educação infantil!

---

## 📞 Suporte

Se tiver problemas:

1. Consulte a seção de **Troubleshooting** acima
2. Verifique os logs no Coolify
3. Consulte a documentação do Coolify: https://coolify.io/docs

---

## 📚 Documentos Relacionados

- `README.md` - Visão geral do projeto
- `QUICKSTART.md` - Início rápido para desenvolvimento
- `DEPLOY_COOLIFY_COMPLETO.md` - Guia técnico detalhado
- `PROVAS_FUNCIONAMENTO.md` - Provas de funcionamento

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão do Guia**: 1.0.0
