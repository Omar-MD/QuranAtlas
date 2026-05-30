import { expect, type Page } from '@playwright/test'

import { expectNoGuardFailures, installPageGuards } from './react-golden-routes'

export async function expectReactServiceWorkerReady(page: Page) {
  await expect(async () => {
    const ready = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5_000)),
      ])
      return Boolean(registration?.active)
    })
    expect(ready).toBe(true)
  }).toPass({ timeout: 12_000 })
}

export async function expectOfflineReaderLoads(page: Page) {
  const guard = installPageGuards(page, 'react offline reload')
  await page.context().setOffline(true)
  try {
    await page.reload()
    await expect(page.locator('#react-root')).toBeVisible()
    await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
    await expect(page.getByText(/Verse text unavailable/i), 'RPA-010: offline proof must render cached dataset content, not preview fallback copy.').toHaveCount(0)
    await expectNoGuardFailures(guard)
  } finally {
    guard.dispose()
    await page.context().setOffline(false)
  }
}
