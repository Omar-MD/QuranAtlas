import { expect, test, type Page } from '@playwright/test'

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

for (const fixture of onboardFixtures) {
  for (const viewportId of fixture.viewports) {
    test(`@golden @a11y ${fixture.id} ${viewportId}`, async ({ page }) => {
      await page.setViewportSize(GOLDEN_VIEWPORTS[viewportId])
      await expectReactProductionPreflight(page)
      await seedTargetState(page, 'svelte', fixture.seed)
      await page.goto(targetUrl('svelte', '/'))
      await expect(page, 'Svelte oracle clean launch should route first-run users to the default reader.').toHaveURL(/#\/s\/1$/)

      await seedTargetState(page, 'react', fixture.seed)
      const guard = installPageGuards(page, `react ${fixture.id}`)
      await page.goto(targetUrl('react', '/'))
      await expect(page.locator('#react-root')).toBeVisible()
      await expect(page, 'RPA-001/RPA-007: React clean production launch must match Svelte default reader launch.').toHaveURL(/#\/s\/1$/)
      await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /choose riwayah|choose translation/i })).toHaveCount(0)
      await expect(readReactSettings(page)).resolves.toMatchObject({
        mvpAssetContractId: 'mvp-default-assets-qaloon-bridges-v1',
        riwayah: 'qaloon',
        quranTextStyleId: 'uthmani-kfgqpc-v1',
        mushafEditionId: 'qalun-quran-ws-v1',
        translationId: 'bridges',
      })
      await expect(readReactSettings(page)).resolves.not.toHaveProperty('onboardingComplete')
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
