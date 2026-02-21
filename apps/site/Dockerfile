# ─── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy dependency files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build (Vite frontend + esbuild backend)
RUN pnpm run build

# ─── Stage 2: Production ───────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install pnpm for production deps only
RUN npm install -g pnpm@9

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start
CMD ["node", "dist/index.js"]
