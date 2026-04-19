import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'QuranAtlas',
        short_name: 'QuranAtlas',
        description: 'Read, reflect, remember.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/dataset\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quran-dataset-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/reader/index.js')) { return 'reader' }
          if (id.includes('src/nav/index.js')) { return 'nav' }
          if (id.includes('src/marks/')) { return 'marks' }
          if (id.includes('src/review/hub.js')) { return 'review' }
          if (id.includes('src/settings/index.js')) { return 'settings' }
          if (id.includes('src/about/index.js')) { return 'about' }
        }
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  }
})
