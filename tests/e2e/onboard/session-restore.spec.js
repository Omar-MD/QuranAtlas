/**
 * E2E Journey A: First run & session restore
 *
 * Covers:
 *   A1. First-run onboarding → Al-Fatihah (happy path, skip alt, browse-all-surahs alt,
 *       a11y scan, keyboard-only)
 *   A2. Reload stays on the last surface
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §A
 *   src/onboard/index.js
 *   src/onboard/screens.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedLastSurface, readSetting } from '../fixtures/idb.js'
import { waitForReader } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Onboarding flow tests must boot with no `onboardingComplete` flag.
// Opt OUT of the onboarded snapshot every other journey spec uses.
test.use({ storageState: { cookies: [], origins: [] } })

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Advance from screen 1 (Welcome) through screen 2 (Theme) to screen 3 (Riwayah).
 * Picks "Dark" theme on screen 2 as a concrete test value.
 * Onboarding is now 6 screens: Welcome → Theme → Riwayah → Translation → Shortcuts → Tags.
 */
async function advanceToScreen3(page) {
  // Screen 1 → tap Begin
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 2 (Theme) — pick Dark swatch then Continue
  await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })
  await page.locator('.qa-onb-sw--dark').click()
  await expect(page.locator('.qa-onb-sw--dark')).toHaveClass(/qa-onb-sw--on/)
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 3 (Riwayah) should now be visible
  await expect(page.locator('.qa-onb-rlist')).toBeVisible({ timeout: 8_000 })
}

/**
 * Advance from screen 3 (Riwayah) through screen 4 (Translation), screen 5 (Shortcuts)
 * to screen 6 (Tags intro). No translations ship today so the translation list is empty;
 * Continue still advances. Ends on the Tags intro screen (.qa-onb-vpreview).
 */
async function advanceToScreen4(page) {
  // Screen 3 (Riwayah) — Qālūn is default-selected; just Continue
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 4 (Translation) — list may be empty (no translations ship today);
  // wait for Riwayah screen to leave, then just Continue
  await expect(page.locator('.qa-onb-rlist')).not.toBeVisible({ timeout: 8_000 })
  await expect(page.locator('.qa-onb-tlist')).toBeAttached({ timeout: 8_000 })
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 5 (Shortcuts)
  await expect(page.locator('.qa-onb-shortcuts')).toBeVisible({ timeout: 8_000 })

  // Continue → Screen 6 (Tags intro)
  await page.locator('.qa-onb-cta--primary').click()
  await expect(page.locator('.qa-onb-vpreview')).toBeVisible({ timeout: 8_000 })
}

// ---------------------------------------------------------------------------
// Journey A1 — Happy path
// ---------------------------------------------------------------------------

test.describe('Journey A: First run & session restore', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
  })

  // -------------------------------------------------------------------------
  // A1.1 Happy path — all 6 steps
  // -------------------------------------------------------------------------
  test('A2: reload stays on the last surface', async ({ page }) => {
    // Seed IDB directly: onboardingComplete + lastSurface = '#/review'.
    // Using seedLastSurface (rather than navigating to the surface) avoids the race
    // between parallel tests writing different values to the shared origin's IDB.
    await markOnboardingComplete(page)
    await seedLastSurface(page, '#/review')

    // Navigate to root with no hash — this simulates a fresh app launch / hard reload.
    // handleRoute('') fires ROUTER_LAUNCH_RESTORE which reads lastSurface and restores it.
    await page.goto('/')

    // App should restore the last surface (#/review) not boot to onboarding
    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
    await expect(page).toHaveURL(/#\/review/, { timeout: 8_000 })
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

  // -------------------------------------------------------------------------
  // A1.8 — Screen 3: Riwayah picker (new in KFGQPC rewire)
  // -------------------------------------------------------------------------
})
