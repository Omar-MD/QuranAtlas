import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  collectPublicAssetFiles,
  publicShellAssetEntries,
  releaseRuntimeAssetEntries,
  removeOutputAssetEntries,
  readPublicAssetFile,
} from './scripts/ci/public-assets.mjs'

export const datasetRuntimeCaching = {
  urlPattern: ({ url }) => url.pathname.startsWith('/dataset/')
    && !url.pathname.startsWith('/dataset/search/')
    && url.pathname !== '/dataset/indexes/mushaf-assets.json',
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
}

export const mushafIndexRuntimeCaching = {
  urlPattern: ({ url }) => url.pathname === '/dataset/indexes/mushaf-assets.json',
  handler: 'NetworkFirst',
  options: {
    cacheName: 'quran-atlas-runtime-mushaf-index-v1',
    networkTimeoutSeconds: 3,
    cacheableResponse: { statuses: [0, 200] },
    expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
  },
}

function quranAtlasPublicShellAssetsPlugin(root) {
  let outputDir

  return {
    name: 'quranatlas-public-shell-assets',
    apply: 'build',
    configResolved(config) {
      outputDir = path.resolve(config.root, config.build.outDir)
    },
    async generateBundle() {
      const files = await collectPublicAssetFiles({
        root,
        entries: publicShellAssetEntries,
      })

      for (const file of files) {
        this.emitFile({
          type: 'asset',
          fileName: file.fileName,
          source: await readPublicAssetFile(file),
        })
      }
    },
    async closeBundle() {
      await removeOutputAssetEntries({
        outDir: outputDir,
        entries: releaseRuntimeAssetEntries,
      })
    },
  }
}

export default defineConfig(() => {
  const root = fileURLToPath(new URL('.', import.meta.url))
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
      quranAtlasPublicShellAssetsPlugin(root),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifestFilename: 'manifest-20260612-icon-v2.webmanifest',
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
              src: '/icons/quranatlas-icon-192-v2.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/quranatlas-icon-512-v2.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/quranatlas-icon-maskable-512-v2.png',
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
          globIgnores: ['**/dataset/**', '**/search-packs/**'],
          runtimeCaching: [
            mushafIndexRuntimeCaching,
            datasetRuntimeCaching,
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
      copyPublicDir: false,
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
