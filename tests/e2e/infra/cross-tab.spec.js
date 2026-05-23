/**
 * E2E Journey I: Cross-tab synchronisation
 *
 * Covers:
 *   I1. Bookmark saved in Tab A → bookmark glyph appears in Tab B without reload
 *   I2. Bookmark deleted in Tab B → bookmark glyph clears in Tab A without reload
 *   I3. Clear Data in Tab B → Tab A shows "Update Required" reload banner
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §I
 *   src/infra/safety/sync.js              (BroadcastChannel + versionchange banner)
 *   src/continuity/bookmarks/store.ts      (broadcastBookmarkChange on save/delete)
 *   src/core/db.js                  (onversionchange → DB_VERSION_CHANGE)
 *
 * Cross-tab setup: all tests use TWO PAGES within ONE BrowserContext so that:
 *   - Both pages share the same IndexedDB origin (required for I1/I2 bookmark reads
 *     and for I3's onversionchange to fire on Tab A when Tab B deletes the DB).
 *   - BroadcastChannel messages DO propagate between pages in the same context
 *     in Playwright's Chromium (verified; the channel name 'quran-atlas:sync'
 *     reaches all same-origin pages regardless of how many contexts exist).
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedBookmarks } from '../fixtures/idb.js'
import { waitForReader } from '../fixtures/chrome.js'

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
// Journey I1: Another tab saves a bookmark → Tab B decorates the same verse
// ---------------------------------------------------------------------------

test('I1: Tab A bookmarks 1:5 → Tab B reader shows the bookmark glyph without reload', async ({ browser }) => {
  const ctx = await browser.newContext()
  const pageA = await ctx.newPage()
  const pageB = await ctx.newPage()

  try {
    await setupPage(pageA, '/#/s/1')
    await setupPage(pageB, '/#/s/1')

    const verse1_5_A = pageA.locator('.qa-verse[data-token-key="1:5"]')
    const verse1_5_B = pageB.locator('.qa-verse[data-token-key="1:5"]')
    const verse1_5_Number_A = verse1_5_A.locator('.qa-verse-number')
    await expect(verse1_5_A).toBeVisible({ timeout: 5_000 })
    await expect(verse1_5_B).toBeVisible({ timeout: 5_000 })
    await expect(verse1_5_A).not.toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 5_000 })
    await expect(verse1_5_B).not.toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 5_000 })

    await verse1_5_Number_A.dispatchEvent('click')
    await waitForReader(pageB)

    await expect(verse1_5_A).toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 8_000 })
    await expect(verse1_5_B).toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 8_000 })
  } finally {
    await ctx.close()
  }
})

// ---------------------------------------------------------------------------
// Journey I2: Another tab deletes an existing bookmark → Tab A clears the glyph
// ---------------------------------------------------------------------------

test('I2: Tab B removes an existing bookmark on 2:255 → Tab A reader clears the glyph without reload', async ({ browser }) => {
  const ctx = await browser.newContext()
  const pageA = await ctx.newPage()
  const pageB = await ctx.newPage()

  try {
    await setupPage(pageA, '/#/s/2/255')
    await seedBookmarks(pageA, [{ verseKey: '2:255', riwayah: 'qaloon' }])
    await pageA.reload({ waitUntil: 'domcontentloaded' })
    await waitForReader(pageA)
    if (!/#\/s\/2\/255$/.test(pageA.url())) {
      await pageA.goto('/#/s/2/255')
      await waitForReader(pageA)
    }

    await pageB.goto('/#/s/2/255')
    await waitForReader(pageB)

    const verse2_255_A = pageA.locator('.qa-verse[data-token-key="2:255"]')
    const verse2_255_B = pageB.locator('.qa-verse[data-token-key="2:255"]')
    await expect(pageA).toHaveURL(/#\/s\/2\/255/, { timeout: 8_000 })
    await expect(pageB).toHaveURL(/#\/s\/2\/255/, { timeout: 8_000 })
    await expect(verse2_255_A).toBeVisible({ timeout: 8_000 })
    await expect(verse2_255_B).toBeVisible({ timeout: 8_000 })
    await expect(verse2_255_A).toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 8_000 })
    await expect(verse2_255_B).toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 8_000 })

    await verse2_255_B.locator('.qa-verse-number').click({ force: true })

    await expect(verse2_255_B).not.toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 8_000 })
    await expect(verse2_255_A).not.toHaveClass(/qa-verse--bookmarked-glyph/, { timeout: 8_000 })
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
