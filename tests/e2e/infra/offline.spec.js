/**
 * E2E Journey H: Offline resilience
 *
 * Covers:
 *   H1. Reload offline — service worker serves reader + command sheet from cache
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §H
 *   src/infra/sw.js / workbox config
 *
 * NOTE: This test requires a built service worker and runs only under the
 * "Offline (Preview)" Playwright project (tagged @offline).  The dev server
 * does not emit a SW, so the test is excluded from the chromium / Tablet /
 * Mobile Chrome projects via grepInvert in playwright.config.js.
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, readSetting, writeSetting } from '../fixtures/idb.js'
import { waitForReader } from '../fixtures/chrome.js'

const DATASET_CACHE = 'quran-dataset-v2'

// Rule 6.2 carve-out: SW lifecycle exercises cross-store cache invariants and
// must boot from a fully fresh state.  Opt OUT of the onboarded storageState
// every other journey spec uses; rely on `clearAllData + markOnboardingComplete`
// in `beforeEach` for clean per-test state.
test.use({ storageState: { cookies: [], origins: [] } })

/**
 * Wait until the service worker is active and controlling the page.
 * The SW uses registerType:'prompt' so it stays in "waiting" after first
 * install.  We send SKIP_WAITING to promote it, then wait for controller.
 */
async function waitForServiceWorker(page) {
  const isSupported = await page.evaluate(() => 'serviceWorker' in navigator)
  expect(isSupported).toBe(true)

  await page.evaluate(async () => {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), 15_000)),
    ])
    if (!reg) throw new Error('service worker registration was not ready')

    // Promote waiting/installing SW so it can take control immediately
    const sw = reg.waiting || reg.installing
    if (sw) {
      sw.postMessage({ type: 'SKIP_WAITING' })
    }

    // Wait up to 10 s for a controller to be assigned
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const onControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
          resolve()
        }
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
        // Resolve early if controller already set between listener registration and here
        if (navigator.serviceWorker.controller) resolve()
        setTimeout(resolve, 10_000)
      })
    }
  })

  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload({ waitUntil: 'domcontentloaded' })
  }

  await expect(async () => {
    const controlled = await page.evaluate(async () => {
      if (navigator.serviceWorker.controller) return true
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(null), 2_000)),
      ])
      if (reg) {
        const sw = reg.waiting || reg.installing
        if (sw) sw.postMessage({ type: 'SKIP_WAITING' })
      }
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => {
          const onControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
            resolve()
          }
          navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
          setTimeout(resolve, 1_000)
        })
      }
      return Boolean(navigator.serviceWorker.controller)
    })
    expect(controlled).toBe(true)
  }).toPass({ timeout: 15_000 })
}

async function useSingleMushafPageDownloadPlan(page, pageNumber = 42) {
  const padded = String(pageNumber).padStart(3, '0')

  await page.addInitScript(({ paddedPage }) => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init)
      const rawUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : response.url
      const url = new URL(rawUrl, window.location.href)
      if (url.pathname !== '/dataset/manifest.json') return response

      const manifest = await response.clone().json()
      const keep = new Set([
        'mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json',
        `mushaf-pages/qaloon/qalun-quran-ws-v1/pages/${paddedPage}.svg`,
      ])
      const files = manifest.files.filter((file) => file.lane !== 'pages' || keep.has(file.path))
      const pageFiles = files.filter((file) => file.lane === 'pages')
      const pageBytes = pageFiles.reduce((sum, file) => sum + (typeof file.bytes === 'number' ? file.bytes : 0), 0)
      const headers = new Headers(response.headers)
      headers.set('content-type', 'application/json')
      headers.delete('content-length')

      return new Response(JSON.stringify({
        ...manifest,
        lanes: {
          ...manifest.lanes,
          pages: {
            enabled: pageFiles.length > 0,
            files: pageFiles.length,
            bytes: pageBytes,
          },
        },
        files,
      }), {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
  }, { paddedPage: padded })
}

async function waitForCachedQalunPage(page, pageNumber) {
  const pagePath = `/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/pages/${String(pageNumber).padStart(3, '0')}.svg`
  await expect(async () => {
    const cached = await page.evaluate(async (path) => {
      if (!('caches' in window)) return false
      const absolute = new URL(path, location.origin).href
      const keys = await caches.keys()
      for (const key of keys) {
        if (!key.startsWith('qa-pages-qaloon-')) continue
        const cache = await caches.open(key)
        if (await cache.match(absolute)) return true
        if (await cache.match(path)) return true
      }
      return false
    }, pagePath)
    expect(cached).toBe(true)
  }).toPass({ timeout: 20_000 })
}

async function waitForCachedDatasetUrls(page, paths) {
  await expect(async () => {
    const missing = await page.evaluate(async ({ cacheName, requiredPaths }) => {
      if (!('caches' in window)) return requiredPaths
      const cache = await caches.open(cacheName)
      const origin = window.location.origin
      const misses = []
      for (const path of requiredPaths) {
        const absolute = new URL(path, origin).href
        const cached = await cache.match(absolute) || await cache.match(path)
        if (!cached) misses.push(path)
      }
      return misses
    }, { cacheName: DATASET_CACHE, requiredPaths: paths })
    expect(missing).toEqual([])
  }).toPass({ timeout: 20_000 })
}

async function clearQalunPageCaches(page) {
  await page.evaluate(async () => {
    if (!('caches' in window)) return
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('qa-pages-qaloon-')).map((key) => caches.delete(key)))
  })
}

async function cacheDatasetPath(page, path, body = '{}') {
  await page.evaluate(async ({ cacheName, path: datasetPath, bodyText }) => {
    if (!('caches' in window)) return
    const cache = await caches.open(cacheName)
    const absolute = new URL(datasetPath, location.origin).href
    const response = new Response(bodyText, { headers: { 'content-type': 'application/json' } })
    await cache.put(datasetPath, response.clone())
    await cache.put(absolute, response.clone())
  }, { cacheName: DATASET_CACHE, path, bodyText: body })
}

test.describe('Journey H: Offline resilience', () => {
  // -------------------------------------------------------------------------
  // H1. Reload offline — reader and shortcuts sheet load from cache
  // @offline — only runs in the "Offline (Preview)" project
  // -------------------------------------------------------------------------

  test('H1: reload offline serves reader + shortcuts sheet from cache @offline', async ({ page, context }) => {
    // Step 1: load the app online — lets SW register and cache the shell
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)

    // Wait for SW to become active and controlling the page.
    // The SW uses registerType:'prompt' (stays "waiting" after first install).
    // We send SKIP_WAITING to promote it; without an active controller the SW
    // never intercepts fetches, so dataset responses are never cached.
    await waitForServiceWorker(page)

    // Reload the current reader route so the dataset fetch goes through the
    // now-active SW and lands in the runtime cache. A same-URL hash goto does
    // not remount the app, so it can leave the cache empty.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForReader(page)
    await waitForCachedDatasetUrls(page, [
      '/dataset/manifest.json',
      '/dataset/surahs.json',
      '/dataset/quran-text/qaloon/uthmani-kfgqpc-v1/001.json',
      '/dataset/translations/bridges/001.json',
      '/dataset/translations/_verse-aliases.json',
      '/dataset/knowledge/ayah/001.json',
      '/dataset/knowledge/passages/001.json',
    ])

    // Step 2: go offline
    await context.setOffline(true)

    try {
      // Step 3: reload — SW should serve the shell from cache
      await page.reload()
      await waitForReader(page)
      await page.locator('.qa-verse').first().locator('.qa-verse-body-summary').click()
      await expect(page.locator('[data-knowledge-lane]').first()).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('.qa-verse-themes').first()).toHaveText(/\S+/, { timeout: 10_000 })

      // Verify URL still shows reader route (may redirect to / if SW not active)
      // At minimum the reader content must load
      await expect(page.locator('.qa-verse').first()).toBeVisible({ timeout: 10_000 })

      // Step 4: keyboard shortcuts sheet must work from cache; command UI is retired.
      await page.keyboard.press('?')
      const sheet = page.locator('.qa-sheet--shortcuts')
      await expect(sheet).toBeVisible({ timeout: 5_000 })
      await expect(page.locator(['.qa', 'cmd', 'sheet'].join('-'))).toHaveCount(0)

      // Close shortcuts sheet.
      await page.keyboard.press('Escape')
      await expect(sheet).not.toBeAttached({ timeout: 3_000 })
    } finally {
      // Always restore network so subsequent tests are not affected
      await context.setOffline(false)
    }
  })

  // -------------------------------------------------------------------------
  // H2. Storage selector — per-feature offline opt-in (N21)
  // @offline — only runs in the "Offline (Preview)" project
  //
  // E2E-only because reload + re-hydrate proves the real boot path wires
  // initOfflineMigration + initOfflineCategories into the real app shell.
  // -------------------------------------------------------------------------

  test('H2: asset route renders under the production service worker @offline', async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
    await waitForServiceWorker(page)

    await page.goto('/#/assets')
    await expect(page.getByRole('heading', { name: 'Asset Management' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('status')).toContainText('Asset state ready.')
    await expect(page.getByRole('table', { name: 'Quran Text Styles' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Mushaf Editions' })).toBeVisible()
  })

  test('H3: cached Qalun page survives offline Mushaf reload @offline', async ({ page, context }) => {
    test.setTimeout(60_000)

    await useSingleMushafPageDownloadPlan(page, 42)
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
    await waitForServiceWorker(page)
    await clearQalunPageCaches(page)

    await page.goto('/#/m/42')
    await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })
    await waitForCachedQalunPage(page, 42)

    await context.setOffline(true)
    try {
      await page.reload()
      await expect(page.locator('.qa-mushaf-page-figure')).toBeVisible({ timeout: 10_000 })
    } finally {
      await context.setOffline(false)
    }
  })

  test('H4: asset route verifies optional source packs before activation and blocks active delete @offline', async ({ page }) => {
    test.setTimeout(60_000)

    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await writeSetting(page, 'translationId', 'bridges')
    await page.goto('/#/s/1')
    await waitForReader(page)
    await waitForServiceWorker(page)

    await cacheDatasetPath(page, '/dataset/translations/saheeh/001.json', '{"translationId":"saheeh","surahNo":1,"verses":[]}')
    await page.goto('/#/assets')

    const row = page.locator('.qa-asset-row').filter({ hasText: 'Saheeh International' })
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row.locator('.qa-asset-status-chip')).toHaveText('incomplete')
    await expect(row.getByRole('button', { name: /Reinstall Saheeh International/ })).toBeVisible()

    await row.getByRole('button', { name: /Reinstall Saheeh International/ }).click()
    await expect(row.getByRole('button', { name: /Set Active Saheeh International/ })).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => readSetting(page, 'translationId')).toBe('bridges')

    await row.getByRole('button', { name: /Set Active Saheeh International/ }).click()
    await expect(row.getByRole('button', { name: /Active Saheeh International/ })).toBeDisabled({ timeout: 10_000 })
    await expect.poll(() => readSetting(page, 'translationId')).toBe('saheeh')
    await expect(row.getByText('Switch to another compatible asset before deleting.')).toBeVisible()
    await expect(row.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})
