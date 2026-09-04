import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { expectControlledServiceWorker, seedOnboardedReader } from './fixtures/app'

// `context.setOffline()` does not propagate to service-worker-initiated fetches
// in Chromium, so a controlled static server stands in for the network: taking
// the server down is a genuine offline state for the whole origin, service
// worker included.
const DIST_ROOT = fileURLToPath(new URL('../../dist/', import.meta.url))
const ORIGIN = 'http://127.0.0.1:4273'
const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

let server: Server

async function goOnline(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(4273, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
}

async function goOffline(): Promise<void> {
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

test.beforeAll(async () => {
  if (!existsSync(join(DIST_ROOT, 'index.html'))) {
    throw new Error('offline suite requires a release build: run `mise run build:release` first')
  }
  server = createServer(async (request, response) => {
    try {
      if (request.method !== 'GET') {
        response.writeHead(405).end()
        return
      }
      const path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname))
      const relative = path === '/' ? 'index.html' : path.replace(/^\//, '')
      const file = join(DIST_ROOT, relative)
      if (!file.startsWith(DIST_ROOT)) {
        response.writeHead(403).end()
        return
      }
      const body = await readFile(file)
      response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' })
      response.end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
  await goOnline()
})

test.afterAll(async () => {
  await goOffline()
})

// The reader syncs the default asset pack at boot, so surah routes always have
// cached text. The search pack registry is intentionally never service-worker
// cached, so an offline search exposes the designed unfetched-data fallback.
const cachedReaderResources = {
  text: '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json',
  translation: '/dataset/translations/bridges/001.json',
}
const synchronizedReaderResources = {
  text: '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/114.json',
  translation: '/dataset/translations/bridges/114.json',
}
const synchronizedVerseText = 'I seek refuge with the Lord of mankind'

async function cachedResources(page: Parameters<typeof expectControlledServiceWorker>[0], resources: Record<string, string>) {
  return page.evaluate(async (urls) => Object.fromEntries(
    await Promise.all(Object.entries(urls).map(async ([name, url]) => [name, Boolean(await caches.match(url))])),
  ), resources)
}

test('preserves the production reader through offline, fallback, retry, and resynchronization', async ({ page }) => {
  await seedOnboardedReader(page, ORIGIN)

  await test.step('warm the production shell and required reader data online', async () => {
    await page.goto(`${ORIGIN}/#/s/1`)
    await expect(page).toHaveURL(/#\/s\/1$/)
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
    await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
    await page.reload()
    await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
    await expectControlledServiceWorker(page)
    await expect(cachedResources(page, cachedReaderResources)).resolves.toEqual({ text: true, translation: true })
  })

  await goOffline()
  try {
    await test.step('reload the controlled shell with cached reader content offline', async () => {
      await page.reload()
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
    })

    await test.step('show a visible fallback for an unfetched route offline', async () => {
      await page.goto(`${ORIGIN}/#/search`)
      await expect(page).toHaveURL(/#\/search(?:\?.*)?$/)
      await expect(page.getByRole('status')).toContainText('Search data is not available on this device.')
    })

    await test.step('confirm the synchronized surah is still unfetched while offline', async () => {
      await expect(cachedResources(page, synchronizedReaderResources)).resolves.toEqual({ text: false, translation: false })
    })

    await goOnline()
    await test.step('restore connectivity and retry the missing reader synchronization', async () => {
      await page.goto(`${ORIGIN}/#/s/114`)
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByText(synchronizedVerseText)).toBeVisible()
      await expect(cachedResources(page, synchronizedReaderResources)).resolves.toEqual({ text: true, translation: true })
    })

    await goOffline()
    await test.step('prove the synchronized result survives another offline reload', async () => {
      await page.reload()
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByText(synchronizedVerseText)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Failed to load reader text' })).toHaveCount(0)
    })
  } finally {
    await goOnline()
  }
})
