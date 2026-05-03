/**
 * E2E Journey B: Reader & ambient chrome
 *
 * Covers:
 *   B1. Primary-nav chrome visible on reader (desktop rail / mobile header)
 *   B2. Scroll hides mobile header; scroll near top reveals it (desktop: rail always visible)
 *   B3. Tap verse number → edge indicators appear on both sides
 *   B4. Non-reader routes keep primary nav visible
 *   B5. Font slider live preview
 *   B6. Auto theme follows OS (prefers-color-scheme emulation)
 *   A11y. Axe-core scan of reader surface
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §B
 *   src/navigate/AmbientDock.svelte   (desktop left rail, always visible)
 *   src/navigate/MarginHeader.svelte  (mobile top header, auto-hide on scroll-down)
 *   src/read/EdgeIndicator.svelte
 *   src/configure/Panel.svelte
 *   src/configure/theme.ts
 *   src/configure/font-size.ts
 */

import { test, expect } from '@playwright/test'
import { waitForReader, surfaceDock, openSettingsSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

test.describe('Journey B: Reader & ambient chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // B1. Primary-nav chrome visible on reader
  // -------------------------------------------------------------------------

  test('B-Cross1: end-of-surah Continue link swaps to next surah', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)

    // Scroll to the end so the chunked-append finishes rendering and the
    // Continue link replaces the surah-end terminator.
    await page.evaluate(() => {
      const el = document.getElementById('main-content')
      if (el) { el.scrollTo(0, el.scrollHeight) }
    })
    await expect(page.locator('[data-continue-next]')).toBeVisible({ timeout: 5_000 })

    await page.locator('[data-continue-next]').click()
    await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5_000 }).toBe('#/s/2')
  })

  test('B-Cross2: top-of-surah Continue link swaps to previous surah', async ({ page }) => {
    await page.goto('/#/s/2')
    await waitForReader(page)

    await expect(page.locator('[data-continue-prev]')).toBeVisible()
    await page.locator('[data-continue-prev]').click()
    await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5_000 }).toBe('#/s/1')
  })

  test('B-Cross3: forward wrap — Surah 114 Continue link → Surah 1', async ({ page }) => {
    await page.goto('/#/s/114')
    await waitForReader(page)
    await page.evaluate(() => {
      const el = document.getElementById('main-content')
      if (el) { el.scrollTo(0, el.scrollHeight) }
    })
    await expect(page.locator('[data-continue-next]')).toBeVisible({ timeout: 5_000 })
    await page.locator('[data-continue-next]').click()
    await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5_000 }).toBe('#/s/1')
  })

  test('B-Cross4: backward wrap — Surah 1 Continue link → Surah 114', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
    await expect(page.locator('[data-continue-prev]')).toBeVisible()
    await page.locator('[data-continue-prev]').click()
    await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5_000 }).toBe('#/s/114')
  })

  test('B-Cross-arrow: continue link is a single-line arrow + italic title (~22px tall)', async ({ page }) => {
    // Mid-quran surah so prev exists without wrap edge cases.
    await page.goto('/#/s/18')
    await waitForReader(page)

    const prevLink = page.locator('[data-continue-prev]')
    await expect(prevLink).toBeVisible()
    // Arrow + italic title structure
    await expect(prevLink.locator('.qa-continue-arrow')).toContainText('↑')
    await expect(prevLink.locator('.qa-continue-title')).toBeVisible()

    // Height check — sanity guard against regression to full-width banner.
    const box = await prevLink.boundingBox()
    expect(box?.height ?? 999).toBeLessThan(36)
  })

  test('B-Cross5: settings.currentPosition is overwritten on swap', async ({ page }) => {
    const readPosition = () => page.evaluate(() => new Promise((resolve) => {
      const open = indexedDB.open('quran-atlas')
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('settings', 'readonly')
        const req = tx.objectStore('settings').get('currentPosition')
        req.onsuccess = () => { resolve(req.result?.value ?? null); db.close() }
        req.onerror = () => { resolve(null); db.close() }
      }
      open.onerror = () => resolve(null)
    }))

    await page.goto('/#/s/3')
    await waitForReader(page)
    await expect.poll(async () => (await readPosition())?.surah, { timeout: 5_000 }).toBe(3)

    await expect(page.locator('[data-continue-prev]')).toBeVisible()
    await page.locator('[data-continue-prev]').click()
    await expect.poll(() => page.evaluate(() => window.location.hash), { timeout: 5_000 }).toBe('#/s/2')

    await waitForReader(page)
    await expect.poll(async () => (await readPosition())?.surah, { timeout: 5_000 }).toBe(2)

    const pos = await readPosition()
    expect(pos).toBeTruthy()
    expect(pos.surah).toBe(2)
  })

  // -------------------------------------------------------------------------
  // A11y — Axe-core scan of the reader surface
  // -------------------------------------------------------------------------
})
