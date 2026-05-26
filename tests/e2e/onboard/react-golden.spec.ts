import { expect, test, type Locator, type Page } from '@playwright/test'

import { DB_NAME } from '../../../src/core/db/migrations.js'
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

const onboardFixtures = GOLDEN_FIXTURES.filter((fixture) => fixture.id === 'launch-fresh-onboarding')

async function readReactSettings(page: Page) {
  return page.evaluate(
    async ({ dbName }) => new Promise<Record<string, unknown>>((resolve, reject) => {
      const open = indexedDB.open(dbName)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('settings', 'readonly')
        const request = tx.objectStore('settings').getAll()
        request.onsuccess = () => {
          db.close()
          resolve(Object.fromEntries(request.result.map((record: { key: string; value: unknown }) => [record.key, record.value])))
        }
        request.onerror = () => {
          db.close()
          reject(request.error)
        }
      }
      open.onerror = () => reject(open.error)
    }),
    { dbName: DB_NAME },
  )
}

async function expectOnboardingTokenStyles(page: Page) {
  const selected = page.getByRole('button', { name: /Qaloon an Nafi/i })
  const disabled = page.getByRole('button', { name: /Hafs an Asim/i })
  const selectedHandle = await selected.elementHandle()
  const disabledHandle = await disabled.elementHandle()
  expect(selectedHandle).not.toBeNull()
  expect(disabledHandle).not.toBeNull()
  const styleProof = await selectedHandle!.evaluate((selectedElement, disabledElement) => {
    const root = getComputedStyle(document.documentElement)
    const selectedStyle = getComputedStyle(selectedElement)
    const disabledStyle = getComputedStyle(disabledElement as Element)
    return {
      accentToken: root.getPropertyValue('--qa-react-accent').trim(),
      borderToken: root.getPropertyValue('--qa-react-border').trim(),
      focusToken: root.getPropertyValue('--qa-react-focus').trim(),
      selectionToken: root.getPropertyValue('--qa-react-reader-selection').trim(),
      surfaceToken: root.getPropertyValue('--qa-react-surface').trim(),
      textToken: root.getPropertyValue('--qa-react-text').trim(),
      mutedToken: root.getPropertyValue('--qa-react-text-muted').trim(),
      dangerToken: root.getPropertyValue('--qa-react-danger').trim(),
      selectedBackground: selectedStyle.backgroundColor,
      selectedColor: selectedStyle.color,
      disabledOpacity: disabledStyle.opacity,
      disabledCursor: disabledStyle.cursor,
    }
  }, disabledHandle)

  expect(styleProof).toMatchObject({
    accentToken: expect.stringMatching(/\S/),
    borderToken: expect.stringMatching(/\S/),
    focusToken: expect.stringMatching(/\S/),
    selectionToken: expect.stringMatching(/\S/),
    surfaceToken: expect.stringMatching(/\S/),
    textToken: expect.stringMatching(/\S/),
    mutedToken: expect.stringMatching(/\S/),
    dangerToken: expect.stringMatching(/\S/),
  })
  expect(styleProof.selectedBackground).not.toBe('rgba(0, 0, 0, 0)')
  expect(styleProof.selectedColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(Number(styleProof.disabledOpacity)).toBeLessThan(1)
  expect(styleProof.disabledCursor).toBe('default')
}

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
  expect(box?.width).toBeGreaterThanOrEqual(44)
}

for (const fixture of onboardFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await expectReactProductionPreflight(page)
      await seedTargetState(page, 'svelte', fixture.seed)
      await page.goto(targetUrl('svelte', '/'))
      await expect(page, 'Svelte oracle clean launch should route first-run users to onboarding.').toHaveURL(/#\/onboarding$/)

      await seedTargetState(page, 'react', fixture.seed)
      const guard = installPageGuards(page, `react ${fixture.id}`)
      const sourcesLoaded = page.waitForResponse((response) =>
        response.url().endsWith('/dataset/indexes/sources.json') && response.ok(),
      )
      await page.goto(targetUrl('react', '/'))
      await expect(page.locator('#react-root')).toBeVisible()
      await expect(page, 'RPA-001/RPA-007: React clean production launch must match Svelte first-run onboarding gate.').toHaveURL(/#\/onboarding$/)
      await expect(page.getByRole('banner'), 'React onboarding should not show ambient shell chrome.').toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Choose Riwayah' })).toBeVisible()
      await sourcesLoaded
      const qaloon = page.getByRole('button', { name: /Qaloon an Nafi/i })
      const hafs = page.getByRole('button', { name: /Hafs an Asim/i })
      const continueButton = page.getByRole('button', { name: 'Continue' })
      await expect(qaloon).toBeEnabled()
      await expect(qaloon).toHaveAttribute('aria-pressed', 'true')
      await expect(hafs).toBeDisabled()
      await expectOnboardingTokenStyles(page)
      await expectTouchTarget(qaloon)
      await expectTouchTarget(hafs)
      await expectTouchTarget(continueButton)
      await expect(page.getByRole('heading', { name: 'Choose Riwayah' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(qaloon).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(continueButton).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('heading', { name: 'Choose Translation' })).toBeVisible()
      await expect(readReactSettings(page)).resolves.not.toHaveProperty('onboardingComplete')
      const bridges = page.getByRole('button', { name: /Bridges/i })
      const openButton = page.getByRole('button', { name: 'Open Al-Fatihah' })
      await expect(bridges).toBeEnabled()
      await expectTouchTarget(bridges)
      await expectTouchTarget(openButton)
      await expect(page.getByRole('heading', { name: 'Choose Translation' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(bridges).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Back' })).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(openButton).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/#\/s\/1$/)
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(readReactSettings(page)).resolves.toMatchObject({
        onboardingComplete: true,
        riwayah: 'qaloon',
        translationId: 'bridges',
      })
      await page.goto(targetUrl('react', '/'))
      await expect(page).toHaveURL(/#\/s\/1$/)
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expectNoHorizontalOverflow(page)
      await expectAxeClean(page)
      await expectNoGuardFailures(guard)
      guard.dispose()
    })
  }
}
