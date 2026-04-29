import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Short git SHA at build time. execFileSync (no shell) keeps the call
// safe even though the args are static — no shell-injection surface.
// Falls back to 'dev' if git unavailable (e.g. sandboxed builds).
let buildSha = 'dev'
try {
  buildSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf-8' }).trim()
} catch { /* keep 'dev' */ }
const buildTime = new Date().toISOString()

export default defineConfig({
  plugins: [
    svelte(),
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
      // With strategies: 'injectManifest' the `workbox.*` keys are silently
       // ignored — `globPatterns` and `runtimeCaching` must live under
       // top-level `injectManifest` and inside src/sw.js respectively.
       //
       // Fonts (woff2) deliberately EXCLUDED from precache — they're handled
       // by a CacheFirst runtime route in src/sw.js. Single-riwayah users
       // would otherwise pay ~180 KB up-front for the two unused KFGQPC
       // riwayah cuts. The active riwayah's woff2 is fetched at boot by
       // `core/font-loader.ts` (which keys off the hydrated `settings.riwayah`)
       // and cached for the deploy lifetime; other-riwayah cuts arrive only
       // when the user switches via Settings.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html}']
      },
      workbox: {
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
          if (id.includes('src/about/About.svelte')) { return 'about' }
        }
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_TIME__: JSON.stringify(buildTime)
  }
})
