import { expect, test, type Page } from '@playwright/test'

import { expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { seedReactMushafState } from '../fixtures/react-golden-routes'

type MushafPrefs = {
  mushafFitWidth: boolean
  mushafViewMode: 'auto' | 'fit-page' | 'fit-width' | 'continuous'
}

type Box = {
  bottom: number
  centerX: number
  centerY: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

const RESPONSIVE_VIEWPORTS = [
  { label: 'phone portrait', width: 390, height: 844 },
  { label: 'phone landscape', width: 844, height: 390 },
  { label: 'tablet portrait', width: 768, height: 1024 },
  { label: 'tablet landscape', width: 1180, height: 820 },
  { label: 'desktop', width: 1440, height: 900 },
] as const

async function openMushaf(page: Page, prefs: MushafPrefs, pageNo = 42): Promise<void> {
  await seedReactMushafState(page, prefs)
  await page.goto(`/#/m/${pageNo}`)
  await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
  await expect(page.getByRole('img', { name: /Mushaf page/i })).toBeVisible()
}

async function layoutMetrics(page: Page): Promise<{
  bookmark: Box | null
  counter: Box | null
  documentClientWidth: number
  documentScrollWidth: number
  fitWidth: string | null
  nav: Box | null
  page: Box | null
  currentCell: Box | null
  nextCell: Box | null
  stage: Box | null
  stageClientHeight: number
  stageScrollHeight: number
  stageScrollTop: number
  surah: Box | null
}> {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        bottom: rect.bottom,
        centerX: rect.left + (rect.width / 2),
        centerY: rect.top + (rect.height / 2),
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      }
    }
    const root = document.scrollingElement ?? document.documentElement
    const surface = document.querySelector<HTMLElement>('.qar-react-mushaf-page-surface')
    const stage = document.querySelector<HTMLElement>('.qar-react-mushaf-page-stage')
    return {
      bookmark: box('.qar-react-mushaf-bookmark-toggle'),
      counter: box('.qar-react-mushaf-page-counter'),
      documentClientWidth: root.clientWidth,
      documentScrollWidth: root.scrollWidth,
      fitWidth: surface?.dataset.mushafFitWidth ?? null,
      nav: box('nav[aria-label="Primary navigation"]'),
      page: box('[data-mushaf-cell="current"] svg'),
      currentCell: box('[data-mushaf-cell="current"]'),
      nextCell: box('[data-mushaf-cell="next"]'),
      stage: box('.qar-react-mushaf-page-stage'),
      stageClientHeight: stage?.clientHeight ?? 0,
      stageScrollHeight: stage?.scrollHeight ?? 0,
      stageScrollTop: stage?.scrollTop ?? 0,
      surah: box('.qar-react-mushaf-page-surah'),
    }
  })
}

async function mushafChromeOpacity(page: Page): Promise<{
  bookmark: string | null
  counter: string | null
  surah: string | null
}> {
  return page.evaluate(() => {
    const opacity = (selector: string) => {
      const element = document.querySelector(selector)
      return element ? window.getComputedStyle(element).opacity : null
    }
    return {
      bookmark: opacity('.qar-react-mushaf-bookmark-toggle'),
      counter: opacity('.qar-react-mushaf-page-counter'),
      surah: opacity('.qar-react-mushaf-page-surah'),
    }
  })
}

async function wheelUntilMushafPage(page: Page, pageNo: number): Promise<void> {
  const stage = page.locator('.qar-react-mushaf-page-stage')
  await stage.hover()

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.mouse.wheel(0, 520)
    if (new RegExp(`#/m/${pageNo}$`).test(page.url())) return
    await page.waitForURL(new RegExp(`#/m/${pageNo}$`), { timeout: 500 }).catch(() => undefined)
  }
}

async function dragMushafPage(page: Page, from: number, to: number): Promise<void> {
  const currentPage = page.getByRole('img', { name: /Mushaf page/i })
  const pageBox = await currentPage.boundingBox()
  expect(pageBox).not.toBeNull()

  const y = pageBox!.y + pageBox!.height / 2
  await page.mouse.move(pageBox!.x + pageBox!.width * from, y)
  await page.mouse.down()
  await page.mouse.move(pageBox!.x + pageBox!.width * to, y, { steps: 4 })
  await page.mouse.up()
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

test.describe('Mushaf responsive behavior', () => {
  test('Single + Fit width does not create horizontal document overflow', async ({ page }) => {
    for (const viewport of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'fit-page' })

      await expectNoHorizontalOverflow(page)
    }
  })

  test('Scroll + Fit width scrolls current page before route changes', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'continuous' })

    const before = await layoutMetrics(page)
    expect(before.stageScrollHeight).toBeGreaterThan(before.stageClientHeight)

    await page.mouse.wheel(0, 500)

    await expect.poll(async () => {
      const metrics = await layoutMetrics(page)
      return metrics.stageScrollTop
    }).toBeGreaterThan(0)
    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('Settings overlay blocks Mushaf page-turn keys', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    await page.getByRole('button', { name: 'Open settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.keyboard.press('ArrowLeft')

    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('Mobile single-page swipes follow Mushaf page direction', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    await dragMushafPage(page, 0.18, 0.72)

    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()

    await dragMushafPage(page, 0.72, 0.18)

    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()
  })

  test('Mobile single-page partial swipe does not complete a page turn', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    await dragMushafPage(page, 0.42, 0.58)

    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()
  })

  test('Scroll mode does not keep horizontal edge tap page turns', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'continuous' })

    await page.mouse.click(8, 422)

    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('Scroll mode updates route when the next page becomes dominant', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'continuous' })
    await expect(page.locator('[data-mushaf-cell="next"]')).toHaveAttribute('data-mushaf-cell-page', '43')

    const stage = page.locator('.qar-react-mushaf-page-stage')
    await stage.hover()
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await page.mouse.wheel(0, 520)
      if (/#\/m\/43$/.test(page.url())) break
      await page.waitForURL(/#\/m\/43$/, { timeout: 500 }).catch(() => undefined)
    }

    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.locator('[data-mushaf-cell="next"]')).toHaveAttribute('data-mushaf-cell-page', '44')
    const after = await layoutMetrics(page)
    expect(after.currentCell).not.toBeNull()
    expect(after.currentCell!.top).toBeGreaterThan(after.stage!.top + (after.stage!.height * 0.25))
    expect(after.currentCell!.top).toBeLessThan(after.stage!.bottom)
  })

  test('Scroll mode helper reaches the next page', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'continuous' })
    await wheelUntilMushafPage(page, 43)

    await expect(page).toHaveURL(/#\/m\/43$/)
  })

  test('Scroll mode tap reveals hidden Mushaf chrome after page navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await openMushaf(page, { mushafFitWidth: true, mushafViewMode: 'continuous' })
    const stage = page.locator('.qar-react-mushaf-page-stage')
    await wheelUntilMushafPage(page, 43)
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect.poll(async () => (await mushafChromeOpacity(page)).counter).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).surah).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).bookmark).toBe('0')

    await stage.click()

    await expect.poll(async () => (await mushafChromeOpacity(page)).counter).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).surah).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).bookmark).toBe('1')
    await stage.click()
    await expect.poll(async () => (await mushafChromeOpacity(page)).counter).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).surah).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).bookmark).toBe('0')
  })

  test('Escape reveals hidden Mushaf chrome after page navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()
    await expect.poll(async () => (await mushafChromeOpacity(page)).counter).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).surah).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).bookmark).toBe('0')

    await page.keyboard.press('Escape')

    await expect.poll(async () => (await mushafChromeOpacity(page)).counter).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).bookmark).toBe('1')
    await expect.poll(async () => (await mushafChromeOpacity(page)).surah).toBe('1')
  })

  test('Mushaf chrome avoids page and control overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    const metrics = await layoutMetrics(page)

    expect(metrics.counter).not.toBeNull()
    expect(metrics.bookmark).not.toBeNull()
    expect(metrics.nav).not.toBeNull()
    expect(metrics.page).not.toBeNull()
    expect(metrics.surah).not.toBeNull()

    expect(boxesOverlap(metrics.counter!, metrics.bookmark!)).toBe(false)
    expect(metrics.bookmark!.left).toBeGreaterThan(metrics.counter!.right)
    expect(metrics.surah!.right).toBeLessThanOrEqual(metrics.documentClientWidth)
    expect(Math.abs(metrics.surah!.right - metrics.page!.right)).toBeLessThanOrEqual(4)
    expect(Math.abs(metrics.counter!.centerX - metrics.page!.centerX)).toBeLessThanOrEqual(4)
    expect(metrics.nav!.bottom).toBeLessThanOrEqual(metrics.page!.top)
    expect(metrics.counter!.top).toBeGreaterThanOrEqual(metrics.page!.bottom)
  })

  test('Mobile single page stays centered between persistent Mushaf metadata', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    const metrics = await layoutMetrics(page)

    expect(metrics.counter).not.toBeNull()
    expect(metrics.page).not.toBeNull()
    expect(metrics.surah).not.toBeNull()

    const readingTop = metrics.surah!.bottom + 8
    const readingBottom = metrics.counter!.top - 8
    const readingCenter = (readingTop + readingBottom) / 2
    const pageCenter = (metrics.page!.top + metrics.page!.bottom) / 2

    expect(metrics.page!.top).toBeGreaterThanOrEqual(readingTop)
    expect(metrics.page!.bottom).toBeLessThanOrEqual(readingBottom)
    expect(Math.abs(pageCenter - readingCenter)).toBeLessThanOrEqual(28)
    expect(metrics.page!.height / (readingBottom - readingTop)).toBeGreaterThan(0.72)
  })

  test('Mobile single page layout stays fixed when Mushaf chrome hides', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    const before = await layoutMetrics(page)
    expect(before.page).not.toBeNull()
    expect(before.counter).not.toBeNull()
    expect(before.surah).not.toBeNull()

    await page.mouse.click(before.page!.centerX, before.page!.centerY)

    await expect.poll(async () => (await mushafChromeOpacity(page)).bookmark).toBe('0')
    const after = await layoutMetrics(page)
    expect(after.page).not.toBeNull()
    expect(after.counter).not.toBeNull()
    expect(after.surah).not.toBeNull()

    expect(Math.abs(after.page!.top - before.page!.top)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.page!.bottom - before.page!.bottom)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.surah!.right - before.surah!.right)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.counter!.centerX - before.counter!.centerX)).toBeLessThanOrEqual(1)
  })

  test('Mobile landscape defaults Mushaf to Fit width and still allows user opt-out', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await openMushaf(page, { mushafFitWidth: false, mushafViewMode: 'fit-page' })

    await expect.poll(async () => (await layoutMetrics(page)).fitWidth).toBe('true')
    const landscape = await layoutMetrics(page)
    expect(landscape.stageScrollHeight).toBeGreaterThan(landscape.stageClientHeight)

    await page.getByRole('button', { name: 'Open settings' }).click()
    const fitWidth = page.getByRole('switch', { name: 'Fit width' })
    await expect(fitWidth).toBeChecked()

    await fitWidth.click()
    await expect(fitWidth).not.toBeChecked()
    await page.getByRole('button', { exact: true, name: 'Close settings' }).click()

    await expect.poll(async () => (await layoutMetrics(page)).fitWidth).toBe('false')
  })
})
