# ============================================================================
# CONEXA V3.0 - FRONTEND DOCKERFILE
# ============================================================================
# Build: React 19 + Vite + TailwindCSS
# Runtime: Nginx Alpine
# ============================================================================

# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar package files
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copiar código fonte
COPY . .

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

# Build do frontend
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:alpine

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build do frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
