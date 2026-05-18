/**
 * E2E Journey F: Navigation (surah list, keyboard)
 *
 * Covers:
 *   F4. Surah directory — 114 rows, search "67" → eyebrow + Al-Mulk row → tap → #/s/67
 *   F5. Continue-reading card — visible at top after visiting a surah; tap navigates
 *   F4. Surah directory — 114 rows, search "67" → eyebrow + Al-Mulk row → tap → #/s/67
 *   F5. Continue-reading card — visible at top after visiting a surah; tap navigates
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §F
 *   src/navigate/surahs/list.js
 *   src/navigate/ambient-pill.js
 *   src/navigate/ambient-dock.js
 */

import { test, expect } from '@playwright/test'
import { waitForReader } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey F: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForReader(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('F4: #/surahs renders 114 rows; search "67" → eyebrow + Al-Mulk row', async ({ page }) => {
    await page.goto('/#/surahs')

    // Surah list page should render
    const surahListPage = page.locator('.qa-surah-list-page')
    await expect(surahListPage).toBeVisible({ timeout: 8_000 })
    await expect(page).toHaveURL(/#\/surahs/)

    // 114 rows rendered
    const rows = page.locator('.qa-sl-row')
    await expect(rows.first()).toBeVisible({ timeout: 5_000 })
    const rowCount = await rows.count()
    expect(rowCount).toBe(114)

    // Search "67"
    const searchInput = page.locator('.qa-sl-search-input')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('67')

    // Eyebrow hint "Jumping to #67" appears
    const hint = page.locator('.qa-sl-hint')
    await expect(hint).not.toHaveClass(/qa-sl-hint--hidden/, { timeout: 3_000 })
    await expect(hint).toContainText('Jumping to #67')

    // Only 1 row remains (Al-Mulk)
    const filteredRows = page.locator('.qa-sl-row')
    await expect(filteredRows).toHaveCount(1, { timeout: 3_000 })
    const rowName = filteredRows.first().locator('.qa-sl-row-en')
    await expect(rowName).toHaveText('Al-Mulk')

    // Tap the row → navigates to #/s/67
    await filteredRows.first().click()
    await expect(page).toHaveURL(/#\/s\/67/, { timeout: 8_000 })
    await waitForReader(page)
  })

  test('F4: a11y — no serious/critical axe violations on surah list @a11y', async ({ page }) => {
    await page.goto('/#/surahs')
    await expect(page.locator('.qa-surah-list-page')).toBeVisible({ timeout: 8_000 })

    const violations = await scanA11y(page, { include: ['.qa-surah-list-page'] })
    expect(violations).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // F5. Continue-reading card
  // ---------------------------------------------------------------------------

  test('F5: after visiting #/s/67, surah list shows continue-reading card at top; tap navigates', async ({ page }) => {
    // Navigate to surah 67 so the reader writes a position record
    await page.goto('/#/s/67')
    await waitForReader(page)

    // Navigate to surah list
    await page.goto('/#/surahs')
    const surahListPage = page.locator('.qa-surah-list-page')
    await expect(surahListPage).toBeVisible({ timeout: 8_000 })

    // Continue-reading card should appear at top of list (All filter, no query)
    const continueCard = page.locator('.qa-sl-continue')
    await expect(continueCard).toBeVisible({ timeout: 5_000 })

    // Card should show a reference mentioning surah 67
    const continueRef = page.locator('.qa-sl-continue-ref')
    await expect(continueRef).toBeVisible()
    await expect(continueRef).toContainText('Al-Mulk')

    // Tap the card → navigates to surah 67
    await continueCard.click()
    await expect(page).toHaveURL(/#\/s\/67/, { timeout: 8_000 })
    await waitForReader(page)
  })

  test('F5: continue-reading card is hidden when search query is active', async ({ page }) => {
    // Navigate to surah 67 to set the last position
    await page.goto('/#/s/67')
    await waitForReader(page)

    await page.goto('/#/surahs')
    await expect(page.locator('.qa-surah-list-page')).toBeVisible({ timeout: 8_000 })

    // Card visible with no query
    await expect(page.locator('.qa-sl-continue')).toBeVisible({ timeout: 5_000 })

    // Type a search query → card should disappear
    const searchInput = page.locator('.qa-sl-search-input')
    await searchInput.fill('Al-Fatiha')

    await expect(page.locator('.qa-sl-continue')).toHaveCount(0, { timeout: 3_000 })
  })

  // Keyboard shortcut coverage lives in the retired-entry unit coverage.
})

// ---------------------------------------------------------------------------
// Journey F — desktop variants (≥1180px viewport)
//
// The surah directory renders as a 2-column grid at desktop.
// ---------------------------------------------------------------------------

test.describe('Journey F: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // Boot directly at /#/surahs — skips the reader-mount dataset fetch we
  // would immediately discard.  storageState provides onboarded state.
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/surahs')
  })
})
