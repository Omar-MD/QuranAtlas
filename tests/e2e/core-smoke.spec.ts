import { createHash } from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { seedOnboardedReader } from './fixtures/app'

// The dev server ships no Mushaf page media, and the seeded default edition
// resolves to a v1 (inline-SVG, no framing) manifest — so the Mushaf text-size
// control never mounts in this suite on its own. The plain-language copy under
// test lives behind that control, so the test fulfills the edition's asset
// index + manifest with the same synthetic v2 contract (framing +
// external-image media) the offline suite serves through its controlled
// server. Page bodies are a shared minimal decodable 1×1 WebP.
const FRAMED_RIWAYAH = 'qaloon'
const FRAMED_EDITION_ID = 'qalun-quran-ws-v1'
const FRAMED_EDITION_PREFIX = `/dataset/mushaf-pages/${FRAMED_RIWAYAH}/${FRAMED_EDITION_ID}`
const FRAMED_PAGE_COUNT = 604
const FRAMED_TEXT_FRAME = { x: 0.2, y: 0.15, width: 0.6, height: 0.7 }
const FRAMED_WEBP_BODY = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
const FRAMED_WEBP_SHA256 = createHash('sha256').update(FRAMED_WEBP_BODY).digest('hex')

function framedWebpDescriptor(page: number, width: number, height: number) {
  return {
    assetPath: `pages/${String(page).padStart(3, '0')}-${width}.webp`,
    bytes: FRAMED_WEBP_BODY.byteLength,
    sha256: FRAMED_WEBP_SHA256,
    width,
    height,
    mimeType: 'image/webp',
  }
}

function framedMushafManifestJson(): string {
  return JSON.stringify({
    version: 2,
    riwayah: FRAMED_RIWAYAH,
    mushafEditionId: FRAMED_EDITION_ID,
    pageCount: FRAMED_PAGE_COUNT,
    pages: Array.from({ length: FRAMED_PAGE_COUNT }, (_, index) => {
      const page = index + 1
      const preview = framedWebpDescriptor(page, 1280, 1806)
      const full = framedWebpDescriptor(page, 2136, 3014)
      return {
        page,
        firstVerse: { surah: 1, verse: 1 },
        framing: { textFrame: FRAMED_TEXT_FRAME, sideLane: 'none' },
        media: { kind: 'external-image', fallback: full, sources: [preview, full] },
      }
    }),
    verseToPage: { '1:1': 1 },
  })
}

function framedMushafAssetsJson(manifestJson: string): string {
  const manifestUrl = `${FRAMED_EDITION_PREFIX}/manifest.json`
  const files = [{ url: manifestUrl, bytes: Buffer.byteLength(manifestJson), sha256: createHash('sha256').update(manifestJson).digest('hex') }]
  const pageUrls: string[] = []
  for (let page = 1; page <= FRAMED_PAGE_COUNT; page += 1) {
    for (const descriptor of [framedWebpDescriptor(page, 1280, 1806), framedWebpDescriptor(page, 2136, 3014)]) {
      files.push({ url: `${FRAMED_EDITION_PREFIX}/${descriptor.assetPath}`, ...descriptor })
    }
    pageUrls.push(`${FRAMED_EDITION_PREFIX}/pages/${String(page).padStart(3, '0')}-2136.webp`)
  }
  return JSON.stringify({
    version: 1,
    defaults: { qaloon: FRAMED_EDITION_ID },
    assets: [
      {
        riwayah: FRAMED_RIWAYAH,
        mushafEditionId: FRAMED_EDITION_ID,
        label: 'Qalun Quran.ws',
        pageCount: FRAMED_PAGE_COUNT,
        availability: 'available',
        version: 'v2',
        manifestUrl,
        pageUrls,
        files,
        totalBytes: files.reduce((total, file) => total + file.bytes, 0),
      },
    ],
  })
}

async function fulfillFramedMushafEdition(page: Page): Promise<void> {
  const manifestJson = framedMushafManifestJson()
  await page.route('**/dataset/indexes/mushaf-assets.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: framedMushafAssetsJson(manifestJson) }),
  )
  await page.route(`**${FRAMED_EDITION_PREFIX}/manifest.json`, (route) =>
    route.fulfill({ contentType: 'application/json', body: manifestJson }),
  )
  await page.route(`**${FRAMED_EDITION_PREFIX}/pages/*.webp`, (route) =>
    route.fulfill({ contentType: 'image/webp', body: FRAMED_WEBP_BODY }),
  )
}

test('boots the reader and reaches primary reader, search, and settings surfaces', async ({ page }) => {
  await seedOnboardedReader(page)

  await page.goto('/#/s/1')
  await expect(page).toHaveURL(/#\/s\/1$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()

  await page.goto('/#/search')
  await expect(page).toHaveURL(/#\/search(?:\?.*)?$/)
  await expect(page.getByRole('main', { name: 'Search' })).toBeVisible()
  await expect(page.getByLabel('Search Quran text, translation, or context')).toBeVisible()

  await page.goto('/#/settings')
  // S-P4: opening settings from a ChromeFrame base (search) preserves that base
  // instead of teleporting to the reader.
  await expect(page).toHaveURL(/#\/search(?:\?.*)?$/)
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Texts and editions' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toHaveCount(0)

  // Defect-inventory §9: after leaving #/search the URL must stay on the
  // destination — a stale async search write may never reclaim it. The settle
  // window re-assertion is the durable tripwire; the race itself is verified
  // by a manual probe (browser-timing-dependent).
  await page.goto('/#/search')
  await expect(page.getByRole('status').filter({ hasText: 'Search data is ready' })).toBeVisible()
  await page.getByLabel('Search Quran text, translation, or context').fill('mercy')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/search\?q=mercy$/)
  await page.getByRole('button', { name: 'Show all matches' }).click()
  await page.getByRole('button', { name: 'Open 1:3 in Reader' }).first().click()
  await expect(page).toHaveURL(/#\/s\/1\/2$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await page.waitForTimeout(1_200)
  await expect(page).toHaveURL(/#\/s\/1\/2$/)
})

test('settings use plain-language copy for controls and inventory', async ({ page }) => {
  await seedOnboardedReader(page)
  // Serve the synthetic v2 (external-image, framed) edition pack so the Mushaf
  // text-size control — gated on framing capability — renders in the mushaf
  // settings overlay; the shipped quran.ws edition is v1 and has no framing.
  await fulfillFramedMushafEdition(page)

  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByText('Read-only inventory for the active reading profile.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()

  await page.goto('/#/m/1')
  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(page.getByRole('heading', { name: 'Mushaf settings' })).toBeVisible()
  await expect(page.getByText(/% reviewed frame width/)).toHaveCount(0)
  await expect(page.getByText(/Text area \d+%/)).toBeVisible()
})

test('reader never shows internal Hafs-keyed continuation vocabulary', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText(/Hafs-keyed/)).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
})

test('verse spacing offers three plain-language options', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Reading flow' }).click()
  await expect(page.getByRole('option', { name: 'Compact' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Comfortable' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Spacious' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Tight' })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Standard' })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Wide' })).toHaveCount(0)
})

test('about separates sources from build credits and offers a report route', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Built with' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Report an issue' })).toBeVisible()
})

test('reader chrome exposes search and a surah selector without the drawer', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('button', { name: 'Search Quran' })).toBeVisible()
  await page.getByRole('button', { name: 'Search Quran' }).click()
  await expect(page).toHaveURL(/#\/search/)
  await page.goto('/#/s/2')
  await page.getByRole('button', { name: 'Choose surah' }).click()
  await expect(page.getByRole('dialog', { name: /navigation/i })).toBeVisible()
})

test('bookmarks is a standalone destination in the navigation drawer', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('button', { name: 'Bookmarks', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click()
  await expect(page.getByRole('region', { name: /bookmarks/i })).toBeVisible()
})

test('theme offers a system-following option and night dimming is named by effect', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('radio', { name: 'Theme: System' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Theme: Auto' })).toHaveCount(0)
  await expect(page.getByText('Dims Mushaf page images in low light.')).toBeVisible()
})

test('surah start offers no backward navigation and titles appear once', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Previous surah/i })).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
  await page.goto('/#/s/2')
  await expect(page.getByRole('button', { name: /Previous surah/i })).toBeVisible()
})

test('search defers tabs and save until a query returns results', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/search')
  await expect(page.getByText('Search the Quran')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save search' })).toHaveCount(0)

  await page.getByLabel('Search Quran text, translation, or context').fill('mercy')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Show all matches' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Verses' })).toBeVisible()
})

test('about documents reference numbering and identifies editions', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Reference numbering' })).toBeVisible()
  await expect(page.getByText(/QuranAtlas reads in the Qalūn narration/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Editions' })).toBeVisible()
  await expect(page.getByText('Qalun Quran.ws')).toBeVisible()
  await expect(page.getByText('Qalun Furatiyyah 2023')).toBeVisible()
})
