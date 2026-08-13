import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const BUILD_ID = `${Date.now()}`;

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['branding/cocris/logo-cocris.png', 'vite.svg'],
      manifest: {
        name: 'COCRIS Pedagógico',
        short_name: 'COCRIS',
        description: 'Sistema de gestão pedagógica para educação infantil',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/app/mobile',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: 'branding/cocris/logo-cocris.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'branding/cocris/logo-cocris.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Chamada', url: '/app/mobile/chamada', description: 'Registrar chamada da turma' },
          { name: 'Diário', url: '/app/mobile/diario', description: 'Escrever no diário da turma' },
          { name: 'Observação', url: '/app/mobile/observacao', description: 'Observação individual de criança' },
        ],
        categories: ['education', 'productivity'],
      },
      workbox: {
        // Aumentar limite para arquivos grandes (chunks do recharts etc.)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
        // Cache estratégico: app shell sempre do cache, dados da rede com fallback
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // API: network-first com fallback para cache (dados frescos quando online)
            urlPattern: /^https:\/\/apicocris\.casadf\.com\.br\/(?!auth).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Auth: sempre da rede (tokens não podem ser stale)
            urlPattern: /^https:\/\/apicocris\.casadf\.com\.br\/auth.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Assets estáticos: cache-first (imagens, fontes)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        // Background sync para ações offline
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/health/],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react-is'],
  },
  build: {
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('react-is')) return 'vendor-react'
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            if (id.includes('lucide-react')) return 'vendor-icons'
            if (id.includes('@tanstack')) return 'vendor-query'
            if (id.includes('workbox') || id.includes('vite-plugin-pwa')) return 'vendor-pwa'
            return 'vendor'
          }
        },
      },
    },
  },
})
