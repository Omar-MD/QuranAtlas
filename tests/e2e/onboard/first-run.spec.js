/**
 * E2E Journey A: First run & session restore
 *
 * Covers:
 *   A1. First-run onboarding → Al-Fatihah (happy path, skip alt, browse-all-surahs alt,
 *       a11y scan, keyboard-only)
 *   A2. Reload stays on the last surface
 *
 * Sources of truth:
 *   docs/context/user-journeys.md  §A
 *   src/onboard/index.js
 *   src/onboard/screens.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete, seedLastSurface, readSetting } from '../fixtures/idb.js'
import { waitForReader } from '../fixtures/chrome.js'
import { scanA11y } from '../fixtures/a11y.js'

// Onboarding flow tests must boot with no `onboardingComplete` flag.
// Opt OUT of the onboarded snapshot every other journey spec uses.
test.use({ storageState: { cookies: [], origins: [] } })

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Advance from screen 1 (Welcome) through screen 2 (Theme) to screen 3 (Riwayah).
 * Picks "Dark" theme on screen 2 as a concrete test value.
 * Onboarding is now 6 screens: Welcome → Theme → Riwayah → Translation → Shortcuts → Tags.
 */
async function advanceToScreen3(page) {
  // Screen 1 → tap Begin
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 2 (Theme) — pick Dark swatch then Continue
  await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })
  await page.locator('.qa-onb-sw--dark').click()
  await expect(page.locator('.qa-onb-sw--dark')).toHaveClass(/qa-onb-sw--on/)
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 3 (Riwayah) should now be visible
  await expect(page.locator('.qa-onb-rlist')).toBeVisible({ timeout: 8_000 })
}

/**
 * Advance from screen 3 (Riwayah) through screen 4 (Translation), screen 5 (Shortcuts)
 * to screen 6 (Tags intro). No translations ship today so the translation list is empty;
 * Continue still advances. Ends on the Tags intro screen (.qa-onb-vpreview).
 */
async function advanceToScreen4(page) {
  // Screen 3 (Riwayah) — Qālūn is default-selected; just Continue
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 4 (Translation) — list may be empty (no translations ship today);
  // wait for Riwayah screen to leave, then just Continue
  await expect(page.locator('.qa-onb-rlist')).not.toBeVisible({ timeout: 8_000 })
  await expect(page.locator('.qa-onb-tlist')).toBeAttached({ timeout: 8_000 })
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 5 (Shortcuts)
  await expect(page.locator('.qa-onb-shortcuts')).toBeVisible({ timeout: 8_000 })

  // Continue → Screen 6 (Tags intro)
  await page.locator('.qa-onb-cta--primary').click()
  await expect(page.locator('.qa-onb-vpreview')).toBeVisible({ timeout: 8_000 })
}

// ---------------------------------------------------------------------------
// Journey A1 — Happy path
// ---------------------------------------------------------------------------

test.describe('Journey A: First run & session restore', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
  })

  // -------------------------------------------------------------------------
  // A1.1 Happy path — all 6 steps
  // -------------------------------------------------------------------------
  test('A1: first-run onboarding → Al-Fatihah (happy path)', async ({ page }) => {
    // Step 1: Boot with clean IDB → routes to #/onboarding
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    // Step 2: Screen 1 (Welcome) — structural checks
    const screen1 = page.locator('.qa-onb-page')
    await expect(screen1).toBeVisible()

    // Progress dot 1 is active; no Skip button on screen 1
    const dots = page.locator('.qa-onb-dots')
    await expect(dots).toBeVisible()
    const activeDots = page.locator('.qa-onb-dot--on')
    await expect(activeDots).toHaveCount(1)
    await expect(page.locator('.qa-onb-skip')).toHaveCount(0)

    // No ambient dock or pill while onboarding is active
    // Dock hidden: either absent or carries the hidden class
    const dock = page.locator('#bottom-nav')
    const dockCount = await dock.count()
    if (dockCount > 0) {
      await expect(dock).toHaveClass(/qa-dock--hidden/)
    }

    // Step 3: Tap Begin → Screen 2 (Theme)
    await page.locator('.qa-onb-cta--primary').click()
    await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })

    // Skip button appears from screen 2 onward
    await expect(page.locator('.qa-onb-skip')).toBeVisible()

    // 4 theme swatches present
    await expect(page.locator('.qa-onb-sw')).toHaveCount(4)

    // Step 4: Pick Dark theme → applied live → Continue → Screen 3 (Riwayah)
    await page.locator('.qa-onb-sw--dark').click()
    await expect(page.locator('.qa-onb-sw--dark')).toHaveClass(/qa-onb-sw--on/)

    // Theme should be applied to <html> immediately
    await expect(async () => {
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme')
      )
      expect(theme).toBe('dark')
    }).toPass({ timeout: 3_000 })

    await page.locator('.qa-onb-cta--primary').click()

    // Screen 3 (Riwayah): radio cards for Ḥafṣ / Warsh / Qālūn; Qālūn is default
    await expect(page.locator('.qa-onb-rlist')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('.qa-onb-r[aria-checked="true"]')).toContainText('Qālūn')

    // Step 5: Continue → Screen 4 (Translation)
    await page.locator('.qa-onb-cta--primary').click()

    // Screen 4 (Translation): Riwayah screen is gone; translation headline is visible.
    // No translations ship today so .qa-onb-tlist may be empty/zero-height — assert it
    // exists in DOM rather than visible.
    await expect(page.locator('.qa-onb-rlist')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.locator('.qa-onb-tlist')).toBeAttached({ timeout: 8_000 })

    // Step 6: Continue → Screen 5 (Shortcuts)
    await page.locator('.qa-onb-cta--primary').click()

    // Screen 5 (Shortcuts): keyboard shortcut grid with ≥1 rows
    await expect(page.locator('.qa-onb-shortcuts')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('.qa-onb-shortcut-row').first()).toBeVisible()

    await page.locator('.qa-onb-cta--primary').click()

    // Screen 6 (Tags intro): verse preview, 3 sample chips, privacy note
    await expect(page.locator('.qa-onb-vpreview')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('.qa-onb-chips')).toBeVisible()
    await expect(page.locator('.qa-onb-chip')).toHaveCount(3)
    await expect(page.locator('.qa-onb-privacy')).toBeVisible()

    // Step 7: Tap "Open Al-Fatihah" → completes onboarding, lands on #/s/1
    await page.locator('.qa-onb-cta--primary').click()

    // onboardingComplete written to IDB
    expect(await readSetting(page, 'onboardingComplete')).toBe(true)

    // Reader mounts; hash is #/s/1
    await waitForReader(page)
    await expect(page).toHaveURL(/#\/s\/1/)

    // Ambient dock is now visible (onboarding gone)
    const dockAfter = page.locator('#bottom-nav')
    const dockCountAfter = await dockAfter.count()
    if (dockCountAfter > 0) {
      await expect(dockAfter).not.toHaveClass(/qa-dock--hidden/)
    }
  })

  // -------------------------------------------------------------------------
  // A1.2 Alt path — Skip from screen 2 lands on #/s/1
  // -------------------------------------------------------------------------

  test('A1: alt path — Skip from screen 2 lands on #/s/1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    // Advance to screen 2
    await page.locator('.qa-onb-cta--primary').click()
    await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })

    // Tap Skip
    await page.locator('.qa-onb-skip').click()

    // Same completion path — lands on reader at #/s/1
    await waitForReader(page)
    await expect(page).toHaveURL(/#\/s\/1/)
  })

  // -------------------------------------------------------------------------
  // A1.3 Alt path — Skip from screen 3 (Riwayah) also lands on #/s/1
  // -------------------------------------------------------------------------

  test('A1: alt path — Skip from screen 3 lands on #/s/1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    // advanceToScreen3 now lands on Riwayah screen (.qa-onb-rlist)
    await advanceToScreen3(page)

    // Skip on screen 3 (Riwayah)
    await page.locator('.qa-onb-skip').click()
    await waitForReader(page)
    await expect(page).toHaveURL(/#\/s\/1/)
  })

  // -------------------------------------------------------------------------
  // A1.4 Alt path — "Browse all surahs" from screen 4 lands on #/surahs
  // -------------------------------------------------------------------------

  test('A1: alt path — Browse all surahs from screen 4 opens drawer (mobile) or surah list (desktop) @mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    await advanceToScreen3(page)
    await advanceToScreen4(page)

    // Tap "Browse all surahs" (ghost CTA)
    await page.locator('.qa-onb-cta--ghost').click()

    // Mobile (<1180px): hard-redirect to drawer + last surface (post 2026-04-25).
    // Desktop (≥1180px): standalone #/surahs page renders.
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
    if (isDesktop) {
      await expect(page).toHaveURL(/#\/surahs/, { timeout: 8_000 })
    } else {
      await expect(page.locator('.qa-nav-drawer')).toBeVisible({ timeout: 8_000 })
      await page.waitForFunction(() => !window.location.hash.startsWith('#/surahs'), { timeout: 5_000 })
    }

    // onboardingComplete was written
    expect(await readSetting(page, 'onboardingComplete')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // A1.5 a11y — axe-core scan on onboarding screen 1
  // -------------------------------------------------------------------------

  test('A1: a11y — no serious/critical axe violations on screen 1 @a11y', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    const violations = await scanA11y(page, { include: ['.qa-onboarding'] })
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // A1.6 a11y — axe-core scan on screen 2 (Theme)
  // -------------------------------------------------------------------------

  test('A1: a11y — no serious/critical axe violations on screen 2 (Theme) @a11y', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    // Advance to screen 2
    await page.locator('.qa-onb-cta--primary').click()
    await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })

    const violations = await scanA11y(page, { include: ['.qa-onboarding'] })
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // A1.7 Keyboard-only walk through the happy path @keyboard
  // -------------------------------------------------------------------------

  test('A1: keyboard-only walk through onboarding @keyboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    // --- Screen 1 ---
    // Tab to Begin button and press Enter
    await page.keyboard.press('Tab')
    // Keep tabbing until the primary CTA is focused
    await expect(async () => {
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-cta--primary')
      })
      if (!focused) { await page.keyboard.press('Tab') }
      expect(focused).toBe(true)
    }).toPass({ timeout: 3_000 })

    await page.keyboard.press('Enter')
    await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })

    // --- Screen 2 (Theme) ---
    // Tab to the Dark swatch and activate it
    let darkFocused = false
    for (let i = 0; i < 10 && !darkFocused; i++) {
      await page.keyboard.press('Tab')
      darkFocused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-sw--dark') ?? false
      })
    }
    expect(darkFocused).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('.qa-onb-sw--dark')).toHaveClass(/qa-onb-sw--on/)

    // Tab to Continue and press Enter
    let continueFocused = false
    for (let i = 0; i < 6 && !continueFocused; i++) {
      await page.keyboard.press('Tab')
      continueFocused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-cta--primary') ?? false
      })
    }
    expect(continueFocused).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('.qa-onb-rlist')).toBeVisible({ timeout: 8_000 })

    // --- Screen 3 (Riwayah) ---
    // Qālūn is default-selected; just Tab to Continue and press Enter.

    // Tab to Continue
    continueFocused = false
    for (let i = 0; i < 8 && !continueFocused; i++) {
      await page.keyboard.press('Tab')
      continueFocused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-cta--primary') ?? false
      })
    }
    expect(continueFocused).toBe(true)
    await page.keyboard.press('Enter')
    // Screen 4 (Translation): .qa-onb-tlist may be empty/zero-height; just confirm
    // Riwayah screen is gone and translation screen is attached.
    await expect(page.locator('.qa-onb-rlist')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.locator('.qa-onb-tlist')).toBeAttached({ timeout: 8_000 })

    // --- Screen 4 (Translation) ---
    // No translations ship today; list is empty. Tab to Continue and press Enter.
    continueFocused = false
    for (let i = 0; i < 6 && !continueFocused; i++) {
      await page.keyboard.press('Tab')
      continueFocused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-cta--primary') ?? false
      })
    }
    expect(continueFocused).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('.qa-onb-shortcuts')).toBeVisible({ timeout: 8_000 })

    // --- Screen 5 (Shortcuts) ---
    // Tab to Continue
    continueFocused = false
    for (let i = 0; i < 10 && !continueFocused; i++) {
      await page.keyboard.press('Tab')
      continueFocused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-cta--primary') ?? false
      })
    }
    expect(continueFocused).toBe(true)
    await page.keyboard.press('Enter')
    await expect(page.locator('.qa-onb-vpreview')).toBeVisible({ timeout: 8_000 })

    // --- Screen 6 (Tags intro) ---
    // Tab to primary CTA "Open Al-Fatihah"
    continueFocused = false
    for (let i = 0; i < 6 && !continueFocused; i++) {
      await page.keyboard.press('Tab')
      continueFocused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-cta--primary') ?? false
      })
    }
    expect(continueFocused).toBe(true)
    await page.keyboard.press('Enter')

    // Ends on reader at #/s/1
    await waitForReader(page)
    await expect(page).toHaveURL(/#\/s\/1/)
  })

  // ---------------------------------------------------------------------------
  // Journey A2 — Reload stays on the last surface
  // ---------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // A2.1 Reload restores the last surface
  // -------------------------------------------------------------------------

  test('A1: onboarding screen 3 — Choose Riwayah, Qālūn default', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    // Walk through Welcome → Theme to reach screen 3 (Riwayah)
    await page.locator('.qa-onb-cta--primary').click()
    await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })
    await page.locator('.qa-onb-cta--primary').click()

    // Screen 3: Riwayah
    await expect(page.locator('.qa-onb-rlist')).toBeVisible({ timeout: 8_000 })

    // Qālūn is default-selected
    await expect(page.locator('.qa-onb-r[aria-checked="true"]')).toContainText('Qālūn')

    // Three radio cards: Ḥafṣ, Warsh, Qālūn
    await expect(page.locator('.qa-onb-r')).toHaveCount(3)

    // Switch to Ḥafṣ
    await page.locator('.qa-onb-r', { hasText: 'Ḥafṣ' }).click()
    await expect(page.locator('.qa-onb-r[aria-checked="true"]')).toContainText('Ḥafṣ')

    // Continue advances away from the Riwayah screen
    await page.locator('.qa-onb-cta--primary').click()
    await expect(page.locator('.qa-onb-rlist')).not.toBeVisible({ timeout: 5_000 })
  })
})

// ---------------------------------------------------------------------------
// Journey A — desktop variants (≥1180px viewport)
// ---------------------------------------------------------------------------

test.describe('Journey A: desktop variants', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAllData(page)
  })

  test('A1 desktop: onboarding wordmark and container scale up', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible()

    const sizes = await page.evaluate(() => {
      const w = getComputedStyle(document.querySelector('.qa-onboarding')).maxWidth
      const m = getComputedStyle(document.querySelector('.qa-onb-mark')).fontSize
      return { wrap: w, mark: parseFloat(m) }
    })
    expect(sizes.wrap).toBe('680px')
    expect(sizes.mark).toBeGreaterThanOrEqual(60) // 3.75rem
  })
})
