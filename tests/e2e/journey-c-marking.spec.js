/**
 * E2E Journey C: Verse marking
 *
 * Covers:
 *   C1. Long-press → open mark editor (happy path, a11y scan, @keyboard variant)
 *   C2. Multi-tag selection and deselect (per-layer)
 *   C3. Create a new tag inline (per-layer search)
 *   C4. Note + save → verify IDB write + gold edge
 *   C5. Delete + undo (@reduced-motion variant for undo toast)
 *   C6. Long-press has no alternative gesture (no context menu, no multi-action sheet)
 *   C7. Multi-layer round-trip: tags in threads + audience + flags persist across open/close
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §C
 *   src/marks/Editor.svelte
 *   src/marks/TagLayerRegion.svelte
 *   src/marks/store.ts
 *   src/core/ui.js          (showUndoToast — .qa-undo-toast)
 *   src/marks/indicator.ts  (.qa-verse--bookmarked)
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks, getMarkFromIdb } from './fixtures/idb.js'
import { waitForReader, longPress } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open the mark editor for the first verse via right-click (contextmenu).
 * The app prevents the native context menu and opens the editor instead.
 */
async function openMarkEditorViaRightClick(page) {
  await page.locator('.qa-verse').first().click({ button: 'right' })
  await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 5_000 })
}

/**
 * Get the threads layer region (expanded by default).
 */
function threadsLayer(page) {
  return page.locator('.qa-layer-region[data-layer="threads"]')
}

/**
 * Get chips in the threads layer's "all" pool.
 */
function threadsAllChips(page) {
  return threadsLayer(page).locator('.qa-layer-all .qa-mark-chip')
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

    // Threads layer is expanded by default and has seed chips
    const threadsRegion = page.locator('.qa-layer-region[data-layer="threads"]')
    await expect(threadsRegion).toBeVisible()
    const chips = threadsRegion.locator('.qa-layer-all .qa-mark-chip')
    await expect(chips.first()).toBeVisible()
    const chipCount = await chips.count()
    expect(chipCount).toBeGreaterThanOrEqual(1)

    // Flag checkboxes are present and unchecked
    const questionFlag = page.locator('.qa-mark-flag-checkbox').first()
    await expect(questionFlag).toBeVisible()
    await expect(questionFlag).not.toBeChecked()
  })

  // -------------------------------------------------------------------------
  // C1. Right-click as alternate entry (desktop contextmenu → suppressed)
  // -------------------------------------------------------------------------

  test('C1: right-click also opens mark editor (no native context menu)', async ({ page }) => {
    await openMarkEditorViaRightClick(page)
    await expect(page.locator('.qa-sheet-title')).toHaveText('New mark')
  })

  // -------------------------------------------------------------------------
  // C1. a11y — axe-core scan of open mark editor
  // -------------------------------------------------------------------------

  test('C1: a11y — no serious/critical axe violations on open mark editor @a11y', async ({ page }) => {
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
  // C2. Multi-tag selection and deselect (per-layer)
  // -------------------------------------------------------------------------

  test('C2: tap tag chip moves it to layer selected row; × removes it', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    // Use the threads layer (expanded by default)
    const layerRegion = page.locator('.qa-layer-region[data-layer="threads"]')
    await expect(layerRegion).toBeVisible()

    const allPool = layerRegion.locator('.qa-layer-all')
    await expect(allPool).toBeVisible()
    const firstChip = allPool.locator('.qa-mark-chip').first()
    await expect(firstChip).toBeVisible()

    // Capture the chip's text before clicking
    const tagLabel = (await firstChip.textContent()).trim()

    // Tap the chip to select it
    await firstChip.click()

    // Selected row in this layer should now show the chip
    const selectedRow = layerRegion.locator('.qa-layer-selected')
    await expect(selectedRow).toBeVisible()
    const selectedChip = selectedRow.locator('.qa-mark-chip--on').first()
    await expect(selectedChip).toBeVisible({ timeout: 3_000 })

    // Layer count badge increments to ≥1
    const countBadge = layerRegion.locator('.qa-layer-count')
    await expect(countBadge).toBeVisible()
    expect(parseInt(await countBadge.textContent(), 10)).toBeGreaterThanOrEqual(1)

    // Select a second chip if available
    const remainingChips = allPool.locator('.qa-mark-chip')
    const remainingCount = await remainingChips.count()
    if (remainingCount > 0) {
      await remainingChips.first().click()
      const newCount = await countBadge.textContent()
      expect(parseInt(newCount, 10)).toBeGreaterThanOrEqual(2)
    }

    // Capture count AFTER optional second selection
    const beforeRemove = parseInt(await countBadge.textContent(), 10)

    // Tap × on the first selected chip → moves back to all pool
    const xBtn = selectedChip.locator('.qa-mark-chip-x')
    await expect(xBtn).toBeVisible()
    await xBtn.click()

    // Count should decrease
    await expect(async () => {
      const afterCount = await countBadge.textContent()
      const after = parseInt(afterCount, 10)
      expect(after).toBeLessThan(beforeRemove)
    }).toPass({ timeout: 3_000 })

    // The deselected tag chip should reappear in the all pool
    await expect(allPool.locator('.qa-mark-chip').filter({ hasText: tagLabel.trim() })).toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // C3. Create new tag inline (per-layer search)
  // -------------------------------------------------------------------------

  test('C3: type new label in layer search → "+ create" chip appears → tap creates and selects tag', async ({ page }) => {
    await openMarkEditorViaRightClick(page)

    // Use the threads layer (expanded by default)
    const layerRegion = page.locator('.qa-layer-region[data-layer="threads"]')
    await expect(layerRegion).toBeVisible()

    const searchInput = layerRegion.locator('.qa-layer-search')
    await expect(searchInput).toBeVisible()

    // Type a unique tag label unlikely to exist in threads seed tags
    await searchInput.fill('unique-custom-tag-xyz')

    // "+ unique-custom-tag-xyz" chip appears in the all pool
    const createChip = layerRegion.locator('.qa-mark-chip--create')
    await expect(createChip).toBeVisible({ timeout: 3_000 })
    await expect(createChip).toContainText('unique-custom-tag-xyz')

    // Tap the create chip
    await createChip.click()

    // New tag moves to selected row
    const selectedRow = layerRegion.locator('.qa-layer-selected')
    const newChip = selectedRow.locator('.qa-mark-chip--on').filter({ hasText: 'unique-custom-tag-xyz' })
    await expect(newChip).toBeVisible({ timeout: 3_000 })

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

    // Select a tag from threads layer (expanded by default)
    const threadsRegion = page.locator('.qa-layer-region[data-layer="threads"]')
    await expect(threadsRegion).toBeVisible()
    await threadsRegion.locator('.qa-layer-all .qa-mark-chip').first().click()

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

    // IDB record exists with 12-layer schema
    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.verseKey).toBe(verseKey)
    // threads layer should have the selected chip
    expect(Array.isArray(mark.threads)).toBe(true)
    expect(mark.threads.length).toBeGreaterThanOrEqual(1)
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
    // beforeEach already booted a clean app at /#/s/1.  Seed the mark (v2 schema),
    // then page.reload() so the indicator module's marksCache restarts null and
    // falls back to IDB — otherwise the cached (empty) marksCache from the
    // initial mount would hide the newly-seeded mark.
    await seedMarks(page, [{ verseKey: '1:1', threads: ['mercy'], note: 'original note' }])
    await page.reload()
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

    // IDB record is restored with mercy in threads layer
    const restoredMark = await getMarkFromIdb(page, verseKey)
    expect(restoredMark).toBeDefined()
    expect(restoredMark.threads).toContain('mercy')
  })

  test('C5: undo toast auto-dismisses after ~5s without undo @reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })

    // beforeEach booted the app at /#/s/1.  Seed + reload so marksCache picks
    // up the new mark (page.goto to the same hash would no-op in Chromium).
    await seedMarks(page, [{ verseKey: '1:1', threads: ['patience'], note: '' }])
    await page.reload()
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

  test('C6: both right-click and long-press open ONLY the mark editor (no competing sheets)', async ({ page }) => {
    let dialogFired = false
    page.on('dialog', () => { dialogFired = true })

    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible()
    const sheet = page.locator('.qa-sheet--mark')

    // --- Path 1: right-click (desktop contextmenu) ---
    await firstVerse.click({ button: 'right' })
    await expect(sheet).toBeVisible({ timeout: 5_000 })

    // No browser dialog (native context menu suppressed)
    expect(dialogFired).toBe(false)
    // Only one sheet in the DOM, and no alternative surfaces
    expect(await page.locator('.qa-sheet').count()).toBe(1)
    await expect(page.locator('.qa-sheet--actions')).toHaveCount(0)
    await expect(page.locator('.qa-verse-preview')).toHaveCount(0)
    await expect(page.locator('.qa-contextmenu')).toHaveCount(0)

    // Close the editor between paths
    await page.keyboard.press('Escape')
    await expect(sheet).not.toBeVisible({ timeout: 3_000 })

    // --- Path 2: touch long-press ---
    await longPress(firstVerse)
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    expect(await page.locator('.qa-sheet').count()).toBe(1)
    await expect(page.locator('.qa-sheet--actions')).toHaveCount(0)
  })

  // -------------------------------------------------------------------------
  // C7. Multi-layer round-trip: tags in threads + audience + flags persist
  // -------------------------------------------------------------------------

  test('C7: select tags in threads + audience, toggle hasQuestion flag, save, reopen, assert state', async ({ page }) => {
    const verseKey = '1:1'

    // Open editor for a new mark
    await openMarkEditorViaRightClick(page)
    await expect(page.locator('.qa-sheet-title')).toHaveText('New mark')

    // --- Select 'mercy' from threads layer (expanded by default) ---
    const threadsRegion = page.locator('.qa-layer-region[data-layer="threads"]')
    await expect(threadsRegion).toBeVisible()
    const mercyChip = threadsRegion.locator('.qa-layer-all .qa-mark-chip').filter({ hasText: 'mercy' })
    await expect(mercyChip).toBeVisible({ timeout: 3_000 })
    await mercyChip.click()
    // Verify mercy is in threads selected row
    const threadsSelected = threadsRegion.locator('.qa-layer-selected .qa-mark-chip--on')
    await expect(threadsSelected.filter({ hasText: 'mercy' })).toBeVisible({ timeout: 3_000 })

    // --- Expand audience layer and select 'muminin' ---
    const audienceRegion = page.locator('.qa-layer-region[data-layer="audience"]')
    await expect(audienceRegion).toBeVisible()
    // Click the toggle button to expand if collapsed
    const audienceToggle = audienceRegion.locator('.qa-layer-toggle')
    const audienceExpanded = await audienceToggle.getAttribute('aria-expanded')
    if (audienceExpanded === 'false') {
      await audienceToggle.click()
    }
    const mumininChip = audienceRegion.locator('.qa-layer-all .qa-mark-chip').filter({ hasText: 'muminin' })
    await expect(mumininChip).toBeVisible({ timeout: 3_000 })
    await mumininChip.click()
    const audienceSelected = audienceRegion.locator('.qa-layer-selected .qa-mark-chip--on')
    await expect(audienceSelected.filter({ hasText: 'muminin' })).toBeVisible({ timeout: 3_000 })

    // --- Toggle the hasQuestion flag ---
    const questionCheckbox = page.locator('.qa-mark-flag-checkbox').first()
    await expect(questionCheckbox).not.toBeChecked()
    await questionCheckbox.click()
    await expect(questionCheckbox).toBeChecked()

    // --- Save ---
    const saveBtn = page.locator('.qa-mark-btn--primary')
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()
    await expect(page.locator('.qa-sheet--mark')).not.toBeVisible({ timeout: 5_000 })

    // --- Verify IDB record ---
    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.threads).toContain('mercy')
    expect(mark.audience).toContain('muminin')
    expect(mark.flags.hasQuestion).toBe(true)

    // --- Reopen editor and verify state is restored ---
    const verse = page.locator(`.qa-verse[data-verse-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    await verse.click({ button: 'right' })
    await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-sheet-title')).toHaveText('Edit mark')

    // threads layer shows mercy selected
    const threadsRegion2 = page.locator('.qa-layer-region[data-layer="threads"]')
    await expect(threadsRegion2).toBeVisible()
    const threadsSelected2 = threadsRegion2.locator('.qa-layer-selected .qa-mark-chip--on')
    await expect(threadsSelected2.filter({ hasText: 'mercy' })).toBeVisible({ timeout: 3_000 })

    // audience layer shows muminin selected (may need to expand)
    const audienceRegion2 = page.locator('.qa-layer-region[data-layer="audience"]')
    const audienceToggle2 = audienceRegion2.locator('.qa-layer-toggle')
    const isExpanded2 = await audienceToggle2.getAttribute('aria-expanded')
    if (isExpanded2 === 'false') {
      await audienceToggle2.click()
    }
    const audienceSelected2 = audienceRegion2.locator('.qa-layer-selected .qa-mark-chip--on')
    await expect(audienceSelected2.filter({ hasText: 'muminin' })).toBeVisible({ timeout: 3_000 })

    // hasQuestion flag is checked
    const questionCheckbox2 = page.locator('.qa-mark-flag-checkbox').first()
    await expect(questionCheckbox2).toBeChecked()
  })
})

// ---------------------------------------------------------------------------
// Journey C — desktop variants (≥1180px viewport)
//
// The mark editor renders as an 820px-wide verse-hero modal at desktop: true
// vertically-centered, grip hidden, and body scrollable (single-column layout
// with 12 layer regions).
// ---------------------------------------------------------------------------

test.describe('Journey C: desktop variants @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('C1 desktop: verse-hero modal centered at 820px, grip hidden', async ({ page }) => {
    // Open editor via right-click — the app suppresses the native context menu.
    await page.locator('[data-verse-key]').first().click({ button: 'right' })
    await expect(page.locator('.qa-sheet--mark')).toBeVisible({ timeout: 10_000 })

    // Wait for the scale-in animation to finish before reading geometry.
    await page.locator('.qa-sheet--mark').evaluate(el =>
      Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished))
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

  test('C1 desktop: layer regions and flag checkboxes are visible', async ({ page }) => {
    await page.locator('[data-verse-key]').first().click({ button: 'right' })
    const sheet = page.locator('.qa-sheet--mark')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await sheet.evaluate(el =>
      Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished))
    )

    // Threads layer visible and expanded
    const threadsRegion = page.locator('.qa-layer-region[data-layer="threads"]')
    await expect(threadsRegion).toBeVisible({ timeout: 5_000 })
    await expect(threadsRegion.locator('.qa-layer-all')).toBeVisible()

    // Flag checkboxes present
    const flags = page.locator('.qa-mark-flags')
    await expect(flags).toBeVisible()
    expect(await page.locator('.qa-mark-flag-checkbox').count()).toBe(2)
  })
})
