# ============================================================================
# COCRIS PEDAGÓGICO — FRONTEND
# Contexto de build: raiz do repositório
# Dockerfile: apps/web/Dockerfile
# ============================================================================

FROM node:20-alpine AS builder

WORKDIR /app/apps/web

# Instalação determinística: usa exatamente o lockfile validado nesta entrega.
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --ignore-scripts

COPY apps/web/ ./

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

# Inclui TypeScript + Vite + geração do PWA. O deploy falha se qualquer etapa
# não puder ser reproduzida.
RUN npm run build

FROM nginx:alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
