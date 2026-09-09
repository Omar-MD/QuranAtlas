import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { expectControlledServiceWorker, seedOnboardedReader, wipeApplicationData } from './fixtures/app'
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
// The pages lane ships no real Mushaf media, so the server also serves an
// in-memory synthetic edition whose crafted index is byte-exact against the
// bodies it serves. The offline downloader proves sanitized, byte-verified
// writes against it; `corruptOnePage` declares page 300 one byte larger than
// the body actually served so the negative test can prove rejection.
const SYNTHETIC_RIWAYAH = 'qaloon'
const SYNTHETIC_EDITION_ID = 'qalun-quran-ws-v1'
const SYNTHETIC_EDITION_LABEL = 'Qalun Quran.ws'
const SYNTHETIC_PAGE_COUNT = 604
const SYNTHETIC_MUSHAF_PREFIX = `/dataset/mushaf-pages/${SYNTHETIC_RIWAYAH}/${SYNTHETIC_EDITION_ID}`
let corruptOnePage = false

function syntheticMushafSvg(page: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 141"><rect width="100" height="141" fill="#ffffff"/><text x="50" y="75" text-anchor="middle" font-size="12">Page ${page}</text></svg>`
}

function paddedMushafPage(page: number): string {
  return String(page).padStart(3, '0')
}

const syntheticMushafManifestJson = JSON.stringify({
  version: 1,
  riwayah: SYNTHETIC_RIWAYAH,
  mushafEditionId: SYNTHETIC_EDITION_ID,
  pageCount: SYNTHETIC_PAGE_COUNT,
  pages: Array.from({ length: SYNTHETIC_PAGE_COUNT }, (_, index) => ({
    page: index + 1,
    assetPath: `pages/${paddedMushafPage(index + 1)}.svg`,
    viewBox: '0 0 100 141',
    displayViewBox: '0 0 100 141',
    firstVerse: { surah: 1, verse: 1 },
  })),
  verseToPage: { '1:1': 1 },
})

function syntheticMushafAssetsJson(): string {
  const manifestUrl = `${SYNTHETIC_MUSHAF_PREFIX}/manifest.json`
  const files = [{ url: manifestUrl, bytes: Buffer.byteLength(syntheticMushafManifestJson) }]
  let totalBytes = files[0].bytes
  for (let page = 1; page <= SYNTHETIC_PAGE_COUNT; page += 1) {
    let bytes = Buffer.byteLength(syntheticMushafSvg(page))
    if (corruptOnePage && page === 300) bytes += 1
    files.push({ url: `${SYNTHETIC_MUSHAF_PREFIX}/pages/${paddedMushafPage(page)}.svg`, bytes })
    totalBytes += bytes
  }
  return JSON.stringify({
    version: 1,
    defaults: { qaloon: SYNTHETIC_EDITION_ID },
    assets: [
      {
        riwayah: SYNTHETIC_RIWAYAH,
        mushafEditionId: SYNTHETIC_EDITION_ID,
        label: SYNTHETIC_EDITION_LABEL,
        pageCount: SYNTHETIC_PAGE_COUNT,
        availability: 'available',
        manifestUrl,
        files,
        totalBytes,
      },
    ],
  })
}

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
      const syntheticJson = (body: string) => {
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(body)
      }
      if (path === '/dataset/indexes/mushaf-assets.json') {
        syntheticJson(syntheticMushafAssetsJson())
        return
      }
      if (path === `${SYNTHETIC_MUSHAF_PREFIX}/manifest.json`) {
        syntheticJson(syntheticMushafManifestJson)
        return
      }
      if (path.startsWith(`${SYNTHETIC_MUSHAF_PREFIX}/pages/`) && path.endsWith('.svg')) {
        const page = Number.parseInt(path.slice(`${SYNTHETIC_MUSHAF_PREFIX}/pages/`.length), 10)
        response.writeHead(200, { 'Content-Type': 'image/svg+xml', Vary: 'Accept-Encoding' })
        response.end(Number.isInteger(page) ? syntheticMushafSvg(page) : '')
        return
      }
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

async function cachedResources(
  page: Parameters<typeof expectControlledServiceWorker>[0],
  resources: Record<string, string>,
) {
  return page.evaluate(
    async (urls) =>
      Object.fromEntries(
        await Promise.all(Object.entries(urls).map(async ([name, url]) => [name, Boolean(await caches.match(url))])),
      ),
    resources,
  )
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
      await expect(page.getByRole('main', { name: 'Search' }).getByRole('status')).toContainText(
        'Search data is not available on this device.',
      )
    })

    await test.step('confirm the synchronized surah is still unfetched while offline', async () => {
      await expect(cachedResources(page, synchronizedReaderResources)).resolves.toEqual({
        text: false,
        translation: false,
      })
    })

    await goOnline()
    await test.step('restore connectivity and retry the missing reader synchronization', async () => {
      await page.goto(`${ORIGIN}/#/s/114`)
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByText(synchronizedVerseText)).toBeVisible()
      await expect(cachedResources(page, synchronizedReaderResources)).resolves.toEqual({
        text: true,
        translation: true,
      })
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

test('downloads the complete Mushaf and reader texts from onboarding for offline reading', async ({ page }) => {
  test.setTimeout(240_000)
  await wipeApplicationData(page, ORIGIN)

  await test.step('offer the complete offline download after fresh onboarding', async () => {
    await page.goto(`${ORIGIN}/#/s/1`)
    await expect(page.getByRole('heading', { name: 'Download for offline reading' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download for offline reading' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Skip for now' })).toBeVisible()
    await expect(page.getByText('Complete Mushaf ·')).toContainText(/ MB$/)
  })

  await test.step('start the download and continue reading immediately', async () => {
    await page.getByRole('button', { name: 'Download for offline reading' }).click()
    await expect(page.getByRole('progressbar', { name: 'Downloading offline reading data' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue reading' }).click()
    await expect(page).toHaveURL(/#\/s\/1$/)
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  })

  await test.step('report both packs downloaded in Settings', async () => {
    await expectControlledServiceWorker(page)
    await page.goto(`${ORIGIN}/#/settings`)
    const region = page.getByRole('region', { name: 'Offline reading data' })
    await expect(region).toBeVisible()
    await expect(region.getByText('Reader texts')).toBeVisible()
    await expect(region.getByText(SYNTHETIC_EDITION_LABEL)).toBeVisible()
    await expect.poll(async () => region.getByText('Downloaded', { exact: true }).count(), { timeout: 120_000 }).toBe(3)
  })

  await test.step('verify sanitized cache entries for both packs and the mushaf index', async () => {
    await expect(
      cachedResources(page, {
        firstPage: `${SYNTHETIC_MUSHAF_PREFIX}/pages/001.svg`,
        midPage: `${SYNTHETIC_MUSHAF_PREFIX}/pages/300.svg`,
        lastPage: `${SYNTHETIC_MUSHAF_PREFIX}/pages/604.svg`,
        editionManifest: `${SYNTHETIC_MUSHAF_PREFIX}/manifest.json`,
        knowledge: '/dataset/knowledge/ayah/114.json',
        mushafIndex: '/dataset/indexes/mushaf-assets.json',
      }),
    ).resolves.toEqual({
      firstPage: true,
      midPage: true,
      lastPage: true,
      editionManifest: true,
      knowledge: true,
      mushafIndex: true,
    })
  })

  await goOffline()
  try {
    await test.step('reload the verse reader offline from downloaded data', async () => {
      await page.reload()
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
    })

    await test.step('render the first and last Mushaf pages offline from sanitized entries', async () => {
      await page.goto(`${ORIGIN}/#/m/1`)
      await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
      await expect(page.getByRole('img', { name: 'Mushaf page 1, Qaloon, beginning near 1:1' })).toBeVisible()
      await page.goto(`${ORIGIN}/#/m/604`)
      await expect(page.getByRole('img', { name: 'Mushaf page 604, Qaloon, beginning near 1:1' })).toBeVisible()
    })
  } finally {
    await goOnline()
  }
})

test('rejects byte-mismatched pack files instead of caching them', async ({ page }) => {
  test.setTimeout(120_000)
  corruptOnePage = true
  try {
    await wipeApplicationData(page, ORIGIN)
    await page.goto(`${ORIGIN}/#/s/1`)
    await page.getByRole('button', { name: 'Download for offline reading' }).click()
    await expect(page.getByRole('progressbar', { name: 'Downloading offline reading data' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue reading' }).click()
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()

    await page.goto(`${ORIGIN}/#/settings`)
    const region = page.getByRole('region', { name: 'Offline reading data' })
    await expect(region).toBeVisible()
    await expect(region.getByText(SYNTHETIC_EDITION_LABEL)).toBeVisible()
    await expect
      .poll(async () => region.getByText('Failed', { exact: true }).count(), { timeout: 120_000 })
      .toBeGreaterThan(0)
    await expect(region.getByText('Downloaded', { exact: true })).toHaveCount(1)
    await expect(
      page.evaluate(async (url) => Boolean(await caches.match(url)), `${SYNTHETIC_MUSHAF_PREFIX}/pages/300.svg`),
    ).resolves.toBe(false)
    await expect(region.getByRole('button', { name: 'Retry' })).toBeVisible()
  } finally {
    corruptOnePage = false
  }
})
