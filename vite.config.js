import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  const isProductionDeployment = process.env.VITE_QURANATLAS_DEPLOY_TARGET !== 'preview'

  return {
    plugins: [
      {
        name: 'quranatlas-deploy-target-marker',
        transformIndexHtml() {
          return [
            {
              tag: 'meta',
              attrs: {
                name: 'quranatlas-deploy-target',
                content: isProductionDeployment ? 'production' : 'preview',
              },
              injectTo: 'head',
            },
          ]
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: 'QuranAtlas',
          short_name: 'QuranAtlas',
          description: 'Read, reflect, remember.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#8a5a21',
          background_color: '#fbf7ef',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cacheId: 'quranatlas',
          cleanupOutdatedCaches: true,
          importScripts: ['wird-notification-sw.js'],
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
          globIgnores: ['**/dataset/**'],
          runtimeCaching: [
            {
              urlPattern: /\/dataset\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-atlas-runtime-dataset-v1',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 20_000,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': new URL('.', import.meta.url).pathname,
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2020',
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  }
})
