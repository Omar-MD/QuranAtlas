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
 *   src/onboarding/index.js
 *   src/onboarding/screens.js
 */

import { test, expect } from '@playwright/test'
import { clearAllData, markOnboardingComplete } from './fixtures/idb.js'
import { waitForReader } from './fixtures/chrome.js'
import { scanA11y } from './fixtures/a11y.js'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Advance from screen 1 (Welcome) through screen 2 (Theme) to screen 3 (Translation).
 * Picks "Dark" theme on screen 2 as a concrete test value.
 */
async function advanceToScreen3(page) {
  // Screen 1 → tap Begin
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 2 (Theme) — pick Dark swatch then Continue
  await expect(page.locator('.qa-onb-swatches')).toBeVisible({ timeout: 8_000 })
  await page.locator('.qa-onb-sw--dark').click()
  await expect(page.locator('.qa-onb-sw--dark')).toHaveClass(/qa-onb-sw--on/)
  await page.locator('.qa-onb-cta--primary').click()

  // Screen 3 (Translation) should now be visible
  await expect(page.locator('.qa-onb-tlist')).toBeVisible({ timeout: 8_000 })
}

/**
 * Advance from screen 3 (Translation) through screen 4 (Tags intro).
 * Picks "Pickthall" translation on screen 3.
 */
async function advanceToScreen4(page) {
  // Pick Pickthall (second item in the list)
  const pickthall = page.locator('.qa-onb-t').filter({ hasText: 'Pickthall' })
  await pickthall.click()
  await expect(pickthall).toHaveClass(/qa-onb-t--on/)

  // Continue → Screen 4
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

    // Step 4: Pick Dark theme → applied live → Continue → Screen 3 (Translation)
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
    await expect(page.locator('.qa-onb-tlist')).toBeVisible({ timeout: 8_000 })

    // 4 translation options; Saheeh is selected by default
    await expect(page.locator('.qa-onb-t')).toHaveCount(4)
    const saheehOption = page.locator('.qa-onb-t').filter({ hasText: 'Saheeh' })
    await expect(saheehOption).toHaveClass(/qa-onb-t--on/)

    // Step 5: Pick Pickthall → Continue → Screen 4 (Tags intro)
    const pickthall = page.locator('.qa-onb-t').filter({ hasText: 'Pickthall' })
    await pickthall.click()
    await expect(pickthall).toHaveClass(/qa-onb-t--on/)
    // Saheeh is no longer active
    await expect(saheehOption).not.toHaveClass(/qa-onb-t--on/)

    await page.locator('.qa-onb-cta--primary').click()

    // Screen 4: verse preview, 3 sample chips, privacy note
    await expect(page.locator('.qa-onb-vpreview')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('.qa-onb-chips')).toBeVisible()
    await expect(page.locator('.qa-onb-chip')).toHaveCount(3)
    await expect(page.locator('.qa-onb-privacy')).toBeVisible()

    // Step 6: Tap "Open Al-Fatihah" → completes onboarding, lands on #/s/1
    await page.locator('.qa-onb-cta--primary').click()

    // onboardingComplete written to IDB
    const onboardingComplete = await page.evaluate(() =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('quran-atlas')
        open.onsuccess = () => {
          const db = open.result
          if (!db.objectStoreNames.contains('settings')) { resolve(false); db.close(); return }
          const tx = db.transaction('settings', 'readonly')
          const req = tx.objectStore('settings').get('onboardingComplete')
          req.onsuccess = () => { resolve(req.result?.value === true); db.close() }
          req.onerror = () => { resolve(false); db.close() }
        }
        open.onerror = () => reject(open.error)
      })
    )
    expect(onboardingComplete).toBe(true)

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
  // A1.3 Alt path — Skip from screen 3 (translation) also lands on #/s/1
  // -------------------------------------------------------------------------
  test('A1: alt path — Skip from screen 3 lands on #/s/1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    await advanceToScreen3(page)

    // Skip on screen 3
    await page.locator('.qa-onb-skip').click()
    await waitForReader(page)
    await expect(page).toHaveURL(/#\/s\/1/)
  })

  // -------------------------------------------------------------------------
  // A1.4 Alt path — "Browse all surahs" from screen 4 lands on #/surahs
  // -------------------------------------------------------------------------
  test('A1: alt path — Browse all surahs from screen 4 lands on #/surahs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    await advanceToScreen3(page)
    await advanceToScreen4(page)

    // Tap "Browse all surahs" (ghost CTA)
    await page.locator('.qa-onb-cta--ghost').click()

    // Lands on surah list
    await expect(page).toHaveURL(/#\/surahs/, { timeout: 8_000 })

    // onboardingComplete was written
    const onboardingComplete = await page.evaluate(() =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('quran-atlas')
        open.onsuccess = () => {
          const db = open.result
          if (!db.objectStoreNames.contains('settings')) { resolve(false); db.close(); return }
          const tx = db.transaction('settings', 'readonly')
          const req = tx.objectStore('settings').get('onboardingComplete')
          req.onsuccess = () => { resolve(req.result?.value === true); db.close() }
          req.onerror = () => { resolve(false); db.close() }
        }
        open.onerror = () => reject(open.error)
      })
    )
    expect(onboardingComplete).toBe(true)
  })

  // -------------------------------------------------------------------------
  // A1.5 a11y — axe-core scan on onboarding screen 1
  // -------------------------------------------------------------------------
  test('A1: a11y — no serious/critical axe violations on screen 1', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.qa-onboarding')).toBeVisible({ timeout: 8_000 })

    const violations = await scanA11y(page, { include: ['.qa-onboarding'] })
    expect(violations).toEqual([])
  })

  // -------------------------------------------------------------------------
  // A1.6 a11y — axe-core scan on screen 2 (Theme)
  // -------------------------------------------------------------------------
  test('A1: a11y — no serious/critical axe violations on screen 2 (Theme)', async ({ page }) => {
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
    await expect(page.locator('.qa-onb-tlist')).toBeVisible({ timeout: 8_000 })

    // --- Screen 3 (Translation) ---
    // Tab to Pickthall and activate
    let pickthallFocused = false
    for (let i = 0; i < 10 && !pickthallFocused; i++) {
      await page.keyboard.press('Tab')
      pickthallFocused = await page.evaluate(() => {
        const el = document.activeElement
        return el?.classList?.contains('qa-onb-t') &&
          (el?.textContent?.includes('Pickthall') ?? false)
      })
    }
    expect(pickthallFocused).toBe(true)
    await page.keyboard.press('Enter')
    const pickthallOption = page.locator('.qa-onb-t').filter({ hasText: 'Pickthall' })
    await expect(pickthallOption).toHaveClass(/qa-onb-t--on/)

    // Tab to Continue
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
    await expect(page.locator('.qa-onb-vpreview')).toBeVisible({ timeout: 8_000 })

    // --- Screen 4 (Tags intro) ---
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
  test('A2: reload stays on the last surface', async ({ page }) => {
    // Mark onboarding complete and navigate to a surface other than #/onboarding
    await markOnboardingComplete(page)

    // Navigate to the review hub so lastSurface is written
    await page.goto('/#/review')
    // Wait for the route to settle — dock should be visible (non-reader route)
    await expect(page.locator('#bottom-nav')).toBeVisible({ timeout: 8_000 })

    // Hard reload — hash cleared, ROUTER_LAUNCH_RESTORE fires
    await page.reload()

    // App should restore the last surface (#/review) not boot to onboarding
    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
    await expect(page).toHaveURL(/#\/review/, { timeout: 8_000 })
  })

  // -------------------------------------------------------------------------
  // A2.2 Reload restores a reader surface
  // -------------------------------------------------------------------------
  test('A2: reload restores reader surface (e.g. #/s/2)', async ({ page }) => {
    await markOnboardingComplete(page)

    await page.goto('/#/s/2')
    await expect(page.locator('[data-surah-header]')).toBeVisible({ timeout: 10_000 })

    await page.reload()

    await expect(page.locator('.qa-onboarding')).toHaveCount(0)
    await expect(page).toHaveURL(/#\/s\/2/, { timeout: 8_000 })
  })

  // -------------------------------------------------------------------------
  // A2.3 a11y — no violations on the reader surface post-onboarding
  // -------------------------------------------------------------------------
  test('A2: a11y — no serious/critical axe violations on reader after onboarding', async ({ page }) => {
    await markOnboardingComplete(page)
    await page.goto('/#/s/1')
    await waitForReader(page)

    const violations = await scanA11y(page)
    expect(violations).toEqual([])
  })
})
