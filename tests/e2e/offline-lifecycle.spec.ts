import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
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
const SYNTHETIC_CUSTOM_EDITION_ID = 'qalun-custom-v2-v1'
const SYNTHETIC_CUSTOM_EDITION_LABEL = 'Qalun Custom V2'
const SYNTHETIC_PAGE_COUNT = 604
const SYNTHETIC_MUSHAF_PREFIX = `/dataset/mushaf-pages/${SYNTHETIC_RIWAYAH}/${SYNTHETIC_EDITION_ID}`
const SYNTHETIC_CUSTOM_PREFIX = `/dataset/mushaf-pages/${SYNTHETIC_RIWAYAH}/${SYNTHETIC_CUSTOM_EDITION_ID}`
let corruptOnePage = false

function syntheticMushafSvg(page: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 141"><rect width="100" height="141" fill="#ffffff"/><text x="50" y="75" text-anchor="middle" font-size="12">Page ${page}</text></svg>`
}

function paddedMushafPage(page: number): string {
  return String(page).padStart(3, '0')
}

// Minimal decodable 1×1 lossy WebP; every v2 rendition body is this buffer so
// descriptor bytes/sha256 stay byte-exact against what the server serves.
const SYNTHETIC_WEBP_BODY = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
const SYNTHETIC_WEBP_SHA256 = createHash('sha256').update(SYNTHETIC_WEBP_BODY).digest('hex')

function syntheticWebpDescriptor(page: number, width: number, height: number) {
  return {
    assetPath: `pages/${paddedMushafPage(page)}-${width}.webp`,
    bytes: SYNTHETIC_WEBP_BODY.byteLength,
    sha256: SYNTHETIC_WEBP_SHA256,
    width,
    height,
    mimeType: 'image/webp',
  }
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

const syntheticCustomManifestJson = JSON.stringify({
  version: 2,
  riwayah: SYNTHETIC_RIWAYAH,
  mushafEditionId: SYNTHETIC_CUSTOM_EDITION_ID,
  pageCount: SYNTHETIC_PAGE_COUNT,
  pages: Array.from({ length: SYNTHETIC_PAGE_COUNT }, (_, index) => {
    const page = index + 1
    const preview = syntheticWebpDescriptor(page, 1280, 1806)
    const full = syntheticWebpDescriptor(page, 2136, 3014)
    return {
      page,
      firstVerse: { surah: 1, verse: 1 },
      framing: { textFrame: { x: 0, y: 0, width: 1, height: 1 }, sideLane: 'none' },
      media: { kind: 'external-image', fallback: full, sources: [preview, full] },
    }
  }),
  verseToPage: { '1:1': 1 },
})
const SYNTHETIC_CUSTOM_MANIFEST_SHA256 = createHash('sha256').update(syntheticCustomManifestJson).digest('hex')

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

  const customManifestUrl = `${SYNTHETIC_CUSTOM_PREFIX}/manifest.json`
  const customFiles = [
    {
      url: customManifestUrl,
      bytes: Buffer.byteLength(syntheticCustomManifestJson),
      sha256: SYNTHETIC_CUSTOM_MANIFEST_SHA256,
    },
  ]
  const customPageUrls: string[] = []
  for (let page = 1; page <= SYNTHETIC_PAGE_COUNT; page += 1) {
    for (const descriptor of [syntheticWebpDescriptor(page, 1280, 1806), syntheticWebpDescriptor(page, 2136, 3014)]) {
      customFiles.push({ url: `${SYNTHETIC_CUSTOM_PREFIX}/${descriptor.assetPath}`, ...descriptor })
    }
    customPageUrls.push(`${SYNTHETIC_CUSTOM_PREFIX}/pages/${paddedMushafPage(page)}-2136.webp`)
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
      {
        riwayah: SYNTHETIC_RIWAYAH,
        mushafEditionId: SYNTHETIC_CUSTOM_EDITION_ID,
        label: SYNTHETIC_CUSTOM_EDITION_LABEL,
        pageCount: SYNTHETIC_PAGE_COUNT,
        availability: 'available',
        version: 'v2',
        manifestUrl: customManifestUrl,
        pageUrls: customPageUrls,
        files: customFiles,
        totalBytes: customFiles.reduce((total, file) => total + file.bytes, 0),
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
      if (path === `${SYNTHETIC_CUSTOM_PREFIX}/manifest.json`) {
        syntheticJson(syntheticCustomManifestJson)
        return
      }
      if (path.startsWith(`${SYNTHETIC_CUSTOM_PREFIX}/pages/`) && path.endsWith('.webp')) {
        response.writeHead(200, { 'Content-Type': 'image/webp' })
        response.end(SYNTHETIC_WEBP_BODY)
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
  test.setTimeout(240_000)
  await seedOnboardedReader(page, ORIGIN)

  await test.step('warm the production shell while the required reader pack installs', async () => {
    await page.goto(`${ORIGIN}/#/s/1`)
    await expect(page).toHaveURL(/#\/s\/1$/)
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
    await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
    await page.reload()
    await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
    await expectControlledServiceWorker(page)
    await expect(cachedResources(page, cachedReaderResources)).resolves.toEqual({ text: true, translation: true })
    // The verse/reader-text pack is required offline data: launch installs it
    // automatically, so even never-visited surahs become available offline.
    await expect
      .poll(async () => Object.values(await cachedResources(page, synchronizedReaderResources)).every(Boolean), {
        timeout: 120_000,
      })
      .toBe(true)
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

    await test.step('read a never-visited surah offline from the installed reader pack', async () => {
      await page.goto(`${ORIGIN}/#/s/114`)
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByText(synchronizedVerseText)).toBeVisible()
    })

    await test.step('prove the offline read survives another offline reload', async () => {
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

  await test.step('choose the default edition with the custom edition still listed', async () => {
    await page.goto(`${ORIGIN}/#/s/1`)
    const group = page.getByRole('radiogroup', { name: 'Mushaf edition' })
    await expect(group).toBeVisible()
    await expect(group.getByRole('radio', { name: SYNTHETIC_EDITION_LABEL })).toBeVisible()
    await expect(group.getByRole('radio', { name: SYNTHETIC_CUSTOM_EDITION_LABEL })).toBeVisible()
    // The radio input is visually hidden (sr-only) under its label span; a real
    // user clicks the visible label, so the test does too.
    await group.getByText(SYNTHETIC_EDITION_LABEL, { exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  })

  await test.step('offer only the optional Mushaf pages after fresh onboarding', async () => {
    await expect(page.getByRole('heading', { name: 'Download for offline reading' })).toBeVisible()
    await expect(page.getByText('Your reader texts are saved to this device automatically.')).toBeVisible()
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
    const group = page.getByRole('radiogroup', { name: 'Mushaf edition' })
    // The radio input is visually hidden (sr-only) under its label span; a real
    // user clicks the visible label, so the test does too.
    await group.getByText(SYNTHETIC_EDITION_LABEL, { exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
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

test('auto-downloads the required reader texts without consent', async ({ page }) => {
  test.setTimeout(120_000)
  await wipeApplicationData(page, ORIGIN)

  await test.step('skip the optional Mushaf pages at onboarding', async () => {
    await page.goto(`${ORIGIN}/#/s/1`)
    const group = page.getByRole('radiogroup', { name: 'Mushaf edition' })
    // The radio input is visually hidden (sr-only) under its label span; a real
    // user clicks the visible label, so the test does too.
    await group.getByText(SYNTHETIC_EDITION_LABEL, { exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  })
  await test.step('reader texts install on their own while the Mushaf pack stays untouched', async () => {
    await expectControlledServiceWorker(page)
    await page.goto(`${ORIGIN}/#/settings`)
    const region = page.getByRole('region', { name: 'Offline reading data' })
    await expect(region).toBeVisible()
    await expect(region.getByText('Reader texts')).toBeVisible()
    await expect
      .poll(async () => region.getByText('Downloaded', { exact: true }).count(), { timeout: 120_000 })
      .toBeGreaterThanOrEqual(1)
    await expect(region.getByText('Not downloaded')).toBeVisible()
  })
})

test('downloads the custom external-image edition and renders it offline', async ({ page }) => {
  test.setTimeout(240_000)
  await wipeApplicationData(page, ORIGIN)

  await test.step('choose the custom v2 edition and consent to the page download', async () => {
    await page.goto(`${ORIGIN}/#/s/1`)
    const group = page.getByRole('radiogroup', { name: 'Mushaf edition' })
    await group.getByText(SYNTHETIC_CUSTOM_EDITION_LABEL, { exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByText('Complete Mushaf ·')).toContainText(/ MB$/)
    await page.getByRole('button', { name: 'Download for offline reading' }).click()
    await expect(page.getByRole('progressbar', { name: 'Downloading offline reading data' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue reading' }).click()
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  })

  await test.step('both the reader texts and the custom page pack install', async () => {
    await expectControlledServiceWorker(page)
    await page.goto(`${ORIGIN}/#/settings`)
    const region = page.getByRole('region', { name: 'Offline reading data' })
    await expect(region.getByText(SYNTHETIC_CUSTOM_EDITION_LABEL)).toBeVisible()
    await expect.poll(async () => region.getByText('Downloaded', { exact: true }).count(), { timeout: 180_000 }).toBe(3)
  })

  await goOffline()
  try {
    await test.step('render the custom edition page offline from the downloaded WebP pack', async () => {
      // Reload offline (not hash-navigation from the settings overlay) so the
      // app boots through its offline launch path like the quran.ws test.
      await page.reload()
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await page.goto(`${ORIGIN}/#/m/1`)
      await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
      await expect(page.getByRole('img', { name: 'Mushaf page 1, Qaloon, beginning near 1:1' })).toBeVisible()
    })

    await test.step('the downloaded WebP renditions live in the sanitized dataset cache', async () => {
      await expect(
        cachedResources(page, {
          preview: `${SYNTHETIC_CUSTOM_PREFIX}/pages/001-1280.webp`,
          full: `${SYNTHETIC_CUSTOM_PREFIX}/pages/001-2136.webp`,
          editionManifest: `${SYNTHETIC_CUSTOM_PREFIX}/manifest.json`,
        }),
      ).resolves.toEqual({ preview: true, full: true, editionManifest: true })
    })
  } finally {
    await goOnline()
  }
})

test('switches the Mushaf edition from settings and downloads the other edition pack', async ({ page }) => {
  test.setTimeout(240_000)
  await wipeApplicationData(page, ORIGIN)

  await test.step('onboard and install the default edition pack', async () => {
    await page.goto(`${ORIGIN}/#/s/1`)
    const group = page.getByRole('radiogroup', { name: 'Mushaf edition' })
    await group.getByText(SYNTHETIC_EDITION_LABEL, { exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Download for offline reading' }).click()
    await expect(page.getByRole('progressbar', { name: 'Downloading offline reading data' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue reading' }).click()
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  })

  await test.step('switch to the other edition from the settings Mushaf edition group', async () => {
    await expectControlledServiceWorker(page)
    await page.goto(`${ORIGIN}/#/settings`)
    const offlineRegion = page.getByRole('region', { name: 'Offline reading data' })
    await expect(offlineRegion.getByText(SYNTHETIC_EDITION_LABEL)).toBeVisible()

    const editionRegion = page.getByRole('region', { name: 'Mushaf edition' })
    const editionGroup = editionRegion.getByRole('radiogroup', { name: 'Mushaf edition' })
    await expect(editionGroup.getByRole('radio', { name: SYNTHETIC_EDITION_LABEL })).toBeVisible()
    await expect(editionGroup.getByRole('radio', { name: SYNTHETIC_CUSTOM_EDITION_LABEL })).toBeVisible()
    // The radio input is visually hidden (sr-only) under its label span; a real
    // user clicks the visible label, so the test does too.
    await editionRegion.getByText(SYNTHETIC_CUSTOM_EDITION_LABEL, { exact: true }).click()

    // The offline rows re-derive from the newly active edition: its pack is
    // not downloaded, while the previous edition's row leaves the surface.
    await expect(offlineRegion.getByText(SYNTHETIC_CUSTOM_EDITION_LABEL)).toBeVisible()
    await expect(offlineRegion.getByText(SYNTHETIC_EDITION_LABEL)).toHaveCount(0)
    await expect(offlineRegion.getByText('Not downloaded')).toBeVisible()
  })

  await test.step('download the switched edition pack from settings', async () => {
    const offlineRegion = page.getByRole('region', { name: 'Offline reading data' })
    await offlineRegion.getByRole('button', { name: 'Download', exact: true }).click()
    await expect
      .poll(async () => offlineRegion.getByText('Downloaded', { exact: true }).count(), { timeout: 180_000 })
      .toBe(3)
  })

  await goOffline()
  try {
    await test.step('render the switched edition offline from its downloaded pack', async () => {
      await page.reload()
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await page.goto(`${ORIGIN}/#/m/1`)
      await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
      await expect(page.getByRole('img', { name: 'Mushaf page 1, Qaloon, beginning near 1:1' })).toBeVisible()
    })
  } finally {
    await goOnline()
  }
})
