# ⚙️ Configuração Coolify - Frontend Conexa V3.0

## 🔴 IMPORTANTE: Configuração para Monorepo

Este app faz parte de um **monorepo pnpm**. O Dockerfile precisa acessar a raiz do repositório para copiar os packages compartilhados.

---

## 📋 Configuração no Coolify

### 1️⃣ General Settings

| Campo | Valor |
|-------|-------|
| **Name** | Conexa V3 - Frontend |
| **Build Pack** | Dockerfile |
| **Base Directory** | `/` (raiz do repo) |
| **Dockerfile Location** | `apps/web/Dockerfile` |
| **Port** | `80` |

⚠️ **CRÍTICO**: Base Directory deve ser `/` (raiz), NÃO `apps/web`

---

### 2️⃣ Domains

| Domínio | HTTPS |
|---------|-------|
| `app.conexa3.casadf.com.br` | ✅ Enabled (Let's Encrypt) |

---

### 3️⃣ Environment Variables (Build Time)

⚠️ **IMPORTANTE**: Todas as variáveis devem ser marcadas como **Build Time** (não Runtime)

```bash
VITE_API_URL=https://api.conexa3.casadf.com.br
VITE_APP_NAME=Conexa V3.0
VITE_APP_VERSION=3.0.0
VITE_APP_ENV=production
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_DEBUG=false
VITE_DEFAULT_THEME=dark
VITE_DEFAULT_LANGUAGE=pt-BR
VITE_STORAGE_PREFIX=conexa_
VITE_API_TIMEOUT=30000
```

---

## 🔍 Como o Build Funciona

### Estrutura do Monorepo
```
conexa-v3.0/
├── apps/web/           ← Frontend (este app)
├── packages/
│   ├── ui/            ← Componentes compartilhados
│   ├── types/         ← Tipos TypeScript
│   ├── utils/         ← Utilitários
│   ├── database/      ← Schema Prisma
│   └── config/        ← Configs compartilhadas
```

### O Dockerfile:
1. Copia **raiz do monorepo** (package.json, pnpm-lock.yaml, pnpm-workspace.yaml)
2. Copia **todos os packages/** (dependências internas)
3. Copia **apps/web/** (código do frontend)
4. Instala deps com `pnpm install --frozen-lockfile`
5. Builda com `pnpm --filter @conexa/web build`

---

## ✅ Checklist de Deploy

- [ ] Base Directory configurado como `/` (raiz)
- [ ] Dockerfile Location: `apps/web/Dockerfile`
- [ ] Todas as variáveis VITE_* configuradas como **Build Time**
- [ ] Domínio `app.conexa3.casadf.com.br` configurado
- [ ] HTTPS habilitado
- [ ] Port: `80`

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@conexa/ui'"
**Causa**: Base Directory está errado (apps/web ao invés de /)  
**Solução**: Mudar Base Directory para `/`

### Erro: "pnpm: command not found"
**Causa**: Dockerfile antigo sem corepack  
**Solução**: Usar Dockerfile atualizado com `corepack enable`

### Build muito lento
**Normal**: Primeira build instala ~400 pacotes, leva 3-5 minutos  
**Cache**: Builds subsequentes são mais rápidos

---

## 📊 Logins para Testar

Após deploy bem-sucedido:

| Email | Senha | Nível |
|-------|-------|-------|
| developer@conexa.com | Teste@123 | Developer |
| admin@cocris.org.br | Teste@123 | Admin Mantenedora |
| coordenador@cepi.com.br | Teste@123 | Coordenador |
| nonata@cepi.com.br | Teste@123 | Professora |

---

**Última atualização**: 2026-02-20  
**Commit com correções**: Próximo commit
