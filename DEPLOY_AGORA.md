# 🚀 DEPLOY AGORA - Conexa V3.0

**Status**: ✅ LIBERADO PARA DEPLOY  
**Tempo estimado**: 30-45 minutos  
**Dificuldade**: Fácil

---

## 📋 PRÉ-REQUISITOS

Antes de começar, tenha em mãos:

- [ ] Acesso ao Coolify
- [ ] Repositório GitHub: `vml-arquivos/conexa-v3.0`
- [ ] Gemini API Key: https://makersuite.google.com/app/apikey
- [ ] Domínios (opcional): `api.conexa.com`, `app.conexa.com`, `conexa.com`

---

## 🎯 PASSO A PASSO SIMPLIFICADO

### FASE 1: BANCO DE DADOS (5 min)

1. **Acesse o Coolify**
   - URL: Seu painel Coolify

2. **Crie o PostgreSQL**
   - Clique em **"Databases"** → **"+ Add Database"**
   - Selecione **"PostgreSQL"**
   - Preencha:
     - Name: `conexa-v3-db`
     - Database: `conexa`
     - Username: `conexa_user`
     - Password: `[gere uma senha forte]`
   - Clique em **"Create"**

3. **Aguarde o deploy**
   - Status deve ficar **"Running"** (verde)

4. **Copie a Connection String**
   - Clique no banco criado
   - Copie a **"Connection String"**
   - Exemplo: `postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]`
   - **ANOTE!** Você vai usar várias vezes

✅ **Banco criado!**

---

### FASE 2: BACKEND API (10 min)

1. **Crie a Aplicação**
   - Clique em **"Applications"** → **"+ Add Application"**
   - Selecione **"GitHub"**
   - Repositório: `vml-arquivos/conexa-v3.0`
   - Branch: `main`
   - Name: `conexa-v3-api`

2. **Configure Build**
   - Build Command: `pnpm install && pnpm --filter @conexa/database generate && pnpm --filter @conexa/api build`
   - Start Command: `node apps/api/dist/src/main.js`
   - Port: `3000`
   - Working Directory: `/`

3. **Configure Variáveis de Ambiente**
   
   Clique em **"Environment Variables"** e adicione:

   ```bash
   DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
   JWT_SECRET=[CONFIGURE_NO_AMBIENTE] com: openssl rand -base64 32]
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   PORT=3000
   API_URL=https://api.conexa.seu-dominio.com
   CORS_ORIGIN=https://app.conexa.seu-dominio.com,https://conexa.seu-dominio.com
   GEMINI_API_KEY=[sua Gemini API Key]
   GEMINI_MODEL=gemini-1.5-flash
   ENABLE_AI_ASSISTANT=true
   ENABLE_OFFLINE_MODE=true
   ENABLE_PUSH_NOTIFICATIONS=false
   LOG_LEVEL=info
   LOG_FORMAT=json
   ```

   **Substitua**:
   - `SUA_SENHA` → Senha do banco (copiada na Fase 1)
   - `[gere com...]` → Execute `openssl rand -base64 32` no terminal
   - `seu-dominio.com` → Seu domínio real
   - `[sua Gemini API Key]` → Obtenha em https://makersuite.google.com/app/apikey

4. **Deploy**
   - Clique em **"Deploy"**
   - Aguarde o build (3-5 minutos)
   - Status deve ficar **"Running"** (verde)

5. **Execute Migrations**
   - Clique em **"Console"**
   - Execute:
   ```bash
   cd apps/api
   npx prisma migrate deploy
   ```
   - Aguarde: `✅ Migrations applied`

6. **Crie Usuário Admin**
   - No console, execute:
   ```bash
   cd apps/api
   node scripts/create-admin.js
   ```
   - Anote: Email `admin@conexa.com` / Senha `Admin@123`

7. **Crie Usuários de Teste**
   - No console, execute:
   ```bash
   cd apps/api
   node scripts/seed-test-users.js
   ```
   - Aguarde: `✅ Seed concluído! Criados: 13`

8. **Teste Health Check**
   - Acesse: `https://api.conexa.seu-dominio.com/health`
   - Deve retornar: `{"status":"ok"}`

✅ **Backend funcionando!**

---

### FASE 3: FRONTEND WEB (5 min)

1. **Crie a Aplicação**
   - Clique em **"Applications"** → **"+ Add Application"**
   - Selecione **"GitHub"**
   - Repositório: `vml-arquivos/conexa-v3.0`
   - Branch: `main`
   - Name: `conexa-v3-web`

2. **Configure Build**
   - Build Command: `pnpm install && pnpm --filter @conexa/web build`
   - Output Directory: `apps/web/dist`
   - Port: `5173`
   - Working Directory: `/`

3. **Configure Variáveis de Ambiente**
   
   ```bash
   VITE_API_URL=https://api.conexa.seu-dominio.com
   VITE_APP_NAME=Conexa V3.0
   VITE_APP_VERSION=3.0.0
   ```

   **Substitua**:
   - `seu-dominio.com` → Seu domínio real

4. **Deploy**
   - Clique em **"Deploy"**
   - Aguarde o build (2-3 minutos)
   - Status deve ficar **"Running"** (verde)

5. **Teste**
   - Acesse: `https://app.conexa.seu-dominio.com`
   - Deve aparecer a tela de login

✅ **Frontend funcionando!**

---

### FASE 4: SITE INSTITUCIONAL (5 min)

1. **Crie a Aplicação**
   - Clique em **"Applications"** → **"+ Add Application"**
   - Selecione **"GitHub"**
   - Repositório: `vml-arquivos/conexa-v3.0`
   - Branch: `main`
   - Name: `conexa-v3-site`

2. **Configure Build**
   - Build Command: `pnpm install && pnpm --filter @conexa/site build`
   - Start Command: `node apps/site/dist/index.js`
   - Port: `5174`
   - Working Directory: `/`

3. **Configure Variáveis de Ambiente**
   
   ```bash
   DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]
   API_URL=https://api.conexa.seu-dominio.com
   NODE_ENV=production
   PORT=5174
   ```

   **Substitua**:
   - `SUA_SENHA` → Senha do banco (mesma da Fase 1)
   - `seu-dominio.com` → Seu domínio real

4. **Deploy**
   - Clique em **"Deploy"**
   - Aguarde o build (2-3 minutos)
   - Status deve ficar **"Running"** (verde)

5. **Teste**
   - Acesse: `https://conexa.seu-dominio.com`
   - Deve aparecer o site institucional

✅ **Site funcionando!**

---

### FASE 5: DOMÍNIOS E SSL (5 min)

**Se você tiver domínios próprios:**

1. **Configure DNS**
   - No seu provedor de DNS (Cloudflare, GoDaddy, etc.)
   - Adicione registros A ou CNAME apontando para o IP da VPS:
     - `api.conexa.com` → IP da VPS
     - `app.conexa.com` → IP da VPS
     - `conexa.com` → IP da VPS

2. **Configure no Coolify**
   - Para cada aplicação:
     - Clique em **"Domains"**
     - Adicione o domínio
     - Clique em **"Save"**
   - Aguarde SSL (Let's Encrypt automático)

3. **Teste SSL**
   - Acesse cada domínio com HTTPS
   - Deve aparecer o cadeado verde

✅ **Domínios configurados!**

**Se NÃO tiver domínios:**
- Use as URLs geradas pelo Coolify
- Exemplo: `https://conexa-v3-api-abc123.coolify.io`

---

### FASE 6: VALIDAÇÃO FINAL (5 min)

1. **Verifique Status**
   - [ ] PostgreSQL: **Running** (verde)
   - [ ] Backend API: **Running** (verde)
   - [ ] Frontend Web: **Running** (verde)
   - [ ] Site: **Running** (verde)

2. **Teste Login**
   - Acesse: `https://app.conexa.seu-dominio.com`
   - Login: `admin@conexa.com`
   - Senha: `Admin@123`
   - Deve entrar no dashboard

3. **Teste IA Assistiva**
   - No dashboard, vá em "Planejamentos"
   - Clique em "Gerar com IA"
   - Deve aparecer sugestões (Gemini funcionando!)

4. **Teste Usuários de Teste**
   - Logout
   - Teste cada nível:
     - `developer@conexa.com` / `Teste@123`
     - `admin@mantenedora.com` / `Teste@123`
     - `coordenacao@central.com` / `Teste@123`
     - `diretor@unidade1.com` / `Teste@123`
     - `professor1@unidade1.com` / `Teste@123`

5. **Verifique Logs**
   - No Coolify, veja os logs de cada serviço
   - Não deve ter erros críticos

✅ **Sistema 100% funcional!**

---

## 🎉 DEPLOY CONCLUÍDO!

Parabéns! O Conexa V3.0 está no ar! 🚀

### O Que Você Tem Agora

- ✅ **4 serviços rodando**:
  - PostgreSQL (banco de dados)
  - Backend API (NestJS + Prisma)
  - Frontend Web (React + Vite)
  - Site Institucional

- ✅ **IA Assistiva funcionando** (Gemini):
  - Análise de diários
  - Geração de planejamentos
  - Relatórios RDIC/RIA
  - Diagnósticos
  - Sugestões pedagógicas

- ✅ **13 usuários de teste**:
  - 1 Developer
  - 2 Mantenedora
  - 2 Staff Central
  - 4 Unidade
  - 4 Professores

- ✅ **Funcionalidades completas**:
  - CRUD de crianças
  - CRUD de fornecedores
  - Diário de bordo
  - Micro-gestos
  - Planejamentos
  - Requisições de materiais
  - Relatórios
  - Dashboards premium
  - Modo offline (professores)

---

## 📞 PRÓXIMOS PASSOS

### Imediato (Hoje)

1. **Altere senhas**
   - Admin: `admin@conexa.com`
   - Usuários de teste

2. **Crie mantenedora real**
   - Login como `developer@conexa.com`
   - Crie sua instituição

3. **Crie unidades reais**
   - Adicione suas escolas/creches

4. **Crie funcionários reais**
   - Diretores, coordenadores, professores

5. **Importe dados**
   - Crianças, turmas, matrículas

### Curto Prazo (Esta Semana)

1. **Treine a equipe**
   - Mostre o sistema
   - Explique funcionalidades
   - Distribua logins

2. **Configure backup**
   - No Coolify, configure backup automático
   - Teste restore

3. **Monitore sistema**
   - Verifique logs diariamente
   - Acompanhe performance
   - Responda a alertas

### Médio Prazo (Este Mês)

1. **Otimize performance**
   - Ajuste configurações
   - Adicione cache (Redis)
   - Otimize queries

2. **Adicione funcionalidades**
   - Comunicação com famílias
   - Agenda digital
   - Webhooks n8n

3. **Configure CI/CD**
   - Deploys automáticos
   - Testes automatizados

---

## 🔧 TROUBLESHOOTING

### Problema: Build falhou

**Solução**:
1. Verifique logs do build
2. Verifique se todas as variáveis estão configuradas
3. Tente rebuild

### Problema: "Connection refused"

**Solução**:
1. Verifique se o banco está rodando
2. Verifique `DATABASE_URL`
3. Verifique nome do container: `conexa-v3-db`

### Problema: "Authentication failed"

**Solução**:
1. Verifique senha do banco
2. Verifique `DATABASE_URL`
3. Recrie o banco se necessário

### Problema: IA não funciona

**Solução**:
1. Verifique `GEMINI_API_KEY`
2. Verifique `ENABLE_AI_ASSISTANT=true`
3. Teste API Key em: https://makersuite.google.com/app/apikey
4. Verifique logs do backend

### Problema: CORS error

**Solução**:
1. Verifique `CORS_ORIGIN` no backend
2. Deve incluir URL do frontend
3. Use HTTPS
4. Sem espaços após vírgula

---

## 📚 DOCUMENTAÇÃO

Consulte para mais detalhes:

- **Guia Completo**: `GUIA_DEPLOY_COOLIFY_PASSO_A_PASSO.md`
- **Variáveis de Ambiente**: `VARIAVEIS_AMBIENTE_DEPLOY.md`
- **Logins de Teste**: `LOGINS_TESTE.md`
- **PostgreSQL**: `POSTGRESQL_COOLIFY.md`
- **Checklist Completo**: `CHECKLIST_DEPLOY.md`

---

## ✅ CHECKLIST RÁPIDO

- [ ] Banco de dados criado e rodando
- [ ] Backend API deployado e rodando
- [ ] Migrations executadas
- [ ] Usuário admin criado
- [ ] Usuários de teste criados
- [ ] Frontend Web deployado e rodando
- [ ] Site deployado e rodando
- [ ] Domínios configurados (opcional)
- [ ] SSL ativo (opcional)
- [ ] Login testado
- [ ] IA testada
- [ ] Logs verificados
- [ ] Backup configurado

---

## 🎯 RESULTADO ESPERADO

Após seguir este guia:

✅ **Sistema 100% funcional**  
✅ **IA Assistiva ativa**  
✅ **13 usuários de teste**  
✅ **Pronto para uso**  

**Tempo total**: 30-45 minutos  
**Dificuldade**: Fácil  
**Sucesso**: Garantido! 🎉

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0

---

## 🚀 COMECE AGORA!

**Tudo pronto para deploy!**  
**Siga este guia passo a passo e em 30-45 minutos estará no ar!**  
**Boa sorte! 🍀**
