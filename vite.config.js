import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

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
        manualChunks: {
          reader: ['./src/reader/index.js'],
          nav: ['./src/nav/index.js'],
          marks: ['./src/marks/store.js', './src/marks/editor.js', './src/marks/indicator.js'],
          review: ['./src/review/hub.js'],
          settings: ['./src/settings/index.js'],
          about: ['./src/about/index.js']
        }
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0')
  }
})
