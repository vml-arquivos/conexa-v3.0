# Backup automático diário do Conexa V3.0 com Google Drive

## Estado atual

O repositório já tinha backup local por `scripts/backup-database.sh` e agendamento por `scripts/setup-backup-cron.sh`.
A evolução atual deixa o backup pronto para produção com:

- backup diário automático às 03:00 Brasília;
- dump PostgreSQL em formato `custom` e `.sql`;
- inventário de tabelas/registros;
- cópia do volume PostgreSQL quando houver volume nomeado;
- manifesto do backup;
- SHA256 para validação;
- retenção local;
- upload opcional automático para Google Drive via `rclone`;
- retenção remota;
- status via `scripts/backup-status.sh`.

## O backup vai direto para o Drive?

Sim, depois de uma configuração única do `rclone` na VPS.
O sistema não precisa de clique diário, não precisa abrir painel e não depende do usuário depois de configurado.

## Configuração única do Google Drive

Na VPS:

```bash
apt-get update
apt-get install -y rclone cron
rclone config
```

Crie um remote chamado, por exemplo:

```txt
conexa-drive
```

Depois edite:

```bash
nano /etc/conexa/backup.env
```

Configure:

```env
DB_NAME=conexa
BACKUP_ROOT=/root/backups-conexa
BACKUP_RETENTION_LOCAL=30
BACKUP_REMOTE=conexa-drive:Backups/Conexa
BACKUP_RETENTION_REMOTE_DAYS=90
```

## Ativar backup diário

Na raiz do repositório:

```bash
bash scripts/setup-backup-cron.sh
```

Esse comando já executa um backup de teste imediatamente.

## Ver status

```bash
bash scripts/backup-status.sh
```

## Rodar backup manual

```bash
bash scripts/backup-database.sh
```

## Ver logs

```bash
tail -f /var/log/conexa-backup.log
```

## O que não é alterado

O backup é somente leitura. Ele não altera:

- matriz curricular;
- planos de aula;
- planejamentos;
- diários;
- RDICs;
- dados históricos;
- schema Prisma;
- migrations.

## Restauração

O pacote gerado contém:

- `.dump` para restauração com `pg_restore`;
- `.sql` para restauração com `psql`;
- manifesto;
- inventário;
- SHA256.

Antes de restaurar em produção, sempre restaurar primeiro em ambiente de teste.
