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
  const files = [
    {
      url: manifestUrl,
      bytes: Buffer.byteLength(manifestJson),
      sha256: createHash('sha256').update(manifestJson).digest('hex'),
    },
  ]
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

test('boots the reader and reaches primary reader, surah list, and settings surfaces', async ({ page }) => {
  await seedOnboardedReader(page)
  // No page fetch during the journey may target retired Search data.
  const removedFeatureRequests: string[] = []
  page.on('request', (request) => {
    if (/search-packs|\/dataset\/search(?:\/|$)|search-index\.json|knowledge\/indexes/.test(request.url())) {
      removedFeatureRequests.push(request.url())
    }
  })

  await page.goto('/#/s/1')
  await expect(page).toHaveURL(/#\/s\/1$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()

  await page.goto('/#/surahs')
  await expect(page).toHaveURL(/#\/surahs$/)
  await expect(page.getByRole('heading', { name: 'Surahs' })).toBeVisible()

  await page.goto('/#/settings')
  // S-P4: opening settings from a ChromeFrame base (surahs) preserves that base
  // instead of teleporting to the reader.
  await expect(page).toHaveURL(/#\/surahs$/)
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Texts and editions' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toHaveCount(0)

  // Removed Search deep links land on the existing unsupported-address
  // recovery screen, with or without a query string, and recovery navigates
  // to a supported destination.
  await page.goto('/#/search')
  await expect(page.getByText('Address not recognized')).toBeVisible()
  await page.getByRole('button', { name: 'Go to Surah list' }).click()
  await expect(page).toHaveURL(/#\/surahs$/)

  await page.goto('/#/search?q=mercy')
  await expect(page.getByText('Address not recognized')).toBeVisible()
  await page.getByRole('button', { name: 'Go to Surah list' }).click()
  await expect(page).toHaveURL(/#\/surahs$/)

  await expect(removedFeatureRequests).toEqual([])
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

test('reader chrome offers a surah selector and no Search action', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('button', { name: 'Search Quran' })).toHaveCount(0)
  await page.goto('/#/s/2')
  await page.getByRole('button', { name: 'Choose surah' }).click()
  await expect(page.getByRole('dialog', { name: /navigation/i })).toBeVisible()
  // The drawer has no Read/Search destination switch and no saved searches.
  await expect(page.getByRole('radiogroup', { name: 'Destination' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Search' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save search' })).toHaveCount(0)
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

test('surah filter navigates by name, number, and verse reference', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('dialog', { name: /navigation/i })).toBeVisible()
  const filter = page.getByRole('searchbox', { name: 'Search surah by name, number, or verse reference' })
  await expect(filter).toBeVisible()
  const surahList = page.getByRole('list', { name: 'Surah list' })

  // By name: only Al-Baqarah matches.
  await filter.fill('Baqarah')
  await expect(surahList.getByRole('listitem')).toHaveCount(1)
  await expect(surahList.getByText('Al-Baqarah')).toBeVisible()

  // By number: surah 114.
  await filter.fill('114')
  await expect(surahList.getByRole('listitem')).toHaveCount(1)

  // By verse reference with Enter-to-jump.
  await filter.fill('2:255')
  await filter.press('Enter')
  await expect(page).toHaveURL(/#\/s\/2\/255$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
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
