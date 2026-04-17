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
 * Cross-tab setup: each test uses browser.newContext() so both pages share the
 * same origin and therefore the same BroadcastChannel namespace. Two pages in
 * the same context do NOT deliver BroadcastChannel messages to each other in
 * Playwright; separate contexts from the same browser instance are required.
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { waitForReader } from './fixtures/chrome.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a long-press on a locator by holding the mouse button for 600ms.
 * waitForTimeout is intentional — the delay IS the gesture.
 */
async function longPress(locator) {
  const box = await locator.boundingBox()
  await locator.page().mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await locator.page().mouse.down()
  await locator.page().waitForTimeout(600)
  await locator.page().mouse.up()
}

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
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  try {
    // Bootstrap both tabs on the same reader route
    await setupPage(pageA, '/#/s/1')
    // Tab B shares the same IDB (same origin) — clear is done by Tab A's setupPage.
    // Navigate Tab B after Tab A has initialised so the DB exists.
    await pageB.goto('/#/s/1')
    await waitForReader(pageB)

    // Ensure verse 1:5 is rendered in both tabs
    const verse1_5_A = pageA.locator('.qa-verse[data-verse-key="1:5"]')
    const verse1_5_B = pageB.locator('.qa-verse[data-verse-key="1:5"]')
    await expect(verse1_5_A).toBeVisible({ timeout: 5_000 })
    await expect(verse1_5_B).toBeVisible({ timeout: 5_000 })

    // Tab B should NOT have the gold edge before Tab A acts
    await expect(verse1_5_B).not.toHaveClass(/qa-verse--bookmarked/)

    // Tab A: long-press 1:5 → mark editor opens
    await longPress(verse1_5_A)
    const markEditor = pageA.locator('.qa-sheet--mark')
    await expect(markEditor).toBeVisible({ timeout: 5_000 })

    // Select a tag so Save becomes enabled
    const allRegion = pageA.locator('.qa-mark-chips--all')
    await expect(allRegion).toBeVisible()
    await allRegion.locator('.qa-mark-chip').first().click()

    // Tab A: tap Save → editor closes → broadcastMarkChange fires
    const saveBtn = pageA.locator('.qa-mark-btn--primary')
    await expect(saveBtn).toBeEnabled({ timeout: 3_000 })
    await saveBtn.click()
    await expect(markEditor).not.toBeVisible({ timeout: 5_000 })

    // Tab A: verify gold edge on 1:5
    await expect(verse1_5_A).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    // Tab B: should receive the BroadcastChannel message and apply the gold edge
    await expect(verse1_5_B).toHaveClass(/qa-verse--bookmarked/, { timeout: 8_000 })
  } finally {
    await ctxA.close()
    await ctxB.close()
  }
})

// ---------------------------------------------------------------------------
// Journey I2: Mark deleted in Tab B while Tab A has editor open → editor closes
// ---------------------------------------------------------------------------

test('I2: mark deleted in Tab B while Tab A editor is open → Tab A editor closes silently', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  try {
    // Seed a mark on 2:255 so Tab A can open it in edit mode
    await pageA.goto('/')
    await clearAllData(pageA)
    await markOnboardingComplete(pageA)
    await seedMarks(pageA, [{ verseKey: '2:255', tags: ['faith'], note: '' }])
    await pageA.goto('/#/s/2')
    await waitForReader(pageA)

    // Tab B: load the same route
    await pageB.goto('/#/s/2')
    await waitForReader(pageB)

    // Tab A: open mark editor for 2:255 (right-click as keyboard-accessible alternative)
    const verse_A = pageA.locator('.qa-verse[data-verse-key="2:255"]')
    await expect(verse_A).toBeVisible({ timeout: 5_000 })
    await verse_A.click({ button: 'right' })

    const markEditor = pageA.locator('.qa-sheet--mark')
    await expect(markEditor).toBeVisible({ timeout: 5_000 })
    // Confirm it's an edit (existing mark)
    await expect(pageA.locator('.qa-sheet-title')).toHaveText('Edit mark')

    // Tab B: delete the same mark via the mark editor UI
    const verse_B = pageB.locator('.qa-verse[data-verse-key="2:255"]')
    await expect(verse_B).toBeVisible({ timeout: 5_000 })
    await verse_B.click({ button: 'right' })

    const markEditorB = pageB.locator('.qa-sheet--mark')
    await expect(markEditorB).toBeVisible({ timeout: 5_000 })
    await expect(pageB.locator('.qa-sheet-title')).toHaveText('Edit mark')

    // Click Delete → confirm prompt → confirm delete
    const deleteBtn = pageB.locator('.qa-mark-btn--danger[data-action="delete"]')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    const confirmDeleteBtn = pageB.locator('.qa-mark-btn--danger-primary')
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 3_000 })
    await confirmDeleteBtn.click()

    // Tab B editor closes; broadcast fires
    await expect(markEditorB).not.toBeVisible({ timeout: 5_000 })

    // Tab A editor should close silently after receiving the broadcast
    await expect(markEditor).not.toBeVisible({ timeout: 8_000 })

    // Tab A: gold edge should be gone
    await expect(verse_A).not.toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })
  } finally {
    await ctxA.close()
    await ctxB.close()
  }
})

// ---------------------------------------------------------------------------
// Journey I3: Clear Data in Tab B → Tab A shows reload banner
// ---------------------------------------------------------------------------

test('I3: Tab B deletes IDB → Tab A safety/sync.js shows reload banner', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  try {
    // Tab A: load the reader so it opens an IDB connection (onversionchange is attached)
    await setupPage(pageA, '/#/s/1')

    // Tab B: load and then delete the database.
    // Deleting the DB while Tab A has it open triggers Tab A's onversionchange →
    // DB_VERSION_CHANGE event → safety/sync.js renders the .qa-sync-banner.
    // We do NOT use suppressNextVersionChange here (that's only for the tab that
    // initiates the delete intentionally via the Settings UI).
    await pageB.goto('/')
    // Ensure Tab B has the page loaded (IDB may or may not be open — doesn't matter)
    await pageB.evaluate(() => new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase('quran-atlas')
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve() // best-effort; Tab A's connection will close after versionchange
    }))

    // Tab A: the versionchange event fires on the open IDB connection →
    // safety/sync.js renders .qa-sync-banner with "Update Required"
    const banner = pageA.locator('.qa-sync-banner')
    await expect(banner).toBeVisible({ timeout: 8_000 })

    // Banner content
    const title = pageA.locator('.qa-sync-title')
    await expect(title).toBeVisible()
    await expect(title).toHaveText('Update Required')

    // Reload button is present and interactive
    const reloadBtn = pageA.locator('.qa-sync-reload-btn')
    await expect(reloadBtn).toBeVisible()
    await expect(reloadBtn).toBeEnabled()
  } finally {
    await ctxA.close()
    await ctxB.close()
  }
})
