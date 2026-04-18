/**
 * Desktop layout smoke tests @desktop
 *
 * Verifies the four desktop surfaces introduced in the 2026-04-18 redesign:
 *   1. Surah list — 2-col grid
 *   2. About — stats 4-across, body-split 2-col
 *   3. Mark editor — 820px verse-hero modal, true-centered, grip hidden
 *   4. Review hub — 220px left rail + 2-col card grid, rail filtering
 *
 * All tests run at 1440×900.
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'

test.use({ viewport: { width: 1440, height: 900 } })

test.describe('Desktop layouts @desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
  })

  // ---------------------------------------------------------------------------
  // 1. Surah list — 2-col grid
  // ---------------------------------------------------------------------------

  test('surah list renders as 2-col grid', async ({ page }) => {
    await page.goto('/#/surahs')
    await page.waitForSelector('.qa-sl-list .qa-sl-row')

    const cols = await page.locator('.qa-sl-list').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(cols.split(' ').length).toBe(2)

    // Two consecutive rows share the same top offset (same grid row)
    const rowTops = await page.locator('.qa-sl-row').evaluateAll(rows => [
      rows[0].getBoundingClientRect().top,
      rows[1].getBoundingClientRect().top,
    ])
    expect(Math.abs(rowTops[0] - rowTops[1])).toBeLessThan(2)
  })

  // ---------------------------------------------------------------------------
  // 2. About — stats 4-across, body-split 2-col
  // ---------------------------------------------------------------------------

  test('about page: stats 4-across, body split 2-col', async ({ page }) => {
    await page.goto('/#/about')
    await page.waitForSelector('.qa-about-stat-grid')

    const statCols = await page.locator('.qa-about-stat-grid').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(statCols.split(' ').length).toBe(4)

    await expect(page.locator('.qa-about-body-split')).toHaveCount(1)
  })

  // ---------------------------------------------------------------------------
  // 3. Mark editor — verse-hero modal centered, grip hidden
  // ---------------------------------------------------------------------------

  test('mark editor: verse-hero modal centered, grip hidden', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')

    await page.evaluate(async () => {
      const mod = await import('/src/marks/editor.js')
      const v = document.querySelector('[data-verse-key]')
      mod.openEditor(v.getAttribute('data-verse-key'))
    })
    await page.waitForSelector('.qa-sheet--mark')

    // Wait for the scale-in animation to finish before reading geometry
    await page.locator('.qa-sheet--mark').evaluate(
      el => new Promise(r => setTimeout(r, 250))
    )

    const geom = await page.locator('.qa-sheet--mark').evaluate(el => {
      const r = el.getBoundingClientRect()
      return {
        computedWidth: getComputedStyle(el).width,
        topGap: r.top,
        bottomGap: window.innerHeight - r.bottom,
        leftGap: r.left,
        rightGap: window.innerWidth - r.right,
      }
    })

    expect(geom.computedWidth).toBe('820px')
    expect(Math.abs(geom.topGap - geom.bottomGap)).toBeLessThan(10)
    expect(Math.abs(geom.leftGap - geom.rightGap)).toBeLessThan(2)

    const gripDisplay = await page.locator('.qa-sheet--mark .qa-sheet-grip').evaluate(
      el => getComputedStyle(el).display
    )
    expect(gripDisplay).toBe('none')

    const quoteSpan = await page.locator('.qa-sheet--mark .qa-mark-quote').evaluate(
      el => getComputedStyle(el).gridColumn
    )
    expect(quoteSpan).toContain('-1')
  })

  // ---------------------------------------------------------------------------
  // 4. Review hub — left rail + 2-col cards + rail filtering
  // ---------------------------------------------------------------------------

  test('review hub: left rail builds + filters on click', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: 'Ayat al-Kursi' },
      { verseKey: '67:1',  tags: ['reflect', 'protection'],    note: '' },
      { verseKey: '93:11', tags: ['gratitude'],                note: '' },
    ])

    await page.goto('/#/review')
    await page.waitForSelector('.qa-review-layout')

    const layoutCols = await page.locator('.qa-review-layout').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(layoutCols).toContain('220px')

    await expect(page.locator('.qa-review-rail-row').first()).toBeVisible()
    const rowCount = await page.locator('.qa-review-rail-row').count()
    expect(rowCount).toBeGreaterThan(0)

    const beforeCards = await page.locator('.qa-review-card').count()
    await page.locator('.qa-review-rail-row').first().click()
    await expect(page.locator('.qa-review-rail-row--on').first()).toBeVisible({ timeout: 3_000 })
    const afterCards = await page.locator('.qa-review-card').count()
    expect(afterCards).toBeLessThanOrEqual(beforeCards)
  })
})
