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
      // O registro e o manifest são ativados por public/registerSW.js somente
      // em celulares. Isso impede que navegadores desktop ofereçam a instalação
      // do PWA e também remove registros legados que possam servir um app shell
      // antigo após um redeploy.
      injectRegister: false,
      includeAssets: ['branding/cocris/logo-cocris.png', 'vite.svg'],
      manifest: false,
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
        // Os scripts de recuperação precisam vir sempre da rede para também
        // corrigirem instalações antigas do Service Worker.
        globIgnores: ['**/registerSW.js', '**/boot-recovery.js', '**/sw-device-policy.js'],
        // Um Service Worker antigo ainda consegue baixar esta versão e executar
        // a migração. No desktop ele se remove e recarrega o cliente pela rede;
        // no celular o arquivo não altera o funcionamento offline.
        importScripts: ['/sw-device-policy.js'],
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
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('/node_modules/')) {
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router/') ||
              normalizedId.includes('/node_modules/react-router-dom/') ||
              normalizedId.includes('/node_modules/react-is/')
            ) return 'vendor-react'
            if (normalizedId.includes('/node_modules/recharts/') || normalizedId.includes('/node_modules/d3-')) return 'vendor-charts'
            if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-icons'
            if (normalizedId.includes('/node_modules/@tanstack/')) return 'vendor-query'
            if (normalizedId.includes('/node_modules/workbox-') || normalizedId.includes('/node_modules/vite-plugin-pwa/')) return 'vendor-pwa'
          }
        },
      },
    },
  },
})
