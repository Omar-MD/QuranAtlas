import { test } from '@playwright/test'

import { expectOfflineReaderLoads, expectReactServiceWorkerReady } from '../fixtures/react-offline'

test.skip(process.env.PLAYWRIGHT_INCLUDE_OFFLINE !== '1', 'React offline proof runs only against the preview build.')

test('@offline React app shell and installed reader assets survive offline reload', async ({ page }) => {
  await page.goto('/#/s/1')
  await expectReactServiceWorkerReady(page)
  await expectOfflineReaderLoads(page)
})
