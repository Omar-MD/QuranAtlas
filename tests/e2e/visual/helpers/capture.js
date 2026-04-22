import { expect } from '@playwright/test'

/**
 * Screenshot with flake mitigations:
 *   - Force reduced-motion.
 *   - Lock viewport.
 *   - Set data-theme explicitly.
 *   - Await document.fonts.ready.
 *   - Pass animations:'disabled' to Playwright.
 */
export async function stableScreenshot(page, name, opts = {}) {
  const { theme = 'light', viewport } = opts
  if (viewport) await page.setViewportSize(viewport)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate((t) => { document.documentElement.dataset.theme = t }, theme)
  await page.waitForFunction(() => document.documentElement.dataset.theme !== 'auto')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
  await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
    maxDiffPixelRatio: 0.05,
    animations: 'disabled',
  })
}

export const VIEWPORTS = {
  mobile:  { width: 375,  height: 812  },
  tablet:  { width: 768,  height: 1024 },
  desktop: { width: 1440, height: 900  },
}

export const THEMES = ['light', 'sepia', 'dark']
