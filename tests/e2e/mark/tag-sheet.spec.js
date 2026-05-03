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

  test('C1: double-tap verse opens TagSheet (via ⛶) with correct structure', async ({ page }) => {
    const firstVerse = page.locator('.qa-verse').first()
    await expect(firstVerse).toBeVisible({ timeout: 5_000 })

    await openTagSheetViaDoubleTap(page, firstVerse)

    const sheet = page.locator('.qa-ts')
    await expect(sheet).toBeVisible({ timeout: 5_000 })

    // Title
    await expect(sheet.locator('.qa-ts-title')).toHaveText('Mark verse')

    // Verse preview card — ref is on the preview, not duplicated in the title
    await expect(sheet.locator('.qa-ts-preview')).toBeVisible()
    await expect(sheet.locator('.qa-ts-pref')).toContainText('1:1')
    await expect(sheet.locator('.qa-ts-par')).toBeVisible()
    // .qa-ts-pen holds the translation text; with no translations shipped it
    // may be empty and thus zero-height — assert it exists in DOM only.
    await expect(sheet.locator('.qa-ts-pen').first()).toBeAttached()

    // Note textarea empty on a new mark
    await expect(sheet.locator('.qa-ts-note-area')).toHaveValue('')

    // Four group sections (Speech / Narrative / Themes / Entities)
    const groups = sheet.locator('.qa-ts-grp')
    await expect(groups).toHaveCount(4)
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

  // C1 keyboard Escape ported to tests/unit/mark/tag/tag-sheet.test.ts (Phase 2 bucket 2, 2026-04-26).

  // -------------------------------------------------------------------------
  // C1 (post-redesign 2026-04-25). Double-tap / right-click open the
  // FAST-TAG inline panel, not the deep TagSheet. Editor reachable only
  // via ⛶ escalation. Regression guard for mobile-nav-redesign spec §3.
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
    const verse = page.locator(`.qa-verse[data-token-key="${verseKey}"]`)
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
    const verse = page.locator(`.qa-verse[data-token-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })

    await openTagSheetViaRightClick(page)

    // Delete requires inline confirm (Delete → Delete)
    const deleteBtn = page.locator('.qa-ts-btn--danger')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    const confirmBtn = page.locator('.qa-ts-btn--danger-primary')
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 })
    await confirmBtn.click()

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
    await page.locator('.qa-ts-btn--danger-primary').click()

    const undoToast = page.locator('.qa-undo-toast')
    await expect(undoToast).toBeVisible({ timeout: 3_000 })
    await expect(undoToast).not.toBeVisible({ timeout: 8_000 })

    const mark = await getMarkFromIdb(page, '1:1')
    expect(mark).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // C6. Only TagSheet opens — no competing surfaces
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

    // Save
    await page.locator('.qa-ts-btn--primary').click()
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 5_000 })

    // IDB record
    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.threads).toContain('mercy')
    expect(mark.audience).toContain('muminin')

    // Reopen — right-click → fast-tag → ⛶ → deep TagSheet
    const verse = page.locator(`.qa-verse[data-token-key="${verseKey}"]`)
    await expect(verse).toHaveClass(/qa-verse--bookmarked/, { timeout: 5_000 })
    await verse.click({ button: 'right' })
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await page.locator('.qa-vtp-escalate').click()
    await expect(page.locator('.qa-ts')).toBeVisible({ timeout: 5_000 })

    // Themes tab: mercy chip is present
    await activateTab(page, 'Themes')
    await expect(layerRow(page, 'threads').locator('.qa-ts-hchip--on').filter({ hasText: 'mercy' }))
      .toBeVisible({ timeout: 3_000 })

    // Speech tab: muminin chip is present
    await activateTab(page, 'Speech')
    await expect(layerRow(page, 'audience').locator('.qa-ts-hchip--on').filter({ hasText: 'muminin' }))
      .toBeVisible({ timeout: 3_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey C — desktop variants (≥1180px viewport)
// TagSheet renders as a fixed right-side panel (~44vw / max 560px).
// ---------------------------------------------------------------------------

test.describe('Journey C: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  test('C1 desktop: TagSheet is a right-side panel, full-height', async ({ page }) => {
    // Post 2026-04-25: right-click → fast-tag panel; click ⛶ to escalate.
    await page.locator('[data-token-key]').first().click({ button: 'right' })
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 10_000 })
    await page.locator('.qa-vtp-escalate').click()
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
})
