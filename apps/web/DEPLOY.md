# DEPLOY - FONT-CONEXA-V2

Instruções de deploy do frontend no Coolify.

---

## CONFIGURAÇÃO NO COOLIFY

### 1. Variáveis de Ambiente

```env
VITE_API_BASE_URL=https://apiconexa.casadf.com.br
```

### 2. Build Configuration

**Build Command:**
```bash
npm ci && npm run build
```

**Output Directory:**
```
dist
```

**Node Version:**
```
20
```

### 3. Domínio

```
https://democonexa.casadf.com.br
```

---

## COMANDOS LOCAIS

### Instalação de Dependências

```bash
npm ci
```

### Build de Produção

```bash
npm run build
```

### Preview Local

```bash
npm run preview
```

### Desenvolvimento

```bash
npm run dev
```

---

## ESTRUTURA DE BUILD

Após o build, a estrutura do diretório `dist/` será:

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].css
│   └── index-[hash].js
└── vite.svg
```

---

## VALIDAÇÃO PÓS-DEPLOY

### 1. Verificar se o frontend está acessível

```bash
curl -I https://democonexa.casadf.com.br
```

Resposta esperada: `HTTP/2 200`

### 2. Testar Login

1. Acessar: https://democonexa.casadf.com.br/login
2. Fazer login com credenciais válidas
3. Verificar redirecionamento para `/app/dashboard`
4. Verificar se email do usuário aparece no topbar

### 3. Testar Navegação

- Dashboard: `/app/dashboard`
- Planejamentos: `/app/plannings`
- Diário: `/app/diary`
- Matrizes: `/app/matrices`
- Relatórios: `/app/reports`

### 4. Testar Relatórios

Na página de Relatórios (`/app/reports`):

1. Clicar em "Por Turma" → deve chamar `GET /reports/diary/by-classroom`
2. Clicar em "Por Período" → deve chamar `GET /reports/diary/by-period`
3. Clicar em "Não Planejado" → deve chamar `GET /reports/diary/unplanned`

Verificar:
- Se dados aparecem em tabela dinâmica
- Se lista vazia exibe "Nenhum dado encontrado"
- Se erros aparecem na tela

---

## TROUBLESHOOTING

### Build falha com "Cannot find module"

Limpar cache e reinstalar:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API não responde

Verificar variável de ambiente:
```bash
echo $VITE_API_BASE_URL
```

Deve retornar: `https://apiconexa.casadf.com.br`

### 401 Unauthorized

- Verificar se token está sendo enviado no header `Authorization: Bearer {token}`
- Verificar se backend está aceitando o token
- Fazer logout e login novamente

### Relatórios não carregam

Verificar endpoints no backend:
- `GET /reports/diary/by-classroom`
- `GET /reports/diary/by-period`
- `GET /reports/diary/unplanned`

---

## ROLLBACK

Se houver problemas no deploy:

```bash
# No repositório local
cd /home/ubuntu/font-conexa-v2
git revert HEAD
git push origin main
```

No Coolify:
- Fazer redeploy do commit anterior
- Ou manter deploy anterior ativo

---

## REFERÊNCIAS

- **Repositório:** https://github.com/vml-arquivos/font-conexa-v2
- **API Backend:** https://apiconexa.casadf.com.br
- **Frontend:** https://democonexa.casadf.com.br

---

**Última atualização:** 2026-02-06
