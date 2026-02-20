# 🌐 Domínios e Subdomínios - Conexa V3.0

**Data**: 19 de Fevereiro de 2026  
**Status**: ✅ PRONTO PARA CONFIGURAÇÃO

---

## 📋 Resumo Executivo

Você precisa de **3 subdomínios** (ou 3 domínios separados) para o sistema Conexa V3.0 funcionar completamente:

| Serviço | Subdomínio | Porta | Descrição |
|---------|------------|-------|-----------|
| **Backend API** | `api.conexa.com` | 3000 | API REST (NestJS) |
| **Frontend Web** | `app.conexa.com` | 5173 | Aplicação web (React) |
| **Site Institucional** | `conexa.com` | 5174 | Landing page |

**Total**: 3 subdomínios (ou 2 subdomínios + 1 domínio raiz)

---

## 🎯 Opções de Configuração

### Opção 1: Usar Subdomínios (Recomendado)

**Domínio principal**: `conexa.com` (ou `conexa.com.br`, `conexa.org`, etc.)

**Subdomínios necessários**:
1. `api.conexa.com` → Backend API
2. `app.conexa.com` → Frontend Web (área de login e autenticação)
3. `conexa.com` → Site Institucional (landing page)

**Vantagens**:
- ✅ Organização clara
- ✅ Fácil de lembrar
- ✅ Padrão da indústria
- ✅ SSL único para todos (wildcard)

**Exemplo**:
- Site: `https://conexa.com`
- Login: `https://app.conexa.com`
- API: `https://api.conexa.com`

---

### Opção 2: Usar Domínios Separados

**Domínios necessários**:
1. `api-conexa.com` → Backend API
2. `app-conexa.com` → Frontend Web
3. `conexa.com` → Site Institucional

**Vantagens**:
- ✅ Isolamento total
- ✅ Pode usar provedores diferentes

**Desvantagens**:
- ❌ Mais caro (3 domínios)
- ❌ Mais complexo de gerenciar
- ❌ 3 certificados SSL

---

### Opção 3: Usar URLs do Coolify (Sem Domínio Próprio)

**URLs geradas automaticamente**:
1. `https://conexa-v3-api-abc123.coolify.io` → Backend API
2. `https://conexa-v3-web-def456.coolify.io` → Frontend Web
3. `https://conexa-v3-site-ghi789.coolify.io` → Site Institucional

**Vantagens**:
- ✅ Grátis
- ✅ SSL automático
- ✅ Funciona imediatamente

**Desvantagens**:
- ❌ URLs longas e feias
- ❌ Não profissional
- ❌ Difícil de lembrar

**Recomendação**: Use apenas para testes. Para produção, use domínio próprio.

---

## 🔧 Configuração Detalhada

### 1. Backend API

**Subdomínio**: `api.conexa.com`

**O que faz**:
- API REST para autenticação
- CRUD de dados (crianças, turmas, etc.)
- Geração de relatórios
- IA Assistiva (Gemini)
- Webhooks

**Porta**: 3000

**Tipo de registro DNS**:
- **A Record**: `api` → IP da VPS
- **OU CNAME**: `api` → `seu-servidor.com`

**Exemplo de configuração DNS**:
```
Type: A
Name: api
Value: 123.456.789.10 (IP da VPS)
TTL: 3600
```

**Teste**:
```bash
curl https://api.conexa.com/health
# Deve retornar: {"status":"ok"}
```

---

### 2. Frontend Web (Área de Login e Autenticação)

**Subdomínio**: `app.conexa.com`

**O que faz**:
- Tela de login
- Dashboards (Professor, Coordenador, Diretor, etc.)
- Diário de bordo
- Micro-gestos
- Planejamentos
- Relatórios
- Requisições de materiais

**Porta**: 5173

**Tipo de registro DNS**:
- **A Record**: `app` → IP da VPS
- **OU CNAME**: `app` → `seu-servidor.com`

**Exemplo de configuração DNS**:
```
Type: A
Name: app
Value: 123.456.789.10 (IP da VPS)
TTL: 3600
```

**Teste**:
```bash
curl https://app.conexa.com
# Deve retornar HTML da página de login
```

---

### 3. Site Institucional (Landing Page)

**Domínio/Subdomínio**: `conexa.com` (raiz) ou `www.conexa.com`

**O que faz**:
- Landing page
- Informações sobre o sistema
- Contato
- Apresentação institucional

**Porta**: 5174

**Tipo de registro DNS**:
- **A Record**: `@` (raiz) → IP da VPS
- **A Record**: `www` → IP da VPS (opcional)

**Exemplo de configuração DNS**:
```
Type: A
Name: @ (ou deixe vazio)
Value: 123.456.789.10 (IP da VPS)
TTL: 3600

Type: A
Name: www
Value: 123.456.789.10 (IP da VPS)
TTL: 3600
```

**Teste**:
```bash
curl https://conexa.com
# Deve retornar HTML do site institucional
```

---

## 📝 Passo a Passo de Configuração DNS

### Se você usa Cloudflare:

1. **Acesse Cloudflare**
   - Faça login em https://dash.cloudflare.com
   - Selecione seu domínio

2. **Vá em DNS**
   - Clique em "DNS" no menu lateral

3. **Adicione os registros**:

   **Registro 1 - API**:
   - Type: `A`
   - Name: `api`
   - IPv4 address: `[IP da VPS]`
   - Proxy status: 🟠 DNS only (desligado)
   - TTL: Auto
   - Clique em "Save"

   **Registro 2 - APP**:
   - Type: `A`
   - Name: `app`
   - IPv4 address: `[IP da VPS]`
   - Proxy status: 🟠 DNS only (desligado)
   - TTL: Auto
   - Clique em "Save"

   **Registro 3 - Site (raiz)**:
   - Type: `A`
   - Name: `@`
   - IPv4 address: `[IP da VPS]`
   - Proxy status: 🟠 DNS only (desligado)
   - TTL: Auto
   - Clique em "Save"

4. **Aguarde propagação**
   - DNS leva de 5 minutos a 48 horas para propagar
   - Normalmente: 15-30 minutos

5. **Teste**:
   ```bash
   nslookup api.conexa.com
   nslookup app.conexa.com
   nslookup conexa.com
   ```

---

### Se você usa GoDaddy:

1. **Acesse GoDaddy**
   - Faça login em https://www.godaddy.com
   - Vá em "My Products" → "Domains"

2. **Clique no domínio**
   - Clique em "DNS" ou "Manage DNS"

3. **Adicione os registros**:

   **Registro 1 - API**:
   - Type: `A`
   - Host: `api`
   - Points to: `[IP da VPS]`
   - TTL: 1 Hour
   - Clique em "Save"

   **Registro 2 - APP**:
   - Type: `A`
   - Host: `app`
   - Points to: `[IP da VPS]`
   - TTL: 1 Hour
   - Clique em "Save"

   **Registro 3 - Site (raiz)**:
   - Type: `A`
   - Host: `@`
   - Points to: `[IP da VPS]`
   - TTL: 1 Hour
   - Clique em "Save"

4. **Aguarde propagação** (15-30 minutos)

---

### Se você usa Registro.br:

1. **Acesse Registro.br**
   - Faça login em https://registro.br
   - Vá em "Meus Domínios"

2. **Clique no domínio**
   - Clique em "Editar Zona"

3. **Adicione os registros**:

   **Registro 1 - API**:
   - Nome: `api`
   - Tipo: `A`
   - Dados: `[IP da VPS]`
   - Clique em "Adicionar"

   **Registro 2 - APP**:
   - Nome: `app`
   - Tipo: `A`
   - Dados: `[IP da VPS]`
   - Clique em "Adicionar"

   **Registro 3 - Site (raiz)**:
   - Nome: (deixe vazio ou `@`)
   - Tipo: `A`
   - Dados: `[IP da VPS]`
   - Clique em "Adicionar"

4. **Salve as alterações**

5. **Aguarde propagação** (15-30 minutos)

---

## 🔒 Configuração de SSL (HTTPS)

### No Coolify (Automático)

O Coolify usa **Let's Encrypt** para gerar certificados SSL automaticamente.

**Passo a passo**:

1. **Configure o domínio no Coolify**:
   - Vá na aplicação (Backend, Frontend ou Site)
   - Clique em "Domains"
   - Adicione o domínio (ex: `api.conexa.com`)
   - Clique em "Save"

2. **Aguarde SSL**:
   - Coolify detecta o domínio
   - Gera certificado Let's Encrypt automaticamente
   - Pode levar 1-5 minutos

3. **Verifique**:
   - Acesse `https://api.conexa.com`
   - Deve aparecer o cadeado verde 🔒

**Importante**:
- DNS deve estar propagado ANTES de configurar no Coolify
- Se SSL falhar, verifique se o DNS está correto
- Certifique-se de que a porta 80 e 443 estão abertas no firewall

---

## ✅ Checklist de Configuração

### Antes de Configurar

- [ ] Domínio registrado (ex: `conexa.com`)
- [ ] Acesso ao painel DNS (Cloudflare, GoDaddy, Registro.br, etc.)
- [ ] IP da VPS anotado
- [ ] Acesso ao Coolify

### Configuração DNS

- [ ] Registro A para `api.conexa.com` → IP da VPS
- [ ] Registro A para `app.conexa.com` → IP da VPS
- [ ] Registro A para `conexa.com` (raiz) → IP da VPS
- [ ] DNS propagado (teste com `nslookup`)

### Configuração no Coolify

- [ ] Backend API: domínio `api.conexa.com` configurado
- [ ] Frontend Web: domínio `app.conexa.com` configurado
- [ ] Site: domínio `conexa.com` configurado
- [ ] SSL gerado para os 3 domínios (cadeado verde)

### Variáveis de Ambiente Atualizadas

- [ ] Backend: `API_URL=https://api.conexa.com`
- [ ] Backend: `CORS_ORIGIN=https://app.conexa.com,https://conexa.com`
- [ ] Frontend: `VITE_API_URL=https://api.conexa.com`
- [ ] Site: `API_URL=https://api.conexa.com`

### Testes

- [ ] `https://api.conexa.com/health` retorna `{"status":"ok"}`
- [ ] `https://app.conexa.com` mostra tela de login
- [ ] `https://conexa.com` mostra site institucional
- [ ] Login funciona (teste com `admin@conexa.com`)
- [ ] Dashboard carrega após login

---

## 🎯 Resumo Final

### Você Precisa de:

**3 subdomínios**:
1. `api.conexa.com` → Backend API (porta 3000)
2. `app.conexa.com` → Frontend Web (porta 5173)
3. `conexa.com` → Site Institucional (porta 5174)

### Configuração:

1. **DNS**: Adicionar 3 registros A apontando para IP da VPS
2. **Coolify**: Configurar domínios em cada aplicação
3. **SSL**: Automático via Let's Encrypt
4. **Variáveis**: Atualizar URLs nas variáveis de ambiente

### Tempo Total:

- Configuração DNS: 10 minutos
- Propagação DNS: 15-30 minutos
- Configuração Coolify: 5 minutos
- Geração SSL: 1-5 minutos

**Total**: 30-50 minutos

---

## 💡 Dicas Importantes

1. **Use HTTPS sempre**
   - Nunca use HTTP em produção
   - Let's Encrypt é gratuito

2. **Proxy status no Cloudflare**
   - Deixe 🟠 DNS only (desligado) inicialmente
   - Depois que funcionar, pode ativar 🟧 Proxied

3. **Wildcard SSL** (Opcional)
   - Se tiver muitos subdomínios, use certificado wildcard
   - `*.conexa.com` cobre todos os subdomínios

4. **Redirecionamento www**
   - Configure `www.conexa.com` para redirecionar para `conexa.com`
   - Ou vice-versa (escolha um padrão)

5. **Teste antes de ir ao ar**
   - Use `/etc/hosts` para testar localmente
   - Adicione: `123.456.789.10 api.conexa.com`

---

## 📞 Troubleshooting

### Problema: DNS não propaga

**Solução**:
1. Verifique se o registro foi salvo
2. Aguarde mais tempo (até 48h)
3. Limpe cache DNS: `ipconfig /flushdns` (Windows) ou `sudo dscacheutil -flushcache` (Mac)
4. Use DNS público: `8.8.8.8` (Google)

### Problema: SSL não gera

**Solução**:
1. Verifique se DNS está propagado
2. Verifique se porta 80 e 443 estão abertas
3. Tente gerar manualmente no Coolify
4. Verifique logs do Coolify

### Problema: CORS error

**Solução**:
1. Verifique `CORS_ORIGIN` no backend
2. Deve incluir `https://app.conexa.com`
3. Sem espaços após vírgula
4. Redeploy do backend

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0
