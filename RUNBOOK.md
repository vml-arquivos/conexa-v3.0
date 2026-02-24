# 📘 RUNBOOK: Conexa V3.0 — PACKET V3-OPS-PRP-001

**Data:** 2026-02-24
**Autor:** Manus AI
**Commit Base:** `a39d815`
**Commit Final:** (será preenchido no final)

---

## 1. Visão Geral

Este runbook detalha os procedimentos para deploy, manutenção e rollback das alterações implementadas pelo packet `V3-OPS-PRP-001`. As missões concluídas foram:

- **Missão 01:** Estabilização de Sessão (Cookies HTTPS + Fallback Bearer)
- **Missão 02:** Unificação do Banco de Dados do `apps/site` (MySQL → Postgres 17)
- **Missão 03:** UX 2 Segundos (Dashboard Premium + Micro-Gestos Offline)
- **Missão Extra:** Hardening de Segurança Nginx

## 2. Procedimento de Deploy (Produção)

O deploy deve ser feito via pipeline de CI/CD (Coolify, Railway, etc.) que monitora o branch `main`.

### 2.1. Variáveis de Ambiente

As seguintes variáveis de ambiente **DEVEM** ser configuradas no ambiente de produção:

| Variável | App | Descrição | Exemplo | Obrigatório |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `api`, `site` | Define o ambiente para produção | `production` | **Sim** |
| `DATABASE_URL` | `api` | URL de conexão com o banco de dados principal | `postgresql://user:pass@host:port/main_db` | **Sim** |
| `SITE_DATABASE_URL` | `site` | URL de conexão com o banco de dados do site (agora Postgres) | `postgresql://user:pass@host:port/site_db` | **Sim** |
| `JWT_SECRET` | `api` | Segredo para assinar os tokens JWT | `segredo_forte_de_pelo_menos_32_chars` | **Sim** |
| `CORS_ORIGIN` | `api` | Whitelist de origens para o CORS | `https://app.conexa.com,https://conexa.com` | **Sim** |
| `OPENAI_API_KEY` | `api` | Chave da API da OpenAI para o motor de IA | `sk-xxxxxxxx` | **Sim** |

### 2.2. Passos de Build e Deploy

O pipeline deve executar os seguintes comandos na raiz do monorepo:

```bash
# 1. Instalar dependências (usa pnpm workspaces)
pnpm install --frozen-lockfile

# 2. Gerar cliente Prisma (necessário para o build do backend)
pnpm --filter @conexa/database exec prisma generate

# 3. Build de todos os apps e pacotes
pnpm build

# 4. Executar migrations no banco de dados principal (API)
# Este comando deve ser executado no container da API APÓS o build
pnpm --filter @conexa/api exec -- npx prisma migrate deploy

# 5. Executar migrations no banco de dados do site
# Este comando deve ser executado no container do SITE APÓS o build
# (Assumindo que o script de deploy do site execute isso)
# cd apps/site && npx drizzle-kit push:pg
```

### 2.3. Verificação Pós-Deploy (Smoke Tests)

Após o deploy, execute o script `smoke-tests.sh` para uma verificação rápida da saúde do sistema.

```bash
./smoke-tests.sh https://api.conexa.com https://app.conexa.com
```

## 3. Procedimento de Rollback

Em caso de falha crítica, o rollback deve ser feito revertendo o commit da `main` para o estado anterior ao merge do packet e acionando um novo deploy.

1.  **Reverter o commit:**
    ```bash
    # Identificar o commit anterior ao merge do packet
    git log

    # Reverter para o commit estável anterior (ex: a39d815)
    git revert <commit_do_merge_do_packet> --no-edit
    git push origin main
    ```

2.  **Acionar o pipeline de deploy novamente.** O pipeline reconstruirá a imagem Docker com a versão anterior do código.

3.  **Rollback de Banco de Dados:**
    - **API (Prisma):** As migrations do Prisma são apenas para frente. Um rollback manual seria necessário, o que é de **alto risco**. A estratégia aqui é corrigir para frente (`fix-forward`).
    - **Site (Drizzle):** A migração de MySQL para Postgres é destrutiva para os dados antigos do site. O rollback exigiria restaurar um backup do banco de dados MySQL anterior.

## 4. Manutenção

### 4.1. Fila Offline (IndexedDB)

Se um professor reportar que seus registros de micro-gestos não estão aparecendo, instrua-o a:
1.  Conectar-se a uma rede Wi-Fi estável.
2.  Abrir o Conexa e ir para o `TeacherDashboardPremium`.
3.  Aguardar a notificação "X registro(s) offline sincronizados!".

O sistema tentará descarregar a fila automaticamente ao detectar conexão online.

### 4.2. Logs

- **API NestJS:** Verifique os logs do container da API para erros de banco de dados, autenticação ou do motor de IA.
- **Site Next.js:** Verifique os logs do container do site para erros de renderização ou de conexão com o banco de dados do site.
- **Nginx:** O `nginx.conf` está configurado para logar acessos e erros. Verifique `/var/log/nginx/access.log` e `/var/log/nginx/error.log` no container do `apps/web`.

---

*Este documento foi gerado por Manus AI e deve ser mantido atualizado a cada novo ciclo de deploy.*
