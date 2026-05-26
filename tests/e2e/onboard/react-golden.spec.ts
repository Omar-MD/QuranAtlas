import { expect, test } from '@playwright/test'

import { expectAxeClean, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const onboardFixtures = GOLDEN_FIXTURES.filter((fixture) => fixture.id === 'launch-fresh-onboarding')

for (const fixture of onboardFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto(fixture.route)
      await expect(page.locator('#react-root')).toBeVisible()
      await expect(page.getByRole('heading', { name: /start reading/i })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)
    })
  }
}
