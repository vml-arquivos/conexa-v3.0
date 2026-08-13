# 🐘 PostgreSQL no Coolify - Guia Completo

**Data**: 19 de Fevereiro de 2026  
**Versão PostgreSQL**: 16 (recomendado)

---

## ❓ Pergunta Frequente

### "Preciso instalar PostgreSQL manualmente na VPS ou o Coolify faz isso automaticamente?"

**Resposta**: ✅ **O Coolify faz TUDO automaticamente!**

Você **NÃO precisa**:
- ❌ Instalar PostgreSQL manualmente na VPS
- ❌ Configurar PostgreSQL via SSH
- ❌ Criar usuários e bancos manualmente
- ❌ Configurar portas e permissões
- ❌ Gerenciar containers Docker manualmente

O Coolify vai:
- ✅ Baixar a imagem Docker do PostgreSQL
- ✅ Criar o container automaticamente
- ✅ Configurar usuário e senha
- ✅ Criar o banco de dados
- ✅ Expor a porta internamente
- ✅ Gerenciar volumes para persistência
- ✅ Fazer backups (se configurado)

---

## 🎯 Como Funciona

### Passo 1: Você Cria o Banco no Coolify

No painel do Coolify:
1. Clique em **"Databases"**
2. Clique em **"+ Add Database"**
3. Selecione **"PostgreSQL"**
4. Preencha os campos:
   - Name: `conexa-v3-db`
   - Database: `conexa`
   - Username: `conexa_user`
   - Password: `[senha forte]`
5. Clique em **"Create"**

### Passo 2: Coolify Faz o Deploy

O Coolify automaticamente:
1. Baixa a imagem `postgres:16-alpine` do Docker Hub
2. Cria um container Docker
3. Configura variáveis de ambiente
4. Monta volume para persistência de dados
5. Expõe porta 5432 internamente
6. Inicia o PostgreSQL
7. Cria o banco de dados `conexa`
8. Cria o usuário `conexa_user` com a senha fornecida

### Passo 3: Você Obtém a Connection String

Após criado, o Coolify fornece:
```
postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]]@conexa-v3-db:5432/conexa
```

### Passo 4: Você Usa no Backend

Configure a variável de ambiente no backend:
```bash
DATABASE_URL=postgresql://[USUARIO]:[SENHA]@[HOST]:[PORTA]/[BANCO]]@conexa-v3-db:5432/conexa
```

### Passo 5: Execute as Migrations

Após o deploy do backend:
```bash
cd apps/api
npx prisma migrate deploy
```

**Pronto!** O banco está funcionando! 🎉

---

## 🔧 Detalhes Técnicos

### Container Docker

O Coolify cria um container Docker com:

```yaml
Image: postgres:16-alpine
Container Name: conexa-v3-db
Port: 5432 (interno)
Volume: /var/lib/postgresql/data
Environment:
  POSTGRES_DB: conexa
  POSTGRES_USER: conexa_user
  POSTGRES_PASSWORD: [sua senha]
```

### Rede Interna

O PostgreSQL fica em uma **rede Docker interna** do Coolify:
- Acessível por outros containers via nome: `conexa-v3-db`
- **NÃO** exposto publicamente na internet
- Seguro e isolado

### Persistência de Dados

Os dados são salvos em um **volume Docker**:
- Path: `/var/lib/postgresql/data`
- Persiste mesmo se o container for recriado
- Backup automático (se configurado)

---

## 🆚 PostgreSQL vs PostGIS

### O Que É PostGIS?

**PostGIS** é uma **extensão** do PostgreSQL que adiciona suporte a dados geoespaciais (mapas, coordenadas, geometrias).

### Você Precisa de PostGIS?

**Provavelmente NÃO** para o Conexa V3.0, a menos que você precise de:
- 📍 Localização geográfica de unidades
- 🗺️ Mapas interativos
- 📏 Cálculo de distâncias entre pontos
- 🌍 Análise geoespacial

### Como Usar PostGIS no Coolify

Se você **realmente precisar** de PostGIS:

#### Opção 1: Usar Imagem PostGIS (Recomendado)

No Coolify, ao criar o banco:
1. Selecione **"PostgreSQL"**
2. Em **"Advanced Settings"**
3. Mude a imagem para: `postgis/postgis:16-3.4-alpine`

Pronto! PostGIS estará disponível.

#### Opção 2: Instalar Extensão Manualmente

Após criar o PostgreSQL normal:
1. Conecte ao banco via console do Coolify
2. Execute:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Recomendação

Para o Conexa V3.0:
- ✅ Use **PostgreSQL normal** (sem PostGIS)
- ✅ Mais leve e rápido
- ✅ Suficiente para todas as funcionalidades
- ✅ Menos complexidade

Se no futuro precisar de geolocalização:
- ⏳ Adicione PostGIS depois
- ⏳ Não afeta dados existentes
- ⏳ Simples de instalar

---

## 📊 Especificações Recomendadas

### Para Desenvolvimento/Teste

```
PostgreSQL Version: 16
Max Connections: 20
Shared Buffers: 128MB
Work Mem: 4MB
Maintenance Work Mem: 64MB
```

### Para Produção (Pequena)

```
PostgreSQL Version: 16
Max Connections: 100
Shared Buffers: 256MB
Work Mem: 8MB
Maintenance Work Mem: 128MB
```

### Para Produção (Média)

```
PostgreSQL Version: 16
Max Connections: 200
Shared Buffers: 512MB
Work Mem: 16MB
Maintenance Work Mem: 256MB
```

### Para Produção (Grande)

```
PostgreSQL Version: 16
Max Connections: 500
Shared Buffers: 1GB
Work Mem: 32MB
Maintenance Work Mem: 512MB
```

---

## 🔒 Segurança

### Boas Práticas

1. **Senha Forte**
   - Mínimo 16 caracteres
   - Letras maiúsculas e minúsculas
   - Números e símbolos
   - Exemplo: `Cx3@Pg$qL9#mN2vR`

2. **Não Expor Publicamente**
   - PostgreSQL deve ficar na rede interna
   - Apenas containers do Coolify podem acessar
   - Use SSH tunnel se precisar acessar externamente

3. **Backup Regular**
   - Configure backup automático no Coolify
   - Frequência: Diária (02:00)
   - Retenção: 30 dias
   - Teste restore periodicamente

4. **Monitoramento**
   - Configure alertas de espaço em disco
   - Monitore conexões ativas
   - Acompanhe logs de erro

5. **Atualizações**
   - Mantenha PostgreSQL atualizado
   - Teste atualizações em staging primeiro
   - Faça backup antes de atualizar

---

## 🧪 Como Testar a Conexão

### Opção 1: Via Console do Coolify

1. No Coolify, vá em **"Databases"**
2. Clique no banco `conexa-v3-db`
3. Clique em **"Console"**
4. Execute:
```sql
SELECT version();
```

Deve retornar a versão do PostgreSQL.

### Opção 2: Via Backend

1. No backend, execute:
```bash
cd apps/api
npx prisma db pull
```

Se conectar com sucesso, está funcionando!

### Opção 3: Via psql (Avançado)

Se tiver acesso SSH à VPS:
```bash
docker exec -it conexa-v3-db psql -U conexa_user -d conexa
```

---

## 🔧 Troubleshooting

### Problema 1: "Connection refused"

**Causa**: Backend não consegue conectar ao banco

**Solução**:
1. Verifique se o banco está rodando (status "Running")
2. Verifique a `DATABASE_URL` no backend
3. Verifique se o nome do container está correto: `conexa-v3-db`

### Problema 2: "Authentication failed"

**Causa**: Senha incorreta

**Solução**:
1. Verifique a senha na connection string
2. Verifique se a senha está correta no Coolify
3. Recrie o banco se necessário

### Problema 3: "Database does not exist"

**Causa**: Banco `conexa` não foi criado

**Solução**:
1. Conecte ao PostgreSQL via console
2. Execute: `CREATE DATABASE conexa;`
3. Ou recrie o banco no Coolify

### Problema 4: "Too many connections"

**Causa**: Limite de conexões atingido

**Solução**:
1. Aumente `max_connections` nas configurações
2. Verifique se há connection leaks no código
3. Reinicie o banco

### Problema 5: "Disk full"

**Causa**: Espaço em disco esgotado

**Solução**:
1. Limpe logs antigos
2. Faça backup e delete dados antigos
3. Aumente o volume do disco

---

## 📚 Recursos Adicionais

### Documentação Oficial

- **PostgreSQL**: https://www.postgresql.org/docs/16/
- **Coolify**: https://coolify.io/docs
- **Prisma**: https://www.prisma.io/docs

### Ferramentas Úteis

- **pgAdmin**: Interface gráfica para PostgreSQL
- **DBeaver**: Cliente universal de banco de dados
- **TablePlus**: Cliente moderno e elegante

### Comandos Úteis

```bash
# Ver logs do PostgreSQL
docker logs conexa-v3-db

# Backup manual
docker exec conexa-v3-db pg_dump -U conexa_user conexa > backup.sql

# Restore manual
docker exec -i conexa-v3-db psql -U conexa_user conexa < backup.sql

# Ver conexões ativas
docker exec conexa-v3-db psql -U conexa_user -d conexa -c "SELECT * FROM pg_stat_activity;"

# Ver tamanho do banco
docker exec conexa-v3-db psql -U conexa_user -d conexa -c "SELECT pg_size_pretty(pg_database_size('conexa'));"
```

---

## ✅ Checklist de Configuração

Antes de considerar o banco pronto:

- [ ] PostgreSQL criado no Coolify
- [ ] Status: **Running** (verde)
- [ ] Connection string obtida e anotada
- [ ] Senha forte configurada
- [ ] Backup automático configurado
- [ ] Variável `DATABASE_URL` configurada no backend
- [ ] Migrations executadas com sucesso
- [ ] Conexão testada
- [ ] Logs sem erros
- [ ] Espaço em disco suficiente (mínimo 20GB)

---

## 🎉 Conclusão

**Você NÃO precisa instalar PostgreSQL manualmente!**

O Coolify faz tudo automaticamente:
1. ✅ Cria o container Docker
2. ✅ Configura usuário e senha
3. ✅ Cria o banco de dados
4. ✅ Gerencia volumes
5. ✅ Expõe internamente

Você só precisa:
1. ✅ Criar o banco no painel do Coolify
2. ✅ Copiar a connection string
3. ✅ Configurar no backend
4. ✅ Executar migrations

**Simples, rápido e seguro!** 🚀

---

**Desenvolvido por**: Manus AI Agent  
**Última atualização**: 19 de Fevereiro de 2026  
**Versão**: 1.0.0
