import { expect, test } from '@playwright/test'

import { expectAxeClean, expectMinTouchTarget, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const readFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  [
    'reader-surah-start',
    'reader-ayah-deeplink',
    'mushaf-ready',
    'search-results',
    'search-index-unavailable',
    'daily-wird-no-plan',
    'daily-wird-active',
  ].includes(fixture.id),
)

for (const fixture of readFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto(fixture.route || '/')
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)
      await expect(page.locator('main')).toBeVisible()

      if (fixture.id.startsWith('reader-') || fixture.id.startsWith('daily-wird')) {
        await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      }

      if (fixture.id === 'reader-ayah-deeplink') {
        await expect(page.getByTestId('verse-2:255')).toBeVisible()
      }

      if (fixture.id === 'mushaf-ready') {
        await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /auto/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /page/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /width/i })).toBeVisible()
      }

      if (fixture.id.startsWith('search-')) {
        await expect(page.getByRole('main', { name: /search/i })).toBeVisible()
        await page.getByLabel('Search QuranAtlas').fill('Compassionate')
        await expect(page.getByText('Most Compassionate Most Merciful')).toBeVisible()
      }

      const firstControl = page.getByRole('button').first()
      if (await firstControl.count()) {
        await expectMinTouchTarget(firstControl)
      }
    })
  }
}
