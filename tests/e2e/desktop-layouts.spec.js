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

  // ---------------------------------------------------------------------------
  // 5. Font preview binds to tokens
  // ---------------------------------------------------------------------------

  test('settings font preview scales when slider moves', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')

    await page.evaluate(async () => {
      const mod = await import('/src/settings/panel.js')
      await mod.openSettingsSheet()
    })
    await page.waitForSelector('.qa-font-slider')

    const getArSize = () => page.locator('.qa-font-preview-ar').evaluate(
      el => parseFloat(getComputedStyle(el).fontSize)
    )

    await page.locator('.qa-font-slider').evaluate(el => {
      el.value = '0' // xs
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(200)
    const xsSize = await getArSize()

    await page.locator('.qa-font-slider').evaluate(el => {
      el.value = '4' // xl
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.waitForTimeout(200)
    const xlSize = await getArSize()

    // xl should be noticeably larger than xs (ratio ~1.73 since 1.3 / 0.75)
    expect(xlSize).toBeGreaterThan(xsSize * 1.5)
  })

  test('settings font preview: English on left, Arabic on right', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')
    await page.evaluate(async () => {
      const mod = await import('/src/settings/panel.js')
      await mod.openSettingsSheet()
    })
    await page.waitForSelector('.qa-font-preview')

    const order = await page.locator('.qa-font-preview').evaluate(
      el => Array.from(el.children).map(c => c.className)
    )
    expect(order).toEqual(['qa-font-preview-en', 'qa-font-preview-ar'])
  })

  // ---------------------------------------------------------------------------
  // 6. Mark editor column rebalance
  // ---------------------------------------------------------------------------

  test('mark editor: selected pills live in left column at desktop', async ({ page }) => {
    await page.goto('/#/s/1')
    await page.waitForSelector('[data-verse-key]')

    await page.evaluate(async () => {
      const mod = await import('/src/marks/editor.js')
      await mod.openEditor('1:1')
    })
    await page.waitForSelector('.qa-sheet--mark')
    await page.waitForTimeout(250)

    // Select a tag to populate .qa-mark-selected
    await page.locator('.qa-mark-chips--all .qa-mark-chip').first().click()
    await page.waitForTimeout(200)

    const cols = await page.evaluate(() => {
      const sel = document.querySelector('.qa-mark-selected')
      const note = document.querySelector('.qa-mark-note')
      const all = document.querySelector('.qa-mark-chips--all')
      return {
        selected: getComputedStyle(sel).gridColumnStart,
        note: getComputedStyle(note).gridColumnStart,
        all: getComputedStyle(all).gridColumnStart,
      }
    })
    expect(cols.selected).toBe('1')
    expect(cols.note).toBe('1')
    expect(cols.all).toBe('2')
  })

  // ---------------------------------------------------------------------------
  // 7. Review hub: single-column, de-duped, multi-tag OR filter
  // ---------------------------------------------------------------------------

  test('review hub: multi-tagged mark renders exactly once', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
    ])
    await page.goto('/#/review')
    await page.waitForSelector('.qa-review-layout')
    await expect(page.locator('.qa-review-card[data-mark="2:255"]')).toBeVisible({ timeout: 10_000 })

    const count = await page.locator('.qa-review-card[data-mark="2:255"]').count()
    expect(count).toBe(1)

    const total = await page.locator('.qa-review-card').count()
    expect(total).toBe(2)
  })

  test('review hub: card list is single-column at desktop (no 2-col grid)', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [{ verseKey: '1:5', tags: ['reflect'], note: '' }])
    await page.goto('/#/review')
    await page.waitForSelector('.qa-review-card-list')

    const display = await page.locator('.qa-review-card-list').evaluate(
      el => getComputedStyle(el).display
    )
    expect(display).toBe('block')
  })

  test('review hub: multi-tag OR filter + chip bar + clear', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
      { verseKey: '67:1',  tags: ['reflect', 'protection'],    note: '' },
      { verseKey: '93:11', tags: ['gratitude'],                note: '' },
    ])
    await page.goto('/#/review')
    await page.locator('.qa-review-rail-row').filter({ hasText: 'reflect' }).first().waitFor({ timeout: 15_000 })

    // Click reflect + gratitude
    await page.locator('.qa-review-rail-row').filter({ hasText: 'reflect' }).first().click()
    await page.locator('.qa-review-rail-row').filter({ hasText: 'gratitude' }).first().click()
    await page.waitForTimeout(300)

    await expect(page.locator('.qa-review-filter-bar')).toBeVisible()
    const chipCount = await page.locator('.qa-review-filter-chip').count()
    expect(chipCount).toBe(2)
    const cardCount = await page.locator('.qa-review-card').count()
    expect(cardCount).toBe(4)

    // Remove one via × button
    await page.locator('.qa-review-filter-chip button').first().click()
    await page.waitForTimeout(200)
    expect(await page.locator('.qa-review-filter-chip').count()).toBe(1)

    // Clear all
    await page.locator('.qa-review-filter-bar-clear').click()
    await page.waitForTimeout(200)
    await expect(page.locator('.qa-review-filter-bar')).toHaveCount(0)
  })

  // ---------------------------------------------------------------------------
  // 8. FVR centering
  // ---------------------------------------------------------------------------

  test('FVR layout is centered at 720px max-width at desktop', async ({ page }) => {
    await page.goto('/')
    await seedMarks(page, [{ verseKey: '2:255', tags: ['reflect'], note: '' }])
    await page.goto('/#/t/reflect')
    await page.waitForSelector('.qa-fvr-layout')

    const geom = await page.locator('.qa-fvr-layout').evaluate(el => {
      const r = el.getBoundingClientRect()
      return {
        width: r.width,
        left: r.left,
        rightGap: window.innerWidth - r.right,
      }
    })
    expect(Math.round(geom.width)).toBe(720)
    expect(Math.abs(geom.left - geom.rightGap)).toBeLessThan(2)
  })

  // ---------------------------------------------------------------------------
  // 9. Onboarding at desktop
  // ---------------------------------------------------------------------------

  test('onboarding desktop: wordmark and container scale up', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => {
      const db = await import('/src/core/db.js')
      await db.del('settings', 'onboardingComplete').catch(() => {})
    })
    await page.goto('/')
    await page.waitForSelector('.qa-onboarding')

    const sizes = await page.evaluate(() => {
      const w = getComputedStyle(document.querySelector('.qa-onboarding')).maxWidth
      const m = getComputedStyle(document.querySelector('.qa-onb-mark')).fontSize
      return { wrap: w, mark: parseFloat(m) }
    })
    expect(sizes.wrap).toBe('680px')
    expect(sizes.mark).toBeGreaterThanOrEqual(60) // 3.75rem
  })

  test('onboarding: shortcuts screen renders 2-col at desktop', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => {
      const db = await import('/src/core/db.js')
      await db.del('settings', 'onboardingComplete').catch(() => {})
    })
    await page.goto('/')
    await page.waitForSelector('.qa-onboarding')

    // Click through welcome → theme → translation
    for (let i = 0; i < 3; i++) {
      await page.locator('.qa-onb-cta--primary').first().click()
      await page.waitForTimeout(300)
    }

    await page.waitForSelector('.qa-onb-shortcuts')
    const cols = await page.locator('.qa-onb-shortcuts').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(cols.split(' ').length).toBe(2)

    const rows = await page.locator('.qa-onb-shortcut-row').count()
    expect(rows).toBeGreaterThanOrEqual(6)
  })
})
