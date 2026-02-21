# ─── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Build args injetados pelo Coolify
ARG VITE_SITE_URL
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG DATABASE_URL

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm@9

# Copiar arquivos de dependência
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# NODE_ENV=development para instalar devDependencies (Vite, TypeScript, esbuild)
ENV NODE_ENV=development
RUN pnpm install --no-frozen-lockfile

# Copiar código-fonte
COPY . .

# Expor variáveis de build para o Vite (VITE_ são incorporadas no bundle)
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

# Build: Vite (frontend) + esbuild (backend)
# --external:vite e outros plugins garantem que devDependencies de build
# não sejam incluídas como referências externas no bundle de produção
RUN pnpm run build

# ─── Stage 2: Production ───────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Porta 3001 para não conflitar com a API (porta 3000)
ENV PORT=3001

# Instalar wget para healthcheck e pnpm
RUN apk add --no-cache wget && npm install -g pnpm@9

# Copiar apenas arquivos necessários para dependências de produção
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Instalar somente dependências de produção (sem devDependencies)
RUN pnpm install --no-frozen-lockfile --prod

# Copiar artefatos do build (frontend + servidor compilado)
COPY --from=builder /app/dist ./dist

# Expor porta
EXPOSE 3001

# Health check na porta correta
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Iniciar servidor
CMD ["node", "dist/index.js"]
