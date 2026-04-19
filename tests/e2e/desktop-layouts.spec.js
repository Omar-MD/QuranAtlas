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
    // Step 1: load the app so window.__qaSuppressNextVersionChange is available.
    await page.goto('/')
    // Step 2: wipe IDB and recreate with onboarding-complete.
    await clearAllData(page)
    await markOnboardingComplete(page)
    // Step 3: hard-boot the app with a fresh IDB connection.
    // about:blank breaks the current page context; the subsequent goto() to the
    // app origin triggers a genuine HTTP load (not a hash change), so the app
    // calls openDB() anew against the just-recreated database.  Tests that need
    // extra marks call seedMarks() after beforeEach while the page is still
    // on the app origin, then navigate to their target route.
    await page.goto('about:blank')
    await page.goto('/#/s/1')
    // Wait for the reader to confirm the app has booted and is reading from the
    // fresh IDB before any test navigates or seeds marks.
    await expect(page.locator('[data-verse-key]').first()).toBeVisible({ timeout: 15_000 })
  })

  // ---------------------------------------------------------------------------
  // 1. Surah list — 2-col grid
  // ---------------------------------------------------------------------------

  test('surah list renders as 2-col grid', async ({ page }) => {
    // Navigate to surahs; wait for the first row to appear before reading computed styles.
    // Use expect().toBeVisible() (polling) rather than waitForSelector (one-shot) to
    // tolerate the async getSurahs() fetch that populates the list.
    await page.goto('/#/surahs')
    await expect(page.locator('.qa-sl-list .qa-sl-row').first()).toBeVisible({ timeout: 20_000 })

    const cols = await page.locator('.qa-sl-list').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    // At 1440px the CSS applies grid-template-columns: repeat(2, minmax(0, 1fr))
    // which resolves to two equal pixel values, e.g. "756px 756px"
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
    await expect(page.locator('[data-verse-key]').first()).toBeVisible({ timeout: 15_000 })

    // Open the editor via right-click (contextmenu) — the app suppresses the native
    // context menu and calls openEditor() instead. This mirrors real user interaction.
    await page.locator('[data-verse-key]').first().click({ button: 'right' })
    await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 10_000 })

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
    await seedMarks(page, [
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: 'Ayat al-Kursi' },
      { verseKey: '67:1',  tags: ['reflect', 'protection'],    note: '' },
      { verseKey: '93:11', tags: ['gratitude'],                note: '' },
    ])

    await page.goto('/#/review')
    await expect(page.locator('.qa-review-layout')).toBeVisible({ timeout: 15_000 })

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
    await expect(page.locator('[data-verse-key]').first()).toBeVisible({ timeout: 15_000 })

    // Open editor via right-click (contextmenu) — same as user interaction.
    await page.locator('[data-verse-key]').first().click({ button: 'right' })
    await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 10_000 })
    // Allow animation to settle before reading computed styles
    await page.locator('.qa-sheet--mark').evaluate(
      el => new Promise(r => setTimeout(r, 250))
    )

    // Select a tag to populate .qa-mark-selected chips
    await expect(page.locator('.qa-mark-chips--all .qa-mark-chip').first()).toBeVisible({ timeout: 5_000 })
    await page.locator('.qa-mark-chips--all .qa-mark-chip').first().click()
    await expect(page.locator('.qa-mark-chips--selected .qa-mark-chip').first()).toBeVisible({ timeout: 3_000 })

    // The 2-col layout at desktop puts .qa-mark-body-left (note + selected) in
    // the left column and .qa-mark-body-right (search + all tags) in the right.
    // CSS auto-placement means gridColumnStart is "auto" in computed style even
    // when the element is visually in column 1.  Check visual X-position instead.
    const positions = await page.evaluate(() => {
      const body = document.querySelector('.qa-mark-body').getBoundingClientRect()
      const left = document.querySelector('.qa-mark-body-left').getBoundingClientRect()
      const right = document.querySelector('.qa-mark-body-right').getBoundingClientRect()
      const midX = body.left + body.width / 2
      return {
        leftCenterX: left.left + left.width / 2,
        rightCenterX: right.left + right.width / 2,
        midX,
      }
    })
    // .qa-mark-body-left visual center should be LEFT of the body midpoint
    expect(positions.leftCenterX).toBeLessThan(positions.midX)
    // .qa-mark-body-right visual center should be RIGHT of the body midpoint
    expect(positions.rightCenterX).toBeGreaterThan(positions.midX)
    // .qa-mark-selected is inside .qa-mark-body-left which is left of .qa-mark-body-right
    const selVsAll = await page.evaluate(() => {
      const sel = document.querySelector('.qa-mark-selected').getBoundingClientRect()
      const all = document.querySelector('.qa-mark-chips--all').getBoundingClientRect()
      return { selRight: sel.right, allLeft: all.left }
    })
    expect(selVsAll.selRight).toBeLessThan(selVsAll.allLeft + 10)
  })

  // ---------------------------------------------------------------------------
  // 7. Review hub: single-column, de-duped, multi-tag OR filter
  // ---------------------------------------------------------------------------

  test('review hub: multi-tagged mark renders exactly once', async ({ page }) => {
    // Seed before navigating — beforeEach only runs clearAllData+markOnboardingComplete.
    // No extra goto('/') needed; the page is already at '/' from beforeEach.
    await seedMarks(page, [
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
    ])
    await page.goto('/#/review')
    // At 1440px the hub renders .qa-review-layout (desktop rail + main column).
    // Wait for at least one card to confirm the hub has rendered with data.
    await expect(page.locator('.qa-review-card').first()).toBeVisible({ timeout: 15_000 })

    // The multi-tagged mark 2:255 must appear exactly once (flat deduped list)
    await expect(page.locator('.qa-review-card[data-mark="2:255"]')).toBeVisible()
    const count = await page.locator('.qa-review-card[data-mark="2:255"]').count()
    expect(count).toBe(1)

    const total = await page.locator('.qa-review-card').count()
    expect(total).toBe(2)
  })

  test('review hub: card list is single-column at desktop (no 2-col grid)', async ({ page }) => {
    await seedMarks(page, [{ verseKey: '1:5', tags: ['reflect'], note: '' }])
    await page.goto('/#/review')
    await expect(page.locator('.qa-review-card-list')).toBeVisible({ timeout: 15_000 })

    const display = await page.locator('.qa-review-card-list').evaluate(
      el => getComputedStyle(el).display
    )
    expect(display).toBe('block')
  })

  // E2b: filter by multiple tags (desktop) — rail OR filter + chip bar + clear all
  test('review hub: multi-tag OR filter + chip bar + clear', async ({ page }) => {
    await seedMarks(page, [
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
      { verseKey: '67:1',  tags: ['reflect', 'protection'],    note: '' },
      { verseKey: '93:11', tags: ['gratitude'],                note: '' },
    ])
    await page.goto('/#/review')
    // Wait for the rail to render with tag buckets (desktop ≥1180px only)
    await expect(
      page.locator('.qa-review-rail-row').filter({ hasText: 'reflect' }).first()
    ).toBeVisible({ timeout: 15_000 })

    // Click reflect + gratitude to activate two tag filters in the rail
    await page.locator('.qa-review-rail-row').filter({ hasText: 'reflect' }).first().click()
    await page.locator('.qa-review-rail-row').filter({ hasText: 'gratitude' }).first().click()

    // Wait for chip bar to appear (re-render is synchronous after click)
    await expect(page.locator('.qa-review-filter-bar')).toBeVisible({ timeout: 5_000 })
    const chipCount = await page.locator('.qa-review-filter-chip').count()
    expect(chipCount).toBe(2)
    const cardCount = await page.locator('.qa-review-card').count()
    expect(cardCount).toBe(4)

    // Remove one chip via its × button
    await page.locator('.qa-review-filter-chip button').first().click()
    await expect(page.locator('.qa-review-filter-chip')).toHaveCount(1, { timeout: 5_000 })

    // Clear all remaining chips
    await page.locator('.qa-review-filter-bar-clear').click()
    await expect(page.locator('.qa-review-filter-bar')).toHaveCount(0, { timeout: 5_000 })
  })

  // ---------------------------------------------------------------------------
  // 8. FVR centering
  // ---------------------------------------------------------------------------

  test('FVR layout is centered at desktop', async ({ page }) => {
    // At viewport ≥1180px the CSS overrides .qa-fvr-layout max-width to 1000px.
    // The test verifies centering (equal left/right gaps) regardless of the exact
    // pixel width, and checks that the rendered width matches the CSS max-width.
    await seedMarks(page, [{ verseKey: '2:255', tags: ['reflect'], note: '' }])
    await page.goto('/#/t/reflect')
    await expect(page.locator('.qa-fvr-layout')).toBeVisible({ timeout: 15_000 })

    const geom = await page.locator('.qa-fvr-layout').evaluate(el => {
      const r = el.getBoundingClientRect()
      return {
        width: Math.round(r.width),
        left: r.left,
        rightGap: window.innerWidth - r.right,
      }
    })
    // At 1440px viewport: desktop media query sets max-width:1000px
    expect(geom.width).toBe(1000)
    // Layout must be horizontally centered
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
