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
import { clearAllData, markOnboardingComplete, readSetting } from '../fixtures/idb.js'
import { waitForReader, openCommandSheet } from '../fixtures/chrome.js'

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

async function clickStorageApply(page) {
  const apply = page.getByTestId('storage-apply')
  await expect(apply).toBeEnabled()
  await apply.click()
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
        'mushaf-pages/qaloon/manifest.json',
        `mushaf-pages/qaloon/pages/${paddedPage}.svg`,
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

async function waitForQaloonPageOptIn(page, expected) {
  await expect(async () => {
    const value = await readSetting(page, 'offlineCategories')
    expect(value?.pages?.qaloon === true).toBe(expected)
  }).toPass({ timeout: 10_000 })
}

async function waitForCachedQaloonPage(page, pageNumber) {
  const pagePath = `/dataset/mushaf-pages/qaloon/pages/${String(pageNumber).padStart(3, '0')}.svg`
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

async function clearQaloonPageCaches(page) {
  await page.evaluate(async () => {
    if (!('caches' in window)) return
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('qa-pages-qaloon-')).map((key) => caches.delete(key)))
  })
}

test.describe('Journey H: Offline resilience', () => {
  // -------------------------------------------------------------------------
  // H1. Reload offline — reader and command sheet load from cache
  // @offline — only runs in the "Offline (Preview)" project
  // -------------------------------------------------------------------------

  test('H1: reload offline serves reader + command sheet from cache @offline', async ({ page, context }) => {
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
      '/dataset/riwayat/qaloon/001.json',
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

      // Step 4: open command sheet — must work from cache
      await openCommandSheet(page)
      const sheet = page.locator('.qa-cmd-sheet')
      await expect(sheet).toBeVisible({ timeout: 5_000 })
      await expect(sheet).not.toHaveClass(/qa-cmd--hidden/)

      // Step 5: type 2:255 → verse card renders from cached dataset
      await page.locator('.qa-cmd-input').fill('2:255')
      const vcard = page.locator('.qa-cmd-vcard')
      await expect(vcard).toBeVisible({ timeout: 8_000 })

      // Close command sheet
      await page.keyboard.press('Escape')
      await expect(sheet).toHaveClass(/qa-cmd--hidden/, { timeout: 3_000 })
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

  test('H2: Storage selector opts into text category and persists across reload @offline', async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
    await waitForServiceWorker(page)

    // Open Settings via direct route (desktop @offline viewport).
    await page.goto('/#/settings')

    // Storage section is present (collapsed by default — expand it first).
    const storageSection = page.locator('[data-testid="storage-section"]')
    await expect(storageSection).toBeVisible({ timeout: 5_000 })
    const storageToggle = page.locator('[data-testid="storage-toggle"]')
    await storageToggle.click()

    // Text row is now visible (manifest entries exist for the text category).
    const textRow = page.locator('[data-testid="storage-row-text"]')
    await expect(textRow).toBeVisible()

    // Check the text checkbox (single collapsible — no per-row <summary>).
    const textCheck = page.locator('[data-testid="storage-check-text"]')
    await expect(textCheck).toBeVisible()
    await textCheck.check()

    // Apply commits the selection.
    const apply = page.locator('[data-testid="storage-apply"]')
    await expect(apply).toBeEnabled()
    await apply.click()
    // handleApply is async: busy=true → 'Saving…'; busy=false + saved=true → 'Saved ✓'.
    // Wait for both transitions so the IDB write + SW post complete before reload.
    await expect(apply).toHaveText('Saving…', { timeout: 2_000 })
    await expect(apply).toHaveText('Saved ✓', { timeout: 10_000 })

    // After Apply, the selector persists the new state. Reload + re-mount
    // the rune from IDB to prove the boot path wires it.
    await page.reload()
    await waitForReader(page)
    await page.goto('/#/settings')

    const persisted = await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('quran-atlas')
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readonly')
        const r = tx.objectStore('settings').get('offlineCategories')
        r.onsuccess = () => resolve(r.result?.value ?? null)
        r.onerror = () => reject(r.error)
      })
    })

    expect(persisted).toBeTruthy()
    expect(persisted.text).toBeDefined()
    expect(persisted.text.riwayat.qaloon).toBe(true)
    expect(persisted.text.translations.bridges).toBe(true)
    expect(persisted.text.tafsir.muyassar).toBe(true)
  })

  test('H3: Storage selector caches Qaloon pages for offline Mushaf reload @offline', async ({ page, context }) => {
    test.setTimeout(60_000)

    await useSingleMushafPageDownloadPlan(page, 42)
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
    await waitForServiceWorker(page)
    await clearQaloonPageCaches(page)

    await page.goto('/#/settings')
    const storageSection = page.locator('[data-testid="storage-section"]')
    await expect(storageSection).toBeVisible({ timeout: 5_000 })
    await page.locator('[data-testid="storage-toggle"]').click()

    const pageCheck = page.getByTestId('storage-page-check-qaloon')
    await expect(pageCheck).toBeVisible({ timeout: 10_000 })
    if (await pageCheck.isChecked()) {
      await pageCheck.uncheck()
      await clickStorageApply(page)
      await waitForQaloonPageOptIn(page, false)
    }
    await pageCheck.check()
    await clickStorageApply(page)
    await waitForQaloonPageOptIn(page, true)
    await waitForCachedQaloonPage(page, 42)

    await page.goto('/#/m/42')
    await expect(page.locator('.qa-mushaf-page-img')).toBeVisible({ timeout: 10_000 })

    await context.setOffline(true)
    try {
      await page.reload()
      await expect(page.locator('.qa-mushaf-page-img')).toBeVisible({ timeout: 10_000 })
    } finally {
      await context.setOffline(false)
    }
  })
})
