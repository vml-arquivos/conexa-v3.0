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
        // O minificador do Workbox encerra o worker prematuramente em alguns
        // builders. O SW continua sendo gerado para produção, apenas sem a
        // etapa de minificação que tornava o deploy não determinístico.
        mode: 'development',
        disableDevLogs: true,
        sourcemap: false,
        // Aumentar limite para arquivos grandes (chunks do recharts etc.)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
        cleanupOutdatedCaches: true,
        // Somente o app shell e arquivos públicos podem ser armazenados.
        // Dados autenticados da API têm o PostgreSQL como fonte única da verdade.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
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
