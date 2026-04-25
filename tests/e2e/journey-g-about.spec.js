/**
 * E2E Journey G: About page
 *
 * Covers:
 *   G1. Open About via dock More sheet → page renders all required sections
 *   G2. Install PWA (skipped — not testable in Playwright)
 *   G3. Shortcut cheatsheet (`?`) → sheet opens, 4 groups visible, Esc closes
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §G
 *   src/about/index.js
 *   src/about/pwa-install.js
 *   src/nav/shortcuts-sheet.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedMarks } from './fixtures/idb.js'
import { waitForReader, openMoreSheet } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey G: About', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    // Seed marks so the stat grid shows non-zero values
    await seedMarks(page, [
      { verseKey: '1:1', tags: ['mercy'], note: '' },
      { verseKey: '2:255', tags: ['mercy', 'faith'], note: '' },
    ])
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // ---------------------------------------------------------------------------
  // G1. Open About — happy path + structure check
  // ---------------------------------------------------------------------------

  test('G1: drawer → About → renders all required sections', async ({ page }) => {
    // Post-2026-04-25 redesign: dock/header → drawer → About link
    await openMoreSheet(page)  // shim → openNavDrawer
    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible()

    await drawer.locator('button', { hasText: 'About' }).click()
    await expect(page).toHaveURL(/#\/about/, { timeout: 8_000 })

    // Wordmark / page heading
    const heading = page.locator('.qa-about-heading')
    await expect(heading).toBeVisible({ timeout: 5_000 })
    await expect(heading).toHaveText('QuranAtlas')

    // 54:17 blessing section
    const blessingWrap = page.locator('.qa-about-blessing-wrap')
    await expect(blessingWrap).toBeVisible()

    // Stat grid — 4 cells present
    const statGrid = page.locator('.qa-about-stat-grid')
    await expect(statGrid).toBeVisible()

    const statCells = page.locator('.qa-about-stat-cell')
    await expect(statCells).toHaveCount(4)

    // Every cell has both a value and a label
    for (let i = 0; i < 4; i++) {
      const cell = statCells.nth(i)
      await expect(cell.locator('.qa-about-stat-value')).toBeVisible()
      await expect(cell.locator('.qa-about-stat-label')).toBeVisible()
    }

    // Stat labels match expected order: Marks, Tags, Surahs, % Qur'an
    const labels = page.locator('.qa-about-stat-label')
    await expect(labels.nth(0)).toHaveText('Marks')
    await expect(labels.nth(1)).toHaveText('Tags')
    await expect(labels.nth(2)).toHaveText('Surahs')
    await expect(labels.nth(3)).toContainText('%')

    // Seeded marks → stat values should be non-zero numerics
    const marksValue = page.locator('.qa-about-stat-value').nth(0)
    await expect(async () => {
      const text = await marksValue.textContent()
      expect(parseInt(text, 10)).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5_000 })

    // Attribution list visible
    const attrList = page.locator('.qa-about-attr-list')
    await expect(attrList).toBeVisible()
    const attrItems = attrList.locator('li')
    const attrCount = await attrItems.count()
    expect(attrCount).toBeGreaterThanOrEqual(1)

    // Version line visible
    const versionLine = page.locator('.qa-about-version-line')
    await expect(versionLine).toBeVisible()
    const vText = await versionLine.textContent()
    expect(vText).toMatch(/^v/)
  })

  test('G: hamburger drawer opens with Review and About items', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'drawer hamburger is mobile-only; desktop ambient dock has its own kebab')

    const hamburger = page.locator('.qa-mh-hamburger')
    await expect(hamburger).toBeVisible({ timeout: 5_000 })
    await hamburger.click()

    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible({ timeout: 3_000 })

    await expect(drawer.locator('button', { hasText: 'Review' })).toBeVisible()
    await expect(drawer.locator('button', { hasText: 'About' })).toBeVisible()

    await drawer.locator('button', { hasText: 'About' }).click()
    await expect(page).toHaveURL(/#\/about/, { timeout: 5_000 })
    await expect(drawer).not.toBeVisible({ timeout: 3_000 })
  })

  test('G: hamburger toggles the drawer (open → click again → close)', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'drawer hamburger is mobile-only')

    const hamburger = page.locator('.qa-mh-hamburger')
    const drawer = page.locator('.qa-nav-drawer')

    await hamburger.click()
    await expect(drawer).toBeVisible({ timeout: 3_000 })

    await hamburger.click()
    await expect(drawer).not.toBeVisible({ timeout: 3_000 })
  })

  test('G: tapping label on About after reading 67 resumes #/s/67 (not Fatihah)', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'header label is mobile chrome only')

    // 1. Read surah 67 to seed positions store.
    await page.goto('/#/s/67')
    await expect(page.locator('.qa-verse').first()).toBeVisible({ timeout: 5_000 })

    // 2. Cold-load About — currentSurahNum rune is null, label says "QuranAtlas".
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })

    // 3. Tap the label — must resume the most-recent surah, not reset to Fatihah.
    await page.locator('.qa-mh-label').click()
    await expect(page).toHaveURL(/#\/s\/67/, { timeout: 3_000 })
  })

  test('G: Clear data link is present on About page footer', async ({ page }) => {
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })
    const link = page.locator('.qa-about-clear-data')
    await expect(link).toBeVisible()
    await expect(link).toHaveText(/Clear all data/i)
  })

  test('G1: a11y — no serious/critical axe violations on About page @a11y', async ({ page }) => {
    await openMoreSheet(page)  // shim → openNavDrawer
    await page.locator('.qa-nav-drawer button', { hasText: 'About' }).click()
    await expect(page).toHaveURL(/#\/about/, { timeout: 8_000 })
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })

    const violations = await scanA11y(page, { include: ['#main-content'] })
    expect(violations).toEqual([])
  })

  // ---------------------------------------------------------------------------
  // G2. Install PWA — not testable in Playwright
  // ---------------------------------------------------------------------------

  test('G2: PWA install button triggers installation prompt', async ({ page }) => {
    // The initInstallListener in app-bootstrap listens for
    // `beforeinstallprompt` and stores the event as the deferred prompt.
    // Dispatch a synthetic event with the same shape after app boot but
    // BEFORE navigating to #/about — About.svelte reads getInstallPrompt()
    // at mount time to decide whether to render the Install button.
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.waitForFunction(() => typeof window.__qaSuppressNextVersionChange === 'function')

    await page.evaluate(() => {
      const ev = new Event('beforeinstallprompt', { cancelable: true })
      // BeforeInstallPromptEvent shape consumed by pwa-install.ts
      Object.assign(ev, {
        prompt: () => {},
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      })
      window.dispatchEvent(ev)
    })

    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 8_000 })

    const installBtn = page.locator('.qa-about-install-btn')
    await expect(installBtn).toBeVisible()
    await expect(installBtn).toHaveText('Install App')
    await expect(installBtn).toBeEnabled()

    await installBtn.click()

    await expect(installBtn).toHaveText('Installed!', { timeout: 3_000 })
    await expect(installBtn).toBeDisabled()
  })

  // ---------------------------------------------------------------------------
  // G3. Shortcut cheatsheet (`?`) — open, assert 4 groups, close via Esc
  // ---------------------------------------------------------------------------

  test('G3: press ? → keyboard shortcuts sheet opens and closes', async ({ page }) => {
    // The reader is already loaded from beforeEach (/#/s/1).
    // Ensure focus is on a non-text-input element so `?` fires the key handler.
    // Focus #main-content directly — a click at (50,50) on mobile is blocked by
    // the fixed MarginHeader at the top.
    await page.evaluate(() => document.getElementById('main-content')?.focus())

    // Step 1: press ? → shortcuts sheet opens
    await page.keyboard.press('?')

    const shortcutsSheet = page.locator('.qa-sheet--shortcuts')
    await expect(shortcutsSheet).toBeVisible({ timeout: 5_000 })

    // Sheet has correct ARIA role and label (src/nav/shortcuts-sheet.js)
    await expect(shortcutsSheet).toHaveAttribute('role', 'dialog')
    await expect(shortcutsSheet).toHaveAttribute('aria-label', 'Keyboard shortcuts')

    // Title row
    const titleEl = shortcutsSheet.locator('.qa-sheet-title')
    await expect(titleEl).toHaveText('Keyboard shortcuts')

    // Step 2: verify 4 section groups are present (Universal · Go to · Reader · Command sheet)
    const groups = shortcutsSheet.locator('.qa-sc-group')
    await expect(groups).toHaveCount(4)

    const groupTitles = shortcutsSheet.locator('.qa-sc-group-title')
    await expect(groupTitles.nth(0)).toHaveText('Universal')
    await expect(groupTitles.nth(1)).toHaveText('Go to')
    await expect(groupTitles.nth(2)).toHaveText('Reader')
    await expect(groupTitles.nth(3)).toHaveText('Command sheet')

    // Step 3: close via Esc → sheet is removed from DOM
    await page.keyboard.press('Escape')
    await expect(shortcutsSheet).not.toBeAttached({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey G — desktop variants (≥1180px viewport)
//
// About page: 4-across stat grid, 2-col body split.
// ---------------------------------------------------------------------------

test.describe('Journey G: desktop variants @desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // Boot directly at /#/about — skips the /#/s/1 reader mount we would
  // immediately discard.  about:blank breaks the current page context so the
  // next goto is a true HTTP load, which is required after clearAllData
  // wipes the IDB the app was using.
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
    await markOnboardingComplete(page)
    await page.goto('about:blank')
    await page.goto('/#/about')
  })

  test('G1 desktop: stats render 4-across; body splits into 2 columns', async ({ page }) => {
    await expect(page.locator('.qa-about-stat-grid')).toBeVisible()

    const statCols = await page.locator('.qa-about-stat-grid').evaluate(
      el => getComputedStyle(el).gridTemplateColumns
    )
    expect(statCols.split(' ').length).toBe(4)

    await expect(page.locator('.qa-about-body-split')).toHaveCount(1)
  })
})
