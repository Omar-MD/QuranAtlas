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
 *   src/configure/about/index.js
 *   src/configure/about/pwa-install.js
 *   src/navigate/shortcuts-sheet.js
 */

import { test, expect } from '@playwright/test'
import { waitForReader, openMoreSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

test.describe('Journey G: About', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForReader(page)
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // ---------------------------------------------------------------------------
  // G1. Open About — happy path + structure check
  // ---------------------------------------------------------------------------

  test('G1: drawer → About → renders all required sections', async ({ page }) => {
    // Post-2026-04-25 drawer overhaul: header wordmark + ⓘ icon = sole About entry.
    await openMoreSheet(page)  // shim → openNavDrawer
    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible()

    await drawer.locator('.qa-nav-drawer-wordmark').click()
    await expect(page).toHaveURL(/#\/about/, { timeout: 8_000 })

    // Wordmark / page heading
    const heading = page.locator('.qa-about-heading')
    await expect(heading).toBeVisible({ timeout: 5_000 })
    await expect(heading).toHaveText('QuranAtlas')

    // 54:17 blessing section
    const blessingWrap = page.locator('.qa-about-blessing-wrap')
    await expect(blessingWrap).toBeVisible()

    // Reader-first About no longer exposes removed-scope marks/tags stats.
    await expect(page.locator('.qa-about-stat-grid')).toHaveCount(0)
    await expect(page.getByText('Marks')).toHaveCount(0)
    await expect(page.getByText('Tags')).toHaveCount(0)

    // Attribution list visible
    const attrList = page.locator('.qa-about-attr-list')
    await expect(attrList).toBeVisible()
    await expect(attrList).toContainText('Qalun riwayat')
    await expect(attrList).not.toContainText('Qaloon')
    const attrItems = attrList.locator('li')
    const attrCount = await attrItems.count()
    expect(attrCount).toBeGreaterThanOrEqual(1)

    // Version line visible
    const versionLine = page.locator('.qa-about-version-line')
    await expect(versionLine).toBeVisible()
    const vText = await versionLine.textContent()
    expect(vText).toMatch(/^v/)
  })

  test('G: hamburger drawer opens with the Read rail and wordmark→About @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'drawer hamburger is mobile-only; desktop ambient dock has its own kebab')

    const hamburger = page.locator('.qa-mh-hamburger')
    await expect(hamburger).toBeVisible({ timeout: 5_000 })
    await hamburger.click()

    const drawer = page.locator('.qa-nav-drawer')
    await expect(drawer).toBeVisible({ timeout: 3_000 })

    // Single reader-first mode rail: Read only.
    await expect(drawer.locator('.qa-nav-drawer-tab', { hasText: 'Read' })).toBeVisible()
    await expect(drawer.locator('.qa-nav-drawer-tab', { hasText: 'Study' })).toHaveCount(0)
    // Read mode exposes Surah, Juz, and Bookmarks as peer source tabs.
    await expect(drawer.getByTestId('read-source-surah')).toBeVisible()
    await expect(drawer.getByTestId('read-source-juz')).toBeVisible()
    await expect(drawer.getByTestId('read-source-bookmarks')).toBeVisible()
    await expect(drawer.getByTestId('read-source-surah')).toHaveAttribute('aria-selected', 'true')

    // Wordmark with ⓘ icon = About entry
    await expect(drawer.locator('.qa-nav-drawer-wordmark')).toBeVisible()

    await drawer.locator('.qa-nav-drawer-wordmark').click()
    await expect(page).toHaveURL(/#\/about/, { timeout: 5_000 })
    await expect(drawer).not.toBeVisible({ timeout: 3_000 })
  })

  test('G: drawer dismisses via ✕ close button @mobile', async ({ page }) => {
    // Post 2026-04-25: drawer is full-screen on mobile (z:100), occluding the
    // MarginHeader hamburger (z:95). Toggle-by-second-tap is gone; the in-drawer
    // ✕ button (and backdrop, swipe-left, Esc) are the dismissal paths.
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'drawer hamburger is mobile-only')

    const hamburger = page.locator('.qa-mh-hamburger')
    const drawer = page.locator('.qa-nav-drawer')

    await hamburger.click()
    await expect(drawer).toBeVisible({ timeout: 3_000 })

    await page.locator('.qa-nav-drawer-close').click()
    await expect(drawer).not.toBeVisible({ timeout: 3_000 })
  })

  test('G: About footer shows version + commit SHA', async ({ page }) => {
    await page.goto('/#/about')
    const version = page.getByTestId('about-version')
    await expect(version).toBeVisible({ timeout: 5_000 })
    const text = await version.innerText()
    // Format: "v<semver> · <sha>" — sha is short (>=3 hex chars) or "dev" / "test".
    expect(text).toMatch(/^v\d+\.\d+\.\d+\s+·\s+([a-f0-9]{3,}|dev|test)$/i)
  })

  test('G: hamburger from About opens drawer with current-surah hydrated @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'header hamburger is mobile chrome only')

    // 1. Read surah 67 to set the reader rune.
    await page.goto('/#/s/67')
    await expect(page.locator('.qa-verse').first()).toBeVisible({ timeout: 5_000 })

    // 2. Visit About — center-label tap is no-op post 2026-04-25; surah-resume
    //    happens via the drawer instead.
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })

    // 3. Open drawer + tap the row for surah 67 → resume reading.
    await page.locator('.qa-mh-hamburger').click()
    await expect(page.locator('.qa-nav-drawer')).toBeVisible({ timeout: 3_000 })
    await page.locator('.qa-nav-drawer-surah-row[data-surah="67"]').click()
    await expect(page).toHaveURL(/#\/s\/67/, { timeout: 3_000 })
  })

  test('G: drawer current-surah highlight survives navigating to About and back @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'drawer hamburger is mobile chrome only')

    // 1. Read surah 67 — populates settings.currentPosition in IDB.
    await page.goto('/#/s/67')
    await expect(page.locator('.qa-verse').first()).toBeVisible({ timeout: 5_000 })

    // 2. Navigate to About without going through the drawer first. This
    //    unmounts Reader and nulls reader.currentSurahNum, leaving the
    //    persisted settings.currentPosition as the only surviving signal of
    //    "where the user is reading". Mirrors the user-reported repro: open
    //    drawer from About → highlight gone.
    await page.goto('/#/about')
    await expect(page.locator('.qa-about-heading')).toBeVisible({ timeout: 5_000 })

    // 3. Open drawer — current-surah row must carry the --current class
    //    *immediately*. Tight 400ms timeout: with the fix the class is
    //    present on first paint via settings.currentPosition fallback.
    //    Without it, reader.currentSurahNum is null until session-restore
    //    eventually re-mounts Reader (~600-1000ms), which is long enough
    //    to be perceived as a missing highlight.
    await page.locator('.qa-mh-hamburger').click()
    await expect(page.locator('.qa-nav-drawer')).toBeVisible({ timeout: 3_000 })
    const row67 = page.locator('.qa-nav-drawer-surah-row[data-surah="67"]')
    await expect(row67).toHaveClass(/qa-nav-drawer-surah-row--current/, { timeout: 400 })
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
    await page.locator('.qa-nav-drawer-wordmark').click()
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
    // storageState already provides onboarded state — no clearAllData
    // needed (would race with parallel workers under dev-server load).
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

    // Sheet has correct ARIA role and label (src/navigate/shortcuts-sheet.js)
    await expect(shortcutsSheet).toHaveAttribute('role', 'dialog')
    await expect(shortcutsSheet).toHaveAttribute('aria-label', 'Keyboard shortcuts')

    // Title row
    const titleEl = shortcutsSheet.locator('.qa-sheet-title')
    await expect(titleEl).toHaveText('Keyboard shortcuts')

    // Step 2: verify 3 section groups are present (Universal · Go to · Reader)
    const groups = shortcutsSheet.locator('.qa-sc-group')
    await expect(groups).toHaveCount(3)

    const groupTitles = shortcutsSheet.locator('.qa-sc-group-title')
    await expect(groupTitles.nth(0)).toHaveText('Universal')
    await expect(groupTitles.nth(1)).toHaveText('Go to')
    await expect(groupTitles.nth(2)).toHaveText('Reader')

    // Step 3: close via Esc → sheet is removed from DOM
    await page.keyboard.press('Escape')
    await expect(shortcutsSheet).not.toBeAttached({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey G — desktop variants (≥1180px viewport)
//
// About page: no legacy stats grid, 2-col body split.
// ---------------------------------------------------------------------------

test.describe('Journey G: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // Boot directly at /#/about — skips the /#/s/1 reader mount we would
  // immediately discard.  storageState already provides onboarded state.
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/about')
  })

  test('G1 desktop: removed-scope stats stay absent; body still splits into 2 columns', async ({ page }) => {
    await expect(page.locator('.qa-about-stat-grid')).toHaveCount(0)
    await expect(page.locator('.qa-about-body-split')).toHaveCount(1)
  })
})
