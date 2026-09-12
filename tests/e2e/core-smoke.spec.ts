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
  await expect(page.getByRole('region', { name: 'Included reading assets' })).toBeVisible()
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
