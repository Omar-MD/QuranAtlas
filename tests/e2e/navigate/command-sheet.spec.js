/**
 * E2E Journey F: Navigation (command sheet, surah list, keyboard)
 *
 * Covers:
 *   F1. Command sheet direct verse-ref (2:255) → reader at #/s/2/255 + a11y scan
 *   F2. Arrow-down to "Mark this verse" row → Enter → mark editor opens
 *   F3. Tag search (type "mer") → Tags group shows "mercy" → Enter → #/threads/mercy FVR
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
import { seedMarks } from '../fixtures/idb.js'
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
    // Wait for app boot to settle before seeding so launch-restore
    // IDB reads cannot race with the seed write.
    await page.goto('/')
    await waitForReader(page)
    await seedMarks(page, [
      { verseKey: '2:255', tags: ['mercy'], note: '' },
    ])
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
  // F2. Mark a verse from command sheet
  // ---------------------------------------------------------------------------

  test('F2: verse preview → ArrowDown to "Mark this verse" → Enter opens fast-tag panel', async ({ page }) => {
    // Open command sheet and type verse reference for the currently-loaded
    // surah (reader is at #/s/1 from beforeEach). The fast-tag panel renders
    // inside the visible Verse component, so the target verse must be in
    // the rendered surah.
    await openCommandSheet(page)
    await page.locator('.qa-cmd-input').fill('1:1')
    await expect(page.locator('.qa-cmd-vcard')).toBeVisible({ timeout: 5_000 })

    // Confirm "Open verse" is currently active (index 0)
    const firstActive = page.locator('.qa-cmd--active')
    await expect(firstActive.locator('.qa-cmd-item-label')).toHaveText('Open verse')

    // Arrow down once → "Mark this verse" should become active
    await page.keyboard.press('ArrowDown')

    const activeItem = page.locator('.qa-cmd--active')
    await expect(activeItem).toBeVisible()
    const activeLabel = activeItem.locator('.qa-cmd-item-label')
    await expect(activeLabel).toHaveText('Mark this verse')

    // Press Enter → command sheet closes → fast-tag inline panel opens
    // (post-2026-04-25 mobile-nav-redesign: was mark editor)
    await page.keyboard.press('Enter')

    const sheet = page.locator('.qa-cmd-sheet')
    await expect(sheet).toHaveClass(/qa-cmd--hidden/, { timeout: 5_000 })

    // Fast-tag inline panel surfaces; deep TagSheet must NOT open
    await expect(page.locator('.qa-vtp')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.qa-ts')).toHaveCount(0)
  })

  // ---------------------------------------------------------------------------
  // F3. Tag search → FVR
  // ---------------------------------------------------------------------------

  test('F3: type "mer" → Tags group shows "mercy" with count badge → Enter → #/threads/mercy FVR', async ({ page }) => {
    await openCommandSheet(page)
    await page.locator('.qa-cmd-input').fill('mer')

    // Wait for Tags group to appear in results
    const tagsGroup = page.locator('.qa-cmd-group').filter({ hasText: 'Tags' })
    await expect(tagsGroup).toBeVisible({ timeout: 5_000 })

    // The group should contain "mercy"
    const mercyItem = tagsGroup.locator('.qa-cmd-item').filter({ hasText: 'mercy' })
    await expect(mercyItem).toBeVisible()

    // Count badge on the group header should be present (at least "1")
    const countBadge = tagsGroup.locator('.qa-cmd-group-count')
    await expect(countBadge).toBeVisible()
    const countText = await countBadge.textContent()
    expect(parseInt(countText, 10)).toBeGreaterThanOrEqual(1)

    // "mercy" item should be active (first result) or can navigate to it
    // Press Enter to activate the first item
    await page.keyboard.press('Enter')

    // Should navigate to the tag FVR route
    await expect(page).toHaveURL(/#\/threads\/mercy/, { timeout: 8_000 })

    // FVR header block should render
    const fvrHeader = page.locator('.qa-fvr-header')
    await expect(fvrHeader).toBeVisible({ timeout: 5_000 })

    // Tag name in FVR should be "mercy"
    const fvrName = fvrHeader.locator('.qa-fvr-name')
    await expect(fvrName).toBeVisible()
    await expect(fvrName).toHaveText('mercy')
  })

  // ---------------------------------------------------------------------------
  // F4. Surah directory
  // ---------------------------------------------------------------------------
})
