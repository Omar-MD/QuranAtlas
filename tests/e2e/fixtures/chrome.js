import { expect } from '@playwright/test'

/**
 * Wait for the reader to finish mounting (first verse rendered).
 *
 * Timeout is generous (25s) because CI runners are 2-4× slower than local
 * dev hardware and the reader cold-boot path waits on dataset fetch + IDB
 * schema check + first verse render. Local runs still resolve in <2s.
 */
export async function waitForReader(page) {
  await expect(page.locator('.qa-verse').first()).toBeVisible({ timeout: 25_000 })
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
 * Ensure primary-nav chrome is reachable.
 * Desktop (≥1180px): left rail (#bottom-nav contents) is always visible — no-op.
 * Mobile (<1180px): MarginHeader is fixed at top; if hidden by scroll, scroll main to top.
 */
export async function surfaceDock(page) {
  const header = page.locator('header.qa-mh').first()
  if (await header.count() > 0) {
    const hidden = await header.evaluate(el => el.classList.contains('qa-mh--hidden')).catch(() => false)
    if (hidden) {
      await page.evaluate(() => {
        const el = document.getElementById('main-content')
        if (el) { el.scrollTo(0, 0); el.dispatchEvent(new Event('scroll')) }
      })
    }
  }
  const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
  if (isDesktop) {
    await expect(page.locator('[data-tab="more"]:visible').first()).toBeVisible()
  } else {
    await expect(page.locator('.qa-mh-hamburger')).toBeVisible()
  }
}

/**
 * Open the nav drawer.
 * Desktop (≥1180px): ⋯ kebab on AmbientDock rail.
 * Mobile  (<1180px): ≡ hamburger on MarginHeader.
 */
export async function openNavDrawer(page) {
  await surfaceDock(page)
  const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
  if (isDesktop) {
    await page.locator('[data-tab="more"]:visible').first().click()
  } else {
    await page.locator('.qa-mh-hamburger').click()
  }
  await expect(page.locator('.qa-nav-drawer')).toBeVisible()
}

/** Backwards-compat alias — legacy tests still call openMoreSheet. */
export const openMoreSheet = openNavDrawer

/**
 * Open the Settings sheet.
 * Desktop (≥1180px): navigate to #/settings (router opens the sheet).
 * Mobile  (<1180px): MarginHeader gear icon.
 */
export async function openSettingsSheet(page) {
  const isDesktop = await page.evaluate(() => window.innerWidth >= 1180)
  if (isDesktop) {
    await page.evaluate(() => { window.location.hash = '#/settings' })
  } else {
    const gear = page.locator('.qa-mh-settings')
    await expect(gear).toBeVisible({ timeout: 5_000 })
    await gear.click()
  }
  const sheet = page.locator('.qa-settings-shell')
  await expect(sheet).toBeVisible()
  await sheet.evaluate(el =>
    Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished))
  )
}

/**
 * Simulate a double-tap by dispatching two TouchEvent pairs ~120ms apart.
 * Replaces the retired long-press gesture for opening the fast-tag panel so
 * OS-native gestures like text selection and iOS callouts remain available.
 *
 * The gesture code in src/mark/long-press.ts listens for touchstart/touchend,
 * not mousedown/pointerdown, so mouse.down() doesn't trigger it. Scrolls the
 * element into view first so elementFromPoint returns the correct target.
 */
export async function doubleTap(locator) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)

  async function tap(cx, cy) {
    const hit = await locator.page().evaluate(([cx, cy]) => {
      const el = document.elementFromPoint(cx, cy)
      if (!el) { return false }
      const touch = new Touch({ identifier: 1, target: el, clientX: cx, clientY: cy, pageX: cx, pageY: cy, screenX: cx, screenY: cy })
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true, cancelable: true,
        touches: [touch], targetTouches: [touch], changedTouches: [touch],
      }))
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true, cancelable: true,
        touches: [], targetTouches: [], changedTouches: [touch],
      }))
      return true
    }, [cx, cy])
    if (!hit) { throw new Error(`doubleTap: no element at (${cx}, ${cy})`) }
  }

  await tap(x, y)
  // Inter-tap delay must stay under setupTapGestures' DOUBLE_TAP_MS (300ms).
  await locator.page().waitForTimeout(120)
  await tap(x, y)
}

// Back-compat alias — older specs imported `longPress`. The gesture they
// drive now is double-tap, so the name is misleading. Re-export points at
// `doubleTap`; new specs should import the canonical name directly.
export const longPress = doubleTap
