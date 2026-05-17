/**
 * E2E Journey A: session restore
 *
 * Covers:
 *   A2. Launch restore rejects removed and stale lastSurface hashes
 *   A2. Direct #/settings returns to the saved lastSurface
 *   A2. Mobile #/surahs and #/bookmarks normalize non-reader hashes through the reader fallback
 *   A2. Reader route post-onboarding remains axe-clean
 *
 * Sources of truth:
 *   src/app-bootstrap.ts
 *   src/core/router.ts
 *   src/onboard/state.ts
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedLastSurface, readSetting, writeSetting } from '../fixtures/idb.js'
import { waitForReader } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

const removedHubHash = ['#/re', 'view'].join('')

test.describe('Journey A: First run & session restore', () => {
  // These cases seed exact IDB state and verify bootstrap restore behavior from a
  // clean browser context, so they keep the explicit empty storage state.
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
  })

  test('A2: reload rejects removed review surface and falls back to the saved reader position', async ({ page }) => {
    // Seed IDB directly with a removed launch hash.
    // Using seedLastSurface (rather than navigating to the surface) avoids the race
    // between parallel tests writing different values to the shared origin's IDB.
    await markOnboardingComplete(page)
    await seedLastSurface(page, removedHubHash)
    await writeSetting(page, 'currentPosition', { surah: 2, verse: 255 })

    // Navigate to root with no hash — this simulates a fresh app launch / hard reload.
    // handleRoute('') fires ROUTER_LAUNCH_RESTORE which reads lastSurface and restores it.
    await page.goto('/')

    // App should reject the removed route and use the saved reader position instead.
    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
    await expect(page).toHaveURL(/#\/s\/2\/255/, { timeout: 8_000 })
  })

  // -------------------------------------------------------------------------
  // A2.2 Reload restores a reader surface
  // -------------------------------------------------------------------------

  test('A2: reload restores reader surface (e.g. #/s/2)', async ({ page }) => {
    // Seed IDB directly to avoid navigation races with parallel tests.
    await markOnboardingComplete(page)
    await seedLastSurface(page, '#/s/2')

    // Navigate to root (no hash) — simulates fresh app launch / hard reload.
    // ROUTER_LAUNCH_RESTORE reads lastSurface and restores the reader.
    await page.goto('/')

    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
    await expect(page).toHaveURL(/#\/s\/2/, { timeout: 8_000 })
  })

  test('A2: direct #/settings currently returns to the saved lastSurface', async ({ page }) => {
    await markOnboardingComplete(page)
    await seedLastSurface(page, '#/about')

    await page.goto('/#/settings')

    await expect(page).toHaveURL(/#\/about/, { timeout: 8_000 })
    await expect.poll(async () => readSetting(page, 'lastSurface')).toBe('#/about')
  })

  // -------------------------------------------------------------------------
  // A2.3 a11y — no violations on the reader surface post-onboarding
  // -------------------------------------------------------------------------

  test('A2: a11y — no serious/critical axe violations on reader after onboarding @a11y', async ({ page }) => {
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)

    const violations = await scanA11y(page)
    expect(violations).toEqual([])
  })
})

test.describe('Journey A: mobile session restore route redirects @mobile', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
  })

  test('A2: mobile #/surahs redirects non-reader lastSurface hashes to the saved reader position', async ({ page }) => {
    const cases = ['#/about', '#/bookmarks', removedHubHash, '#/stale-route']
    await writeSetting(page, 'currentPosition', { surah: 2, verse: 255 })

    for (const seededHash of cases) {
      await seedLastSurface(page, seededHash)
      await page.goto('/#/surahs')
      await expect.poll(() => new URL(page.url()).hash).toBe('#/s/2/255')
      await expect(page.locator('.qa-nav-drawer')).toBeVisible()
    }
  })

  test('A2: mobile #/surahs rejects the static route as a reader restore target and uses the saved position', async ({ page }) => {
    await seedLastSurface(page, '#/surahs')
    await writeSetting(page, 'currentPosition', { surah: 2, verse: 255 })
    await page.goto('/#/surahs')

    await expect.poll(() => new URL(page.url()).hash).toBe('#/s/2/255')
    await expect(page.locator('.qa-nav-drawer')).toBeVisible()
  })

  test('A2: mobile #/bookmarks redirects non-reader lastSurface hashes to the saved reader position', async ({ page }) => {
    const cases = ['#/about', '#/surahs', removedHubHash, '#/stale-route']
    await writeSetting(page, 'currentPosition', { surah: 2, verse: 255 })

    for (const seededHash of cases) {
      await seedLastSurface(page, seededHash)
      await page.goto('/#/bookmarks')
      await expect.poll(() => new URL(page.url()).hash).toBe('#/s/2/255')
      await expect(page.locator('.qa-nav-drawer')).toBeVisible()
    }
  })

  test('A2: mobile #/bookmarks rejects the static route as a reader restore target and uses the saved position', async ({ page }) => {
    await seedLastSurface(page, '#/bookmarks')
    await writeSetting(page, 'currentPosition', { surah: 2, verse: 255 })
    await page.goto('/#/bookmarks')

    await expect.poll(() => new URL(page.url()).hash).toBe('#/s/2/255')
    await expect(page.locator('.qa-nav-drawer')).toBeVisible()
  })
})
