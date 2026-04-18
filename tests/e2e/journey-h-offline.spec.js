/**
 * E2E Journey H: Offline resilience
 *
 * Covers:
 *   H1. Reload offline — service worker serves reader + command sheet from cache
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §H
 *   src/core/sw.js / workbox config
 *
 * NOTE: This test requires a built service worker and runs only under the
 * "Offline (Preview)" Playwright project (tagged @offline).  The dev server
 * does not emit a SW, so the test is excluded from the chromium / Tablet /
 * Mobile Chrome projects via grepInvert in playwright.config.js.
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete } from './fixtures/idb.js'
import { waitForReader, openCommandSheet } from './fixtures/chrome.js'

/**
 * Wait until the service worker is active and controlling the page.
 * The SW uses registerType:'prompt' so it stays in "waiting" after first
 * install.  We send SKIP_WAITING to promote it, then wait for controller.
 */
async function waitForServiceWorker(page) {
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return

    const reg = await navigator.serviceWorker.getRegistration('/')
    if (!reg) return

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

    // Navigate again so the dataset fetch goes through the now-active SW and
    // lands in the workbox runtime cache ('quran-dataset-v1').  Without this
    // second trip, the first dataset load happened before the SW was controlling
    // and the cache is empty for the offline reload.
    await page.goto('/#/s/1')
    await waitForReader(page)

    // Step 2: go offline
    await context.setOffline(true)

    try {
      // Step 3: reload — SW should serve the shell from cache
      await page.reload()
      await waitForReader(page)

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
})
