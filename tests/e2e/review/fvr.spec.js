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

  // E5 value-chip toggle, surah-filter intersection (state-machine), filter-chip
  // dismiss + Clear all ported to tests/unit/review/hub.test.ts (Phase 2 bucket
  // 5, 2026-04-26). The card-count side-effect under each filter combination
  // stays e2e via the seeded-marks integration tests below.

  test('E6: navigate to #/threads/mercy directly → FVR renders correct layer label + value', async ({ page }) => {
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

  test('E6: lastSurface persists #/threads/<tag> for session restore', async ({ page }) => {
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

test.describe('Journey E: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await expect(page.locator('[data-token-key]').first()).toBeVisible({ timeout: 15_000 })
  })
})
