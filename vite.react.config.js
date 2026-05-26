import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { createReadStream, stat } from 'node:fs'
import { extname, resolve } from 'node:path'

const datasetRoot = resolve('public/dataset')
const fontRoot = resolve('public/fonts')

const datasetContentTypes = {
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function serveReactDataset(req, res, next) {
  const rawUrl = req.url ?? ''
  if (!rawUrl.startsWith('/dataset/')) {
    next()
    return
  }

  let pathname = ''
  try {
    pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname)
  } catch {
    res.statusCode = 400
    res.end('Bad dataset URL')
    return
  }

  const relativePath = pathname.slice('/dataset/'.length)
  const filePath = resolve(datasetRoot, relativePath)
  if (filePath !== datasetRoot && !filePath.startsWith(`${datasetRoot}/`)) {
    res.statusCode = 403
    res.end('Forbidden dataset URL')
    return
  }

  stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.statusCode = 404
      res.end('Dataset file not found')
      return
    }
    res.setHeader('Content-Type', datasetContentTypes[extname(filePath)] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(res)
  })
}

function serveReactFonts(req, res, next) {
  const rawUrl = req.url ?? ''
  if (!rawUrl.startsWith('/fonts/')) {
    next()
    return
  }

  let pathname = ''
  try {
    pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname)
  } catch {
    res.statusCode = 400
    res.end('Bad font URL')
    return
  }

  const relativePath = pathname.slice('/fonts/'.length)
  const filePath = resolve(fontRoot, relativePath)
  if (filePath !== fontRoot && !filePath.startsWith(`${fontRoot}/`)) {
    res.statusCode = 403
    res.end('Forbidden font URL')
    return
  }

  stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.statusCode = 404
      res.end('Font file not found')
      return
    }
    res.setHeader('Content-Type', extname(filePath) === '.woff2' ? 'font/woff2' : 'application/octet-stream')
    createReadStream(filePath).pipe(res)
  })
}

function reactDatasetPreviewPlugin() {
  return {
    name: 'quranatlas-react-dataset-preview',
    configureServer(server) {
      server.middlewares.use(serveReactFonts)
      server.middlewares.use(serveReactDataset)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveReactFonts)
      server.middlewares.use(serveReactDataset)
    },
  }
}

export default defineConfig(() => {
  const isProductionDeployment = process.env.VITE_QURANATLAS_DEPLOY_TARGET === 'production'

  return {
    root: 'src-react',
    publicDir: 'public',
    plugins: [
      {
        name: 'quranatlas-react-deploy-target-marker',
        transformIndexHtml() {
          return [
            {
              tag: 'meta',
              attrs: {
                name: 'quranatlas-react-deploy-target',
                content: isProductionDeployment ? 'production' : 'preview',
              },
              injectTo: 'head',
            },
          ]
        },
      },
      reactDatasetPreviewPlugin(),
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
