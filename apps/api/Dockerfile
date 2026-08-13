# syntax=docker/dockerfile:1
# =========================
# Builder (devDeps + prisma generate + build + prune)
# =========================
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV CI=true
# Prisma em Debian slim precisa do openssl para geração do client
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Copiar o schema.prisma antes do npm ci para que qualquer mudanca no schema
# invalide o cache do Docker e force rebuild completo (npm ci + prisma generate).
# Sem isto, o Docker pode usar o Prisma Client cacheado de um build anterior
# que nao conhece modelos adicionados por migrations recentes (ex: MaterialRequestItem).
COPY prisma ./prisma
# npm ci (não "npm install"): instala exatamente o que está no package-lock.json,
# sem rodar o algoritmo de resolução de dependências do npm install. É mais
# rápido, determinístico, e falha imediatamente com um erro claro se o
# lockfile estiver dessincronizado do package.json — em vez de arriscar picos
# de memória maiores durante a resolução, que em servidores com pouca RAM
# podem terminar em OOM-kill silencioso no meio do build (sem nenhuma
# mensagem de erro do npm, só o processo morrendo — foi o que aconteceu no
# deploy de 2026-08-13 14:55: o log parava logo após os avisos de pacotes
# depreciados, sem nenhum "npm ERR!", com exit code 255).
RUN npm ci --include=dev --ignore-scripts
COPY . .
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
# Remove devDependencies, mas mantém o Prisma Client gerado dentro do node_modules
RUN npm prune --omit=dev
# =========================
# Runner (prod runtime + healthcheck tools + node_modules vindo do builder)
# =========================
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# postgresql-client: necessário para o entrypoint usar psql para resolver migrations FAILED
# wget: usado pelo Coolify healthcheck
# curl: usado pela aplicação
# openssl + ca-certificates: necessários para Prisma e HTTPS
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
    wget \
    curl \
    openssl \
    ca-certificates \
    postgresql-client \
  && rm -rf /var/lib/apt/lists/*
# Copia o node_modules já "podado" do builder (contém Prisma Client gerado)
COPY --from=builder /app/node_modules ./node_modules
# Copia artefatos e metadados do app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/datasets ./datasets
# Arquivos CSV usados pelo seed de catálogo (catalogo_pedagogico.csv, catalogo_higiene_pessoal.csv)
COPY --from=builder /app/data ./data
COPY package.json package-lock.json ./
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
CMD ["./entrypoint.sh"]
