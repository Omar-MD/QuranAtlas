import { expect } from '@playwright/test'

/**
 * Wait for the reader to finish mounting (first verse rendered).
 */
export async function waitForReader(page) {
  await expect(page.locator('.qa-verse').first()).toBeVisible({ timeout: 10_000 })
}

/**
 * Bypass onboarding when a test doesn't exercise it.
 * Caller should navigate to the desired route AFTER this.
 */
export async function dismissOnboarding(page) {
  // markOnboardingComplete must have run already; this just ensures we're past it.
  // Nothing to click — boot logic routes past #/onboarding when the flag is set.
}

/**
 * Surface the ambient dock on a reader route (it auto-hides).
 */
export async function surfaceDock(page) {
  // Tap reader body to trigger AMBIENT_SURFACE
  await page.locator('#main-content').click({ position: { x: 50, y: 50 } })
  await expect(page.locator('#bottom-nav')).not.toHaveClass(/qa-dock--hidden/)
}

/**
 * Open the More sheet via dock ⋯ button.
 */
export async function openMoreSheet(page) {
  await surfaceDock(page)
  await page.locator('[data-tab="more"]').click()
  await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
}

/**
 * Open the Settings sheet via More → Settings.
 */
export async function openSettingsSheet(page) {
  await openMoreSheet(page)
  await page.locator('button.qa-sheet-row:not(.qa-sheet-row--danger)').filter({ hasText: 'Settings' }).click()
  const sheet = page.locator('.qa-sheet--settings')
  await expect(sheet).toBeVisible()
  // Wait for the qa-sheet-rise animation to finish so axe contrast checks see
  // the final opacity: 1 state (not an intermediate blended value).
  await sheet.evaluate(el =>
    Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished))
  )
}

/**
 * Open the Command sheet via ⌘K.
 */
export async function openCommandSheet(page) {
  await page.keyboard.press('Meta+k') // Mac; Playwright aliases Meta→Ctrl on other OS
  await expect(page.locator('.qa-cmd-sheet')).toBeVisible()
}

/**
 * Simulate a long-press by dispatching TouchEvent sequences via evaluate.
 * The gesture code in src/marks/long-press.ts listens for touchstart/touchend,
 * not mousedown/pointerdown, so mouse.down() doesn't trigger it.
 * Scrolls the element into view first so elementFromPoint returns the correct target.
 */
export async function longPress(locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)

  const hit = await locator.page().evaluate(([cx, cy]) => {
    const el = document.elementFromPoint(cx, cy)
    if (!el) {
      return false
    }
    window.__lpTarget = el
    const touch = new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy, screenX: cx, screenY: cy })
    el.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: [touch], targetTouches: [touch], changedTouches: [touch],
    }))
    return true
  }, [x, y])
  if (!hit) {
    throw new Error(`longPress: no element at (${x}, ${y})`)
  }

  // Semantic hold duration — the app's long-press threshold is 500ms (see
  // src/marks/long-press.ts:LONG_PRESS_MS).  550ms gives a 10% buffer without
  // being a wait-for-state we could replace with auto-waiting.
  await locator.page().waitForTimeout(550)

  await locator.page().evaluate(() => {
    const el = window.__lpTarget
    if (!el) {
      return
    }
    delete window.__lpTarget
    el.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true, cancelable: true,
      touches: [], targetTouches: [], changedTouches: [],
    }))
  })
}
