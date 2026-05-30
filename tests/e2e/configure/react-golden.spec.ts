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
  ['settings-over-reader', 'about-page'].includes(fixture.id),
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
        await expect(page, 'RPA-005: #/settings is transient and restores the reader hash while the shell stays open.').toHaveURL(/#\/s\/1$/)
        const shell = page.getByRole('dialog', { name: 'Settings' })
        await expect(shell).toBeVisible()
        await expect(shell.getByRole('heading', { name: 'Settings' })).toBeVisible()
        await expect(shell.getByRole('tab', { name: 'Reader mode: Verse' })).toHaveAttribute('aria-selected', 'true')
        await expect(shell.getByRole('tab', { name: 'Reader mode: Mushaf' })).toHaveAttribute('aria-selected', 'false')
        await expect(page.getByRole('main', { name: /verse reader|mushaf reader/i })).toBeVisible()
        const includedAssets = shell.getByRole('region', { name: 'Included assets' })
        await expect(includedAssets).toBeVisible()
        await expect(shell.getByRole('button', { name: 'Manage Assets' })).toHaveCount(0)
        await expect(shell.getByRole('group', { name: 'Theme' })).toBeVisible()
        await expect(shell.getByRole('group', { name: 'Night mode' })).toBeVisible()
        await expect(includedAssets.getByText('Text:')).toBeVisible()
        await expect(includedAssets.getByText('Uthmani KFGQPC + KFGQPC Qaloon')).toBeVisible()
        await expect(includedAssets.getByText('Mushaf:')).toBeVisible()
        await expect(includedAssets.getByText('Qalun Quran.ws')).toBeVisible()
        await expect(includedAssets.getByText('Translation:')).toBeVisible()
        await expect(includedAssets.getByText('Bridges')).toBeVisible()
        await expect(shell.getByText('Verse preview')).toHaveCount(0)
        await expect(shell.getByText('Mushaf preview')).toHaveCount(0)
        await expect(page.getByRole('button', { name: /hafs|warsh|install|delete|verify|set active|retry/i })).toHaveCount(0)
        await expect(page.getByRole('heading', { name: /mushaf edition|choose riwayah|choose translation|tafsir|search/i })).toHaveCount(0)

        const containment = await shell.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          const body = element.querySelector('.qar-react-settings-body')
          return {
            bottom: rect.bottom,
            height: rect.height,
            left: rect.left,
            position: style.position,
            right: rect.right,
            shellScrollHeight: element.scrollHeight,
            shellClientHeight: element.clientHeight,
            bodyScrollHeight: body?.scrollHeight ?? 0,
            bodyClientHeight: body?.clientHeight ?? 0,
            top: rect.top,
            width: rect.width,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
          }
        })
        expect(containment.left).toBeGreaterThanOrEqual(0)
        expect(containment.top).toBeGreaterThanOrEqual(0)
        expect(containment.right).toBeLessThanOrEqual(containment.viewportWidth + 1)
        expect(containment.bottom).toBeLessThanOrEqual(containment.viewportHeight + 1)
        expect(containment.shellScrollHeight, 'settings shell should fit without shell scrolling').toBeLessThanOrEqual(containment.shellClientHeight + 1)
        expect(containment.bodyScrollHeight, 'settings controls should fit without body scrolling').toBeLessThanOrEqual(containment.bodyClientHeight + 1)
        if (viewportId === 'phone-standard') {
          expect(containment.width, 'mobile settings shell should fill the viewport width').toBeGreaterThanOrEqual(containment.viewportWidth - 1)
          expect(containment.height, 'mobile settings shell should fill the viewport height').toBeGreaterThanOrEqual(containment.viewportHeight - 1)
        } else {
          expect(containment.left, 'tablet and desktop settings shell should be reader-adjacent on the right side').toBeGreaterThanOrEqual(containment.viewportWidth - 421)
          expect(containment.width).toBeLessThan(containment.viewportWidth)
          expect(containment.width, 'tablet and desktop settings shell should stay a compact column bar').toBeLessThanOrEqual(420)
        }
      }

      if (fixture.id === 'about-page') {
        await expect(page.getByRole('main', { name: 'About' }).getByRole('heading', { name: 'QuranAtlas' }), 'RPA-009: About must carry the Svelte page heading.').toBeVisible()
        await expect(page.getByText('Read, reflect, remember.'), 'RPA-009: About must carry the Svelte mission copy.').toBeVisible()
        await expect(page.getByText(/وَلَقَدۡ يَسَّرۡنَا/), 'RPA-009: About must carry the Svelte blessing copy.').toBeVisible()
        await expect(page.getByRole('heading', { name: 'Attribution' }), 'RPA-009: About must carry attribution.').toBeVisible()
        await expect(page.getByText(/English translation: Bridges/)).toBeVisible()
        await expect(page.getByTestId('about-version')).toContainText(/^v.+ · .+/)
        await expect(page.getByText(/verified reader, navigation, settings, search, bookmarks, and Daily Wird workflows/i)).toHaveCount(0)
        await expect(page.getByRole('button', { name: /clear all data/i }), 'RPA-009: About must expose Svelte clear-data behavior.').toBeVisible()
        await page.getByRole('button', { name: /clear all data/i }).click()
        const dialog = page.getByRole('dialog', { name: /clear all data/i })
        await expect(dialog).toBeVisible()
        await expect(dialog).toContainText(/This will permanently delete saved reading positions/)
        await expect(dialog.getByRole('button', { name: 'Clear All Data' })).toBeDisabled()
        await dialog.getByLabel(/type DELETE to confirm/i).fill('delete')
        await expect(dialog.getByRole('button', { name: 'Clear All Data' })).toBeDisabled()
        await dialog.getByLabel(/type DELETE to confirm/i).fill('DELETE')
        await expect(dialog.getByRole('button', { name: 'Clear All Data' })).toBeEnabled()
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveCount(0)
      }
      await expectNoGuardFailures(guard)
      guard.dispose()
    })
  }
}

test.describe('settings-over-reader shell dismissal and routing', () => {
  test('@golden settings-over-reader closes with button, Escape, backdrop, and opens legacy assets URLs inline', async ({ page }) => {
    await page.setViewportSize(GOLDEN_VIEWPORTS['phone-standard'])
    await expectReactProductionPreflight(page)
    await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
    const guard = installPageGuards(page, 'react settings-over-reader dismissal', [
      /\/dataset\/indexes\/mushaf-assets\.json$/,
      /\/dataset\/indexes\/text-assets\.json$/,
      /\/dataset\/knowledge\/passages\/001\.json$/,
      /\/dataset\/translations\/_verse-aliases\.json$/,
    ])

    await page.goto(targetUrl('react', '#/settings'))
    await expect(page).toHaveURL(/#\/s\/1$/)
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await page.getByRole('button', { name: 'Close settings', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
    await expect(page).toHaveURL(/#\/s\/1$/)

    await page.goto(targetUrl('react', '#/settings'))
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
    await expect(page).toHaveURL(/#\/s\/1$/)

    await page.setViewportSize(GOLDEN_VIEWPORTS.desktop)
    await page.goto(targetUrl('react', '#/settings'))
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await page.getByRole('button', { name: 'Close settings backdrop' }).click({ position: { x: 8, y: 8 } })
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
    await expect(page).toHaveURL(/#\/s\/1$/)

    await page.setViewportSize(GOLDEN_VIEWPORTS['phone-standard'])
    await page.goto(targetUrl('react', '#/assets'))
    await expect(page).toHaveURL(/#\/s\/1$/)
    const shell = page.getByRole('dialog', { name: 'Settings' })
    await expect(shell).toBeVisible()
    await expect(shell.getByRole('region', { name: 'Included assets' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toHaveCount(0)

    await expectNoGuardFailures(guard)
    guard.dispose()
  })

  test('@golden settings-over-reader infers Mushaf Settings from a previous Mushaf route', async ({ page }) => {
    await page.setViewportSize(GOLDEN_VIEWPORTS.desktop)
    await expectReactProductionPreflight(page)
    await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
    const guard = installPageGuards(page, 'react settings-over-reader mushaf', [
      /\/dataset\/mushaf-pages\/qaloon\/qalun-quran-ws-v1\/manifest\.json$/,
      /\/dataset\/mushaf-pages\/qaloon\/qalun-quran-ws-v1\/pages\/042\.svg$/,
    ])

    await page.goto(targetUrl('react', '#/m/42'))
    await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
    await page.goto(targetUrl('react', '#/settings'))
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
    const shell = page.getByRole('dialog', { name: 'Settings' })
    await expect(shell).toBeVisible()
    await expect(shell.getByRole('tab', { name: 'Reader mode: Mushaf' })).toHaveAttribute('aria-selected', 'true')
    await expect(shell.getByRole('tab', { name: 'Reader mode: Verse' })).toHaveAttribute('aria-selected', 'false')

    await expectNoGuardFailures(guard)
    guard.dispose()
  })
})
