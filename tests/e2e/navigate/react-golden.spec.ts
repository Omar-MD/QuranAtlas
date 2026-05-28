import { expect, test } from '@playwright/test'

import { expectAxeClean, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import {
  expectNoGuardFailures,
  expectReactProductionPreflight,
  GOLDEN_FIXTURES,
  GOLDEN_VIEWPORTS,
  installPageGuards,
  seedReactBookmarks,
  seedTargetState,
  targetUrl,
} from '../fixtures/react-golden-routes'

const navigateFixtures = GOLDEN_FIXTURES.filter((fixture) =>
  ['launch-restore-reader', 'surah-directory', 'bookmarks-populated'].includes(fixture.id),
)

for (const fixture of navigateFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await expectReactProductionPreflight(page)
      await seedTargetState(page, 'react', fixture.seed)
      const guard = installPageGuards(
        page,
        `react ${fixture.id}`,
        fixture.id === 'launch-restore-reader'
          ? [/\/dataset\/mushaf-pages\/qaloon\/qalun-quran-ws-v1\/pages\/\d{3}\.svg$/]
          : [],
      )
      await page.goto(targetUrl('react', fixture.route || '/'))
      await expect(page.locator('#react-root')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)

      if (fixture.id === 'launch-restore-reader') {
        await expect(page).toHaveURL(/#\/s\/1$/)
        await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
        if (viewportId === 'phone-standard') {
          const chrome = page.getByRole('navigation', { name: 'Primary navigation' })
          await expect(chrome).toBeVisible()
          await expect(chrome.getByRole('button', { name: 'Open navigation' })).toBeVisible()
          await expect(chrome.getByRole('button', { name: /Toggle surah header for/ })).toHaveCount(0)
          await expect(chrome.getByText('الفَاتِحة')).toHaveCount(0)
          await expect(page.getByText(/Surah 1 · 7 verses/i)).toBeVisible()
          await expect(chrome.getByRole('button', { name: 'Open settings' })).toBeVisible()
          await expect(chrome.getByRole('tab', { name: 'Mushaf' })).toHaveCount(0)
          await expect(page.getByRole('tablist', { name: 'Reader mode' })).toHaveCount(0)
          await expect(chrome.getByRole('button', { name: 'Switch to Mushaf mode' })).toBeVisible()

          await chrome.getByRole('button', { name: 'Open navigation' }).click()
          const drawer = page.getByRole('dialog', { name: 'Navigation' })
          await expect(drawer.getByRole('tablist', { name: 'Reader mode' })).toHaveCount(0)
          await expect(page.getByRole('tablist', { name: 'Read source' })).toBeVisible()
          await expect(page.getByRole('searchbox', { name: 'Search surah by name, number, or verse reference' })).toBeVisible()
          await expect(page.getByRole('tab', { name: 'Surah' })).toHaveAttribute('aria-selected', 'true')
          await expect(page.getByRole('tab', { name: 'Juz' })).toHaveAttribute('aria-selected', 'false')
          await page.getByRole('tab', { name: 'Juz' }).click()
          await expect(page.getByRole('tab', { name: 'Juz' })).toHaveAttribute('aria-selected', 'true')
          await expect(page.getByLabel('Juz list')).toBeVisible()
          await expect(drawer.getByText('Continue')).toHaveCount(0)
          await expect(drawer.getByText('Open')).toHaveCount(0)
          await page.getByRole('button', { name: 'Juz 29, starts at 67:1' }).click()
          await expect(page).toHaveURL(/#\/s\/67\/1$/)
          await expect(page.getByTestId('verse-67:1')).toBeVisible()

          await page.goto(targetUrl('react', '/#/m/1'))
          await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
          const mushafChrome = page.getByRole('navigation', { name: 'Primary navigation' })
          await mushafChrome.getByRole('button', { name: 'Open navigation' }).click()
          const mushafDrawer = page.getByRole('dialog', { name: 'Navigation' })
          await expect(mushafDrawer.getByRole('tablist', { name: 'Mushaf view mode' })).toHaveCount(0)
          await expect(mushafDrawer.getByRole('tablist', { name: 'Read source' })).toBeVisible()
          await expect(mushafDrawer.getByRole('tab', { name: 'Surah' })).toHaveAttribute('aria-selected', 'true')
          await mushafDrawer.getByRole('tab', { name: 'Juz' }).click()
          await expect(mushafDrawer.getByLabel('Juz list')).toBeVisible()
          await mushafDrawer.getByRole('button', { name: 'Juz 29, starts at 67:1' }).click()
          await expect(page).toHaveURL(/#\/m\/562$/)
          await expect(page.getByRole('img', { name: /mushaf page 562/i })).toBeVisible()
          await page.waitForLoadState('networkidle')

          await seedReactBookmarks(page, [{ verseKey: '1:1' }])
          await page.reload({ waitUntil: 'domcontentloaded' })
          await expect(page.getByRole('main', { name: /mushaf reader/i })).toBeVisible()
          await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Open navigation' }).click()
          const bookmarkDrawer = page.getByRole('dialog', { name: 'Navigation' })
          await expect(bookmarkDrawer.getByRole('tablist', { name: 'Mushaf view mode' })).toHaveCount(0)
          await bookmarkDrawer.getByRole('tab', { name: 'Bookmarks' }).click()
          await expect(bookmarkDrawer.getByRole('tab', { name: 'Bookmarks' })).toHaveAttribute('aria-selected', 'true')
          await bookmarkDrawer.getByRole('button', { name: /jump to 1:1/i }).click()
          await expect(page).toHaveURL(/#\/m\/1$/)

          await page.goto(targetUrl('react', '/#/s/2'))
          await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
          await page.getByTestId('verse-2:94').evaluate((element) => {
            element.scrollIntoView({ block: 'center', behavior: 'auto' })
          })
          const scrolledChrome = page.getByRole('navigation', { name: 'Primary navigation' })
          await expect(scrolledChrome).toHaveAttribute('data-visible', 'false')
          await page.evaluate(() => {
            window.scrollBy(0, -120)
            window.dispatchEvent(new Event('scroll'))
          })
          await expect(scrolledChrome).toHaveAttribute('data-visible', 'true')
          await scrolledChrome.getByRole('button', { name: 'Switch to Mushaf mode' }).click()
          await expect(page).toHaveURL(/#\/m\/15$/)
          await expect(page.getByRole('img', { name: /mushaf page 15/i })).toBeVisible()
        }
      }

      if (fixture.id === 'surah-directory') {
        await expect(page.getByRole('heading', { name: 'Surahs' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Open' }), 'RPA-004: React Surah directory must expose all 114 real Surah rows.').toHaveCount(114)
        await page.getByRole('button', { name: 'Open' }).first().focus()
        await expect(page.getByRole('button', { name: 'Open' }).first()).toBeFocused()
      }

      if (fixture.id === 'bookmarks-populated') {
        await expect(page.getByRole('heading', { name: 'Bookmarks' })).toBeVisible()
        await expect(page.getByText(/No bookmarks for the active riwayah/i), 'RPA-004: seeded bookmarks must affect rendered output.').toHaveCount(0)
        await expect(page.getByText(/1:1|Al-Fatihah/i)).toBeVisible()
      }

      await expectNoGuardFailures(guard)
      guard.dispose()
    })
  }
}
