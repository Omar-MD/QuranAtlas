/**
 * E2E Journey I: Cross-tab synchronisation
 *
 * Covers:
 *   I1. Mark saved in Tab A → gold edge appears in Tab B without reload
 *   I2. Mark deleted in Tab B while Tab A has editor open → editor closes silently
 *   I3. Clear Data in Tab B → Tab A shows "Update Required" reload banner
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §I
 *   src/safety/sync.js              (BroadcastChannel + versionchange banner)
 *   src/marks/store.js              (broadcastMarkChange on save/delete)
 *   src/core/db.js                  (onversionchange → DB_VERSION_CHANGE)
 *
 * Cross-tab setup: all tests use TWO PAGES within ONE BrowserContext so that:
 *   - Both pages share the same IndexedDB origin (required for I1/I2 mark reads
 *     and for I3's onversionchange to fire on Tab A when Tab B deletes the DB).
 *   - BroadcastChannel messages DO propagate between pages in the same context
 *     in Playwright's Chromium (verified; the channel name 'quran-atlas:sync'
 *     reaches all same-origin pages regardless of how many contexts exist).
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { waitForReader, doubleTap } from './fixtures/chrome.js'

// Rule 6.2 carve-out: cross-tab IDB versionchange + BroadcastChannel tests
// span multiple stores and need full fresh state.  Each test here calls
// `browser.newContext()` directly without storageState, so the onboarded
// snapshot used by other journey specs never reaches these tests.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Bootstrap a fresh page: clear data, mark onboarding done, go to reader.
 */
async function setupPage(page, route = '/#/s/1') {
  await page.goto('/')
  await clearAllData(page)
  await markOnboardingComplete(page)
  await page.goto(route)
  await waitForReader(page)
}

// ---------------------------------------------------------------------------
// Journey I1: Another tab saves a mark → Tab B reflects gold edge
// ---------------------------------------------------------------------------

test('I1: Tab A saves mark on 1:5 → Tab B reader shows gold edge without reload', async ({ browser }) => {
  const ctx = await browser.newContext()
  const pageA = await ctx.newPage()
  const pageB = await ctx.newPage()

  try {
    // Bootstrap Tab A — clears shared IDB, sets onboarding, navigates to reader
    await setupPage(pageA, '/#/s/1')

    // Tab B: navigate to the same reader route (shared IDB already set up by Tab A)
    await pageB.goto('/#/s/1')
    await waitForReader(pageB)

    // Ensure verse 1:5 is rendered in both tabs
    const verse1_5_A = pageA.locator('.qa-verse[data-token-key="1:5"]')
    const verse1_5_B = pageB.locator('.qa-verse[data-token-key="1:5"]')
    await expect(verse1_5_A).toBeVisible({ timeout: 5_000 })
    await expect(verse1_5_B).toBeVisible({ timeout: 5_000 })

    // Tab B should NOT have the gold edge before Tab A acts
    await expect(verse1_5_B).not.toHaveClass(/qa-verse--bookmarked/)

    // Tab A: double-tap 1:5 → fast-tag panel → ⛶ → TagSheet (post 2026-04-25)
    await doubleTap(verse1_5_A)
    await expect(pageA.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await pageA.locator('.qa-vtp-escalate').click()
    const tagSheet = pageA.locator('.qa-ts')
    await expect(tagSheet).toBeVisible({ timeout: 5_000 })

    // Add a tag via the threads layer combobox (value commits on Enter).
    // All group sections are always rendered — no tab activation needed.
    const threadsInput = pageA.locator('.qa-ts-layer', { has: pageA.locator('.qa-ts-lbl', { hasText: /^threads$/i }) }).locator('.qa-ts-combo-input')
    await threadsInput.click()
    await threadsInput.fill('mercy')
    await threadsInput.press('Enter')

    // Tab A: tap Save → sheet closes → broadcastMarkChange fires
    await pageA.locator('.qa-ts-btn--primary').click()
    await expect(tagSheet).not.toBeVisible({ timeout: 5_000 })

    // Tab A: verify gold edge on 1:5
    await expect(verse1_5_A).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    // Tab B: receives the BroadcastChannel message → SYNC_UPDATE_RECEIVED → re-reads
    // shared IDB → applies gold edge without a reload
    await expect(verse1_5_B).toHaveClass(/qa-verse--bookmarked/, { timeout: 8_000 })
  } finally {
    await ctx.close()
  }
})

// ---------------------------------------------------------------------------
// Journey I2: Mark deleted in Tab B while Tab A has editor open → editor closes
// ---------------------------------------------------------------------------

test('I2: mark deleted in Tab B while Tab A editor is open → Tab A editor closes silently', async ({ browser }) => {
  const ctx = await browser.newContext()
  const pageA = await ctx.newPage()
  const pageB = await ctx.newPage()

  try {
    // Bootstrap: clear shared IDB, mark onboarding done, seed mark on 2:255.
    // Go to /#/s/1 first (matches what launch-restore would pick anyway — no race),
    // then navigate in-app to /#/s/2/255 via a hash assignment so the router's
    // scrollToVerse renders the verse into the DOM.
    await setupPage(pageA, '/#/s/1')
    await seedMarks(pageA, [{ verseKey: '2:255', tags: ['faith'], note: '' }])

    // In-app navigation to verse 2:255 — triggers hashchange → router → reader
    // scrollToVerse forces all chunks up to verse 255 into the DOM.
    await pageA.evaluate(() => { window.location.hash = '#/s/2/255' })
    // waitFor 'attached' tolerates the surah-1 → surah-2 DOM transition
    await pageA.locator('.qa-verse[data-token-key="2:255"]').waitFor({ state: 'attached', timeout: 10_000 })

    // Tab B: same context, shared IDB; navigate in-app to surah 2/255 once stable
    await pageB.goto('/')
    // Wait for launch-restore to complete and settle on a non-empty hash before
    // redirecting to the target verse (prevents the restore from overriding us).
    await pageB.waitForFunction(() => window.location.hash !== '' && window.location.hash !== '#/', { timeout: 8_000 })
    await pageB.evaluate(() => { window.location.hash = '#/s/2/255' })
    await pageB.locator('.qa-verse[data-token-key="2:255"]').waitFor({ state: 'attached', timeout: 10_000 })

    // Tab A: open TagSheet for 2:255 via right-click → ⛶ (post 2026-04-25)
    const verse_A = pageA.locator('.qa-verse[data-token-key="2:255"]')
    await expect(verse_A).toBeVisible({ timeout: 5_000 })
    await verse_A.click({ button: 'right' })
    await expect(pageA.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await pageA.locator('.qa-vtp-escalate').click()

    const tagSheetA = pageA.locator('.qa-ts')
    await expect(tagSheetA).toBeVisible({ timeout: 5_000 })

    // Tab B: open TagSheet for 2:255 via right-click → ⛶, then delete
    const verse_B = pageB.locator('.qa-verse[data-token-key="2:255"]')
    await expect(verse_B).toBeVisible({ timeout: 5_000 })
    await verse_B.click({ button: 'right' })
    await expect(pageB.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await pageB.locator('.qa-vtp-escalate').click()

    const tagSheetB = pageB.locator('.qa-ts')
    await expect(tagSheetB).toBeVisible({ timeout: 5_000 })

    // Tab B: click Delete → confirm Delete (inline confirm step)
    await pageB.locator('.qa-ts-btn--danger').click()
    await pageB.locator('.qa-ts-btn--danger-primary').click()
    await expect(tagSheetB).not.toBeVisible({ timeout: 5_000 })

    // Tab A sheet should close silently: SYNC_UPDATE_RECEIVED fires → TagSheet
    // listens for the currently-edited verseKey and calls onclose().
    await expect(tagSheetA).not.toBeVisible({ timeout: 8_000 })

    // Tab A: gold edge should be gone (indicator re-reads IDB on SYNC_UPDATE)
    await expect(verse_A).not.toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })
  } finally {
    await ctx.close()
  }
})

// ---------------------------------------------------------------------------
// Journey I3: Clear Data in Tab B → Tab A shows reload banner
// ---------------------------------------------------------------------------

test('I3: Tab B deletes IDB → Tab A safety/sync.js shows reload banner', async ({ browser }) => {
  const ctx = await browser.newContext()
  const pageA = await ctx.newPage()
  const pageB = await ctx.newPage()

  try {
    // Tab A: load the reader so it opens an IDB connection (onversionchange is attached).
    // Wait for the app to fully initialise (i.e. __qaSuppressNextVersionChange is set)
    // before running clearAllData so the suppress call actually fires and the
    // setupPage delete does NOT leave a stale banner that blocks the I3 assertion.
    await pageA.goto('/')
    await pageA.waitForFunction(() => typeof window.__qaSuppressNextVersionChange === 'function', { timeout: 8_000 })
    await clearAllData(pageA)
    await markOnboardingComplete(pageA)
    await pageA.goto('/#/s/1')
    await waitForReader(pageA)
    // Confirm no stale banner was left by setupPage's clearAllData
    await expect(pageA.locator('.qa-sync-banner')).not.toBeAttached()

    // Tab B: navigate to the app so its JS can access the same shared IDB.
    // Suppress Tab B's own versionchange banner so only Tab A's banner is checked.
    await pageB.goto('/')
    await pageB.waitForFunction(() => typeof window.__qaSuppressNextVersionChange === 'function', { timeout: 8_000 })
    await pageB.evaluate(() => window.__qaSuppressNextVersionChange())

    // Delete the shared database from Tab B.
    // Both Tab A and Tab B have open connections; onversionchange fires on both.
    // Tab B's handler is suppressed (above); Tab A's fires normally and renders the banner.
    await pageB.evaluate(() => new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase('quran-atlas')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve() // Tab A and Tab B both close their connections on versionchange
    }))

    // Tab A: the versionchange event fires on the open IDB connection →
    // safety/sync.js renders .qa-sync-banner with "Update Required"
    const banner = pageA.locator('.qa-sync-banner')
    await expect(banner).toBeVisible({ timeout: 10_000 })

    // Banner content
    const title = pageA.locator('.qa-sync-title')
    await expect(title).toBeVisible()
    await expect(title).toHaveText('Update Required')

    // Reload button is present and interactive
    const reloadBtn = pageA.locator('.qa-sync-reload-btn')
    await expect(reloadBtn).toBeVisible()
    await expect(reloadBtn).toBeEnabled()
  } finally {
    await ctx.close()
  }
})
