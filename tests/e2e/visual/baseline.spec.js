import { test } from '@playwright/test'
import { stableScreenshot, VIEWPORTS, THEMES } from './helpers/capture.js'

const SURFACES = [
  { name: 'reader',     url: '/#/s/1/1',    wait: '.qa-verse'           },
  { name: 'surahs',     url: '/#/surahs',   wait: '.qa-sl-row'          },
  { name: 'about',      url: '/#/about',    wait: '.qa-about-body-split' },
  { name: 'settings',   url: '/#/settings', wait: '.qa-settings-section' },
  { name: 'review-hub', url: '/#/review',   wait: 'main'                 },
]

for (const surface of SURFACES) {
  test.describe(surface.name, () => {
    for (const theme of THEMES) {
      for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
        test(`${surface.name} ${theme} ${vpName}`, async ({ page }) => {
          await page.goto(surface.url)
          await page.waitForSelector(surface.wait, { timeout: 10_000 })
          await stableScreenshot(page, `${surface.name}-${vpName}`, {
            theme,
            viewport: vp,
          })
        })
      }
    }
  })
}
