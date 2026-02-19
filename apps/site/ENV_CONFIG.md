# Configuração de Variáveis de Ambiente - COCRIS

## Variáveis Já Configuradas (Manus)

As seguintes variáveis já estão configuradas automaticamente pelo Manus:

- `DATABASE_URL` - String de conexão MySQL
- `JWT_SECRET` - Segredo para sessões
- `OAUTH_SERVER_URL` - URL do servidor OAuth Manus
- `VITE_OAUTH_PORTAL_URL` - URL do portal de login Manus
- `OWNER_OPEN_ID` - ID do proprietário
- `OWNER_NAME` - Nome do proprietário
- `VITE_APP_ID` - ID da aplicação Manus
- `VITE_APP_TITLE` - Título do site
- `VITE_APP_LOGO` - Logo do site
- `BUILT_IN_FORGE_API_URL` - URL da API Forge (backend)
- `BUILT_IN_FORGE_API_KEY` - Chave da API Forge (backend)
- `VITE_FRONTEND_FORGE_API_URL` - URL da API Forge (frontend)
- `VITE_FRONTEND_FORGE_API_KEY` - Chave da API Forge (frontend)
- `VITE_ANALYTICS_ENDPOINT` - Endpoint de analytics
- `VITE_ANALYTICS_WEBSITE_ID` - ID do website para analytics

## Variáveis Adicionais Necessárias

### 1. Stripe (Pagamentos)

Para habilitar pagamentos reais, configure as seguintes variáveis no painel de Secrets do Manus:

```
STRIPE_SECRET_KEY=sk_test_... ou sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... ou pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (opcional)
```

**Como obter:**
1. Acesse https://dashboard.stripe.com/apikeys
2. Copie a "Secret key" (sk_test_ ou sk_live_)
3. Copie a "Publishable key" (pk_test_ ou pk_live_)
4. Para webhook:
   - Acesse https://dashboard.stripe.com/webhooks
   - Crie endpoint: `https://cocris.casadef.com.br/api/webhooks/stripe`
   - Selecione eventos: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copie o "Signing secret" (whsec_...)

### 2. Email (Opcional - para notificações)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app
SMTP_FROM=noreply@cocris.org
```

**Gmail:**
1. Ative "Verificação em duas etapas"
2. Gere uma "Senha de app" em https://myaccount.google.com/apppasswords
3. Use a senha gerada em `SMTP_PASSWORD`

**Alternativas:**
- SendGrid: https://sendgrid.com
- Mailgun: https://mailgun.com
- AWS SES: https://aws.amazon.com/ses

## Deploy no Coolify

### 1. Criar Banco de Dados MySQL

No painel do Coolify:
1. Crie um novo serviço MySQL
2. Anote as credenciais (host, porta, usuário, senha, database)
3. Configure `DATABASE_URL`:
   ```
   mysql://usuario:senha@host:porta/database
   ```

### 2. Configurar Aplicação

1. **Build Command:**
   ```bash
   pnpm install && pnpm run build
   ```

2. **Start Command:**
   ```bash
   NODE_ENV=production node dist/server/_core/index.js
   ```

3. **Port:** `3000`

4. **Environment Variables:**
   - Copie todas as variáveis do Manus
   - Adicione as variáveis Stripe
   - Adicione `DATABASE_URL` do MySQL criado
   - Adicione `VITE_SITE_URL=https://cocris.casadef.com.br`

### 3. Configurar Domínio

1. No painel DNS do seu provedor:
   ```
   Type: A ou CNAME
   Name: cocris.casadef.com.br
   Value: [IP do servidor Coolify]
   ```

2. No Coolify:
   - Adicione o domínio na configuração da aplicação
   - Habilite HTTPS automático (Let's Encrypt)

### 4. Executar Migrações

Após primeiro deploy:
```bash
pnpm db:push
```

Ou execute manualmente no container:
```bash
docker exec -it [container-id] pnpm db:push
```

## Testes

### Desenvolvimento Local

1. Copie `.env.example` para `.env`
2. Preencha as variáveis necessárias
3. Execute:
   ```bash
   pnpm install
   pnpm db:push
   pnpm dev
   ```

### Testes de Pagamento (Stripe)

Use cartões de teste:
- **Sucesso:** 4242 4242 4242 4242
- **Falha:** 4000 0000 0000 0002
- **3D Secure:** 4000 0025 0000 3155

Data: qualquer data futura
CVC: qualquer 3 dígitos
CEP: qualquer

## Troubleshooting

### Erro de Conexão com Banco

- Verifique se `DATABASE_URL` está correta
- Teste conexão: `mysql -h host -u user -p database`
- Verifique firewall e whitelist de IPs

### Erro Stripe

- Verifique se as chaves estão corretas
- Teste/Produção: não misture chaves sk_test_ com pk_live_
- Webhook: verifique se o endpoint está acessível publicamente

### Build Falha

- Limpe cache: `rm -rf node_modules .next dist && pnpm install`
- Verifique logs: `pnpm build --verbose`
- TypeScript: `pnpm tsc --noEmit`

## Suporte

- Documentação Manus: https://docs.manus.im
- Documentação Stripe: https://stripe.com/docs
- Issues GitHub: https://github.com/vml-arquivos/site-cocris/issues
