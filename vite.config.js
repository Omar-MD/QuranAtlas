import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/reader/') || id.includes('/src/navigation/')) return 'reader';
          if (id.includes('/src/dataset/') || id.includes('/src/offline/')) return 'dataset';
          if (id.includes('/src/marks/') || id.includes('/src/review/')) return 'marks-review';
          if (id.includes('/src/settings/') || id.includes('/src/about/')) return 'settings';
          // src/core/, src/a11y/, src/safety/ → default (shell) chunk
        },
      },
    },
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      // Chrome 112 = Android 12+ floor; enables native nesting, color-mix, etc.
      targets: { chrome: 112 },
    },
  },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'QuranAtlas',
        short_name: 'QuranAtlas',
        description: 'Distraction-free Quran reader',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Include all app shell assets in precache; exclude dataset files (user-triggered download)
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        globIgnores: ['**/dataset/**'],
      },
    }),
  ],
});
