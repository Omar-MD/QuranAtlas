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
import { seedMarks } from '../fixtures/idb.js'
import { waitForReader } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

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

const REVIEW_DESKTOP_SEED = [
  { verseKey: '1:5',   tags: ['reflect'],                  note: '' },
  { verseKey: '2:255', tags: ['reflect', 'core-theology'], note: '' },
  { verseKey: '67:1',  tags: ['reflect', 'protection'],    note: '' },
  { verseKey: '93:11', tags: ['gratitude'],                note: '' },
]

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey E: Review hub', () => {
  test.beforeEach(async ({ page }) => {
    // storageState already provides onboarded state.  Boot fully (wait for
    // reader paint) before seeding so launch-restore IDB reads cannot race
    // with the seed write.  Each test gets a fresh BrowserContext so
    // seeded marks don't leak across tests.
    await page.goto('/')
    await waitForReader(page)
    await seedMarks(page, SEED)
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

  // E2 groupBy segment-state ported to tests/unit/review/hub.test.ts (Phase 2
  // bucket 5, 2026-04-26). The card-list-side-effect of groupBy stays e2e via
  // the surah-grouping seeded-marks check below.

  test('E2: surah grouping — mark for 1:1 and 2:255 both visible after switching to Surah tab', async ({ page }) => {
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="surah"]').click()
    // Wait for the Surah tab to become active
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Surah', { timeout: 5_000 })

    // All seeded marks should still be visible regardless of groupBy setting
    await expect(page.locator('[data-mark="1:1"]')).toBeVisible()
    await expect(page.locator('[data-mark="2:255"]')).toBeVisible()
  })

  test('E5: tap value + surah filter → intersection narrows card count to 1 (surface-level)', async ({ page }) => {
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="flat"]').click()
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Date', { timeout: 5_000 })

    const mercyChip = page.locator('.qa-review-value-chip').filter({ hasText: 'mercy' }).first()
    await expect(mercyChip).toBeVisible({ timeout: 5_000 })
    await mercyChip.click()
    await page.locator('[data-control="surah"]').selectOption({ value: '1' })

    // Intersection: mercy ∩ surah 1 = only 1:1
    await expect(page.locator('[data-mark="1:1"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-review-card')).toHaveCount(1)
  })
})

test.describe('Journey E: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await expect(page.locator('[data-token-key]').first()).toBeVisible({ timeout: 15_000 })
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
})
