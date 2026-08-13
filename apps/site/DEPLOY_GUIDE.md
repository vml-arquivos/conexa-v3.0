# Guia Completo de Deploy - Site COCRIS

## 📋 Pré-requisitos

- Servidor VPS com Ubuntu 20.04+ ou Debian 11+
- Docker e Docker Compose instalados
- Coolify instalado e configurado
- Domínio cocris.casadef.com.br apontando para o servidor
- Conta Stripe (para pagamentos)
- Banco de dados MySQL/MariaDB

---

## 🚀 Deploy no Coolify

### 1. Preparar Banco de Dados

No painel do Coolify:

1. **Criar novo serviço MySQL:**
   - Nome: `cocris-db`
   - Versão: MySQL 8.0 ou MariaDB 10.11
   - Anotar credenciais: usuário, senha, porta, database

2. **Construir DATABASE_URL:**
   ```
   mysql://usuario:senha@cocris-db:3306/cocris
   ```

### 2. Configurar Aplicação

1. **Criar novo Application no Coolify:**
   - Nome: `cocris-site`
   - Tipo: GitHub Repository
   - Repositório: `vml-arquivos/site-cocris`
   - Branch: `main`

2. **Build Settings:**
   ```bash
   # Build Command
   pnpm install && pnpm run build
   
   # Start Command
   NODE_ENV=production node dist/server/_core/index.js
   
   # Port
   3000
   ```

3. **Environment Variables:**

   Copie e configure todas as variáveis abaixo no painel de Environment do Coolify:

   ```env
   # Database
   DATABASE_URL=mysql://usuario:senha@cocris-db:3306/cocris
   
   # Authentication (copiar do Manus)
   JWT_SECRET=[CONFIGURE_NO_AMBIENTE]
   OAUTH_SERVER_URL=https://api.manus.im
   VITE_OAUTH_PORTAL_URL=https://login.manus.im
   OWNER_OPEN_ID=your-owner-open-id
   OWNER_NAME=Administrator Name
   
   # Manus App (copiar do Manus)
   VITE_APP_ID=your-app-id
   VITE_APP_TITLE=CoCris - Educação Infantil
   VITE_APP_LOGO=/images/logo.png
   
   # Manus Forge API (copiar do Manus)
   BUILT_IN_FORGE_API_URL=https://forge.manus.im
   BUILT_IN_FORGE_API_KEY=your-backend-key
   VITE_FRONTEND_FORGE_API_URL=https://forge.manus.im
   VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
   
   # Analytics (copiar do Manus)
   VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
   VITE_ANALYTICS_WEBSITE_ID=your-website-id
   
   # Stripe (obter em https://dashboard.stripe.com)
   STRIPE_SECRET_KEY=sk_live_your_secret_key
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   
   # Site Config
   VITE_SITE_URL=https://cocris.casadef.com.br
   NODE_ENV=production
   ```

### 3. Configurar Domínio

1. **No painel DNS (Registro.br, Cloudflare, etc.):**
   ```
   Type: A
   Name: cocris.casadef.com.br
   Value: [IP do servidor Coolify]
   TTL: 3600
   ```

2. **No Coolify:**
   - Vá em Settings > Domains
   - Adicione: `cocris.casadef.com.br`
   - Habilite "Enable HTTPS" (Let's Encrypt)
   - Aguarde propagação DNS (5-30 minutos)

### 4. Deploy Inicial

1. **Fazer primeiro deploy:**
   - Clique em "Deploy" no painel do Coolify
   - Aguarde build completar (3-5 minutos)
   - Verifique logs em caso de erro

2. **Executar migrações do banco:**
   ```bash
   # Conectar ao container
   docker exec -it [container-id] bash
   
   # Executar migrações
   pnpm db:push
   
   # Popular dados iniciais
   node seed-units.mjs
   ```

3. **Verificar site:**
   - Acesse https://cocris.casadef.com.br
   - Teste navegação entre páginas
   - Verifique imagens e assets

---

## 🔧 Configuração Stripe

### 1. Criar Conta e Obter Chaves

1. Acesse https://dashboard.stripe.com
2. Complete o cadastro da organização
3. Ative pagamentos no Brasil (BRL)
4. Vá em Developers > API Keys
5. Copie:
   - Secret key (sk_live_...)
   - Publishable key (pk_live_...)

### 2. Configurar Webhook

1. Vá em Developers > Webhooks
2. Clique em "Add endpoint"
3. Configure:
   ```
   Endpoint URL: https://cocris.casadef.com.br/api/webhooks/stripe
   Description: COCRIS Payment Webhook
   Events to send:
     - checkout.session.completed
     - payment_intent.succeeded
     - payment_intent.payment_failed
   ```
4. Copie o "Signing secret" (whsec_...)
5. Adicione em STRIPE_WEBHOOK_SECRET

### 3. Habilitar PIX

1. No dashboard Stripe, vá em Settings > Payment methods
2. Habilite "PIX" para Brasil
3. Complete verificação de identidade se solicitado
4. Aguarde aprovação (1-2 dias úteis)

### 4. Testar Pagamentos

**Modo Teste (sk_test_):**
- Cartão sucesso: 4242 4242 4242 4242
- Cartão falha: 4000 0000 0000 0002
- Data: qualquer futura
- CVC: qualquer 3 dígitos

**Modo Produção:**
- Use cartões reais
- Monitore transações no dashboard

---

## 📧 Configuração de Email (Opcional)

### Opção 1: Gmail

1. Ative verificação em 2 etapas
2. Gere senha de app: https://myaccount.google.com/apppasswords
3. Configure variáveis:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASSWORD=senha-de-app-gerada
   SMTP_FROM=noreply@cocris.org
   ```

### Opção 2: SendGrid

1. Crie conta em https://sendgrid.com
2. Gere API Key
3. Configure:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.sua-api-key
   SMTP_FROM=noreply@cocris.org
   ```

---

## 🔍 SEO e Analytics

### 1. Google Search Console

1. Acesse https://search.google.com/search-console
2. Adicione propriedade: `cocris.casadef.com.br`
3. Verifique propriedade (DNS ou HTML)
4. Envie sitemap: `https://cocris.casadef.com.br/sitemap.xml`

### 2. Google Analytics (Opcional)

1. Crie propriedade em https://analytics.google.com
2. Copie Measurement ID (G-XXXXXXXXXX)
3. Adicione ao código (já configurado via Manus Analytics)

### 3. Meta Tags e Open Graph

Já implementado automaticamente em todas as páginas via componente SEO.

---

## 🛡️ Segurança

### 1. Firewall

```bash
# Permitir apenas portas necessárias
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. SSL/TLS

- Coolify configura automaticamente Let's Encrypt
- Certificados renovam automaticamente
- Force HTTPS habilitado por padrão

### 3. Backup do Banco

```bash
# Backup manual
docker exec cocris-db mysqldump -u usuario -p cocris > backup-$(date +%Y%m%d).sql

# Backup automático (crontab)
0 2 * * * docker exec cocris-db mysqldump -u usuario -p cocris > /backups/cocris-$(date +\%Y\%m\%d).sql
```

### 4. Monitoramento

- Configure alertas no Coolify
- Monitore logs: `docker logs -f [container-id]`
- Configure uptime monitoring (UptimeRobot, Pingdom)

---

## 🔄 Atualizações

### Deploy de Novas Versões

1. **Fazer alterações no código**
2. **Commit e push para GitHub:**
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```
3. **Deploy automático no Coolify** (se configurado)
4. **Ou manual:** clique em "Redeploy" no painel

### Rollback

1. No Coolify, vá em Deployments
2. Selecione versão anterior
3. Clique em "Redeploy this version"

---

## 🐛 Troubleshooting

### Erro de Build

```bash
# Limpar cache
rm -rf node_modules .next dist
pnpm install
pnpm build
```

### Erro de Conexão com Banco

```bash
# Testar conexão
mysql -h cocris-db -u usuario -p cocris

# Verificar se serviço está rodando
docker ps | grep mysql
```

### Site Não Carrega

1. Verificar logs: `docker logs -f [container-id]`
2. Verificar DNS: `nslookup cocris.casadef.com.br`
3. Verificar porta: `curl http://localhost:3000`
4. Verificar SSL: `curl https://cocris.casadef.com.br`

### Pagamentos Não Funcionam

1. Verificar chaves Stripe (test vs live)
2. Verificar webhook configurado
3. Verificar logs do Stripe dashboard
4. Testar com cartão de teste

---

## 📞 Suporte

- **Documentação Coolify:** https://coolify.io/docs
- **Documentação Stripe:** https://stripe.com/docs
- **Issues GitHub:** https://github.com/vml-arquivos/site-cocris/issues
- **Email:** suporte@cocris.org

---

## ✅ Checklist Final

Antes de colocar em produção:

- [ ] Banco de dados configurado e populado
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Domínio apontando e SSL ativo
- [ ] Stripe configurado com chaves de produção
- [ ] Webhook Stripe testado e funcionando
- [ ] Email de notificações configurado (opcional)
- [ ] Sitemap enviado ao Google Search Console
- [ ] Backup automático do banco configurado
- [ ] Monitoramento de uptime ativo
- [ ] Todas as páginas testadas e funcionando
- [ ] Pagamentos testados (teste e produção)
- [ ] Performance verificada (PageSpeed, GTmetrix)
- [ ] Acessibilidade verificada (WAVE, Lighthouse)

---

**Última atualização:** Fevereiro 2026  
**Versão:** 1.0.0
