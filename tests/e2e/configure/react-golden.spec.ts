import { expect, test } from '@playwright/test'

import { expectAxeClean, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import {
  expectNoGuardFailures,
  expectReactProductionPreflight,
  GOLDEN_FIXTURES,
  GOLDEN_VIEWPORTS,
  installPageGuards,
  seedTargetState,
  targetUrl,
} from '../fixtures/react-golden-routes'

const configureFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  ['settings-over-reader', 'assets-state-matrix', 'about-page'].includes(fixture.id),
)

for (const fixture of configureFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await expectReactProductionPreflight(page)
      await seedTargetState(page, 'react', fixture.seed)
      const guard = installPageGuards(page, `react ${fixture.id}`)
      await page.goto(targetUrl('react', fixture.route || '/'))
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)

      if (fixture.id === 'settings-over-reader') {
        await expect(page, 'RPA-005: #/settings opens the simplified MVP settings surface.').toHaveURL(/#\/settings$/)
        await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
        await expect(page.getByLabel('Reader assets')).toBeVisible()
        await expect(page.getByRole('heading', { name: /mushaf edition|choose riwayah|choose translation/i })).toHaveCount(0)
      }

      if (fixture.id === 'assets-state-matrix') {
        await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
        await expect(page.getByText('Qaloon Text + Font'), 'RPA-005: text and font assets are included by the default contract.').toBeVisible()
        await expect(page.getByText('Qaloon Mushaf'), 'RPA-005: Mushaf assets are included by the default contract.').toBeVisible()
        await expect(page.getByText('Bridges Translation'), 'RPA-005: translation assets are included by the default contract.').toBeVisible()
        await expect(page.getByRole('button', { name: /manage|install|delete|verify|set active|switch|retry/i })).toHaveCount(0)
      }

      if (fixture.id === 'about-page') {
        await expect(page.getByText('Read, reflect, remember.'), 'RPA-009: About must carry the Svelte mission copy.').toBeVisible()
        await expect(page.getByRole('button', { name: /clear all data/i }), 'RPA-009: About must expose Svelte clear-data behavior.').toBeVisible()
      }
      await expectNoGuardFailures(guard)
      guard.dispose()
    })
  }
}
