/**
 * E2E Journey C: Existing mark editing
 *
 * Covers:
 *   C1. Review card opens deep TagSheet for an existing mark
 *   C4. Save edits persists updated tags + note
 *   C5. Delete → undo toast → tap Undo restores mark
 *   C7. Reopen shows saved draft state
 *
 * Sources of truth:
 *   docs/context/surfaces/mark.md
 *   src/review/ReviewCard.svelte
 *   src/mark/tag/TagSheet.svelte
 *   src/mark/store.ts
 *   src/core/ui.svelte
 */

import { test, expect } from '@playwright/test'
import { seedMarks, getMarkFromIdb } from '../fixtures/idb.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup. Each test gets a
// fresh BrowserContext with the snapshot reloaded, so per-test marks state
// is reset implicitly without `clearAllData`.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })
import { waitForReader } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

async function activateTab(_page, _label) { /* no-op: all groups visible */ }

function layerRow(page, label) {
  return page.locator('.qa-ts-layer').filter({ has: page.locator('.qa-ts-lbl', { hasText: new RegExp(`^${label}$`, 'i') }) })
}

async function addTagToLayer(page, layerLabel, value) {
  const row = layerRow(page, layerLabel)
  const input = row.locator('.qa-ts-combo-input')
  await input.click()
  await input.fill(value)
  await input.press('Enter')
  await expect(row.locator('.qa-ts-hchip--on').filter({ hasText: value })).toBeVisible({ timeout: 3_000 })
}

async function openTagSheetFromReview(page, verseKey) {
  await page.goto('/#/review')
  const card = page.locator(`.qa-review-card[data-mark="${verseKey}"]`)
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.click()
  await expect(page.locator('.qa-ts')).toBeVisible({ timeout: 5_000 })
}

test.describe('Journey C: existing mark editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForReader(page)
    await seedMarks(page, [
      { verseKey: '1:1', tags: ['mercy'], note: 'original note' },
      { verseKey: '2:255', tags: ['faith'], note: 'guarded note' },
    ])
  })

  test('C1: review card opens TagSheet with the saved mark structure', async ({ page }) => {
    await openTagSheetFromReview(page, '1:1')

    const sheet = page.locator('.qa-ts')
    await expect(sheet).toBeVisible({ timeout: 5_000 })

    await expect(sheet.locator('.qa-ts-title')).toHaveText('Mark verse')
    await expect(sheet.locator('.qa-ts-preview')).toBeVisible()
    await expect(sheet.locator('.qa-ts-pref')).toContainText('1:1')
    await expect(sheet.locator('.qa-ts-par')).toBeVisible()
    await expect(sheet.locator('.qa-ts-pen').first()).toBeAttached()
    await expect(sheet.locator('.qa-ts-note-area')).toHaveValue('original note')
    await expect(layerRow(page, 'threads').locator('.qa-ts-hchip--on').filter({ hasText: 'mercy' }))
      .toBeVisible({ timeout: 3_000 })
    const groups = sheet.locator('.qa-ts-grp')
    await expect(groups).toHaveCount(4)
  })

  test('C1: a11y — no serious/critical axe violations on open TagSheet @a11y', async ({ page }) => {
    await openTagSheetFromReview(page, '1:1')
    await layerRow(page, 'threads').locator('.qa-ts-hchip--on').filter({ hasText: 'mercy' }).click()
    const violations = await scanA11y(page, {
      include: ['.qa-ts'],
      exclude: ['.qa-ts-btn--danger'],
    })
    expect(violations).toEqual([])
  })

  test('C4: edit tags and note, Save → mark written to IDB', async ({ page }) => {
    await openTagSheetFromReview(page, '1:1')
    await activateTab(page, 'Themes')
    await addTagToLayer(page, 'threads', 'gratitude')

    const noteArea = page.locator('.qa-ts-note-area')
    await noteArea.fill('Updated reflection note.')

    const saveBtn = page.locator('.qa-ts-btn--primary')
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 5_000 })

    const verseKey = '1:1'
    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.verseKey).toBe(verseKey)
    expect(Array.isArray(mark.threads)).toBe(true)
    expect(mark.threads).toContain('mercy')
    expect(mark.threads).toContain('gratitude')
    expect(mark.note).toBe('Updated reflection note.')
  })

  test('C5: delete mark → undo toast appears → tap Undo restores mark', async ({ page }) => {
    const verseKey = '1:1'
    await openTagSheetFromReview(page, verseKey)

    const deleteBtn = page.locator('.qa-ts-btn--danger')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    const confirmBtn = page.locator('.qa-ts-btn--danger-primary')
    await expect(confirmBtn).toBeVisible({ timeout: 3_000 })
    await confirmBtn.click()
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 5_000 })

    const undoToast = page.locator('.qa-undo-toast')
    await expect(undoToast).toBeVisible({ timeout: 3_000 })
    expect(await getMarkFromIdb(page, verseKey)).toBeUndefined()

    await undoToast.locator('button', { hasText: 'Undo' }).click()
    await expect(undoToast).not.toBeVisible({ timeout: 3_000 })

    const restored = await getMarkFromIdb(page, verseKey)
    expect(restored).toBeDefined()
    expect(restored.threads).toContain('mercy')
  })

  test('C5: undo toast auto-dismisses after ~5s without undo @reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedMarks(page, [{ verseKey: '3:190', tags: ['patience'], note: '' }])
    await openTagSheetFromReview(page, '3:190')
    await page.locator('.qa-ts-btn--danger').click()
    await page.locator('.qa-ts-btn--danger-primary').click()

    const undoToast = page.locator('.qa-undo-toast')
    await expect(undoToast).toBeVisible({ timeout: 3_000 })
    await expect(undoToast).not.toBeVisible({ timeout: 8_000 })

    const mark = await getMarkFromIdb(page, '3:190')
    expect(mark).toBeUndefined()
  })

  test('C7: select threads + audience tags, save, reopen, assert draft restored', async ({ page }) => {
    const verseKey = '1:1'

    await openTagSheetFromReview(page, verseKey)

    await activateTab(page, 'Themes')
    await addTagToLayer(page, 'threads', 'gratitude')

    await activateTab(page, 'Speech')
    await addTagToLayer(page, 'audience', 'muminin')

    await page.locator('.qa-ts-btn--primary').click()
    await expect(page.locator('.qa-ts')).not.toBeVisible({ timeout: 5_000 })

    const mark = await getMarkFromIdb(page, verseKey)
    expect(mark).toBeDefined()
    expect(mark.threads).toContain('gratitude')
    expect(mark.audience).toContain('muminin')

    await openTagSheetFromReview(page, verseKey)

    await activateTab(page, 'Themes')
    await expect(layerRow(page, 'threads').locator('.qa-ts-hchip--on').filter({ hasText: 'gratitude' }))
      .toBeVisible({ timeout: 3_000 })

    await activateTab(page, 'Speech')
    await expect(layerRow(page, 'audience').locator('.qa-ts-hchip--on').filter({ hasText: 'muminin' }))
      .toBeVisible({ timeout: 3_000 })
  })
})

// ---------------------------------------------------------------------------
test.describe('Journey C: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForReader(page)
    await seedMarks(page, [{ verseKey: '1:5', tags: ['reflect'], note: '' }])
  })

  test('C1 desktop: TagSheet is a right-side panel, full-height', async ({ page }) => {
    await page.goto('/#/review')
    await page.locator('.qa-review-card[data-mark="1:5"]').click()
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
    expect(Math.round(geom.width)).toBe(560)
  })
})
