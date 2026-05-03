/**
 * E2E Journey F: Navigation (command sheet, surah list, keyboard)
 *
 * Covers:
 *   F1. Command sheet direct verse-ref (2:255) → reader at #/s/2/255 + a11y scan
 *   F2. Arrow-down to "Mark this verse" row → Enter → mark editor opens
 *   F3. Tag search (type "mer") → Tags group shows "mercy" → Enter → #/threads/mercy FVR
 *   F4. Surah directory — 114 rows, search "67" → eyebrow + Al-Mulk row → tap → #/s/67
 *   F5. Continue-reading card — visible at top after visiting a surah; tap navigates
 *   F6. Keyboard navigation — pill→Enter opens sheet; arrow nav; Esc closes; G then S
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §F
 *   src/navigate/command-sheet.js
 *   src/navigate/surahs/list.js
 *   src/navigate/ambient-pill.js
 *   src/navigate/ambient-dock.js
 */

import { test, expect } from '@playwright/test'
import { seedMarks } from '../fixtures/idb.js'
import { waitForReader, openCommandSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey F: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for app boot to settle before seeding so launch-restore
    // IDB reads cannot race with the seed write.
    await page.goto('/')
    await waitForReader(page)
    await seedMarks(page, [
      { verseKey: '2:255', tags: ['mercy'], note: '' },
    ])
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // ---------------------------------------------------------------------------
  // F1. Command sheet direct verse-ref
  // ---------------------------------------------------------------------------

  test.beforeEach(async ({ page }, testInfo) => {
    const vp = testInfo.project.use.viewport
    if (vp && vp.width >= 1180) {
      testInfo.skip(true, 'mobile-only suite')
    }

    await page.goto('/')
  })

  test('F-mobile-1: hamburger opens drawer with Read tab + Surahs sub-tab default and current-surah highlighted', async ({ page }) => {
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible()

    // Read tab is on by default; Surahs sub-tab is on by default
    await expect(page.locator('.qa-nav-drawer-tab--on')).toHaveText(/Read/i)
    await expect(page.locator('.qa-nav-drawer-subtab--on')).toHaveText(/Surahs/i)

    // Current surah (18 — Al-Kahf) is highlighted
    const currentRow = page.locator('.qa-nav-drawer-surah-row--current')
    await expect(currentRow).toHaveAttribute('data-surah', '18')

    // Wordmark is a button (About entry)
    await expect(page.locator('.qa-nav-drawer-wordmark')).toBeVisible()
  })

  test('F-mobile-2: tapping layer row in Study tab routes to #/review?layer=<name>', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-tab', { hasText: 'Study' }).click()
    await page.locator('.qa-nav-drawer-layer-row[data-layer="people"]').click()
    await expect(page).toHaveURL(/#\/review\?layer=people$/)
  })

  test('F-mobile-3: wordmark in drawer routes to #/about', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-wordmark').click()
    await expect(page).toHaveURL(/#\/about$/)
  })

  test('F-mobile-4: typing #/surahs on mobile redirects + opens drawer', async ({ page }) => {
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.evaluate(() => { window.location.hash = '#/surahs' })
    await expect(page.locator('.qa-nav-drawer')).toBeVisible({ timeout: 4_000 })
    // Hash should be replaced (not on #/surahs)
    await page.waitForFunction(() => !window.location.hash.startsWith('#/surahs'), { timeout: 4_000 })
  })
})
