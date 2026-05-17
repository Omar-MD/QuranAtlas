import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Short git SHA at build time. execFileSync (no shell) keeps the call
// safe even though the args are static — no shell-injection surface.
// Falls back to 'dev' if git unavailable (e.g. sandboxed builds).
let buildSha = 'dev'
try {
  buildSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf-8' }).trim()
} catch { /* keep 'dev' */ }
const buildTime = new Date().toISOString()

// SHA-256 of public/dataset/manifest.json baked into the bundle. The SW
// uses it to verify the fetched manifest before trusting any per-file
// hashes, closing the chain-of-trust hole at sw-handlers.js where a
// manifest-fetch failure (or a swapped manifest) would otherwise leave
// caches written without verification. If the file is missing at build
// time the digest stays null and the SW fails closed on any cache op.
let manifestDigest = null
try {
  const manifestBytes = readFileSync(new URL('./public/dataset/manifest.json', import.meta.url))
  manifestDigest = createHash('sha256').update(manifestBytes).digest('hex')
} catch { /* leave null; SW will fail-closed */ }

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/infra/service-worker',
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
      // Production injectManifest builds take their runtime routes from
      // src/infra/service-worker/sw.js; this top-level Workbox block is kept
      // only because vite-plugin-pwa still reads it for the dev SW path when
      // devOptions.enabled is true.
      //
      // Fonts (woff2) deliberately stay out of precache. A CacheFirst runtime
      // route in src/infra/service-worker/sw.js serves the active riwayah's
      // font without forcing single-riwayah users to download the unused cuts.
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
    rolldownOptions: {
      checks: {
        pluginTimings: false
      }
    },
    rollupOptions: {
      output: {
        // Manual chunks split static-import clusters out of the entry chunk
        // so a hash bump on hot UI code does not invalidate them in every
        // visitor's cache. Dynamic imports (Reader, Hub, Onboarding,
        // SurahList, BookmarksPage) auto-chunk; we only declare chunks
        // here for static-import clusters.
        //
        // Audit R-23 (2026-04-29) found the prior table referenced four
        // files that no longer exist (src/read/index.js, src/navigate/index.js,
        // src/review/hub.js, src/configure/index.js); those rules silently
        // no-op'd. Bootstrap-chunk experiment landed ~2 KB gzip MORE in
        // total eager (chunk wrapper overhead vs. the boot code's tight
        // coupling to entry), so we skip that for now and revisit when
        // audio + sync land and there's a clearer eager-vs-lazy boundary.
        manualChunks(id) {
          if (id.includes('src/mark/')) { return 'mark' }
          if (id.includes('src/configure/about/About.svelte') || id.includes('src/configure/about/pwa-install')) { return 'about' }
        }
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __MANIFEST_DIGEST__: JSON.stringify(manifestDigest)
  }
})
