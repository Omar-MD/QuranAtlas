/**
 * E2E Journey C: Verse marking (TagSheet)
 *
 * Covers:
 *   C1. Double-tap / right-click → open TagSheet (happy path, a11y, keyboard)
 *   C2. Add tag via layer combobox suggestion; click chip removes it
 *   C3. Add a new tag inline (type + Enter commits)
 *   C4. Note + save → verify IDB write + gold edge
 *   C5. Delete → undo toast → tap Undo restores mark
 *   C6. Right-click and double-tap open ONLY TagSheet (no competing surfaces)
 *   C7. Multi-layer round-trip: threads + audience tags persist across reopen
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §C
 *   src/mark/tag/TagSheet.svelte        (deep tagging sheet — replaces old mark Editor)
 *   src/state/tag-session.svelte.ts
 *   src/mark/store.ts
 *   src/core/ui.svelte             (.qa-undo-toast)
 *   src/mark/indicator.ts         (.qa-verse--bookmarked)
 */

import { test, expect } from '@playwright/test'
import { seedMarks, getMarkFromIdb } from '../fixtures/idb.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup. Each test gets a
// fresh BrowserContext with the snapshot reloaded, so per-test marks state
// is reset implicitly without `clearAllData`.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })
import { waitForReader, doubleTap } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openTagSheetViaRightClick(page) {
  // Post-2026-04-25 redesign: right-click opens fast-tag inline panel; click ⛶
  // to escalate to deep TagSheet.
  await page.locator('.qa-verse').first().click({ button: 'right' })
  await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
  await page.locator('.qa-vtp-escalate').click()
  await expect(page.locator('.qa-ts')).toBeVisible({ timeout: 5_000 })
}

/** Double-tap a verse, then click ⛶ to reach the deep TagSheet. */
async function openTagSheetViaDoubleTap(page, verseLocator) {
  const v = verseLocator ?? page.locator('.qa-verse').first()
  await doubleTap(v)
  await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
  await page.locator('.qa-vtp-escalate').click()
  await expect(page.locator('.qa-ts')).toBeVisible({ timeout: 5_000 })
}

/** Group sections replaced tabs — helper kept as a no-op so existing
 *  test prose remains readable; all groups are always rendered now. */
async function activateTab(_page, _label) { /* no-op: all groups visible */ }

/** Layer row keyed by visible label text. All rows render simultaneously. */
function layerRow(page, label) {
  return page.locator('.qa-ts-layer').filter({ has: page.locator('.qa-ts-lbl', { hasText: new RegExp(`^${label}$`, 'i') }) })
}

/** Add a tag to the given layer via its combobox input + Enter. */
async function addTagToLayer(page, layerLabel, value) {
  const row = layerRow(page, layerLabel)
  const input = row.locator('.qa-ts-combo-input')
  await input.click()
  await input.fill(value)
  await input.press('Enter')
  await expect(row.locator('.qa-ts-hchip--on').filter({ hasText: value })).toBeVisible({ timeout: 3_000 })
}

test.describe('Journey C: Verse marking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // C1. Happy path — double-tap opens TagSheet
  // -------------------------------------------------------------------------

  test('C1: double-tap opens fast-tag inline panel, not TagSheet', async ({ page }) => {
    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible({ timeout: 5_000 })
    await doubleTap(firstVerse)

    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-ts')).toHaveCount(0)
  })

  test('C1: right-click opens fast-tag inline panel, not TagSheet', async ({ page }) => {
    await page.locator('.qa-verse').first().click({ button: 'right' })
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-ts')).toHaveCount(0)
  })

  test('C: keyboard m on centered verse opens fast-tag panel, not TagSheet', async ({ page }) => {
    await page.evaluate(() => document.getElementById('main-content')?.focus())
    await page.keyboard.press('m')
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-ts')).toHaveCount(0)
  })

  // C: ⛶ escalate button + ✕ close button ported to
  // tests/unit/mark/tag/verse-tag-panel.test.ts (Phase 2 bucket 2, 2026-04-26).

  test('C: double-tap on a different verse switches the active verse, panel stays open', async ({ page }) => {
    const verses = page.locator('.qa-verse')
    const firstVerse = verses.nth(0)
    await doubleTap(firstVerse)
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })

    // Double-tap a different verse → panel still visible (switched, not exited).
    // The old long-press contract had a "press same verse twice → exit" rule;
    // retired with the gesture switch since a double-tap fires onShort on its
    // first tap (already switching the active verse), making "same verse →
    // exit" fire spuriously. Mobile exits via the ✕ button only.
    const secondVerse = verses.nth(1)
    await expect(secondVerse).toBeVisible({ timeout: 5_000 })
    await doubleTap(secondVerse)
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // C2. Add a tag to a layer → click chip removes it
  // -------------------------------------------------------------------------

  // C2 combobox add + chip toggle (with count badges) and C3 new-label commit
  // ported to tests/unit/mark/tag/tag-sheet.test.ts (Phase 2 bucket 2, 2026-04-26).

  // -------------------------------------------------------------------------
  // C4. Note + save → IDB write + gold edge
  // -------------------------------------------------------------------------

  test('C6: right-click and double-tap each open ONLY the fast-tag panel (⛶ → TagSheet)', async ({ page }) => {
    let dialogFired = false
    page.on('dialog', () => { dialogFired = true })

    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible()

    // Path 1: right-click → fast-tag panel (no competing surfaces)
    await firstVerse.click({ button: 'right' })
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    expect(dialogFired).toBe(false)
    await expect(page.locator('.qa-contextmenu')).toHaveCount(0)
    await expect(page.locator('.qa-sheet--actions')).toHaveCount(0)
    await expect(page.locator('.qa-verse-preview')).toHaveCount(0)
    // ⛶ escalation reaches deep TagSheet
    await page.locator('.qa-vtp-escalate').click()
    await expect(page.locator('.qa-ts')).toBeVisible({ timeout: 5_000 })

    await page.keyboard.press('Escape')
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 3_000 })

    // Path 2: touch double-tap → fast-tag panel (same invariant)
    await doubleTap(firstVerse)
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-contextmenu')).toHaveCount(0)
  })

  // -------------------------------------------------------------------------
  // C7. Multi-layer round-trip: threads + audience persist across reopen
  // -------------------------------------------------------------------------
})
