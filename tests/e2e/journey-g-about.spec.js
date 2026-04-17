/**
 * E2E Journey G: About page
 *
 * Covers:
 *   G1. Open About via dock More sheet → page renders all required sections
 *   G2. Install PWA (skipped — not testable in Playwright)
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §G
 *   src/about/index.js
 *   src/about/pwa-install.js
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
    await expect(page.locator('[aria-label="More"]')).toBeVisible()

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

  test('G1: a11y — no serious/critical axe violations on About page', async ({ page }) => {
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
})
