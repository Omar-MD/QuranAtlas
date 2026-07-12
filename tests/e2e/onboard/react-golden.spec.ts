import { expect, test, type Page } from '@playwright/test'

import { QURAN_ATLAS_DB_NAME } from '../../../src/storage/schema'
import { expectAxeClean, expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import {
  clearTargetStorage,
  expectNoGuardFailures,
  expectReactProductionPreflight,
  GOLDEN_FIXTURES,
  GOLDEN_VIEWPORTS,
  installPageGuards,
  PRIVATE_MUSHAF_ENABLED,
  PRIVATE_MUSHAF_EDITION_ID,
  seedReactMushafState,
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
    { dbName: QURAN_ATLAS_DB_NAME },
  )
}

test.describe('private Furatiyyah setup', () => {
  test.skip(!PRIVATE_MUSHAF_ENABLED, 'Private Mushaf journeys require QURANATLAS_PRIVATE_MUSHAF=1.')

  test('keeps a fresh private deep link after the one-time selection', async ({ page }) => {
    await page.setViewportSize(GOLDEN_VIEWPORTS['phone-standard'])
    await expectReactProductionPreflight(page)
    await clearTargetStorage(page, 'react')
    const guard = installPageGuards(page, 'private edition setup')
    await page.goto(targetUrl('react', '/#/m/42'))

    const setup = page.getByRole('main', { name: 'Mushaf edition setup' })
    await expect(setup).toBeVisible()
    await setup.getByRole('combobox', { name: 'Mushaf edition' }).click()
    await page.getByRole('option', { name: 'Qalun Furatiyyah 2023' }).click()
    await setup.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
    await expect(page.getByRole('img', { name: /Mushaf page 42, Qaloon/i })).toBeVisible()
    await expect(readReactSettings(page)).resolves.toMatchObject({
      mushafEditionId: PRIVATE_MUSHAF_EDITION_ID,
      mushafEditionSetupVersion: 1,
    })
    await expectNoGuardFailures(guard)
    guard.dispose()
  })
})

test('retries transient edition availability and preserves the requested deep link', async ({ page }) => {
  await page.setViewportSize(GOLDEN_VIEWPORTS['phone-standard'])
  await expectReactProductionPreflight(page)
  await seedReactMushafState(page, { mushafFitWidth: false, mushafViewMode: 'auto' })
  await expect(readReactSettings(page)).resolves.toMatchObject({
    mushafEditionId: 'qalun-quran-ws-v1',
    mushafEditionSetupVersion: 1,
  })
  await page.addInitScript(() => {
    const fetcher = window.fetch.bind(window)
    let availabilityRestored = false
    ;(window as typeof window & { restoreMushafEditionAvailability?: () => void }).restoreMushafEditionAvailability = () => {
      availabilityRestored = true
    }
    window.fetch = async (input, init) => {
      const rawUrl = typeof input === 'string' || input instanceof URL ? input.toString() : input.url
      if (!availabilityRestored && new URL(rawUrl, window.location.origin).pathname === '/dataset/indexes/mushaf-assets.json') {
        return new Response('temporarily unavailable', { status: 503 })
      }
      return fetcher(input, init)
    }
  })
  const guard = installPageGuards(page, 'edition availability retry', [/\/dataset\/surahs\.json$/])

  await page.goto(targetUrl('react', '/#/m/42'))
  await expect(page.getByRole('status')).toContainText('Could not check Mushaf edition availability')
  await page.evaluate(() => {
    ;(window as typeof window & { restoreMushafEditionAvailability?: () => void }).restoreMushafEditionAvailability?.()
  })
  await page.getByRole('button', { name: 'Retry edition availability' }).click()

  await expect(page).toHaveURL(/#\/m\/42$/)
  await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
  await expectNoGuardFailures(guard)
  guard.dispose()
})

for (const fixture of onboardFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      test.skip(PRIVATE_MUSHAF_ENABLED, 'The private artifact intentionally offers a fresh edition choice in the dedicated private setup journey.')
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await expectReactProductionPreflight(page)
      await seedTargetState(page, 'react', fixture.seed)
      const guard = installPageGuards(page, `react ${fixture.id}`, [
        /\/dataset\/knowledge\/passages\/001\.json$/,
        /\/dataset\/translations\/_verse-aliases\.json$/,
      ])
      await page.goto(targetUrl('react', '/'))
      await expect(page.locator('#react-root')).toBeVisible()
      await expect(page, 'RPA-001/RPA-007: clean production launch must open the default reader.').toHaveURL(/#\/s\/1$/)
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /choose riwayah|choose translation/i })).toHaveCount(0)
      await expect(readReactSettings(page)).resolves.toMatchObject({
        mvpAssetContractId: 'mvp-default-assets-qaloon-bridges-v1',
        riwayah: 'qaloon',
        quranTextStyleId: 'uthmani-kfgqpc-v1',
        mushafEditionId: 'qalun-quran-ws-v1',
        translationId: 'bridges',
        mushafEditionSetupVersion: 1,
      })
      await expect(readReactSettings(page)).resolves.not.toHaveProperty('onboardingComplete')
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
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
