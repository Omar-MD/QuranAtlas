import { expect, test } from '@playwright/test'

import { expectAxeClean, expectMinTouchTarget, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
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
        await expect(page, 'RPA-005: #/settings must restore the reader route and open mode-aware settings over it.').toHaveURL(/#\/s\/1$/)
        await expect(page.getByRole('heading', { name: /verse settings|settings/i })).toBeVisible()
        await expect(page.getByLabel('Reader assets')).toBeVisible()
      }

      if (fixture.id === 'assets-state-matrix') {
        await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible()
        await expect(page.getByRole('heading', { name: /Quran Text Styles/i }), 'RPA-005: asset rows must be grouped from real text indexes.').toBeVisible()
        await expect(page.getByRole('heading', { name: /Mushaf Editions/i }), 'RPA-005: Mushaf asset rows must be grouped from real indexes.').toBeVisible()
        await expect(page.getByRole('heading', { name: /Translations/i }), 'RPA-005: translation asset rows must come from source indexes.').toBeVisible()
        await expectMinTouchTarget(page.getByRole('button', { name: 'Manage' }).first())
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
