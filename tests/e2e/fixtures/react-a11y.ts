import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

export async function expectAxeClean(page: Page, includeSelector = '#react-root') {
  const results = await new AxeBuilder({ page }).include(includeSelector).analyze()
  expect(results.violations).toEqual([])
}

export async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    { message: 'page must not have horizontal overflow after layout settles' },
  ).toBe(false)
}

export async function expectMinTouchTarget(locator: Locator, minSize = 40) {
  const box = await locator.boundingBox()
  expect(box, 'touch target has a bounding box').not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(minSize)
  expect(box!.height).toBeGreaterThanOrEqual(minSize)
}

export async function expectFocusRestored(opener: Locator, action: () => Promise<void>) {
  await opener.focus()
  await action()
  await expect(opener).toBeFocused()
}

export async function expectStatusText(page: Page, pattern: RegExp) {
  await expect(page.getByRole('status').filter({ hasText: pattern }).first()).toBeVisible()
}
