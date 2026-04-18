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
  await expect(page.locator('.qa-sheet--settings')).toBeVisible()
  // Wait for the qa-sheet-rise animation (0.22s) to complete so axe contrast
  // checks see final opacity: 1 state, not an intermediate blended value.
  await page.waitForTimeout(300)
}

/**
 * Open the Command sheet via ⌘K.
 */
export async function openCommandSheet(page) {
  await page.keyboard.press('Meta+k') // Mac; Playwright aliases Meta→Ctrl on other OS
  await expect(page.locator('.qa-cmd-sheet')).toBeVisible()
}
