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
 * NOTE: This test requires a registered and active service worker.
 * The first page.goto + waitForReader lets the SW register and cache the shell.
 * Without a built service worker (i.e. in dev mode without PLAYWRIGHT_USE_PREVIEW=1)
 * the SW may not be present — the test will still pass if the dev server itself
 * responds to the reload, but true offline caching only works in preview mode.
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete } from './fixtures/idb.js'
import { waitForReader, openCommandSheet } from './fixtures/chrome.js'

test.describe('Journey H: Offline resilience', () => {
  // -------------------------------------------------------------------------
  // H1. Reload offline — reader and command sheet load from cache
  // -------------------------------------------------------------------------

  test('H1: reload offline serves reader + command sheet from cache', async ({ page, context }) => {
    // Step 1: load the app online — lets SW register and cache the shell
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
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
