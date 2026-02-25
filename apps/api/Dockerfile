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
COPY package.json package-lock.json ./

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
CMD ["./entrypoint.sh"]
