# Guia de Deploy - Conexa V3.0

## Visão Geral

Este guia cobre o deploy da plataforma Conexa V3.0 em diferentes ambientes.

---

## Ambientes Suportados

- **Coolify** (recomendado para VPS)
- **Railway**
- **Vercel** (apenas frontend)
- **Docker** (self-hosted)
- **Kubernetes** (produção em escala)

---

## Deploy com Coolify (Recomendado)

### Pré-requisitos

- VPS com Coolify instalado
- PostgreSQL 17+ (pode ser provisionado pelo Coolify)
- Redis (opcional, pode ser provisionado pelo Coolify)

### Passo 1: Configurar PostgreSQL

1. No Coolify, crie um novo serviço PostgreSQL 17
2. Anote a connection string gerada
3. Configure as variáveis `DATABASE_URL` e `DIRECT_URL`

### Passo 2: Configurar Redis (Opcional)

1. No Coolify, crie um novo serviço Redis 7
2. Anote a connection string
3. Configure a variável `REDIS_URL`

### Passo 3: Deploy do Backend (API)

1. Crie um novo projeto no Coolify
2. Conecte ao repositório GitHub: `vml-arquivos/conexa-v3.0`
3. Configure o build:
   - **Build Command**: `pnpm install && pnpm --filter @conexa/api build`
   - **Start Command**: `pnpm --filter @conexa/api start:prod`
   - **Port**: 3000
   - **Root Directory**: `/apps/api`

4. Configure as variáveis de ambiente (ver `.env.example`)
5. Deploy!

### Passo 4: Deploy do Frontend (Web)

1. Crie um novo projeto no Coolify
2. Conecte ao mesmo repositório
3. Configure o build:
   - **Build Command**: `pnpm install && pnpm --filter @conexa/web build`
   - **Output Directory**: `apps/web/dist`
   - **Root Directory**: `/apps/web`

4. Configure as variáveis de ambiente:
   - `VITE_API_BASE_URL`: URL do backend deployado

5. Deploy!

### Passo 5: Deploy do Site Institucional

1. Crie um novo projeto no Coolify
2. Conecte ao mesmo repositório
3. Configure o build:
   - **Build Command**: `pnpm install && pnpm --filter @conexa/site build`
   - **Start Command**: `pnpm --filter @conexa/site start`
   - **Port**: 3001
   - **Root Directory**: `/apps/site`

4. Configure as variáveis de ambiente
5. Deploy!

---

## Deploy com Docker Compose

### Desenvolvimento Local

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### Produção

1. Edite o `docker-compose.yml` para produção:
   - Remova volumes de desenvolvimento
   - Configure variáveis de ambiente de produção
   - Use imagens de produção

2. Build e deploy:

```bash
# Build das imagens
docker-compose build

# Subir em produção
docker-compose -f docker-compose.prod.yml up -d
```

---

## Migrations do Banco de Dados

### Desenvolvimento

```bash
# Criar nova migration
pnpm db:migrate:dev -- --name nome-da-migration

# Aplicar migrations
pnpm db:migrate:dev
```

### Produção

```bash
# Aplicar migrations (NUNCA use migrate:dev em produção!)
pnpm db:migrate:deploy

# Verificar status
pnpm db:status
```

---

## Variáveis de Ambiente

### Backend (API)

Variáveis **obrigatórias**:
- `DATABASE_URL` - Connection string do PostgreSQL
- `DIRECT_URL` - Connection string para migrations
- `JWT_SECRET` - Secret para JWT tokens
- `JWT_REFRESH_SECRET` - Secret para refresh tokens

Variáveis **opcionais**:
- `REDIS_URL` - Connection string do Redis
- `GEMINI_API_KEY` - Chave da API Gemini (IA)
- `OPENAI_API_KEY` - Chave da API OpenAI (fallback)
- `AWS_*` - Credenciais AWS S3 (upload de arquivos)

### Frontend (Web)

Variáveis **obrigatórias**:
- `VITE_API_BASE_URL` - URL base da API

### Site

Variáveis **obrigatórias**:
- `DATABASE_URL` - Connection string do PostgreSQL

Variáveis **opcionais**:
- `AWS_*` - Credenciais AWS S3
- `STRIPE_*` - Chaves Stripe (pagamentos)

---

## Health Checks

### API

```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### Web

```bash
curl http://localhost:5173
```

Deve retornar HTML da aplicação.

---

## Troubleshooting

### Erro: "Cannot connect to database"

**Solução**:
1. Verifique se o PostgreSQL está rodando
2. Verifique a `DATABASE_URL`
3. Teste a conexão: `psql $DATABASE_URL`

### Erro: "Prisma Client not generated"

**Solução**:
```bash
pnpm db:generate
```

### Erro: "Migration failed"

**Solução**:
1. Verifique o status: `pnpm db:status`
2. Resolva conflitos manualmente
3. Reaplique: `pnpm db:migrate:deploy`

### Erro: "Port already in use"

**Solução**:
1. Verifique processos rodando: `lsof -i :3000`
2. Mate o processo: `kill -9 <PID>`
3. Ou mude a porta no `.env`

---

## Backup e Restore

### Backup do PostgreSQL

```bash
# Backup completo
pg_dump $DATABASE_URL > backup.sql

# Backup apenas dados
pg_dump --data-only $DATABASE_URL > backup-data.sql

# Backup apenas schema
pg_dump --schema-only $DATABASE_URL > backup-schema.sql
```

### Restore

```bash
# Restore completo
psql $DATABASE_URL < backup.sql

# Restore apenas dados
psql $DATABASE_URL < backup-data.sql
```

---

## Monitoramento

### Logs

```bash
# Logs do backend
docker-compose logs -f api

# Logs do frontend
docker-compose logs -f web

# Logs do site
docker-compose logs -f site
```

### Métricas

Recomendamos usar:
- **Prometheus** - Coleta de métricas
- **Grafana** - Visualização
- **Loki** - Logs centralizados

---

## Segurança

### Checklist de Produção

- [ ] Trocar todos os secrets padrão
- [ ] Configurar HTTPS/SSL
- [ ] Configurar CORS adequadamente
- [ ] Habilitar rate limiting
- [ ] Configurar firewall
- [ ] Habilitar backups automáticos
- [ ] Configurar monitoramento
- [ ] Revisar permissões de banco de dados
- [ ] Configurar logs de auditoria

---

## Performance

### Otimizações Recomendadas

1. **Habilitar Redis** para cache
2. **Configurar CDN** para assets estáticos
3. **Habilitar compressão** (gzip/brotli)
4. **Configurar índices** no PostgreSQL
5. **Usar connection pooling** (PgBouncer)

---

## Escalabilidade

### Horizontal Scaling

Para escalar horizontalmente:

1. **API**: Múltiplas instâncias atrás de load balancer
2. **Web**: Servir via CDN
3. **Database**: Read replicas + connection pooling
4. **Redis**: Redis Cluster

### Vertical Scaling

Recursos mínimos recomendados:

**Desenvolvimento**:
- 2 vCPU
- 4 GB RAM
- 20 GB SSD

**Produção (pequeno porte)**:
- 4 vCPU
- 8 GB RAM
- 50 GB SSD

**Produção (médio porte)**:
- 8 vCPU
- 16 GB RAM
- 100 GB SSD

---

## Suporte

Para problemas de deploy, consulte:
- [Documentação Coolify](https://coolify.io/docs)
- [Issues no GitHub](https://github.com/vml-arquivos/conexa-v3.0/issues)
- Email: contato@cocris.org
