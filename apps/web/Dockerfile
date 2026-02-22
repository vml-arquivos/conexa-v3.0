# ============================================================================
# CONEXA V3.0 - FRONTEND DOCKERFILE (MONOREPO)
# ============================================================================
# Build: React 19 + Vite + TailwindCSS + pnpm workspaces
# Runtime: Nginx Alpine
# ============================================================================
# ---------- Build stage ----------
FROM node:20-alpine AS builder
# Instalar pnpm (versão fixa — evita timeout por download duplo via corepack)
RUN npm install -g pnpm@8.15.1
WORKDIR /app
# Copiar arquivos de workspace da raiz
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copiar todos os packages (dependências internas do monorepo)
COPY packages/ ./packages/
# Copiar o app web
COPY apps/web/ ./apps/web/
# Build args para variáveis de ambiente
ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG VITE_APP_ENV
ARG VITE_ENABLE_OFFLINE
ARG VITE_ENABLE_NOTIFICATIONS
ARG VITE_ENABLE_AI_ASSISTANT
ARG VITE_ENABLE_DEBUG
ARG VITE_DEFAULT_THEME
ARG VITE_DEFAULT_LANGUAGE
ARG VITE_STORAGE_PREFIX
ARG VITE_API_TIMEOUT
# Definir variáveis de ambiente para o build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_APP_ENV=${VITE_APP_ENV}
ENV VITE_ENABLE_OFFLINE=${VITE_ENABLE_OFFLINE}
ENV VITE_ENABLE_NOTIFICATIONS=${VITE_ENABLE_NOTIFICATIONS}
ENV VITE_ENABLE_AI_ASSISTANT=${VITE_ENABLE_AI_ASSISTANT}
ENV VITE_ENABLE_DEBUG=${VITE_ENABLE_DEBUG}
ENV VITE_DEFAULT_THEME=${VITE_DEFAULT_THEME}
ENV VITE_DEFAULT_LANGUAGE=${VITE_DEFAULT_LANGUAGE}
ENV VITE_STORAGE_PREFIX=${VITE_STORAGE_PREFIX}
ENV VITE_API_TIMEOUT=${VITE_API_TIMEOUT}
# Instalar TODAS as deps do workspace com pnpm
RUN pnpm install --frozen-lockfile
# Build apenas o app web usando pnpm filter
RUN pnpm --filter @conexa/web build
# ---------- Runtime stage ----------
FROM nginx:alpine
# Copiar configuração customizada do nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# Copiar build do frontend
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
