/**
 * E2E Journey G: About page
 *
 * Covers:
 *   G1. Open About via dock More sheet → page renders all required sections
 *   G2. Install PWA (skipped — not testable in Playwright)
 *   G3. Shortcut cheatsheet (`?`) → sheet opens, 4 groups visible, Esc closes
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §G
 *   src/about/index.js
 *   src/about/pwa-install.js
 *   src/nav/shortcuts-sheet.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { waitForReader, openMoreSheet } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey G: About', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    // Seed marks so the stat grid shows non-zero values
    await seedMarks(page, [
      { verseKey: '1:1', tags: ['mercy'], note: '' },
      { verseKey: '2:255', tags: ['mercy', 'faith'], note: '' },
    ])
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // ---------------------------------------------------------------------------
  // G1. Open About — happy path + structure check
  // ---------------------------------------------------------------------------

  test('G1: dock → More sheet → About → renders all required sections', async ({ page }) => {
    // Step 1: open More sheet via dock ⋯
    await openMoreSheet(page)
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()

    // Step 2: tap "About" row → navigates to #/about
    await page.locator('button.qa-sheet-row').filter({ hasText: 'About' }).click()
    await expect(page).toHaveURL(/#\/about/, { timeout: 8_000 })

    // Wordmark / page heading
    const heading = page.locator('.qa-about-heading')
    await expect(heading).toBeVisible({ timeout: 5_000 })
    await expect(heading).toHaveText('QuranAtlas')

    // 54:17 blessing section
    const blessingWrap = page.locator('.qa-about-blessing-wrap')
    await expect(blessingWrap).toBeVisible()

    // Stat grid — 4 cells present
    const statGrid = page.locator('.qa-about-stat-grid')
    await expect(statGrid).toBeVisible()

    const statCells = page.locator('.qa-about-stat-cell')
    await expect(statCells).toHaveCount(4)

    // Every cell has both a value and a label
    for (let i = 0; i < 4; i++) {
      const cell = statCells.nth(i)
      await expect(cell.locator('.qa-about-stat-value')).toBeVisible()
      await expect(cell.locator('.qa-about-stat-label')).toBeVisible()
    }

    // Stat labels match expected order: Marks, Tags, Surahs, % Qur'an
    const labels = page.locator('.qa-about-stat-label')
    await expect(labels.nth(0)).toHaveText('Marks')
    await expect(labels.nth(1)).toHaveText('Tags')
    await expect(labels.nth(2)).toHaveText('Surahs')
    await expect(labels.nth(3)).toContainText('%')

    // Seeded marks → stat values should be non-zero numerics
    const marksValue = page.locator('.qa-about-stat-value').nth(0)
    await expect(async () => {
      const text = await marksValue.textContent()
      expect(parseInt(text, 10)).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5_000 })

    // Attribution list visible
    const attrList = page.locator('.qa-about-attr-list')
    await expect(attrList).toBeVisible()
    const attrItems = attrList.locator('li')
    const attrCount = await attrItems.count()
    expect(attrCount).toBeGreaterThanOrEqual(1)

    // Version line visible
    const versionLine = page.locator('.qa-about-version-line')
    await expect(versionLine).toBeVisible()
    const vText = await versionLine.textContent()
    expect(vText).toMatch(/^v/)
  })

  test('G1: a11y — no serious/critical axe violations on About page @a11y', async ({ page }) => {
    await openMoreSheet(page)
    await page.locator('button.qa-sheet-row').filter({ hasText: 'About' }).click()
    await expect(page).toHaveURL(/#\/about/, { timeout: 8_000 })
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })

    const violations = await scanA11y(page, { include: ['#main-content'] })
    expect(violations).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // G2. Install PWA — not testable in Playwright
  // ---------------------------------------------------------------------------

  test.skip('G2: PWA install button triggers installation prompt', async () => {
    // Not testable in Playwright — beforeinstallprompt cannot be faked.
    // Manual QA only.
  })

  // ---------------------------------------------------------------------------
  // G3. Shortcut cheatsheet (`?`) — open, assert 4 groups, close via Esc
  // ---------------------------------------------------------------------------

  test('G3: press ? → keyboard shortcuts sheet opens and closes', async ({ page }) => {
    // The reader is already loaded from beforeEach (/#/s/1).
    // Ensure focus is on a non-text-input element so `?` fires the key handler.
    // Focus #main-content directly — a click at (50,50) on mobile is blocked by
    // the fixed MarginHeader at the top.
    await page.evaluate(() => document.getElementById('main-content')?.focus())

    // Step 1: press ? → shortcuts sheet opens
    await page.keyboard.press('?')

    const shortcutsSheet = page.locator('.qa-sheet--shortcuts')
    await expect(shortcutsSheet).toBeVisible({ timeout: 5_000 })

    // Sheet has correct ARIA role and label (src/nav/shortcuts-sheet.js)
    await expect(shortcutsSheet).toHaveAttribute('role', 'dialog')
    await expect(shortcutsSheet).toHaveAttribute('aria-label', 'Keyboard shortcuts')

    // Title row
    const titleEl = shortcutsSheet.locator('.qa-sheet-title')
    await expect(titleEl).toHaveText('Keyboard shortcuts')

    // Step 2: verify 4 section groups are present (Universal · Go to · Reader · Command sheet)
    const groups = shortcutsSheet.locator('.qa-sc-group')
    await expect(groups).toHaveCount(4)

    const groupTitles = shortcutsSheet.locator('.qa-sc-group-title')
    await expect(groupTitles.nth(0)).toHaveText('Universal')
    await expect(groupTitles.nth(1)).toHaveText('Go to')
    await expect(groupTitles.nth(2)).toHaveText('Reader')
    await expect(groupTitles.nth(3)).toHaveText('Command sheet')

    // Step 3: close via Esc → sheet is removed from DOM
    await page.keyboard.press('Escape')
    await expect(shortcutsSheet).not.toBeAttached({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey G — desktop variants (≥1180px viewport)
//
// About page: 4-across stat grid, 2-col body split.
// ---------------------------------------------------------------------------

test.describe('Journey G: desktop variants @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // Boot directly at /#/about — skips the /#/s/1 reader mount we would
  // immediately discard.  about:blank breaks the current page context so the
  // next goto is a true HTTP load, which is required after clearAllData
  // wipes the IDB the app was using.
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('about:blank')
    await page.goto('/#/about')
  })

  test('G1 desktop: stats render 4-across; body splits into 2 columns', async ({ page }) => {
    await expect(page.locator('.qa-about-stat-grid')).toBeVisible()

    const statCols = await page.locator('.qa-about-stat-grid').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(statCols.split(' ').length).toBe(4)

    await expect(page.locator('.qa-about-body-split')).toHaveCount(1)
  })
})
