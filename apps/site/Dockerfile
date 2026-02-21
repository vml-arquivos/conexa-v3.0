# ─── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Build args injetados pelo Coolify
ARG VITE_SITE_URL
ARG DATABASE_URL

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm@9

# Copiar arquivos de dependência
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar TODAS as dependências (incluindo devDependencies para o build)
# NODE_ENV deve ser development aqui para que TypeScript, Vite e esbuild sejam instalados
ENV NODE_ENV=development
RUN pnpm install --no-frozen-lockfile

# Copiar código-fonte
COPY . .

# Expor variáveis de build para o Vite
ENV VITE_SITE_URL=$VITE_SITE_URL

# Build: Vite (frontend) + esbuild (backend)
RUN pnpm run build

# ─── Stage 2: Production ───────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Instalar pnpm
RUN npm install -g pnpm@9

# Copiar apenas arquivos necessários para instalar dependências de produção
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar somente dependências de produção
RUN pnpm install --no-frozen-lockfile --prod

# Copiar artefatos do build
COPY --from=builder /app/dist ./dist

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Iniciar servidor
CMD ["node", "dist/index.js"]
