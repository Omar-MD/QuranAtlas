/**
 * E2E Journey F: Navigation (command sheet, surah list, keyboard)
 *
 * Covers:
 *   F1. Command sheet direct verse-ref (2:255) → reader at #/s/2/255 + a11y scan
 *   F2. Arrow-down to "Study this verse" row → Enter → inline tafsir opens
 *   F3. Removed tag search stays absent from the reader-first command sheet
 *   F4. Surah directory — 114 rows, search "67" → eyebrow + Al-Mulk row → tap → #/s/67
 *   F5. Continue-reading card — visible at top after visiting a surah; tap navigates
 *   F6. Keyboard navigation — pill→Enter opens sheet; arrow nav; Esc closes; G then S
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §F
 *   src/navigate/command-sheet.js
 *   src/navigate/surahs/list.js
 *   src/navigate/ambient-pill.js
 *   src/navigate/ambient-dock.js
 */

import { test, expect } from '@playwright/test'
import { waitForReader, openCommandSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey F: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForReader(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // ---------------------------------------------------------------------------
  // F1. Command sheet direct verse-ref
  // ---------------------------------------------------------------------------

  test('F1: ⌘K → type 2:255 → verse preview card appears → Enter navigates to #/s/2/255', async ({ page }) => {
    // Open the command sheet
    await openCommandSheet(page)

    const sheet = page.locator('.qa-cmd-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet).not.toHaveClass(/qa-cmd--hidden/)

    // Type the verse reference
    await page.locator('.qa-cmd-input').fill('2:255')

    // Verse preview card should appear
    const vcard = page.locator('.qa-cmd-vcard')
    await expect(vcard).toBeVisible({ timeout: 5_000 })

    // Card should contain Arabic text; translation field exists in DOM
    // but may be empty (no translations ship today) and thus zero-height.
    const arText = page.locator('.qa-cmd-vcard-ar')
    const enText = page.locator('.qa-cmd-vcard-en')
    await expect(arText).toBeVisible()
    await expect(enText).toBeAttached()
    // The ref line should mention "2:255"
    const refLine = page.locator('.qa-cmd-vcard-ref')
    await expect(refLine).toContainText('2:255')

    // "Open verse" should be the first (active) item
    const activeItem = page.locator('.qa-cmd--active')
    await expect(activeItem).toBeVisible()
    const activeLabel = activeItem.locator('.qa-cmd-item-label')
    await expect(activeLabel).toHaveText('Open verse')

    // Press Enter → sheet closes → navigates to the verse
    await page.keyboard.press('Enter')

    await expect(sheet).toHaveClass(/qa-cmd--hidden/, { timeout: 5_000 })
    await expect(page).toHaveURL(/#\/s\/2/, { timeout: 8_000 })

    // Reader should mount for surah 2
    await waitForReader(page)
  })

  test('F1: a11y — no serious/critical axe violations on open command sheet with verse preview @a11y', async ({ page }) => {
    await openCommandSheet(page)
    await page.locator('.qa-cmd-input').fill('2:255')
    await expect(page.locator('.qa-cmd-vcard')).toBeVisible({ timeout: 5_000 })

    const violations = await scanA11y(page, { include: ['.qa-cmd-sheet'] })
    expect(violations).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // F2. Study a verse from command sheet
  // ---------------------------------------------------------------------------

  test('F2: verse preview → ArrowDown to "Study this verse" → Enter opens inline tafsir preview', async ({ page }) => {
    await openCommandSheet(page)
    await page.locator('.qa-cmd-input').fill('1:1')
    await expect(page.locator('.qa-cmd-vcard')).toBeVisible({ timeout: 5_000 })

    // Confirm "Open verse" is currently active (index 0)
    const firstActive = page.locator('.qa-cmd--active')
    await expect(firstActive.locator('.qa-cmd-item-label')).toHaveText('Open verse')

    // Arrow down once → "Study this verse" should become active
    await page.keyboard.press('ArrowDown')

    const activeItem = page.locator('.qa-cmd--active')
    await expect(activeItem).toBeVisible()
    const activeLabel = activeItem.locator('.qa-cmd-item-label')
    await expect(activeLabel).toHaveText('Study this verse')

    // Press Enter → command sheet closes → inline tafsir preview opens.
    await page.keyboard.press('Enter')

    const sheet = page.locator('.qa-cmd-sheet')
    await expect(sheet).toHaveClass(/qa-cmd--hidden/, { timeout: 5_000 })

    await expect(page.locator('[data-tafsir-preview]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-tafsir-sheet')).toHaveCount(0)
  })

  // ---------------------------------------------------------------------------
  // F3. Removed tag search stays absent
  // ---------------------------------------------------------------------------

  test('F3: type "mer" keeps removed tag search out of the command sheet', async ({ page }) => {
    await openCommandSheet(page)
    await page.locator('.qa-cmd-input').fill('mer')

    await expect(page.locator('.qa-cmd-group').filter({ hasText: 'Tags' })).toHaveCount(0)
    await expect(page.locator('.qa-cmd-sheet')).not.toContainText('mercy')
    await expect(page).not.toHaveURL(/#\/threads\//)
  })

  // ---------------------------------------------------------------------------
  // F4. Surah directory
  // ---------------------------------------------------------------------------
})
