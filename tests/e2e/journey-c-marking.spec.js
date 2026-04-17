/**
 * E2E Journey C: Verse marking
 *
 * Covers:
 *   C1. Long-press → open mark editor (happy path, a11y scan, @keyboard variant)
 *   C2. Multi-tag selection and deselect
 *   C3. Create a new tag inline
 *   C4. Note + save → verify IDB write + gold edge
 *   C5. Delete + undo (@reduced-motion variant for undo toast)
 *   C6. Long-press has no alternative gesture (no context menu, no multi-action sheet)
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §C
 *   src/marks/editor.js
 *   src/marks/store.js
 *   src/core/ui.js          (showUndoToast — .qa-undo-toast)
 *   src/marks/indicator.js  (.qa-verse--bookmarked)
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { waitForReader } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a long-press by dispatching TouchEvent sequences via evaluate.
 * The gesture code in src/marks/editor.js listens for touchstart/touchend,
 * not mousedown/pointerdown, so mouse.down() doesn't trigger it.
 */
async function longPress(locator) {
  const box = await locator.boundingBox()
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)

  const hit = await locator.page().evaluate(([cx, cy]) => {
    const el = document.elementFromPoint(cx, cy)
    if (!el) {
      return false
    }
    window.__lpTarget = el
    const touch = new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy, screenX: cx, screenY: cy })
    el.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: [touch], targetTouches: [touch], changedTouches: [touch],
    }))
    return true
  }, [x, y])
  if (!hit) {
    throw new Error(`longPress: no element at (${x}, ${y})`)
  }

  await locator.page().waitForTimeout(600)

  await locator.page().evaluate(() => {
    const el = window.__lpTarget
    if (!el) {
      return
    }
    delete window.__lpTarget
    el.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: [], targetTouches: [], changedTouches: [],
    }))
  })
}

/**
 * Open the mark editor for the first verse via right-click (contextmenu).
 * The app prevents the native context menu and opens the editor instead.
 */
async function openMarkEditorViaRightClick(page) {
  await page.locator('.qa-verse').first().click({ button: 'right' })
  await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 5_000 })
}

/**
 * Read a mark record from IDB by verseKey. Returns undefined if not found.
 */
async function getMarkFromIdb(page, verseKey) {
  return page.evaluate((vk) => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas')
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('marks')) { resolve(undefined); db.close(); return }
      const tx = db.transaction('marks', 'readonly')
      const req = tx.objectStore('marks').get(vk)
      req.onsuccess = () => { resolve(req.result); db.close() }
      req.onerror = () => { resolve(undefined); db.close() }
    }
    open.onerror = () => reject(open.error)
  }), verseKey)
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey C: Verse marking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // C1. Happy path — long-press opens mark editor
  // -------------------------------------------------------------------------

  test('C1: long-press verse opens mark editor with correct structure', async ({ page }) => {
    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible({ timeout: 5_000 })

    // Long-press the first verse
    await longPress(firstVerse)

    // Sheet slides up
    const sheet = page.locator('.qa-sheet--mark')
    await expect(sheet).toBeVisible({ timeout: 5_000 })

    // Header: "New mark" title + verse reference
    await expect(page.locator('.qa-sheet-title')).toHaveText('New mark')
    await expect(page.locator('.qa-mark-ref')).toBeVisible()
    // Surah 1, verse 1
    await expect(page.locator('.qa-mark-ref')).toContainText('1')

    // Verse preview card is present
    await expect(page.locator('.qa-mark-quote')).toBeVisible()
    await expect(page.locator('.qa-mark-quote-ar')).toBeVisible()
    await expect(page.locator('.qa-mark-quote-en')).toBeVisible()

    // Note textarea is empty
    await expect(page.locator('.qa-mark-note')).toHaveValue('')

    // Seed tags present in All region (≥1 chip visible)
    const allChips = page.locator('.qa-mark-chips--all .qa-mark-chip')
    await expect(allChips.first()).toBeVisible()
    const chipCount = await allChips.count()
    expect(chipCount).toBeGreaterThanOrEqual(1)
  })

  // -------------------------------------------------------------------------
  // C1. Right-click as alternate entry (desktop contextmenu → suppressed)
  // -------------------------------------------------------------------------

  test('C1: right-click also opens mark editor (no native context menu)', async ({ page }) => {
    // Listen for a dialog event (which Playwright surfaces when a native context menu
    // would appear). If the native menu opened it would not trigger a dialog, but
    // we verify the mark editor opened instead of a native browser menu.
    await openMarkEditorViaRightClick(page)
    await expect(page.locator('.qa-sheet-title')).toHaveText('New mark')
  })

  // -------------------------------------------------------------------------
  // C1. a11y — axe-core scan of open mark editor
  // -------------------------------------------------------------------------

  test('C1: a11y — no serious/critical axe violations on open mark editor', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    const violations = await scanA11y(page, { include: ['.qa-sheet--mark'] })
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // C1. @keyboard — mark editor can be opened and closed by keyboard
  // -------------------------------------------------------------------------

  test('C1: keyboard — Escape closes mark editor @keyboard', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    const sheet = page.locator('.qa-sheet--mark')
    await expect(sheet).toBeVisible()

    // Escape should close the sheet
    await page.keyboard.press('Escape')
    await expect(sheet).not.toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // C2. Multi-tag selection and deselect
  // -------------------------------------------------------------------------

  test('C2: tap tag chip moves it to Selected strip; × removes it', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    // Wait for chips to render
    const allRegion = page.locator('.qa-mark-chips--all')
    await expect(allRegion).toBeVisible()
    const firstChip = allRegion.locator('.qa-mark-chip').first()
    await expect(firstChip).toBeVisible()

    // Capture the chip's text content before clicking. The chip DOM is:
    // <button><span class="qa-mark-chip-dot" />{tagName}</button>
    // The dot span has no text content, so textContent = tagName.
    const tagLabel = (await firstChip.textContent()).trim()

    // Tap the chip to select it
    await firstChip.click()

    // Selected strip should now contain a chip with that label
    const selectedStrip = page.locator('.qa-mark-chips--selected')
    await expect(selectedStrip).toBeVisible()
    const selectedChip = selectedStrip.locator('.qa-mark-chip--on').first()
    await expect(selectedChip).toBeVisible({ timeout: 3_000 })

    // Count badge increments to ≥1
    const countBadge = page.locator('.qa-mark-selected-count')
    await expect(countBadge).toBeVisible()
    const countText = await countBadge.textContent()
    expect(parseInt(countText, 10)).toBeGreaterThanOrEqual(1)

    // Select a second chip if available
    const remainingChips = allRegion.locator('.qa-mark-chip')
    const remainingCount = await remainingChips.count()
    if (remainingCount > 0) {
      await remainingChips.first().click()
      const newCount = await countBadge.textContent()
      expect(parseInt(newCount, 10)).toBeGreaterThanOrEqual(2)
    }

    // Tap × on the first selected chip → moves back to All
    const xBtn = selectedChip.locator('.qa-mark-chip-x')
    await expect(xBtn).toBeVisible()
    await xBtn.click()

    // Count should decrease
    await expect(async () => {
      const afterCount = await countBadge.textContent()
      const before = parseInt(countText, 10)
      const after = parseInt(afterCount, 10)
      expect(after).toBeLessThan(before)
    }).toPass({ timeout: 3_000 })

    // The deselected tag chip should reappear in the All region
    await expect(allRegion.locator(`.qa-mark-chip`).filter({ hasText: tagLabel.trim() })).toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // C3. Create new tag inline
  // -------------------------------------------------------------------------

  test('C3: type new label → "+ create" chip appears → tap creates and selects tag', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    const searchInput = page.locator('.qa-mark-search-input')
    await expect(searchInput).toBeVisible()

    // Type a unique tag label unlikely to exist in seed tags
    await searchInput.fill('taqwa')

    // "+ create 'taqwa'" chip appears in All region
    const createChip = page.locator('.qa-mark-chip--create')
    await expect(createChip).toBeVisible({ timeout: 3_000 })
    await expect(createChip).toContainText('taqwa')

    // Tap the create chip
    await createChip.click()

    // New tag moves to Selected strip
    const selectedStrip = page.locator('.qa-mark-chips--selected')
    const taqwaChip = selectedStrip.locator('.qa-mark-chip--on').filter({ hasText: 'taqwa' })
    await expect(taqwaChip).toBeVisible({ timeout: 3_000 })

    // Search input is cleared
    await expect(searchInput).toHaveValue('')

    // Create chip is gone
    await expect(createChip).not.toBeVisible()
  })

  // -------------------------------------------------------------------------
  // C4. Note + save → IDB write + gold edge
  // -------------------------------------------------------------------------

  test('C4: type note, tap Save → mark written to IDB → gold edge on verse', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    // Get the verse key of the first verse (surah 1, verse 1)
    const verseKey = '1:1'

    // Select a tag first so Save becomes enabled
    const allRegion = page.locator('.qa-mark-chips--all')
    await expect(allRegion).toBeVisible()
    await allRegion.locator('.qa-mark-chip').first().click()

    // Type a note
    const noteArea = page.locator('.qa-mark-note')
    await noteArea.fill('A test reflection note.')

    // Save button should be enabled
    const saveBtn = page.locator('.qa-mark-btn--primary')
    await expect(saveBtn).toBeEnabled({ timeout: 3_000 })

    // Tap Save
    await saveBtn.click()

    // Sheet closes
    await expect(page.locator('.qa-sheet--mark')).not.toBeVisible({ timeout: 5_000 })

    // IDB record exists
    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.verseKey).toBe(verseKey)
    expect(Array.isArray(mark.tags)).toBe(true)
    expect(mark.tags.length).toBeGreaterThanOrEqual(1)
    expect(mark.note).toBe('A test reflection note.')

    // Gold edge: .qa-verse--bookmarked on the first verse element
    const verse = page.locator(`.qa-verse[data-verse-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })
  })

  test('C4: Save button is disabled when no tag and no note; enables when note typed', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    const saveBtn = page.locator('.qa-mark-btn--primary')

    // Initially disabled (new mark, no tags, no note)
    await expect(saveBtn).toBeDisabled()

    // Type a note → Save enables
    await page.locator('.qa-mark-note').fill('some note')
    await expect(saveBtn).toBeEnabled({ timeout: 3_000 })

    // Clear note → Save disables again
    await page.locator('.qa-mark-note').fill('')
    await page.locator('.qa-mark-note').dispatchEvent('input')
    await expect(saveBtn).toBeDisabled({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // C5. Delete + undo
  // -------------------------------------------------------------------------

  test('C5: delete mark → undo toast appears → tap Undo restores mark', async ({ page }) => {
    // Seed an existing mark on verse 1:1
    await clearAllData(page)
    await markOnboardingComplete(page)
    await seedMarks(page, [{ verseKey: '1:1', tags: ['mercy'], note: 'original note' }])
    await page.goto('/#/s/1')
    await waitForReader(page)

    const verseKey = '1:1'

    // Gold edge should be visible for seeded mark
    const verse = page.locator(`.qa-verse[data-verse-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    // Open editor for existing mark
    await openMarkEditorViaRightClick(page)

    // Title should say "Edit mark" for existing mark
    await expect(page.locator('.qa-sheet-title')).toHaveText('Edit mark')

    // Tap the Delete button (initial danger button)
    const deleteBtn = page.locator('.qa-mark-btn--danger[data-action="delete"]')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Inline confirm appears in footer
    const confirmText = page.locator('.qa-mark-confirm-text')
    await expect(confirmText).toBeVisible({ timeout: 3_000 })
    await expect(confirmText).toContainText('Delete this mark?')

    // Tap the red Danger-primary confirm button
    const confirmDeleteBtn = page.locator('.qa-mark-btn--danger-primary')
    await expect(confirmDeleteBtn).toBeVisible()
    await confirmDeleteBtn.click()

    // Sheet closes
    await expect(page.locator('.qa-sheet--mark')).not.toBeVisible({ timeout: 5_000 })

    // Undo toast appears
    const undoToast = page.locator('.qa-undo-toast')
    await expect(undoToast).toBeVisible({ timeout: 3_000 })

    // Gold edge is gone
    await expect(verse).not.toHaveClass(/qa-verse--bookmarked/, { timeout: 3_000 })

    // Tap Undo button inside toast
    const undoBtn = undoToast.locator('button', { hasText: 'Undo' })
    await expect(undoBtn).toBeVisible()
    await undoBtn.click()

    // Toast disappears
    await expect(undoToast).not.toBeVisible({ timeout: 3_000 })

    // Gold edge returns
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    // IDB record is restored
    const restoredMark = await getMarkFromIdb(page, verseKey)
    expect(restoredMark).toBeDefined()
    expect(restoredMark.tags).toContain('mercy')
  })

  test('C5: undo toast auto-dismisses after ~5s without undo @reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })

    // Seed a mark
    await clearAllData(page)
    await markOnboardingComplete(page)
    await seedMarks(page, [{ verseKey: '1:1', tags: ['patience'], note: '' }])
    await page.goto('/#/s/1')
    await waitForReader(page)

    // Open editor and delete without undo
    await openMarkEditorViaRightClick(page)
    await expect(page.locator('.qa-sheet-title')).toHaveText('Edit mark')

    const deleteBtn = page.locator('.qa-mark-btn--danger[data-action="delete"]')
    await deleteBtn.click()
    await page.locator('.qa-mark-btn--danger-primary').click()

    const undoToast = page.locator('.qa-undo-toast')
    await expect(undoToast).toBeVisible({ timeout: 3_000 })

    // Toast should auto-dismiss after UNDO_TIMEOUT_MS (5000ms) without interaction
    await expect(undoToast).not.toBeVisible({ timeout: 8_000 })

    // Mark remains deleted
    const mark = await getMarkFromIdb(page, '1:1')
    expect(mark).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // C6. Long-press has no alternative gesture
  // -------------------------------------------------------------------------

  test('C6: right-click suppresses native context menu and opens mark editor only', async ({ page }) => {
    // Track whether a dialog/contextmenu appears outside of the mark editor
    let dialogFired = false
    page.on('dialog', () => { dialogFired = true })

    // Right-click the verse
    await page.locator('.qa-verse').first().click({ button: 'right' })

    // Mark editor should open
    await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 5_000 })

    // No browser dialog (context menus don't fire as Playwright dialogs,
    // but we verify no unexpected dialog was triggered)
    expect(dialogFired).toBe(false)

    // No multi-action sheet (no other sheet or popover besides the mark editor)
    // Verify only the mark editor sheet is present
    const allSheets = page.locator('.qa-sheet')
    const sheetCount = await allSheets.count()
    expect(sheetCount).toBe(1)

    // No preview popover
    await expect(page.locator('.qa-verse-preview')).toHaveCount(0)
    await expect(page.locator('.qa-contextmenu')).toHaveCount(0)
  })

  test('C6: long-press on verse opens only mark editor, not any other action sheet', async ({ page }) => {
    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible()

    await longPress(firstVerse)

    // Mark editor opens
    await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 5_000 })

    // No other sheets open alongside the mark editor
    const allSheets = page.locator('.qa-sheet')
    const sheetCount = await allSheets.count()
    expect(sheetCount).toBe(1)

    // No multi-action sheet
    await expect(page.locator('.qa-sheet--actions')).toHaveCount(0)

    // Close and verify verse has no unexpected state changes
    await page.keyboard.press('Escape')
    await expect(page.locator('.qa-sheet--mark')).not.toBeVisible({ timeout: 3_000 })
  })
})
