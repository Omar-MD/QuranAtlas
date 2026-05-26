import { expect, test } from '@playwright/test'

import { expectAxeClean, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { GOLDEN_FIXTURES, GOLDEN_VIEWPORTS } from '../fixtures/react-golden-routes'

const navigateFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  ['launch-restore-reader', 'surah-directory', 'bookmarks-populated', 'daily-wird-no-plan'].includes(fixture.id),
)

for (const fixture of navigateFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await page.goto(fixture.route || '/')
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)

      if (fixture.id === 'launch-restore-reader') {
        await expect(page).toHaveURL(/#\/s\/1$/)
        await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      }

      if (fixture.id === 'surah-directory') {
        await expect(page.getByRole('heading', { name: 'Surahs' })).toBeVisible()
        await page.getByRole('button', { name: 'Open' }).first().focus()
        await expect(page.getByRole('button', { name: 'Open' }).first()).toBeFocused()
      }

      if (fixture.id === 'bookmarks-populated') {
        await expect(page.getByRole('heading', { name: 'Bookmarks' })).toBeVisible()
        await expect(page.getByText(/No bookmarks for the active riwayah/i)).toBeVisible()
      }

      if (fixture.id === 'daily-wird-no-plan') {
        await expect(page.getByRole('region', { name: /daily wird/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /create plan/i })).toBeVisible()
      }
    })
  }
}
