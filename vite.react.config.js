import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  const isProductionDeployment = process.env.VITE_QURANATLAS_DEPLOY_TARGET === 'production'

  return {
    root: 'src-react',
    publicDir: 'public',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: {
          name: isProductionDeployment ? 'QuranAtlas' : 'QuranAtlas React Preview',
          short_name: 'QuranAtlas',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#8a5a21',
          background_color: '#fbf7ef',
        },
        workbox: {
          cacheId: isProductionDeployment ? 'quranatlas' : 'quranatlas-react-preview',
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        },
      }),
    ],
    build: {
      outDir: '../dist-react',
      emptyOutDir: true,
      target: 'es2020',
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4175,
      strictPort: true,
    },
  }
})
