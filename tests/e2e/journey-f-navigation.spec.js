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
 *   src/nav/command-sheet.js
 *   src/surahs/list.js
 *   src/nav/ambient-pill.js
 *   src/nav/ambient-dock.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { waitForReader, surfaceDock, openCommandSheet } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey F: Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the app to finish its launch-restore navigation before touching IDB.
    // Without this, handleLaunchRestore may navigate (hash change) while a page.evaluate
    // is in-flight, causing "Execution context was destroyed" on the second IDB write.
    await page.waitForFunction(() => window.location.hash !== '', { timeout: 5_000 }).catch(() => {})
    await clearAllData(page)
    await markOnboardingComplete(page)
    // Seed a "mercy" mark so tag search in F3 returns results
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

    // Card should contain Arabic and English text
    const arText = page.locator('.qa-cmd-vcard-ar')
    const enText = page.locator('.qa-cmd-vcard-en')
    await expect(arText).toBeVisible()
    await expect(enText).toBeVisible()
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

  test('F4: Search entry → #/surahs renders 114 rows; search "67" → eyebrow + Al-Mulk row @desktop', async ({ page }) => {
    // Desktop exposes a Search tab in the left rail; the command sheet (⌘K)
    // is the canonical cross-viewport keyboard entry to reach "Browse all
    // surahs".  (Mobile MarginHeader crumb routes straight to `#/surahs`.)
    await openCommandSheet(page)
    const cmdSheet = page.locator('.qa-cmd-sheet')
    await expect(cmdSheet).toBeVisible({ timeout: 5_000 })

    // Close command sheet and navigate directly to surahs route
    // (The Search tab opens command sheet; "Browse all surahs" action is inside)
    // Navigate to surahs via command sheet "Browse all surahs"
    // Wait for empty-state "Browse all surahs" item in the Jump to group
    const browseItem = page.locator('.qa-cmd-item').filter({ hasText: 'Browse all surahs' })
    await expect(browseItem).toBeVisible({ timeout: 5_000 })
    await browseItem.click()

    // Surah list page should render
    const surahListPage = page.locator('.qa-surah-list-page')
    await expect(surahListPage).toBeVisible({ timeout: 8_000 })
    await expect(page).toHaveURL(/#\/surahs/)

    // 114 rows rendered
    const rows = page.locator('.qa-sl-row')
    await expect(rows.first()).toBeVisible({ timeout: 5_000 })
    const rowCount = await rows.count()
    expect(rowCount).toBe(114)

    // Search "67"
    const searchInput = page.locator('.qa-sl-search-input')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('67')

    // Eyebrow hint "Jumping to #67" appears
    const hint = page.locator('.qa-sl-hint')
    await expect(hint).not.toHaveClass(/qa-sl-hint--hidden/, { timeout: 3_000 })
    await expect(hint).toContainText('Jumping to #67')

    // Only 1 row remains (Al-Mulk)
    const filteredRows = page.locator('.qa-sl-row')
    await expect(filteredRows).toHaveCount(1, { timeout: 3_000 })
    const rowName = filteredRows.first().locator('.qa-sl-row-en')
    await expect(rowName).toHaveText('Al-Mulk')

    // Tap the row → navigates to #/s/67
    await filteredRows.first().click()
    await expect(page).toHaveURL(/#\/s\/67/, { timeout: 8_000 })
    await waitForReader(page)
  })

  test('F4: a11y — no serious/critical axe violations on surah list @a11y @desktop', async ({ page }) => {
    await page.goto('/#/surahs')
    await expect(page.locator('.qa-surah-list-page')).toBeVisible({ timeout: 8_000 })

    const violations = await scanA11y(page, { include: ['.qa-surah-list-page'] })
    expect(violations).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // F5. Continue-reading card
  // ---------------------------------------------------------------------------

  test('F5: after visiting #/s/67, surah list shows continue-reading card at top; tap navigates @desktop', async ({ page }) => {
    // Navigate to surah 67 so the reader writes a position record
    await page.goto('/#/s/67')
    await waitForReader(page)

    // Navigate to surah list
    await page.goto('/#/surahs')
    const surahListPage = page.locator('.qa-surah-list-page')
    await expect(surahListPage).toBeVisible({ timeout: 8_000 })

    // Continue-reading card should appear at top of list (All filter, no query)
    const continueCard = page.locator('.qa-sl-continue')
    await expect(continueCard).toBeVisible({ timeout: 5_000 })

    // Card should show a reference mentioning surah 67
    const continueRef = page.locator('.qa-sl-continue-ref')
    await expect(continueRef).toBeVisible()
    await expect(continueRef).toContainText('Al-Mulk')

    // Tap the card → navigates to surah 67
    await continueCard.click()
    await expect(page).toHaveURL(/#\/s\/67/, { timeout: 8_000 })
    await waitForReader(page)
  })

  test('F5: continue-reading card is hidden when search query is active @desktop', async ({ page }) => {
    // Navigate to surah 67 to set the last position
    await page.goto('/#/s/67')
    await waitForReader(page)

    await page.goto('/#/surahs')
    await expect(page.locator('.qa-surah-list-page')).toBeVisible({ timeout: 8_000 })

    // Card visible with no query
    await expect(page.locator('.qa-sl-continue')).toBeVisible({ timeout: 5_000 })

    // Type a search query → card should disappear
    const searchInput = page.locator('.qa-sl-search-input')
    await searchInput.fill('Al-Fatiha')

    await expect(page.locator('.qa-sl-continue')).toHaveCount(0, { timeout: 3_000 })
  })

  // ---------------------------------------------------------------------------
  // F6. Keyboard navigation @keyboard
  // ---------------------------------------------------------------------------

  test('F6: ⌘K opens command sheet @keyboard', async ({ page }) => {
    // The canonical keyboard entry for the command sheet is ⌘K (Meta+k on
    // Mac, Ctrl+k elsewhere — Playwright aliases Meta→Ctrl on non-Mac).
    await page.keyboard.press('Meta+k')
    const cmdSheet = page.locator('.qa-cmd-sheet')
    await expect(cmdSheet).toBeVisible({ timeout: 5_000 })
    await expect(cmdSheet).not.toHaveClass(/qa-cmd--hidden/)
  })

  test('F6: command sheet — ArrowUp/ArrowDown move focus; Escape closes @keyboard', async ({ page }) => {
    await openCommandSheet(page)

    const cmdSheet = page.locator('.qa-cmd-sheet')
    await expect(cmdSheet).toBeVisible()

    // Type to get results with multiple items
    await page.locator('.qa-cmd-input').fill('2:255')
    await expect(page.locator('.qa-cmd-vcard')).toBeVisible({ timeout: 5_000 })

    // First item should be active ("Open verse")
    const firstActive = page.locator('.qa-cmd--active')
    await expect(firstActive.locator('.qa-cmd-item-label')).toHaveText('Open verse')

    // ArrowDown → "Mark this verse" becomes active
    await page.keyboard.press('ArrowDown')
    const secondActive = page.locator('.qa-cmd--active')
    await expect(secondActive.locator('.qa-cmd-item-label')).toHaveText('Mark this verse')

    // ArrowDown again → "Copy reference"
    await page.keyboard.press('ArrowDown')
    const thirdActive = page.locator('.qa-cmd--active')
    await expect(thirdActive.locator('.qa-cmd-item-label')).toHaveText('Copy reference')

    // ArrowUp → back to "Mark this verse"
    await page.keyboard.press('ArrowUp')
    const backToSecond = page.locator('.qa-cmd--active')
    await expect(backToSecond.locator('.qa-cmd-item-label')).toHaveText('Mark this verse')

    // Escape closes the sheet
    await page.keyboard.press('Escape')
    await expect(cmdSheet).toHaveClass(/qa-cmd--hidden/, { timeout: 3_000 })
  })

  test('F6: global shortcut G then S → navigates to #/surahs @keyboard @desktop', async ({ page }) => {
    // Ensure focus is not on an input (reader is loaded, no input focused)
    await expect(page.locator('.qa-verse').first()).toBeVisible()

    // Press g then s (chord shortcut for surah list)
    await page.keyboard.press('g')
    await page.keyboard.press('s')

    // Should navigate to surah list
    await expect(page).toHaveURL(/#\/surahs/, { timeout: 5_000 })
    await expect(page.locator('.qa-surah-list-page')).toBeVisible({ timeout: 8_000 })
  })

  test('F6: ⌘K closes already-open command sheet @keyboard', async ({ page }) => {
    // Open command sheet
    await openCommandSheet(page)
    const cmdSheet = page.locator('.qa-cmd-sheet')
    await expect(cmdSheet).toBeVisible()
    await expect(cmdSheet).not.toHaveClass(/qa-cmd--hidden/)

    // Press ⌘K again → should close
    await page.keyboard.press('Meta+k')
    await expect(cmdSheet).toHaveClass(/qa-cmd--hidden/, { timeout: 3_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey F — desktop variants (≥1180px viewport)
//
// The surah directory renders as a 2-column grid at desktop.
// ---------------------------------------------------------------------------

test.describe('Journey F: desktop variants @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // Boot directly at /#/surahs — skips the reader-mount dataset fetch we
  // would immediately discard.  about:blank breaks the current page context
  // so the next goto triggers a true HTTP load (not a hash-only change),
  // which is required after clearAllData wipes the IDB the app was using.
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('about:blank')
    await page.goto('/#/surahs')
  })

  test('F4 desktop: surah list renders as 2-col grid', async ({ page }) => {
    await expect(page.locator('.qa-sl-list .qa-sl-row').first()).toBeVisible({ timeout: 20_000 })

    const cols = await page.locator('.qa-sl-list').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    // At 1440px the CSS applies grid-template-columns: repeat(2, minmax(0, 1fr))
    expect(cols.split(' ').length).toBe(2)

    // Two consecutive rows share the same top offset (same grid row)
    const rowTops = await page.locator('.qa-sl-row').evaluateAll(rows => [
      rows[0].getBoundingClientRect().top,
      rows[1].getBoundingClientRect().top,
    ])
    expect(Math.abs(rowTops[0] - rowTops[1])).toBeLessThan(2)
  })
})

// ---------------------------------------------------------------------------
// Journey F — mobile drawer (post 2026-04-25 redesign)
//
// Hamburger opens a full-screen drawer with two tabs (Surahs / Review).
// Surahs tab carries everything the desktop #/surahs page provides; Review
// tab carries Hub + 12 grouped layer rows. Wordmark in header → About.
// Mobile #/surahs deep-links hard-redirect to drawer-open.
// ---------------------------------------------------------------------------

test.describe('Journey F: mobile drawer', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // MarginHeader hamburger is hidden on viewports ≥1180px (desktop runs the
    // AmbientDock kebab path instead, covered separately). Skip cleanly so
    // these tests run only on Mobile Chrome / mobile-sized projects.
    const vp = testInfo.project.use.viewport
    if (vp && vp.width >= 1180) { testInfo.skip(true, 'mobile-only suite') }

    await page.goto('/')
    await page.waitForFunction(() => window.location.hash !== '', { timeout: 5_000 }).catch(() => {})
    await clearAllData(page)
    await markOnboardingComplete(page)
  })

  test('F-mobile-1: hamburger opens drawer with Surahs tab default and current-surah highlighted', async ({ page }) => {
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible()

    // Surahs tab is on by default
    await expect(page.locator('.qa-nav-drawer-tab--on')).toHaveText(/Surahs/i)

    // Current surah (18 — Al-Kahf) is highlighted
    const currentRow = page.locator('.qa-nav-drawer-surah-row--current')
    await expect(currentRow).toHaveAttribute('data-surah', '18')

    // Wordmark is a button (About entry)
    await expect(page.locator('.qa-nav-drawer-wordmark')).toBeVisible()
  })

  test('F-mobile-2: switch to Review tab → Hub row + 12 layer rows', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-tab', { hasText: 'Review' }).click()

    await expect(page.locator('.qa-nav-drawer-hub-row')).toBeVisible()
    const layerRows = page.locator('.qa-nav-drawer-layer-row')
    await expect(layerRows).toHaveCount(12)

    // Tap "people" row → routes to #/review?layer=people
    await page.locator('.qa-nav-drawer-layer-row[data-layer="people"]').click()
    await expect(page).toHaveURL(/#\/review\?layer=people$/)
  })

  test('F-mobile-3: wordmark in drawer routes to #/about', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-wordmark').click()
    await expect(page).toHaveURL(/#\/about$/)
  })

  test('F-mobile-4: typing #/surahs on mobile redirects + opens drawer', async ({ page }) => {
    await page.goto('/#/s/18')
    await waitForReader(page)

    await page.evaluate(() => { window.location.hash = '#/surahs' })
    await expect(page.locator('.qa-nav-drawer')).toBeVisible({ timeout: 4_000 })
    // Hash should be replaced (not on #/surahs)
    await page.waitForFunction(() => !window.location.hash.startsWith('#/surahs'), { timeout: 4_000 })
  })

  test('F-mobile-5: center label tap is a no-op', async ({ page }) => {
    await page.goto('/#/s/2')
    await waitForReader(page)

    const before = page.url()
    await page.locator('.qa-mh-label').click({ position: { x: 50, y: 10 } }).catch(() => {})
    expect(page.url()).toBe(before)
    await expect(page.locator('.qa-nav-drawer')).not.toBeVisible()
  })

  test('F-mobile-6: search filters in-drawer surah list', async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    const search = page.locator('.qa-nav-drawer-search-input')
    await search.fill('mulk')

    const rows = page.locator('.qa-nav-drawer-surah-row')
    await expect(rows.filter({ hasText: 'Al-Mulk' })).toHaveCount(1)
  })

  test('F-mobile-7: Bookmarked filter narrows list to bookmarked surahs', async ({ page }) => {
    await seedMarks(page, [{ verseKey: '67:1', tags: ['mercy'], note: '' }])
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-pill', { hasText: 'Bookmarked' }).click()
    const rows = page.locator('.qa-nav-drawer-surah-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Al-Mulk')
  })

  test('F-mobile-8: typing 2:255 does NOT auto-navigate; Enter commits the jump', async ({ page }) => {
    // Regression: drawer search used to call NAVIGATION_NAVIGATE on every
    // input event whenever the buffer matched /^\d+:\d+$/, so the partial
    // "2:2" of someone typing "2:255" fired immediately and landed the user
    // at 2:2. Fix: navigate only on Enter / row tap.
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    const search = page.locator('.qa-nav-drawer-search-input')
    await search.pressSequentially('2:255', { delay: 30 })

    // Drawer should still be open; URL still on /#/s/1.
    await expect(page.locator('.qa-nav-drawer')).toBeVisible()
    await expect(page).toHaveURL(/#\/s\/1/)

    // Hint should explicitly mention pressing Enter for the verse jump.
    await expect(page.locator('.qa-nav-drawer-search-hint')).toContainText(/Enter/)
    // Visible row is the candidate surah only.
    const rows = page.locator('.qa-nav-drawer-surah-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toHaveAttribute('data-surah', '2')

    // Enter commits the jump → navigate to #/s/2/255.
    await search.press('Enter')
    await expect(page).toHaveURL(/#\/s\/2\/255/, { timeout: 3_000 })
  })

  test('F-mobile-9: number 255 lists only surahs with at least 255 verses', async ({ page }) => {
    // Regression: typing a number out of the surah-index range (115–286) used
    // to leave the list unfiltered (full 114-row directory). Now those values
    // filter the list to surahs whose verseCount meets the threshold — only
    // Al-Baqarah (286) for 255.
    await page.goto('/#/s/1')
    await waitForReader(page)

    await page.locator('.qa-mh-hamburger').click()
    await page.locator('.qa-nav-drawer-search-input').fill('255')

    const rows = page.locator('.qa-nav-drawer-surah-row')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toHaveAttribute('data-surah', '2')
    await expect(page.locator('.qa-nav-drawer-search-hint')).toContainText(/255 verses/)
  })
})
