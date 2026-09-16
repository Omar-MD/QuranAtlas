import { createHash } from 'node:crypto'

import { expect, test, type Page } from '@playwright/test'

import { seedOnboardedReader } from './fixtures/app'

// The dev server ships no Mushaf page media, and the seeded default edition
// resolves to a v1 (inline-SVG, no framing) manifest — so the Mushaf page-zoom
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
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0)

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
  // page-zoom control — gated on framing capability — renders in the settings
  // overlay; the shipped quran.ws edition is v1 and has no framing.
  await fulfillFramedMushafEdition(page)

  await page.goto('/#/m/1')
  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByText(/% reviewed frame width/)).toHaveCount(0)
  await expect(page.getByText(/Text area \d+%/)).toHaveCount(0)
  await expect(page.getByText(/Page zoom — \d+%/)).toBeVisible()
  await expect(page.getByText('Fit width')).toHaveCount(0)
  // Settings stays minimal: no preview, no notation guide, no edition switch,
  // no Downloads/About link rows.
  await expect(page.getByRole('button', { name: 'Notation guide' })).toHaveCount(0)
  await expect(page.getByRole('radiogroup', { name: 'Mushaf edition' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Downloads/ })).toHaveCount(0)
  await expect(page.getByText('Preview of your reading settings')).toHaveCount(0)
  await page.getByRole('button', { name: 'Close settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toHaveCount(0)
})

test('reader never shows internal Hafs-keyed continuation vocabulary', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText(/Hafs-keyed/)).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
})

test('verse spacing offers three plain-language preset options', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  const spacing = page.getByRole('radiogroup', { name: 'Verse spacing' })
  await expect(spacing.getByRole('radio', { name: 'Verse spacing: Compact' })).toBeVisible()
  await expect(spacing.getByRole('radio', { name: 'Verse spacing: Comfortable' })).toBeVisible()
  await expect(spacing.getByRole('radio', { name: 'Verse spacing: Spacious' })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Tight/ })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: /Standard/ })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: /Wide/ })).toHaveCount(0)
})

test('about separates sources from build credits and offers a report route', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Sources used' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'King Fahd Complex source' })).toHaveAttribute(
    'href',
    'https://qurancomplex.gov.sa/en/techquran/dev/',
  )
  await expect(page.getByText('KFGQPC Quran text source; restricted terms apply.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bridges translation source' })).toHaveAttribute(
    'href',
    'https://qul.tarteel.ai/resources/translation/179',
  )
  await expect(page.getByText('QUL downloadable resource.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Quran.ws page source' })).toHaveAttribute('href', 'https://quran.ws')
  await expect(page.getByText('Quran.ws page assets free use.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Furatiyyah source record' })).toHaveAttribute(
    'href',
    /data\/catalog\/mushaf-assets\.json/,
  )
  await expect(
    page.getByText(/redistribution is limited to the user-authorized QuranAtlas noncommercial deployment/),
  ).toBeVisible()
  // Technical credits come last and stay visually secondary (S10).
  await expect(page.getByText('Built with React, Vite, and Workbox.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Report an issue' })).toBeVisible()
})

test('about disables update checks while offline', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  const updateButton = page.getByRole('button', { name: 'Check for updates' })
  await expect(updateButton).toBeEnabled()
  await page.context().setOffline(true)
  await expect(updateButton).toBeDisabled()
  await expect(page.getByText('Connect to the internet to check for updates.')).toBeVisible()
})

test('reader chrome offers a surah selector and no Search action', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('button', { name: 'Search Quran' })).toHaveCount(0)
  // The labelled Verses/Mushaf segmented control replaces the icon toggle.
  await expect(page.getByRole('radiogroup', { name: 'View' })).toBeVisible()
  await page.goto('/#/s/2')
  // The selector trigger's accessible name includes the current surah (D2).
  await page.getByRole('button', { name: /Choose surah/ }).click()
  await expect(page.getByRole('dialog', { name: /choose surah/i })).toBeVisible()
  await page.keyboard.press('Escape')
  // The drawer has no Read/Search destination switch and no saved searches.
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Destination' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Search' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save search' })).toHaveCount(0)
})

test('plain icon controls expose desktop tooltips', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-smoke', 'Desktop tooltip requirement')
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: 'Open settings' }).hover()
  await expect(page.getByRole('tooltip')).toHaveText('Open settings')
})

test('bookmarks is a standalone destination in the navigation drawer', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  const drawer = page.getByRole('dialog', { name: 'Navigation' })
  await expect(drawer.getByRole('button', { name: 'Bookmarks', exact: true })).toBeVisible()
  await drawer.getByRole('button', { name: 'Bookmarks', exact: true }).click()
  await expect(page.getByRole('main', { name: /bookmarks/i })).toBeVisible()
})

test('theme offers a system-following option and dimming is named by effect', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('radio', { name: 'Theme: System' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Theme: Auto' })).toHaveCount(0)
  // One theme selector exists; the retired Night-mode controls are gone (A3).
  await expect(page.getByText('Mushaf night dimming')).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Night mode: On' })).toHaveCount(0)
  await expect(page.getByText('Dims Mushaf page images in Dark theme.')).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Dim page images' })).toBeVisible()
})

test('system theme follows operating-system changes without a reload', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/#/settings')
  await page.getByRole('radio', { name: 'Theme: System' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('surah start offers no backward navigation and titles appear once', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  // Below-passage continuity buttons are removed; adjacent navigation lives
  // in the selector (§8 item 1).
  await expect(page.getByRole('button', { name: /Previous surah/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Next surah/i })).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
  await page.goto('/#/s/2')
  await expect(page.getByRole('button', { name: /Previous surah/i })).toHaveCount(0)
})

test('surah selector filter navigates by name, number, and verse reference', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: /Choose surah/ }).click()
  await expect(page.getByRole('dialog', { name: /choose surah/i })).toBeVisible()
  const filter = page.getByRole('textbox', { name: 'Filter by name, number, or verse' })
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

test('surah selector shows adjacent navigation without wrapping at the book ends', async ({ page }) => {
  await seedOnboardedReader(page)
  // At surah 1 there is no Previous action (no wrap to An-Nās, D6).
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: /Choose surah/ }).click()
  const dialog = page.getByRole('dialog', { name: /choose surah/i })
  await expect(dialog.getByRole('button', { name: /Next: Al-Baqarah/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Previous:/ })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.goto('/#/s/114')
  await page.getByRole('button', { name: /Choose surah/ }).click()
  await expect(dialog.getByRole('button', { name: /Previous: Al-Mā'idah|Previous:/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Next:/ })).toHaveCount(0)
})

test('verse selection reveals the quiet action row and the copy toast confirms', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/#/s/1')
  await page.getByTestId('verse-1:1').click()
  await expect(page.getByTestId('verse-1:1')).toHaveAttribute('data-selected', 'true')
  await expect(page.getByRole('button', { name: 'Bookmark', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Copy reference' }).click()
  await expect(page.getByText('Reference copied')).toBeVisible()
})

test('verse reference is a plain Western numeral and bookmarking lives in the action row', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  // The number is a stable reference, never a button, and renders Western
  // digits (no Arabic-Indic numerals in the reader chrome).
  const verse = page.getByTestId('verse-1:1')
  await expect(verse.getByRole('button')).toHaveCount(0)
  await expect(verse).toContainText('1')
  await expect(verse).not.toContainText('١')
  // No persistent per-verse bookmark icon; selecting the verse reveals the
  // quiet action row with the bookmark control.
  await expect(page.getByRole('button', { name: /Bookmark Al-Fātiḥah/ })).toHaveCount(0)
  await verse.click()
  const bookmark = page.getByRole('button', { name: 'Bookmark', exact: true })
  await expect(bookmark).toBeVisible()
  await bookmark.click()
  await expect(page.getByRole('button', { name: 'Bookmarked', exact: true })).toBeVisible()
})

test('about documents reference numbering and identifies editions', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Numbering and references' })).toBeVisible()
  await expect(page.getByText(/Verse references follow the Hafs counting/)).toBeVisible()
  await expect(page.getByText('Qalun Quran.ws (minimal monochrome pages)')).toBeVisible()
  await expect(page.getByText(/Qalun Furatiyyah 2023/)).toBeVisible()
})

test('downloads surface opens by address with the included inventory', async ({ page }) => {
  await seedOnboardedReader(page)
  // Downloads is reachable by its address only — settings and the drawer no
  // longer link to it.
  await page.goto('/#/assets')
  await expect(page.getByRole('region', { name: 'Offline reading data' })).toBeVisible()
  await expect(page.getByText('Reader texts')).toBeVisible()
})

test('selector opens an exact number with Enter and restores focus on Escape', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  const trigger = page.getByRole('button', { name: /Al-Fātiḥah.*Choose surah/ })
  await trigger.click()
  const filter = page.getByRole('textbox', { name: 'Filter by name, number, or verse' })
  await filter.fill('112')
  await filter.press('Enter')
  await expect(page).toHaveURL(/#\/s\/112$/)
  const nextTrigger = page.getByRole('button', { name: /Al-Ikhlāṣ.*Choose surah/ })
  await nextTrigger.click()
  await page.getByRole('textbox', { name: 'Filter by name, number, or verse' }).press('Escape')
  await expect(nextTrigger).toBeFocused()
})

test('continuation verse links land on their visible passage', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1/7')
  await expect(page.getByText('غَيْرِ اِ۬لْمَغْضُوبِ عَلَيْهِمْ وَلَا اَ۬لضَّآلِّينَۖ', { exact: false })).toBeInViewport()
})

test('copied verse references include the surah number', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/#/s/1')
  await page.getByRole('article', { name: 'Al-Fātiḥah 1', exact: true }).click()
  await page.getByRole('button', { name: 'Copy reference' }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('Al-Fātiḥah 1:1 — All praise be to Allah, Lord of all realms,')
})
