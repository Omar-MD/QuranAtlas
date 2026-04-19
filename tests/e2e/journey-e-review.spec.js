/**
 * E2E Journey E: Review hub
 *
 * Covers:
 *   E1. Open review hub — structure check (segment pill, sort, filter dropdowns, cards) + a11y scan
 *   E2. Swap grouping — Surah → Date → Tag → back to Tag default
 *   E3. Tap tag chip on mark card → FVR deep link renders
 *   E4. FVR back link → returns to review hub
 *   E5. Filter by tag + surah (chips, clear one, Clear all)
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §E
 *   src/review/hub.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { scanA11y } from './fixtures/a11y.js'

// Force mobile viewport so the review hub's filter/group controls
// (sort dropdown, tag select, surah select, group-by segment) are
// visible.  At ≥1180px those controls are hidden in favour of the
// desktop left-rail.  Desktop rail filtering is exercised separately
// in desktop-layouts.spec.js.
test.use({ viewport: { width: 390, height: 844 } })

// ---------------------------------------------------------------------------
// Seed data used by all tests:
// - 4 marks across 3 surahs and 3 tags so grouping / filtering exercises real behaviour.
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

  test('E1: hub renders segment pill, sort dropdown, filter dropdowns, and mark cards', async ({ page }) => {
    // Segment pill exists with 3 tabs.
    // Use role+aria-label to uniquely target the controls seg (the one with
    // role="tablist" aria-label="Group by" rendered by renderControls).
    // On desktop a second .qa-review-seg without role appears in the left rail.
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await expect(seg).toBeVisible()

    const items = seg.locator('.qa-review-seg-item')
    await expect(items).toHaveCount(3)

    // Labels: Tag | Surah | Date  (in that DOM order)
    await expect(items.nth(0)).toHaveText('Tag')
    await expect(items.nth(1)).toHaveText('Surah')
    await expect(items.nth(2)).toHaveText('Date')

    // Tag segment is active by default
    const activeItem = seg.locator('.qa-review-seg-item--on')
    await expect(activeItem).toHaveCount(1)
    await expect(activeItem).toHaveText('Tag')
    await expect(activeItem).toHaveAttribute('aria-selected', 'true')

    // Sort dropdown is present
    const sortSelect = page.locator('[data-control="sort"]')
    await expect(sortSelect).toBeVisible()
    await expect(sortSelect).toHaveAttribute('aria-label', 'Sort by')

    // Tag filter dropdown is present
    const tagSelect = page.locator('[data-control="tag"]')
    await expect(tagSelect).toBeVisible()
    await expect(tagSelect).toHaveAttribute('aria-label', 'Filter by tag')

    // Surah filter dropdown is present
    const surahSelect = page.locator('[data-control="surah"]')
    await expect(surahSelect).toBeVisible()
    await expect(surahSelect).toHaveAttribute('aria-label', 'Filter by surah')

    // Mark cards rendered — we seeded 4 marks; all should be visible (PAGE_SIZE = 30)
    const cards = page.locator('.qa-review-card')
    await expect(cards.first()).toBeVisible()
    const cardCount = await cards.count()
    // 4 marks, but multi-tagged marks appear under each tag group → could be > 4 cards
    expect(cardCount).toBeGreaterThanOrEqual(4)

    // No active filter chips yet (no filters applied)
    await expect(page.locator('.qa-review-active-filters')).toHaveCount(0)
  })

  test('E1: a11y — no serious/critical axe violations on review hub', async ({ page }) => {
    const violations = await scanA11y(page, { include: ['#main-content'] })
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // E2. Swap grouping — Surah → Date → Tag
  // -------------------------------------------------------------------------

  test('E2: tap Surah segment → active tab changes; tap Date → flat list; tap Tag → Tag tab active', async ({ page }) => {
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

    // --- Back to Tag grouping ---
    await seg.locator('[data-group="tag"]').click()

    // Tag tab is now active
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Tag', { timeout: 5_000 })

    // Cards still present — groupBy=tag does not hide cards in the flat list view
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
  // E3. Tap tag chip → FVR deep link
  // -------------------------------------------------------------------------

  test('E3: tap a tag chip on a mark card → navigates to #/t/<tag> → FVR renders correctly', async ({ page }) => {
    // In tag-grouped view there are tag chips on the cards
    // Pick the 'mercy' chip from any card
    const mercyChip = page.locator('.qa-review-card-chip').filter({ hasText: 'mercy' }).first()
    await expect(mercyChip).toBeVisible({ timeout: 5_000 })

    await mercyChip.click()

    // URL should include the FVR route
    await expect(page).toHaveURL(/#\/t\/mercy/, { timeout: 5_000 })

    // FVR header block renders
    const fvrHeader = page.locator('.qa-fvr-header')
    await expect(fvrHeader).toBeVisible({ timeout: 5_000 })

    // "← Marks" back link is present
    const backLink = fvrHeader.locator('.qa-fvr-back')
    await expect(backLink).toBeVisible()
    await expect(backLink).toHaveText('← Marks')

    // Tag label reads "Tag"
    await expect(fvrHeader.locator('.qa-fvr-label')).toHaveText('Tag')

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

  test('E3: a11y — no serious/critical axe violations on FVR view', async ({ page }) => {
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
  // E5. Filter by tag + surah + clear chips
  // -------------------------------------------------------------------------

  test('E5: select tag filter → filter chip appears → hub shows only matching cards', async ({ page }) => {
    // Switch to flat grouping first so card count equals the number of matched marks
    // (tag-grouped view can repeat a multi-tagged mark under each of its tags,
    //  so a flat count is the only unambiguous way to assert "2 marks")
    // Use evaluate() to dispatch the click directly — the seg button re-renders the
    // entire controls area (container.textContent = '') so Playwright's retry logic
    // would loop on the detached element if we use locator.click().
    await page.evaluate(() => {
      const btn = document.querySelector('[data-group="flat"]')
      if (btn) { btn.click() }
    })
    await expect(page.getByRole('tablist', { name: 'Group by' }).locator('.qa-review-seg-item--on'))
      .toHaveText('Date', { timeout: 5_000 })

    const tagSelect = page.locator('[data-control="tag"]')
    await expect(tagSelect).toBeVisible()

    // Select 'mercy' tag filter
    await tagSelect.selectOption({ value: 'mercy' })

    // Filter chip bar appears
    const filterBar = page.locator('.qa-review-active-filters')
    await expect(filterBar).toBeVisible({ timeout: 5_000 })

    // A filter chip for 'mercy' is present
    const mercyChip = filterBar.locator('.qa-review-filter-chip').filter({ hasText: 'mercy' })
    await expect(mercyChip).toBeVisible()

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

  test('E5: add surah filter on top of tag filter → intersection renders', async ({ page }) => {
    // Switch to flat grouping first so card count is unambiguous
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="flat"]').click()
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Date', { timeout: 5_000 })

    // Apply tag filter: mercy
    await page.locator('[data-control="tag"]').selectOption({ value: 'mercy' })
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

  test('E5: tap × on tag chip → that filter clears; surah filter remains', async ({ page }) => {
    // Switch to flat grouping to make counts unambiguous
    const seg = page.getByRole('tablist', { name: 'Group by' })
    await seg.locator('[data-group="flat"]').click()
    await expect(seg.locator('.qa-review-seg-item--on')).toHaveText('Date', { timeout: 5_000 })

    // Apply both filters
    await page.locator('[data-control="tag"]').selectOption({ value: 'mercy' })
    await expect(page.locator('.qa-review-active-filters')).toBeVisible({ timeout: 5_000 })
    await page.locator('[data-control="surah"]').selectOption({ value: '2' })
    await expect(page.locator('.qa-review-filter-chip')).toHaveCount(2, { timeout: 5_000 })

    // Dismiss the mercy tag chip (✕ button inside the chip)
    const tagChip = page.locator('.qa-review-filter-chip').filter({ hasText: 'mercy' })
    await expect(tagChip).toBeVisible()
    const dismissBtn = tagChip.locator('button')
    await dismissBtn.click()

    // Only one chip remains (surah filter)
    await expect(page.locator('.qa-review-filter-chip')).toHaveCount(1, { timeout: 5_000 })

    // Tag filter cleared → tag select reset to "Tag: All"
    const tagSelectValue = await page.locator('[data-control="tag"]').inputValue()
    expect(tagSelectValue).toBe('')

    // Surah 2 filter still active → only marks in surah 2 visible
    // Seeded marks in surah 2: 2:255 (tags: mercy, faith) — still visible
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
    await page.locator('[data-control="tag"]').selectOption({ value: 'faith' })
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

    // Both selects reset to "All"
    expect(await page.locator('[data-control="tag"]').inputValue()).toBe('')
    expect(await page.locator('[data-control="surah"]').inputValue()).toBe('')
  })
})
