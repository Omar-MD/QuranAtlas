/**
 * E2E Journey B: Reader & ambient chrome
 *
 * Covers:
 *   B1. Primary-nav chrome visible on reader (desktop rail / mobile header)
 *   B2. Scroll hides mobile header; scroll near top reveals it (desktop: rail always visible)
 *   B3. Tap verse number → edge indicators appear on both sides
 *   B4. Non-reader routes keep primary nav visible
 *   B5. Font slider live preview
 *   B6. Auto theme follows OS (prefers-color-scheme emulation)
 *   A11y. Axe-core scan of reader surface
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §B
 *   src/navigate/AmbientDock.svelte   (desktop left rail, always visible)
 *   src/navigate/MarginHeader.svelte  (mobile top header, auto-hide on scroll-down)
 *   src/read/EdgeIndicator.svelte
 *   src/configure/Panel.svelte
 *   src/configure/theme.ts
 *   src/configure/font-size.ts
 */

import { test, expect } from '@playwright/test'
import { waitForReader, surfaceDock, openSettingsSheet } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Reuse the onboarded snapshot captured by `tests/e2e/global-setup.ts`.
// Reuse the onboarded snapshot to skip per-test cold-boot setup.
test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })

test.describe('Journey B: Reader & ambient chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/s/1')
    await waitForReader(page)
  })

  // -------------------------------------------------------------------------
  // B1. Primary-nav chrome visible on reader
  // -------------------------------------------------------------------------

  test('B1: primary-nav chrome is visible on reader surface @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)

    if (isDesktop) {
      // Desktop: left rail always visible, no auto-fade
      const rail = page.locator('#bottom-nav .qa-rail-top')
      await expect(rail).toBeVisible()
      const readTab = page.locator('.qa-rail-item[data-tab="read"]')
      await expect(readTab).toBeVisible()
      // Read tab should be active on a reader route
      await expect(readTab).toHaveClass(/qa-rail-item--active/)
    } else {
      // Mobile: MarginHeader single-row layout (2026-04-25 redesign)
      const header = page.locator('header.qa-mh')
      await expect(header).toBeVisible()
      await expect(header).not.toHaveClass(/qa-mh--hidden/)
      await expect(page.locator('.qa-mh-hamburger')).toBeVisible()
      await expect(page.locator('.qa-mh-label')).toBeVisible()
      await expect(page.locator('.qa-mh-settings')).toBeVisible()
    }
  })

  test('B1: mobile margin header is a single row, ≤ 60 px tall (post-redesign) @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    test.skip(isDesktop, 'desktop uses ambient rail, not margin header')

    const header = page.locator('header.qa-mh')
    await expect(header).toBeVisible()

    // Row 2 tabs gone, fast-tag dot gone, old kebab gone
    await expect(page.locator('.qa-mh-tabs')).toHaveCount(0)
    await expect(page.locator('.qa-mh-tag')).toHaveCount(0)
    await expect(page.locator('.qa-mh-icon[data-tab="more"]')).toHaveCount(0)

    const height = await header.evaluate(el => el.getBoundingClientRect().height)
    expect(height).toBeLessThanOrEqual(60)
    expect(height).toBeGreaterThan(40)
  })

  // -------------------------------------------------------------------------
  // B1. @reduced-motion variant — chrome still reaches steady state
  // -------------------------------------------------------------------------

  test('B1: primary nav visible under @reduced-motion @mobile', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await surfaceDock(page)
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    if (isDesktop) {
      await expect(page.locator('[data-tab="more"]:visible').first()).toBeVisible()
    } else {
      await expect(page.locator('.qa-mh-hamburger')).toBeVisible()
    }
  })

  // -------------------------------------------------------------------------
  // B1. @keyboard variant — primary-nav chrome is keyboard-reachable
  // -------------------------------------------------------------------------

  test('B1: primary-nav is keyboard-focusable @keyboard @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    if (isDesktop) {
      const moreBtn = page.locator('[data-tab="more"]:visible').first()
      await expect(moreBtn).toBeVisible()
      let focused = false
      for (let i = 0; i < 20 && !focused; i++) {
        await page.keyboard.press('Tab')
        focused = await page.evaluate(() => {
          const el = document.activeElement
          return !!el && el.matches('[data-tab="more"]')
        })
      }
      expect(focused).toBe(true)
    } else {
      const hamburger = page.locator('.qa-mh-hamburger')
      await expect(hamburger).toBeVisible()
      let focused = false
      for (let i = 0; i < 20 && !focused; i++) {
        await page.keyboard.press('Tab')
        focused = await page.evaluate(() => {
          const el = document.activeElement
          return !!el && el.classList.contains('qa-mh-hamburger')
        })
      }
      expect(focused).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // B2. Scroll behavior
  //   Desktop: rail is always visible regardless of scroll
  //   Mobile:  MarginHeader auto-hides on scroll-down, reveals near top
  // -------------------------------------------------------------------------

  test('B2: scroll behavior matches viewport (rail always / header auto-hide) @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)

    if (isDesktop) {
      const rail = page.locator('#bottom-nav .qa-rail-top')
      await expect(rail).toBeVisible()
      // Scroll far down
      await page.evaluate(() => {
        const el = document.getElementById('main-content')
        if (el) { el.scrollTo(0, 1200); el.dispatchEvent(new Event('scroll')) }
      })
      // Rail still visible
      await expect(rail).toBeVisible()
    } else {
      const header = page.locator('header.qa-mh')
      await expect(header).not.toHaveClass(/qa-mh--hidden/)

      // Scroll down past HIDE_DELTA threshold
      await page.evaluate(() => {
        const el = document.getElementById('main-content')
        if (el) { el.scrollTo(0, 500); el.dispatchEvent(new Event('scroll')) }
      })
      await expect(header).toHaveClass(/qa-mh--hidden/, { timeout: 3_000 })

      // Scroll back near the top
      await page.evaluate(() => {
        const el = document.getElementById('main-content')
        if (el) { el.scrollTo(0, 0); el.dispatchEvent(new Event('scroll')) }
      })
      await expect(header).not.toHaveClass(/qa-mh--hidden/, { timeout: 3_000 })
    }
  })

  // -------------------------------------------------------------------------
  // B3. Tap verse number for edge indicator
  // -------------------------------------------------------------------------

  test('B3: tap verse number shows edge indicators on both sides', async ({ page }) => {
    const verseNumber = page.locator('.qa-verse-number').first()
    await expect(verseNumber).toBeVisible({ timeout: 5_000 })
    await verseNumber.click()

    await expect(page.locator('.qa-edge-indicator--left')).toHaveClass(
      /qa-edge-indicator--visible/,
      { timeout: 3_000 }
    )
    await expect(page.locator('.qa-edge-indicator--right')).toHaveClass(
      /qa-edge-indicator--visible/,
      { timeout: 3_000 }
    )
  })

  test('B3: verse meaning and theme stay collapsed until the verse is opened', async ({ page }) => {
    await page.goto('/#/s/2/255')
    await waitForReader(page)

    const verse = page.locator('.qa-verse[data-token-key="2:255"]')
    await expect(verse).toBeVisible({ timeout: 5_000 })

    await expect(verse.locator('.qa-verse-translation')).toHaveCount(0)
    await expect(verse.locator('.qa-verse-knowledge')).toHaveCount(0)

    await verse.locator('.qa-verse-body-summary').click()

    await expect(verse.locator('.qa-verse-translation')).toHaveText(/.+/)
    await expect(verse.locator('.qa-verse-themes')).toContainText('tawhid')
    await expect(verse.locator('.qa-verse-context')).toContainText(
      "Allah's oneness, authority, and all-encompassing knowledge"
    )
  })

  // -------------------------------------------------------------------------
  // B4. Non-reader routes keep primary nav visible
  // -------------------------------------------------------------------------

  test('B4: non-reader routes keep primary nav visible @mobile', async ({ page }) => {
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    for (const route of ['#/surahs', '#/review', '#/about']) {
      await page.goto(`/${route}`)
      if (isDesktop) {
        const moreBtn = page.locator('[data-tab="more"]:visible').first()
        await expect(moreBtn).toBeVisible({ timeout: 5_000 })
      } else {
        await expect(page.locator('.qa-mh-hamburger')).toBeVisible({ timeout: 5_000 })
      }
    }
  })

  // -------------------------------------------------------------------------
  // B5. Font slider live preview
  // -------------------------------------------------------------------------

  // B5 font slider → IDB + data-font-size ported to
  // tests/unit/configure/panel.test.ts (Phase 3, 2026-04-26).

  // -------------------------------------------------------------------------
  // B6. Auto theme follows OS (prefers-color-scheme)
  // -------------------------------------------------------------------------

  test('B6: auto theme swatch follows OS color-scheme change', async ({ page }) => {
    await openSettingsSheet(page)

    const autoSwatch = page.locator('.qa-settings-tf-dot--auto')
    await expect(autoSwatch).toBeVisible()
    await autoSwatch.click()
    await expect(autoSwatch).toHaveClass(/qa-settings-tf-dot--act/, { timeout: 3_000 })

    await expect(async () => {
      const pref = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme-pref')
      )
      expect(pref).toBe('auto')
    }).toPass({ timeout: 3_000 })

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(async () => {
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(theme).toBe('dark')
    }).toPass({ timeout: 3_000 })

    await page.emulateMedia({ colorScheme: 'light' })
    await expect(async () => {
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(theme).toBe('light')
    }).toPass({ timeout: 3_000 })
  })

  // -------------------------------------------------------------------------
  // B7. Scroll position survives warm-resume (iOS lock/unlock regression)
  //
  // Repro of 2026-04 bug: user deep in a surah, screen locks, screen unlocks
  // → reader snaps back to verse 1.  Root cause was the `DB_VISIBILITY_VISIBLE`
  // handler unconditionally scroll-restoring from IDB (which could be stale
  // mid hide-time save) even when the browser had already preserved scroll.
  // -------------------------------------------------------------------------

  test('B7: warm-resume (visibilitychange hidden→visible) preserves scroll position', async ({ page }) => {
    await page.goto('/#/s/2')
    await waitForReader(page)

    // Scroll deep into the surah and let the debounce settle so the tracker
    // has a non-null `lastTrackedVerse`.
    await page.evaluate(() => {
      const el = document.getElementById('main-content')
      if (el) { el.scrollTo(0, 6000); el.dispatchEvent(new Event('scroll')) }
    })
    // Poll until the scroll-tracker debounce fires and writes the deep
    // position to IDB, signalling lastTrackedVerse is populated.
    await expect.poll(async () => page.evaluate(() => new Promise((resolve) => {
      const open = indexedDB.open('quran-atlas')
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('settings', 'readonly')
        const req = tx.objectStore('settings').get('currentPosition')
        req.onsuccess = () => { resolve(req.result?.value?.verse ?? 0); db.close() }
        req.onerror = () => { resolve(0); db.close() }
      }
      open.onerror = () => resolve(0)
    })), { timeout: 5_000 }).toBeGreaterThan(1)

    const before = await page.evaluate(() => {
      const el = document.getElementById('main-content')
      return el?.scrollTop ?? 0
    })
    expect(before).toBeGreaterThan(1000)

    // Simulate iOS lock (hidden).  Playwright cannot flip `document.hidden`
    // natively, so override the getters and fire `visibilitychange` manually.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Simulate the race that made the original bug observable: IDB holds a
    // STALE early verse (e.g. a prior write that the hide-time save never
    // replaced before the tab was suspended) while the browser has
    // preserved scroll. Write the global currentPosition record AFTER the
    // hide-time save has already run so persistOnExit doesn't overwrite
    // the stale value back.
    await page.evaluate(async () => {
      const dbReq = indexedDB.open('quran-atlas')
      await new Promise((resolve) => {
        dbReq.onsuccess = () => {
          const db = dbReq.result
          const tx = db.transaction('settings', 'readwrite')
          tx.objectStore('settings').put({ key: 'currentPosition', value: { surah: 2, verse: 1 } })
          tx.oncomplete = () => resolve(undefined)
          tx.onerror = () => resolve(undefined)
        }
        dbReq.onerror = () => resolve(undefined)
      })
    })

    // Unlock.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    // Scroll must not be reset toward the top (buggy warm-resume handler
    // would have called `scrollToVerse(1)` via stale IDB and driven scrollTop
    // back near 0). Poll over the warm-resume window — buggy code would
    // converge to ~0; correct code keeps scrollTop > 1000 throughout.
    await expect.poll(async () => page.evaluate(() => {
      const el = document.getElementById('main-content')
      return el?.scrollTop ?? 0
    }), { timeout: 2_500, intervals: [200, 400, 600, 800] }).toBeGreaterThan(1000)
  })

  // -------------------------------------------------------------------------
  // B-Cross: Cross-surah infinite scroll (2026-04-25)
  //
  // Reader is single-surah; scrolling past the end of N or top of N swaps
  // the mounted surah to N+1 / N-1 with wrap (114 ↔ 1). Continue links
  // provide an explicit affordance; overscroll triggers the same swap.
  // -------------------------------------------------------------------------

  test('B: a11y — no serious/critical axe violations on reader surface @a11y', async ({ page }) => {
    await surfaceDock(page)
    const violations = await scanA11y(page)
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // B-Riwayah. Riwayah rendering (KFGQPC rewire)
  //   Default is Qālūn — Maghrebi orthography with small alif before lam.
  //   Switching via Settings swatches re-renders with Ḥafṣ orthography.
  // -------------------------------------------------------------------------
})
