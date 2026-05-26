import { expect, test } from '@playwright/test'

import { expectAxeClean, expectMinTouchTarget, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const configureFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  ['settings-over-reader', 'assets-state-matrix', 'about-page'].includes(fixture.id),
)

for (const fixture of configureFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto(fixture.route || '/')
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)

      if (fixture.id === 'settings-over-reader') {
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
        await expect(page.getByLabel('Reader assets')).toBeVisible()
      }

      if (fixture.id === 'assets-state-matrix') {
        await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
        await expect(page.getByText('Qalun text')).toBeVisible()
        await expect(page.getByText('installing')).toBeVisible()
        await expectMinTouchTarget(page.getByRole('button', { name: 'Manage' }).first())
      }

      if (fixture.id === 'about-page') {
        await expect(page.getByText(/React preview keeps Svelte as the shipped reference/i)).toBeVisible()
      }
    })
  }
}
