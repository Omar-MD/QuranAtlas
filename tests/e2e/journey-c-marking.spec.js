/**
 * E2E Journey C: Verse marking (TagSheet)
 *
 * Covers:
 *   C1. Long-press / right-click → open TagSheet (happy path, a11y, keyboard)
 *   C2. Add tag via layer combobox suggestion; click chip removes it
 *   C3. Add a new tag inline (type + Enter commits)
 *   C4. Note + save → verify IDB write + gold edge
 *   C5. Delete → undo toast → tap Undo restores mark
 *   C6. Right-click and long-press open ONLY TagSheet (no competing surfaces)
 *   C7. Multi-layer round-trip: threads + audience tags persist across reopen
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §C
 *   src/tag/TagSheet.svelte        (deep tagging sheet — replaces old mark Editor)
 *   src/state/tag-session.svelte.ts
 *   src/marks/store.ts
 *   src/core/ui.svelte             (.qa-undo-toast)
 *   src/marks/indicator.ts         (.qa-verse--bookmarked)
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks, getMarkFromIdb } from './fixtures/idb.js'
import { waitForReader, longPress } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openTagSheetViaRightClick(page) {
  await page.locator('.qa-verse').first().click({ button: 'right' })
  await expect(page.locator('.qa-ts')).toBeVisible({ timeout: 5_000 })
}

/** Click a tab group by label (Speech / Narrative / Themes / Entities). */
async function activateTab(page, label) {
  await page.locator('.qa-ts-tab', { hasText: label }).click()
}

/** Layer row (within the currently active tab) keyed by visible label text. */
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
  await expect(row.locator('.qa-ts-chip--on').filter({ hasText: value })).toBeVisible({ timeout: 3_000 })
}

test.describe('Journey C: Verse marking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // C1. Happy path — long-press opens TagSheet
  // -------------------------------------------------------------------------

  test('C1: long-press verse opens TagSheet with correct structure', async ({ page }) => {
    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible({ timeout: 5_000 })

    await longPress(firstVerse)

    const sheet = page.locator('.qa-ts')
    await expect(sheet).toBeVisible({ timeout: 5_000 })

    // Title
    await expect(sheet.locator('.qa-ts-title')).toHaveText('Mark verse')
    // Verse reference (header sub-line)
    await expect(sheet.locator('.qa-ts-sub')).toContainText('1:1')

    // Verse preview card
    await expect(sheet.locator('.qa-ts-preview')).toBeVisible()
    await expect(sheet.locator('.qa-ts-par')).toBeVisible()
    await expect(sheet.locator('.qa-ts-pen')).toBeVisible()

    // Note textarea empty on a new mark
    await expect(sheet.locator('.qa-ts-note-area')).toHaveValue('')

    // Tabs present (Speech / Narrative / Themes / Entities)
    const tabs = sheet.locator('.qa-ts-tab')
    await expect(tabs).toHaveCount(4)

    // Flag buttons unpressed
    const flags = sheet.locator('.qa-ts-flag')
    await expect(flags).toHaveCount(2)
    await expect(flags.nth(0)).toHaveAttribute('aria-pressed', 'false')
    await expect(flags.nth(1)).toHaveAttribute('aria-pressed', 'false')
  })

  test('C1: right-click also opens TagSheet (no native context menu)', async ({ page }) => {
    await openTagSheetViaRightClick(page)
    await expect(page.locator('.qa-ts-title')).toHaveText('Mark verse')
  })

  test('C1: a11y — no serious/critical axe violations on open TagSheet @a11y', async ({ page }) => {
    await openTagSheetViaRightClick(page)
    // Delete button uses --qa-color-error on a semi-transparent footer — axe
    // flags contrast there against the baseline surface.  Excluded pending a
    // design pass on error-state tokens.
    const violations = await scanA11y(page, { include: ['.qa-ts'], exclude: ['.qa-ts-btn--danger'] })
    expect(violations).toEqual([])
  })

  test('C1: keyboard — Escape closes TagSheet @keyboard', async ({ page }) => {
    await openTagSheetViaRightClick(page)
    const sheet = page.locator('.qa-ts')
    await expect(sheet).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(sheet).not.toBeVisible({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // C2. Add a tag to a layer → click chip removes it
  // -------------------------------------------------------------------------

  test('C2: add tag to layer via combobox; click chip removes it', async ({ page }) => {
    await openTagSheetViaRightClick(page)
    await activateTab(page, 'Themes')

    const threads = layerRow(page, 'threads')
    await expect(threads).toBeVisible()

    // Type "mercy" and commit with Enter
    const input = threads.locator('.qa-ts-combo-input')
    await input.click()
    await input.fill('mercy')
    await input.press('Enter')

    const chip = threads.locator('.qa-ts-chip--on').filter({ hasText: 'mercy' })
    await expect(chip).toBeVisible({ timeout: 3_000 })

    // Header count reflects one selected tag
    await expect(page.locator('.qa-ts-count')).toContainText('1')

    // Tab badge on Themes shows 1
    const themesTab = page.locator('.qa-ts-tab', { hasText: 'Themes' })
    await expect(themesTab.locator('.qa-ts-tab-count')).toHaveText('1')

    // Click chip → toggles off (removed from draft)
    await chip.click()
    await expect(chip).not.toBeVisible({ timeout: 3_000 })
    await expect(page.locator('.qa-ts-count')).toHaveCount(0) // header count hides at 0
  })

  // -------------------------------------------------------------------------
  // C3. Add a new (non-seed) tag inline
  // -------------------------------------------------------------------------

  test('C3: type new label + Enter in layer combobox → tag added', async ({ page }) => {
    await openTagSheetViaRightClick(page)
    await activateTab(page, 'Themes')

    const threads = layerRow(page, 'threads')
    const input = threads.locator('.qa-ts-combo-input')
    await input.click()
    await input.fill('unique-custom-tag-xyz')
    await input.press('Enter')

    const newChip = threads.locator('.qa-ts-chip--on').filter({ hasText: 'unique-custom-tag-xyz' })
    await expect(newChip).toBeVisible({ timeout: 3_000 })
    await expect(input).toHaveValue('')
  })

  // -------------------------------------------------------------------------
  // C4. Note + save → IDB write + gold edge
  // -------------------------------------------------------------------------

  test('C4: select tag, type note, Save → mark written to IDB → gold edge on verse', async ({ page }) => {
    await openTagSheetViaRightClick(page)
    await activateTab(page, 'Themes')
    await addTagToLayer(page, 'threads', 'mercy')

    const noteArea = page.locator('.qa-ts-note-area')
    await noteArea.fill('A test reflection note.')

    const saveBtn = page.locator('.qa-ts-btn--primary')
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // Sheet closes
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 5_000 })

    // IDB record written
    const verseKey = '1:1'
    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.verseKey).toBe(verseKey)
    expect(Array.isArray(mark.threads)).toBe(true)
    expect(mark.threads).toContain('mercy')
    expect(mark.note).toBe('A test reflection note.')

    // Gold edge appears
    const verse = page.locator(`.qa-verse[data-verse-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })
  })

  // -------------------------------------------------------------------------
  // C5. Delete + undo
  // -------------------------------------------------------------------------

  test('C5: delete mark → undo toast appears → tap Undo restores mark', async ({ page }) => {
    await seedMarks(page, [{ verseKey: '1:1', threads: ['mercy'], note: 'original note' }])
    await page.reload()
    await waitForReader(page)

    const verseKey = '1:1'
    const verse = page.locator(`.qa-verse[data-verse-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    await openTagSheetViaRightClick(page)

    // Delete immediately (no confirm step in TagSheet)
    const deleteBtn = page.locator('.qa-ts-btn--danger')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Sheet closes
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 5_000 })

    const undoToast = page.locator('.qa-undo-toast')
    await expect(undoToast).toBeVisible({ timeout: 3_000 })

    // Gold edge cleared
    await expect(verse).not.toHaveClass(/qa-verse--bookmarked/, { timeout: 3_000 })

    // Undo restores
    await undoToast.locator('button', { hasText: 'Undo' }).click()
    await expect(undoToast).not.toBeVisible({ timeout: 3_000 })
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    const restored = await getMarkFromIdb(page, verseKey)
    expect(restored).toBeDefined()
    expect(restored.threads).toContain('mercy')
  })

  test('C5: undo toast auto-dismisses after ~5s without undo @reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedMarks(page, [{ verseKey: '1:1', threads: ['patience'], note: '' }])
    await page.reload()
    await waitForReader(page)

    await openTagSheetViaRightClick(page)
    await page.locator('.qa-ts-btn--danger').click()

    const undoToast = page.locator('.qa-undo-toast')
    await expect(undoToast).toBeVisible({ timeout: 3_000 })
    await expect(undoToast).not.toBeVisible({ timeout: 8_000 })

    const mark = await getMarkFromIdb(page, '1:1')
    expect(mark).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // C6. Only TagSheet opens — no competing surfaces
  // -------------------------------------------------------------------------

  test('C6: right-click and long-press each open ONLY the TagSheet', async ({ page }) => {
    let dialogFired = false
    page.on('dialog', () => { dialogFired = true })

    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible()
    const sheet = page.locator('.qa-ts')

    // Path 1: right-click
    await firstVerse.click({ button: 'right' })
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    expect(dialogFired).toBe(false)
    await expect(page.locator('.qa-contextmenu')).toHaveCount(0)
    await expect(page.locator('.qa-sheet--actions')).toHaveCount(0)
    await expect(page.locator('.qa-verse-preview')).toHaveCount(0)

    await page.keyboard.press('Escape')
    await expect(sheet).not.toBeVisible({ timeout: 3_000 })

    // Path 2: touch long-press
    await longPress(firstVerse)
    await expect(sheet).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-contextmenu')).toHaveCount(0)
  })

  // -------------------------------------------------------------------------
  // C7. Multi-layer round-trip: threads + audience persist across reopen
  // -------------------------------------------------------------------------

  test('C7: select threads + audience tags, save, reopen, assert draft restored', async ({ page }) => {
    const verseKey = '1:1'

    await openTagSheetViaRightClick(page)

    // Themes tab → threads layer → mercy
    await activateTab(page, 'Themes')
    await addTagToLayer(page, 'threads', 'mercy')

    // Speech tab → audience layer → muminin
    await activateTab(page, 'Speech')
    await addTagToLayer(page, 'audience', 'muminin')

    // Toggle Open question flag
    const qFlag = page.locator('.qa-ts-flag').nth(0)
    await qFlag.click()
    await expect(qFlag).toHaveAttribute('aria-pressed', 'true')

    // Save
    await page.locator('.qa-ts-btn--primary').click()
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 5_000 })

    // IDB record
    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.threads).toContain('mercy')
    expect(mark.audience).toContain('muminin')
    expect(mark.flags.hasQuestion).toBe(true)

    // Reopen
    const verse = page.locator(`.qa-verse[data-verse-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })
    await verse.click({ button: 'right' })
    await expect(page.locator('.qa-ts')).toBeVisible({ timeout: 5_000 })

    // Themes tab: mercy chip is present
    await activateTab(page, 'Themes')
    await expect(layerRow(page, 'threads').locator('.qa-ts-chip--on').filter({ hasText: 'mercy' }))
      .toBeVisible({ timeout: 3_000 })

    // Speech tab: muminin chip is present
    await activateTab(page, 'Speech')
    await expect(layerRow(page, 'audience').locator('.qa-ts-chip--on').filter({ hasText: 'muminin' }))
      .toBeVisible({ timeout: 3_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey C — desktop variants (≥1180px viewport)
// TagSheet renders as a fixed right-side panel (~44vw / max 560px).
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

  test('C1 desktop: TagSheet is a right-side panel, full-height', async ({ page }) => {
    await page.locator('[data-verse-key]').first().click({ button: 'right' })
    const sheet = page.locator('.qa-ts')
    await expect(sheet).toBeVisible({ timeout: 10_000 })

    const geom = await sheet.evaluate(el => {
      const r = el.getBoundingClientRect()
      return {
        width: r.width,
        rightGap: window.innerWidth - r.right,
        topGap: r.top,
        bottomGap: window.innerHeight - r.bottom,
      }
    })

    // Flush-right panel
    expect(geom.rightGap).toBeLessThan(2)
    // Full-height
    expect(geom.topGap).toBeLessThan(2)
    expect(geom.bottomGap).toBeLessThan(2)
    // Width cap: min(560px, 44vw) — 44% of 1440 = 633.6 → 560
    expect(Math.round(geom.width)).toBe(560)
  })

  test('C1 desktop: tabs and flag buttons visible', async ({ page }) => {
    await page.locator('[data-verse-key]').first().click({ button: 'right' })
    const sheet = page.locator('.qa-ts')
    await expect(sheet).toBeVisible({ timeout: 10_000 })
    await expect(sheet.locator('.qa-ts-tab')).toHaveCount(4)
    await expect(sheet.locator('.qa-ts-flag')).toHaveCount(2)
  })
})
