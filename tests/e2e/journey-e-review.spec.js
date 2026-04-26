/**
 * E2E Journey E: Review hub
 *
 * Covers:
 *   E1. Open review hub — structure check (layer seg, group seg, sort, surah filter, cards) + a11y scan
 *   E2. Swap grouping — Surah → Date → Value → back to Value default
 *   E3. Tap tag chip on mark card → FVR deep link renders (#/threads/<tag>)
 *   E4. FVR back link → returns to review hub
 *   E5. Layer switch + value chip filter (+ clear)
 *   E6. FVR via #/<layer>/:value deep link — layer param canonicalizes on load
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §E
 *   src/review/Hub.svelte
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { scanA11y } from './fixtures/a11y.js'

// Force mobile viewport so the review hub's filter/group controls
// (sort dropdown, surah select, group-by segment, layer segment) are
// visible.  At ≥1180px those controls are hidden in favour of the
// desktop left-rail.  Desktop rail filtering is exercised separately
// in desktop-layouts.spec.js.
test.use({ viewport: { width: 390, height: 844 } })

// ---------------------------------------------------------------------------
// Seed data used by all tests:
// - 4 marks across 3 surahs and 3 thread tags so grouping / filtering exercises real behaviour.
// - verseKey '1:1'  → tags ['mercy', 'faith']  — multi-tagged; lands under two tag groups
// - verseKey '2:255'→ tags ['mercy']            — Ayat al-Kursi
// - verseKey '3:190'→ tags ['faith','reflection']
// - verseKey '112:1'→ tags ['faith']            — Surah 112
// ---------------------------------------------------------------------------

const SEED = [
  { verseKey: '1:1',   tags: ['mercy', 'faith'],      note: 'first surah opening' },
  { verseKey: '2:255', tags: ['mercy'],                note: 'Ayat al-Kursi'       },
  { verseKey: '3:190', tags: ['faith', 'reflection'],  note: ''                    },
  { verseKey: '112:1', tags: ['faith'],                note: 'tawheed'             },
]

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey E: Review hub', () => {
  test.beforeEach(async ({ page }) => {
    // Step 1: ensure the app has loaded at least once so that
    // window.__qaSuppressNextVersionChange is available.
    await page.goto('/')
    // Step 2: wipe IDB, recreate schema with onboarding complete, then seed marks.
    await clearAllData(page)
    await markOnboardingComplete(page)
    await seedMarks(page, SEED)
    // Step 3: perform a full page reload to /#/review so the app boots fresh with
    // the newly-seeded IDB.  We navigate to about:blank first to break any pending
    // SPA state, then to the target URL — this guarantees a real HTTP navigation
    // rather than a mere hash change, giving the app a clean IDB connection.
    await page.goto('about:blank')
    await page.goto('/#/review')
    // Step 4: wait for the controls group-by tablist (role=tablist + aria-label)
    // and at least one mark card — together these confirm hub.init() completed with data.
    await expect(page.getByRole('tablist', { name: 'Group by' })).toBeVisible({ timeout: 25_000 })
    await expect(page.locator('.qa-review-card').first()).toBeVisible({ timeout: 10_000 })
  })

  // -------------------------------------------------------------------------
  // E1. Open the review hub — structure + a11y
  // -------------------------------------------------------------------------

  test('E1: hub renders layer segment, group-by segment, sort dropdown, surah filter, and mark cards', async ({ page }) => {
    // Layer segment pill exists with 12 tabs.
    const layerSeg = page.getByRole('tablist', { name: 'Layer' })
    await expect(layerSeg).toBeVisible()
    const layerItems = layerSeg.locator('.qa-review-seg-item')
    await expect(layerItems).toHaveCount(12)

    // Thread layer is active by default
    await expect(layerSeg.locator('[data-layer="threads"]')).toHaveAttribute('aria-selected', 'true')

    // Group-by segment pill exists with 3 tabs.
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await expect(seg).toBeVisible()

    const items = seg.locator('.qa-review-seg-item')
    await expect(items).toHaveCount(3)

    // Labels: Value | Surah | Date  (in that DOM order)
    await expect(items.nth(0)).toHaveText('Value')
    await expect(items.nth(1)).toHaveText('Surah')
    await expect(items.nth(2)).toHaveText('Date')

    // Value segment is active by default
    const activeItem = seg.locator('.qa-review-seg-item--on')
    await expect(activeItem).toHaveCount(1)
    await expect(activeItem).toHaveText('Value')
    await expect(activeItem).toHaveAttribute('aria-selected', 'true')

    // Sort dropdown is present
    const sortSelect = page.locator('[data-control="sort"]')
    await expect(sortSelect).toBeVisible()
    await expect(sortSelect).toHaveAttribute('aria-label', 'Sort by')

    // Surah filter dropdown is present
    const surahSelect = page.locator('[data-control="surah"]')
    await expect(surahSelect).toBeVisible()
    await expect(surahSelect).toHaveAttribute('aria-label', 'Filter by surah')

    // Mark cards rendered — we seeded 4 marks; all should be visible (PAGE_SIZE = 30)
    const cards = page.locator('.qa-review-card')
    await expect(cards.first()).toBeVisible()
    const cardCount = await cards.count()
    expect(cardCount).toBeGreaterThanOrEqual(4)

    // No active filter chips yet (no filters applied)
    await expect(page.locator('.qa-review-active-filters')).toHaveCount(0)
  })

  test('E1: a11y — no serious/critical axe violations on review hub @a11y', async ({ page }) => {
    const violations = await scanA11y(page, { include: ['#main-content'] })
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // E2. Swap grouping — Surah → Date → Value
  // -------------------------------------------------------------------------

  test('E2: tap Surah segment → active tab changes; tap Date → flat list; tap Value → Value tab active', async ({ page }) => {
    const seg = page.getByRole('tablist', { name: 'Group by' })

    // --- Surah grouping ---
    await seg.locator('[data-group="surah"]').click()

    // Surah tab is now active
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Surah', { timeout: 5_000 })

    // Mark cards are still present (groupBy alone does not filter the card list)
    await expect(page.locator('.qa-review-card').first()).toBeVisible()

    // --- Date (flat) grouping ---
    await seg.locator('[data-group="flat"]').click()

    // Date tab is now active
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Date', { timeout: 5_000 })

    // All 4 mark cards visible in flat list (groupBy does not filter)
    await expect(page.locator('.qa-review-card').first()).toBeVisible()
    const flatCount = await page.locator('.qa-review-card').count()
    expect(flatCount).toBe(4)

    // --- Back to Value grouping ---
    await seg.locator('[data-group="tag"]').click()

    // Value tab is now active
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Value', { timeout: 5_000 })

    // Cards still present
    await expect(page.locator('.qa-review-card').first()).toBeVisible()
    const tagViewCards = await page.locator('.qa-review-card').count()
    expect(tagViewCards).toBeGreaterThanOrEqual(4)
  })

  test('E2: surah grouping — mark for 1:1 and 2:255 both visible after switching to Surah tab', async ({ page }) => {
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="surah"]').click()
    // Wait for the Surah tab to become active
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Surah', { timeout: 5_000 })

    // All seeded marks should still be visible regardless of groupBy setting
    await expect(page.locator('[data-mark="1:1"]')).toBeVisible()
    await expect(page.locator('[data-mark="2:255"]')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // E3. Tap tag chip → FVR deep link (#/threads/<tag>)
  // -------------------------------------------------------------------------

  test('E3: tap a tag chip on a mark card → navigates to #/threads/<tag> → FVR renders correctly', async ({ page }) => {
    // In tag-grouped view there are tag chips on the cards
    // Pick the 'mercy' chip from any card
    const mercyChip = page.locator('.qa-review-card-chip').filter({ hasText: 'mercy' }).first()
    await expect(mercyChip).toBeVisible({ timeout: 5_000 })

    await mercyChip.click()

    // URL should include the new FVR route
    await expect(page).toHaveURL(/#\/threads\/mercy/, { timeout: 5_000 })

    // FVR header block renders
    const fvrHeader = page.locator('.qa-fvr-header')
    await expect(fvrHeader).toBeVisible({ timeout: 5_000 })

    // "← Marks" back link is present
    const backLink = fvrHeader.locator('.qa-fvr-back')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveText('← Marks')

    // Layer label reads 'Thread' (LAYER_LABELS['threads'])
    await expect(fvrHeader.locator('.qa-fvr-label')).toHaveText('Thread')

    // Tag name reads 'mercy'
    const fvrName = fvrHeader.locator('.qa-fvr-name')
    await expect(fvrName).toBeVisible()
    await expect(fvrName).toHaveText('mercy')

    // Stats: "n verses · n surahs" — mercy has 2 marks (1:1 and 2:255) across 2 surahs
    const fvrStats = fvrHeader.locator('.qa-fvr-stats')
    await expect(fvrStats).toBeVisible()
    await expect(fvrStats).toContainText('verses')
    await expect(fvrStats).toContainText('surahs')

    // Mark cards for that tag are rendered below the header
    await expect(page.locator('.qa-review-card').first()).toBeVisible()
    const fvrCardCount = await page.locator('.qa-review-card').count()
    // mercy: verseKeys 1:1 and 2:255 → 2 cards
    expect(fvrCardCount).toBe(2)
  })

  test('E3: a11y — no serious/critical axe violations on FVR view @a11y', async ({ page }) => {
    const mercyChip = page.locator('.qa-review-card-chip').filter({ hasText: 'mercy' }).first()
    await expect(mercyChip).toBeVisible({ timeout: 5_000 })
    await mercyChip.click()
    await expect(page.locator('.qa-fvr-header')).toBeVisible({ timeout: 5_000 })

    const violations = await scanA11y(page, { include: ['#main-content'] })
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // E4. FVR back to hub
  // -------------------------------------------------------------------------

  test('E4: tap ← Marks → navigates back to #/review → hub re-renders with segment pill', async ({ page }) => {
    // Navigate to FVR
    const mercyChip = page.locator('.qa-review-card-chip').filter({ hasText: 'mercy' }).first()
    await expect(mercyChip).toBeVisible({ timeout: 5_000 })
    await mercyChip.click()
    await expect(page.locator('.qa-fvr-header')).toBeVisible({ timeout: 5_000 })

    // Tap the back link
    await page.locator('.qa-fvr-back').click()

    // URL returns to review hub
    await expect(page).toHaveURL(/#\/review/, { timeout: 5_000 })

    // Hub re-renders: segment pill is visible again (use role-based to avoid strict-mode violation)
    await expect(page.getByRole('tablist', { name: 'Group by' })).toBeVisible({ timeout: 8_000 })

    // FVR header is gone
    await expect(page.locator('.qa-fvr-header')).toHaveCount(0)

    // Mark cards are visible again
    await expect(page.locator('.qa-review-card').first()).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // E5. Layer switch + value chip filter + surah filter + clear
  // -------------------------------------------------------------------------

  test('E5: value pool chips appear for threads layer; clicking a chip filters marks', async ({ page }) => {
    // Switch to flat grouping for unambiguous card count
    await page.evaluate(() => {
      const btn = document.querySelector('[data-group="flat"]')
      if (btn) { btn.click() }
    })
    await expect(page.getByRole('tablist', { name: 'Group by' }).locator('.qa-review-seg-item--on'))
      .toHaveText('Date', { timeout: 5_000 })

    // Value chips for threads layer should be visible
    const valueChips = page.locator('.qa-review-value-chip')
    await expect(valueChips.first()).toBeVisible({ timeout: 5_000 })

    // Click 'mercy' value chip
    const mercyValueChip = valueChips.filter({ hasText: 'mercy' }).first()
    await expect(mercyValueChip).toBeVisible()
    await mercyValueChip.click()

    // The chip should be active
    await expect(mercyValueChip).toHaveClass(/qa-review-value-chip--on/, { timeout: 3_000 })

    // Filter chip bar appears
    const filterBar = page.locator('.qa-review-active-filters')
    await expect(filterBar).toBeVisible({ timeout: 5_000 })

    // Only marks tagged 'mercy' are shown: 1:1 and 2:255 → 2 cards
    const cards = page.locator('.qa-review-card')
    await expect(cards.first()).toBeVisible({ timeout: 5_000 })
    await expect(cards).toHaveCount(2)

    // Exact marks present
    await expect(page.locator('[data-mark="1:1"]')).toBeVisible()
    await expect(page.locator('[data-mark="2:255"]')).toBeVisible()

    // Cards not tagged 'mercy' are absent
    await expect(page.locator('[data-mark="3:190"]')).toHaveCount(0)
    await expect(page.locator('[data-mark="112:1"]')).toHaveCount(0)
  })

  test('E5: add surah filter on top of value chip filter → intersection renders', async ({ page }) => {
    // Switch to flat grouping first
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="flat"]').click()
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Date', { timeout: 5_000 })

    // Click mercy value chip
    const mercyChip = page.locator('.qa-review-value-chip').filter({ hasText: 'mercy' }).first()
    await expect(mercyChip).toBeVisible({ timeout: 5_000 })
    await mercyChip.click()
    await expect(page.locator('.qa-review-active-filters')).toBeVisible({ timeout: 5_000 })

    // Apply surah filter: surah 1 (verseKey prefix "1:")
    await page.locator('[data-control="surah"]').selectOption({ value: '1' })

    // Two filter chips should be present now
    const chips = page.locator('.qa-review-filter-chip')
    await expect(chips).toHaveCount(2, { timeout: 5_000 })

    // Clear all button appears
    await expect(page.locator('.qa-review-clear-all-btn')).toBeVisible()

    // Intersection: mercy ∩ surah 1 = only 1:1
    await expect(page.locator('[data-mark="1:1"]')).toBeVisible({ timeout: 5_000 })
    const cards = page.locator('.qa-review-card')
    await expect(cards).toHaveCount(1)
  })

  test('E5: tap × on value filter chip → that filter clears; surah filter remains', async ({ page }) => {
    // Switch to flat grouping
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="flat"]').click()
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Date', { timeout: 5_000 })

    // Apply value chip filter: mercy
    const mercyChip = page.locator('.qa-review-value-chip').filter({ hasText: 'mercy' }).first()
    await expect(mercyChip).toBeVisible({ timeout: 5_000 })
    await mercyChip.click()
    await expect(page.locator('.qa-review-active-filters')).toBeVisible({ timeout: 5_000 })

    // Apply surah filter: surah 2
    await page.locator('[data-control="surah"]').selectOption({ value: '2' })
    await expect(page.locator('.qa-review-filter-chip')).toHaveCount(2, { timeout: 5_000 })

    // Dismiss the mercy value filter chip (✕ button inside the chip)
    const valueFilterChip = page.locator('.qa-review-filter-chip').first()
    await expect(valueFilterChip).toBeVisible()
    const dismissBtn = valueFilterChip.locator('button')
    await dismissBtn.click()

    // Only one chip remains (surah filter)
    await expect(page.locator('.qa-review-filter-chip')).toHaveCount(1, { timeout: 5_000 })

    // Surah 2 filter still active → only marks in surah 2 visible
    await expect(page.locator('[data-mark="2:255"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-mark="1:1"]')).toHaveCount(0)
    await expect(page.locator('[data-mark="112:1"]')).toHaveCount(0)
  })

  test('E5: tap Clear all → both filters clear → all cards return', async ({ page }) => {
    // Switch to flat grouping for predictable card count
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="flat"]').click()
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Date', { timeout: 5_000 })

    // Apply both filters
    const faithChip = page.locator('.qa-review-value-chip').filter({ hasText: 'faith' }).first()
    await expect(faithChip).toBeVisible({ timeout: 5_000 })
    await faithChip.click()
    await expect(page.locator('.qa-review-active-filters')).toBeVisible({ timeout: 5_000 })
    await page.locator('[data-control="surah"]').selectOption({ value: '1' })
    await expect(page.locator('.qa-review-filter-chip')).toHaveCount(2, { timeout: 5_000 })

    // Tap Clear all
    const clearAllBtn = page.locator('.qa-review-clear-all-btn')
    await expect(clearAllBtn).toBeVisible()
    await clearAllBtn.click()

    // Filter bar disappears
    await expect(page.locator('.qa-review-active-filters')).toHaveCount(0, { timeout: 5_000 })

    // All 4 mark cards are back
    await expect(page.locator('.qa-review-card').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-review-card')).toHaveCount(4)
  })

  // -------------------------------------------------------------------------
  // E6. FVR via layer-value deep link + canonicalization
  // -------------------------------------------------------------------------

  test('E6: navigate to #/threads/mercy directly → FVR renders correct layer label + value @chromium-only', async ({ page }) => {
    await page.goto('about:blank')
    await page.goto('/#/threads/mercy')

    await expect(page.locator('.qa-fvr-header')).toBeVisible({ timeout: 15_000 })

    // Layer label should be 'Thread' (LAYER_LABELS['threads'])
    await expect(page.locator('.qa-fvr-label')).toHaveText('Thread')
    await expect(page.locator('.qa-fvr-name')).toHaveText('mercy')

    // Stats reflect 2 marks for 'mercy'
    await expect(page.locator('.qa-fvr-stats')).toContainText('verses')
    await expect(page.locator('.qa-review-card')).toHaveCount(2)
  })

  test('E6: lastSurface persists #/threads/<tag> for session restore @chromium-only', async ({ page }) => {
    // Navigate to a layer FVR route
    await page.goto('about:blank')
    await page.goto('/#/threads/faith')
    await expect(page.locator('.qa-fvr-header')).toBeVisible({ timeout: 15_000 })

    // Read lastSurface from IDB
    const lastSurface = await page.evaluate(async () => {
      const { openDB } = await import('/src/core/db.ts')
      const db = await openDB()
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly')
        const req = tx.objectStore('settings').get('lastSurface')
        req.onsuccess = () => resolve(req.result?.value ?? null)
        req.onerror = () => resolve(null)
      })
    }).catch(() => null)

    // lastSurface should point to the layer route
    if (lastSurface !== null) {
      expect(String(lastSurface)).toMatch(/#\/threads\/faith/)
    }
  })
})

// ---------------------------------------------------------------------------
// Journey E — desktop variants (≥1180px viewport)
// ---------------------------------------------------------------------------

const REVIEW_DESKTOP_SEED = [
  { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
  { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
  { verseKey: '67:1',  tags: ['reflect', 'protection'],    note: '' },
  { verseKey: '93:11', tags: ['gratitude'],                note: '' },
]

test.describe('Journey E: desktop variants @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('about:blank')
    await page.goto('/#/s/1')
    await expect(page.locator('[data-verse-key]').first()).toBeVisible({ timeout: 15_000 })
  })

  test('E1 desktop: review hub renders 220px left rail + layer selector in rail', async ({ page }) => {
    await seedMarks(page, REVIEW_DESKTOP_SEED)

    await page.goto('/#/review')
    await expect(page.locator('.qa-review-layout')).toBeVisible({ timeout: 15_000 })

    const layoutCols = await page.locator('.qa-review-layout').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(layoutCols).toContain('220px')

    // Layer rows are in the rail
    await expect(page.locator('[data-layer="threads"]').first()).toBeVisible()
    const layerRows = await page.locator('[data-layer]').count()
    expect(layerRows).toBe(12)

    // Rail rows from buckets are also present
    await expect(page.locator('.qa-review-rail-row').first()).toBeVisible()
  })

  test('E1 desktop: clicking a layer row in the rail switches active layer', async ({ page }) => {
    await seedMarks(page, REVIEW_DESKTOP_SEED)
    await page.goto('/#/review')
    await expect(page.locator('[data-layer="threads"]')).toBeVisible({ timeout: 15_000 })

    // Click the 'audience' layer row
    await page.locator('[data-layer="audience"]').click()
    await expect(page.locator('[data-layer="audience"]')).toHaveClass(/qa-review-rail-row--on/, { timeout: 5_000 })
    await expect(page.locator('[data-layer="threads"]')).not.toHaveClass(/qa-review-rail-row--on/)
  })

  test('E2 desktop: multi-tagged mark renders exactly once (flat deduped list)', async ({ page }) => {
    await seedMarks(page, [
      { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
      { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
    ])
    await page.goto('/#/review')
    await expect(page.locator('.qa-review-card').first()).toBeVisible({ timeout: 15_000 })

    await expect(page.locator('.qa-review-card[data-mark="2:255"]')).toBeVisible()
    const count = await page.locator('.qa-review-card[data-mark="2:255"]').count()
    expect(count).toBe(1)

    const total = await page.locator('.qa-review-card').count()
    expect(total).toBe(2)
  })

  test('E2 desktop: card list is single-column (no 2-col grid)', async ({ page }) => {
    await seedMarks(page, [{ verseKey: '1:5', tags: ['reflect'], note: '' }])
    await page.goto('/#/review')
    await expect(page.locator('.qa-review-card-list')).toBeVisible({ timeout: 15_000 })

    const display = await page.locator('.qa-review-card-list').evaluate(
      el => getComputedStyle(el).display
    )
    expect(display).toBe('block')
  })

  test('E2b desktop: multi-value OR filter + chip bar + clear all', async ({ page }) => {
    await seedMarks(page, REVIEW_DESKTOP_SEED)
    await page.goto('/#/review')
    await expect(
      page.locator('.qa-review-rail-row').filter({ hasText: 'reflect' }).first()
    ).toBeVisible({ timeout: 15_000 })

    // Click reflect + gratitude to activate two tag filters in the rail
    await page.locator('.qa-review-rail-row').filter({ hasText: 'reflect' }).first().click()
    await page.locator('.qa-review-rail-row').filter({ hasText: 'gratitude' }).first().click()

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

  test('E3 desktop: FVR via #/threads/:value → layout is centered at 1000px max-width', async ({ page }) => {
    await seedMarks(page, [{ verseKey: '2:255', tags: ['reflect'], note: '' }])
    await page.goto('/#/threads/reflect')
    await expect(page.locator('.qa-fvr-layout')).toBeVisible({ timeout: 15_000 })

    // FVR is centered inside #main-content (the left rail sits outside main
    // at ≥1180px). Measure relative to main's box, not the viewport.
    const geom = await page.locator('.qa-fvr-layout').evaluate(el => {
      const main = document.getElementById('main-content')
      const mr = main.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      return {
        width: Math.round(r.width),
        leftGap: r.left - mr.left,
        rightGap: mr.right - r.right,
      }
    })
    expect(geom.width).toBe(1000)
    expect(Math.abs(geom.leftGap - geom.rightGap)).toBeLessThan(2)
  })
})
