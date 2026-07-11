import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  expectAxeClean,
  expectMinTouchTarget,
  expectNoHorizontalOverflow,
  expectRenderedBorderContrast,
  expectRenderedContrast,
} from '../fixtures/react-a11y'
import {
  expectNoGuardFailures,
  expectReactProductionPreflight,
  GOLDEN_FIXTURES,
  GOLDEN_VIEWPORTS,
  installPageGuards,
  seedTargetState,
  targetUrl,
  type GoldenViewportId,
} from '../fixtures/react-golden-routes'

const settingsViewports = GOLDEN_FIXTURES.find((fixture) => fixture.id === 'settings-over-reader')!.viewports

async function setupConfigurePage(page: Page, viewportId: GoldenViewportId, route = '#/settings') {
  await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
  await expectReactProductionPreflight(page)
  await seedTargetState(page, 'react', 'onboarded-last-surface-reader')
  const guard = installPageGuards(page, `react configure ${viewportId}`, [
    /\/dataset\/indexes\/(?:mushaf|sources|text)-assets\.json$/,
    /\/dataset\/knowledge\/passages\/001\.json$/,
    /\/dataset\/mushaf-pages\/qaloon\/qalun-quran-ws-v1\/(?:manifest\.json|pages\/\d{3}\.svg)$/,
    /\/dataset\/provenance\.json$/,
    /\/dataset\/translations\/_verse-aliases\.json$/,
  ])
  await page.goto(targetUrl('react', route))
  await expect(page.locator('#react-root')).toBeVisible()
  return guard
}

for (const viewportId of settingsViewports) {
  test(`@golden @a11y settings-over-reader ${viewportId}`, async ({ page }) => {
    const guard = await setupConfigurePage(page, viewportId)
    await expect(page).toHaveURL(/#\/s\/1$/)
    const shell = page.getByRole('dialog', { name: 'Verse settings' })
    const heading = shell.getByRole('heading', { name: 'Verse settings' })
    const close = shell.getByRole('button', { name: 'Close settings' })
    const body = shell.locator('.qar-react-settings-body')
    const includedAssets = shell.getByRole('region', { name: 'Included reading assets' })
    const assetsToggle = includedAssets.getByRole('button', { name: /included reading assets/i })

    await expect(shell).toBeVisible()
    await expect(heading).toBeVisible()
    await expect.poll(() => isPaintedAtCenter(heading)).toBe(true)
    await expect.poll(() => isPaintedAtCenter(close)).toBe(true)
    await expect(shell.getByRole('region', { name: 'Verse reading' })).toBeVisible()
    await expect(shell.getByRole('region', { name: 'Page layout' })).toHaveCount(0)
    await expect(page.getByRole('main', { name: 'Verse reader' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    if (await assetsToggle.getAttribute('aria-expanded') === 'false') await assetsToggle.click()
    await expect(assetsToggle).toHaveAttribute('aria-expanded', 'true')
    await expect(includedAssets.getByText('Uthmani KFGQPC + KFGQPC Qaloon')).toBeVisible()

    const layout = await shell.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const scrollingBody = element.querySelector('.qar-react-settings-body')
      return {
        bottom: rect.bottom,
        bodyClientHeight: scrollingBody?.clientHeight ?? 0,
        bodyScrollHeight: scrollingBody?.scrollHeight ?? 0,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        width: rect.width,
      }
    })
    expect(layout.left).toBeGreaterThanOrEqual(0)
    expect(layout.top).toBeGreaterThanOrEqual(0)
    expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth + 1)
    expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1)
    expect(layout.bodyScrollHeight).toBeGreaterThanOrEqual(layout.bodyClientHeight)

    if (layout.bodyScrollHeight > layout.bodyClientHeight + 1) {
      await body.evaluate((element) => { element.scrollTop = element.scrollHeight })
      await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    }
    await expect(includedAssets).toBeVisible()
    await expect(includedAssets.getByText('Bridges')).toBeVisible()
    await expect(heading).toBeVisible()
    await expect.poll(() => isPaintedAtCenter(heading)).toBe(true)

    if (['phone-small', 'phone-standard', 'phone-landscape'].includes(viewportId)) {
      expect(layout.width).toBeGreaterThanOrEqual(layout.viewportWidth - 1)
      expect(layout.height).toBeGreaterThanOrEqual(layout.viewportHeight - 1)
    } else {
      expect(layout.left).toBeGreaterThanOrEqual(layout.viewportWidth - 449)
      expect(layout.width).toBeLessThan(layout.viewportWidth)
      expect(layout.width).toBeLessThanOrEqual(448)
      await expect.poll(() => backdropOwnsReaderChromePoint(page, shell)).toBe(true)
    }

    const touchTargets = [
      close,
      assetsToggle,
      ...await shell.getByRole('button', { name: /^(?:Theme|Night mode):/ }).all(),
      ...await shell.getByRole('switch').all(),
    ]
    for (const target of touchTargets) await expectMinTouchTarget(target, 44)

    await expectAxeClean(page)
    await expectNoGuardFailures(guard)
    guard.dispose()
  })
}

for (const viewportId of ['phone-standard', 'desktop'] as const) {
  test(`@golden @a11y about-page ${viewportId}`, async ({ page }) => {
    const guard = await setupConfigurePage(page, viewportId, '#/about')
    const main = page.getByRole('main', { name: 'About' })
    await expect(main.getByRole('heading', { name: 'QuranAtlas' })).toBeVisible()
    await expect(page.getByText('Read, reflect, remember.')).toBeVisible()
    await expect(page.getByText(/وَلَقَدۡ يَسَّرۡنَا/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Attribution' })).toBeVisible()
    await expect(page.getByText(/English translation: Bridges/)).toBeVisible()
    await expect(page.getByTestId('about-version')).toContainText(/^v.+ · .+/)
    await expect(page.getByText(/verified reader, navigation, settings, search, bookmarks, and Daily Wird workflows/i)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /switch to (?:verse|mushaf) view/i })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
    await expectAxeClean(page)

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
    await expectNoGuardFailures(guard)
    guard.dispose()
  })
}

test.describe('settings focus and route ownership', () => {
  test('@golden traps focus, dismisses by Escape and outside click, and restores the opener', async ({ page }) => {
    const guard = await setupConfigurePage(page, 'desktop', '#/s/1')
    const opener = page.getByRole('button', { name: 'Open settings' })
    await opener.click()
    const shell = page.getByRole('dialog', { name: 'Verse settings' })
    const firstControl = shell.getByRole('button', { name: 'Close settings' })
    const lastControl = shell.getByRole('button', { name: /included reading assets/i })
    await expect(shell).toBeVisible()

    await firstControl.focus()
    await expect(firstControl).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(lastControl).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(firstControl).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(shell).toHaveCount(0)
    await expect(opener).toBeFocused()

    await opener.click()
    await expect(shell).toBeVisible()
    await expect.poll(() => backdropOwnsReaderChromePoint(page, shell)).toBe(true)
    await page.mouse.click(8, 200)
    await expect(shell).toHaveCount(0)
    await expect(opener).toBeFocused()
    await expectNoGuardFailures(guard)
    guard.dispose()
  })

  test('@golden direct Settings and assets routes preserve mode ownership', async ({ page }) => {
    const guard = await setupConfigurePage(page, 'phone-standard', '#/m/42')
    await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
    await page.goto(targetUrl('react', '#/settings'))
    let mushafShell = page.getByRole('dialog', { name: 'Mushaf settings' })
    await expectMushafSettingsTargets(mushafShell)

    await page.keyboard.press('Escape')
    await page.setViewportSize(GOLDEN_VIEWPORTS.desktop)
    await page.goto(targetUrl('react', '#/settings'))
    mushafShell = page.getByRole('dialog', { name: 'Mushaf settings' })
    await expectMushafSettingsTargets(mushafShell)

    await page.keyboard.press('Escape')
    await page.goto(targetUrl('react', '#/assets'))
    const assets = page.getByRole('dialog', { name: 'Mushaf settings' }).getByRole('region', { name: 'Included reading assets' })
    await expect(assets.getByRole('button', { name: 'Hide included reading assets' })).toHaveAttribute('aria-expanded', 'true')
    await expect(assets.getByText('Bridges')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toHaveCount(0)
    await expectNoGuardFailures(guard)
    guard.dispose()
  })

  test('@golden Search has no reading-view action', async ({ page }) => {
    const guard = await setupConfigurePage(page, 'phone-standard', '#/search')
    await expect(page.getByRole('main', { name: /search/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /switch to (?:verse|mushaf) view/i })).toHaveCount(0)
    await expectNoGuardFailures(guard)
    guard.dispose()
  })
})

test('@golden @a11y Settings themes retain rendered contrast', async ({ page }) => {
  const guard = await setupConfigurePage(page, 'desktop')
  const shell = page.getByRole('dialog', { name: 'Verse settings' })
  const scrollingBody = shell.locator('.qar-react-settings-body')
  const group = shell.getByRole('region', { name: 'Verse reading' })
  const rowText = group.getByText('Translation', { exact: true })
  const heading = shell.getByRole('heading', { name: 'Verse settings' })
  const states = [
    { button: 'Theme: Light', night: null, theme: 'light' },
    { button: 'Theme: Sepia', night: null, theme: 'sepia' },
    { button: 'Theme: Dark', night: null, theme: 'dark' },
    { button: 'Theme: Auto', night: null, theme: /light|dark/, themePreference: 'auto' },
    { button: 'Theme: Light', night: 'Night mode: On', theme: 'light' },
  ] as const

  for (const state of states) {
    await shell.getByRole('button', { name: state.button }).click()
    if (state.night) await shell.getByRole('button', { name: state.night }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', state.theme)
    if ('themePreference' in state) await expect(page.locator('html')).toHaveAttribute('data-theme-pref', state.themePreference)
    if (state.night) await expect(page.locator('html')).toHaveAttribute('data-night-mode', 'on')
    else await expect(page.locator('html')).not.toHaveAttribute('data-night-mode', 'on')

    const selected = shell.getByRole('button', { name: state.night ?? state.button })
    await expectAxeClean(page)
    await expectRenderedContrast(rowText, group, 4.5)
    await expectRenderedContrast(heading, shell, 3)
    await expectRenderedContrast(selected, selected, 3)
    await expectRenderedBorderContrast(selected, group, 3)
    await expectRenderedBorderContrast(group, scrollingBody, 3)
  }

  await expectNoGuardFailures(guard)
  guard.dispose()
})

async function isPaintedAtCenter(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const painted = document.elementFromPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2))
    return painted === element || element.contains(painted)
  })
}

async function backdropOwnsReaderChromePoint(page: Page, shell: Locator): Promise<boolean> {
  const shellLeft = await shell.evaluate((element) => element.getBoundingClientRect().left)
  return page.evaluate((x) => {
    const painted = document.elementFromPoint(x, 28)
    const readerChrome = document.querySelector('[aria-label="Primary navigation"]')
    return painted !== null && !readerChrome?.contains(painted)
  }, Math.max(8, shellLeft / 2))
}

async function expectMushafSettingsTargets(shell: Locator): Promise<void> {
  await expect(shell.getByRole('region', { name: 'Page layout' })).toBeVisible()
  await expect(shell.getByRole('region', { name: 'Verse reading' })).toHaveCount(0)
  for (const target of await shell.getByRole('radio').all()) await expectMinTouchTarget(target, 44)
  for (const target of await shell.getByRole('switch').all()) await expectMinTouchTarget(target, 44)
}
