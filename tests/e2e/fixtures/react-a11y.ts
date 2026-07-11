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

export async function expectRenderedContrast(foreground: Locator, background: Locator, minimum: number) {
  const [foregroundColor, backgroundColor] = await Promise.all([
    foreground.evaluate((element) => getComputedStyle(element).color),
    background.evaluate((element) => getComputedStyle(element).backgroundColor),
  ])
  expectContrastRatio(foregroundColor, backgroundColor, minimum)
}

export async function expectRenderedBorderContrast(boundary: Locator, background: Locator, minimum: number) {
  const [borderColor, backgroundColor] = await Promise.all([
    boundary.evaluate((element) => getComputedStyle(element).borderTopColor),
    background.evaluate((element) => getComputedStyle(element).backgroundColor),
  ])
  expectContrastRatio(borderColor, backgroundColor, minimum)
}

function expectContrastRatio(foregroundColor: string, backgroundColor: string, minimum: number) {
  const parse = (value: string) => {
    const channels = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
    return value.startsWith('color(srgb ') ? channels : channels.map((channel) => channel / 255)
  }
  const luminance = (value: string) => {
    const channels = parse(value).map((channel) => {
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return (0.2126 * channels[0]!) + (0.7152 * channels[1]!) + (0.0722 * channels[2]!)
  }
  const lighter = Math.max(luminance(foregroundColor), luminance(backgroundColor))
  const darker = Math.min(luminance(foregroundColor), luminance(backgroundColor))
  expect((lighter + 0.05) / (darker + 0.05)).toBeGreaterThanOrEqual(minimum)
}

export async function expectFocusRestored(opener: Locator, action: () => Promise<void>) {
  await opener.focus()
  await action()
  await expect(opener).toBeFocused()
}

export async function expectStatusText(page: Page, pattern: RegExp) {
  await expect(page.getByRole('status').filter({ hasText: pattern }).first()).toBeVisible()
}
