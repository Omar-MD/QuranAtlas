import { expect, test, type CDPSession, type Page } from '@playwright/test'

import { expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import {
  openSeededReactMushafRoute,
  PRIVATE_MUSHAF_EDITION_ID,
  PRIVATE_MUSHAF_ENABLED,
} from '../fixtures/react-golden-routes'

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

const FIT_PAGE: MushafPrefs = { mushafFitWidth: false, mushafViewMode: 'fit-page' }
const FIT_WIDTH: MushafPrefs = { mushafFitWidth: true, mushafViewMode: 'fit-page' }
const SCROLL_FIT_PAGE: MushafPrefs = { mushafFitWidth: false, mushafViewMode: 'continuous' }
const SCROLL_FIT_WIDTH: MushafPrefs = { mushafFitWidth: true, mushafViewMode: 'continuous' }

async function openMushaf(
  page: Page,
  prefs: MushafPrefs,
  options: { disableCompactLandscapeFitWidth?: boolean; pageNo?: number; route?: string } = {},
): Promise<void> {
  const route = options.route ?? `/#/m/${options.pageNo ?? 42}`
  await openSeededReactMushafRoute(page, prefs, {
    disableCompactLandscapeFitWidth: options.disableCompactLandscapeFitWidth,
    route,
  })
  await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
  const requestedPage = Number(/#\/m\/(\d+)/.exec(route)?.[1] ?? options.pageNo ?? 42)
  await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${requestedPage},`, 'i') })).toBeVisible()
}

async function openPrivateMushaf(
  page: Page,
  prefs: MushafPrefs,
  options: { pageNo?: number; mushafPageFraming?: number } = {},
): Promise<void> {
  const pageNo = options.pageNo ?? 42
  await openSeededReactMushafRoute(page, prefs, {
    mushafEditionId: PRIVATE_MUSHAF_EDITION_ID,
    mushafPageFraming: options.mushafPageFraming,
    route: `/#/m/${pageNo}`,
  })
  await expect(page.getByRole('main', { name: 'Mushaf reader' })).toBeVisible()
  await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${pageNo},`, 'i') })).toBeVisible()
}

async function expectReadySingleNeighbor(page: Page, position: 'next' | 'previous', pageNo: number): Promise<void> {
  const svg = page.locator(`[data-mushaf-cell="${position}"][data-mushaf-cell-page="${pageNo}"] svg`)
  await expect(svg).toHaveCount(1)
  await expect(svg).toHaveAttribute('viewBox', /^-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?$/)
}

async function stageBox(page: Page): Promise<Box> {
  const box = await page.getByRole('region', { name: 'Scrollable Mushaf pages' }).boundingBox()
  expect(box).not.toBeNull()
  return {
    bottom: box!.y + box!.height,
    centerX: box!.x + (box!.width / 2),
    centerY: box!.y + (box!.height / 2),
    height: box!.height,
    left: box!.x,
    right: box!.x + box!.width,
    top: box!.y,
    width: box!.width,
  }
}

function pointsBetween(
  box: Box,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 5,
): Array<{ x: number; y: number }> {
  return Array.from({ length: steps }, (_, index) => {
    const progress = index / (steps - 1)
    return {
      x: box.left + (box.width * (from.x + ((to.x - from.x) * progress))),
      y: box.top + (box.height * (from.y + ((to.y - from.y) * progress))),
    }
  })
}

async function beginTouchPath(
  page: Page,
  points: Array<{ x: number; y: number }>,
  intervalMs = 16,
): Promise<CDPSession> {
  expect(points.length).toBeGreaterThan(0)
  const session = await page.context().newCDPSession(page)
  try {
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    const [first, ...rest] = points
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...first, id: 1 }],
    })
    for (const point of rest) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ ...point, id: 1 }],
      })
      // Gesture timing is the assertion; this is the scoped E2E timing carve-out.
      await page.waitForTimeout(intervalMs)
    }
    return session
  } catch (error) {
    await session.detach().catch(() => undefined)
    throw error
  }
}

async function finishTouch(session: CDPSession): Promise<void> {
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } finally {
    await session.detach().catch(() => undefined)
  }
}

async function touchPath(
  page: Page,
  points: Array<{ x: number; y: number }>,
  intervalMs = 16,
): Promise<void> {
  const session = await beginTouchPath(page, points, intervalMs)
  await finishTouch(session)
}

async function touchCancel(page: Page, points: Array<{ x: number; y: number }>): Promise<void> {
  const session = await beginTouchPath(page, points)
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  } finally {
    await session.detach().catch(() => undefined)
  }
}

async function withActiveTouch(
  page: Page,
  points: Array<{ x: number; y: number }>,
  inspect: () => Promise<void>,
  intervalMs = 16,
): Promise<void> {
  const session = await beginTouchPath(page, points, intervalMs)
  try {
    await inspect()
  } finally {
    await finishTouch(session)
  }
}

async function stageScroll(page: Page): Promise<{ clientHeight: number; scrollHeight: number; scrollTop: number }> {
  const publicStage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
  const stage = await publicStage.count() > 0 ? publicStage : page.locator('.qar-react-mushaf-page-stage')
  return stage.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }))
}

async function panStageUp(page: Page): Promise<void> {
  const box = await stageBox(page)
  await touchPath(page, pointsBetween(box, { x: 0.52, y: 0.82 }, { x: 0.49, y: 0.18 }, 6))
}

async function burstWheelAcrossWindow(page: Page): Promise<void> {
  const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
  const box = await stageBox(page)
  await stage.hover()
  const scrollEnd = stage.evaluate((element) => new Promise<void>((resolve) => {
    element.addEventListener('scrollend', () => resolve(), { once: true })
  }))
  const session = await page.context().newCDPSession(page)
  try {
    for (let event = 0; event < 24; event += 1) {
      await session.send('Input.dispatchMouseEvent', {
        deltaX: 0,
        deltaY: 180,
        type: 'mouseWheel',
        x: box.centerX,
        y: box.centerY,
      })
    }
  } finally {
    await session.detach().catch(() => undefined)
  }
  await scrollEnd
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

async function reachStageBottomWithTouch(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const metrics = await stageScroll(page)
    if (metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 2) return
    await panStageUp(page)
  }
  await expect.poll(async () => {
    const metrics = await stageScroll(page)
    return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 2
  }).toBe(true)
}

async function waitForStageScrollIdle(page: Page): Promise<void> {
  const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
  await stage.evaluate((element) => new Promise<void>((resolve) => {
    let previous = element.scrollTop
    let stableFrames = 0
    const observe = () => {
      const current = element.scrollTop
      stableFrames = Math.abs(current - previous) <= 0.5 ? stableFrames + 1 : 0
      previous = current
      if (stableFrames >= 8) resolve()
      else requestAnimationFrame(observe)
    }
    requestAnimationFrame(observe)
  }))
}

async function wheelUntilMushafPage(page: Page, pageNo: number, maxAttempts = 12): Promise<number> {
  const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
  await stage.hover()
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await page.mouse.wheel(0, 280)
    const reached = await expect.poll(
      () => Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0),
      { timeout: 600 },
    ).toBeGreaterThanOrEqual(pageNo).then(() => true).catch(() => false)
    if (reached) break
  }
  await expect.poll(async () => {
    const current = Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0)
    if (current < pageNo) return false
    return page.getByRole('img', { name: new RegExp(`Mushaf page ${current},`, 'i') }).isVisible()
  }).toBe(true)
  return Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0)
}

async function wheelUntilExactMushafPage(page: Page, pageNo: number, maxAttempts = 36): Promise<void> {
  const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
  await stage.hover()
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0)
    if (current === pageNo) return
    expect(current).toBeLessThan(pageNo)
    await page.mouse.wheel(0, 120)
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }))
  }
  await expect(page).toHaveURL(new RegExp(`#/m/${pageNo}(?:\\?wird=1)?$`))
}

async function singleStageBox(page: Page): Promise<Box> {
  const box = await page.locator('.qar-react-mushaf-page-stage').boundingBox()
  expect(box).not.toBeNull()
  return {
    bottom: box!.y + box!.height,
    centerX: box!.x + (box!.width / 2),
    centerY: box!.y + (box!.height / 2),
    height: box!.height,
    left: box!.x,
    right: box!.x + box!.width,
    top: box!.y,
    width: box!.width,
  }
}

async function fastHorizontalFlick(page: Page, direction: 'left' | 'right'): Promise<void> {
  await expect(page.locator('[data-mushaf-gesture-phase="idle"]')).toHaveCount(1)
  const box = await singleStageBox(page)
  const from = direction === 'right' ? { x: 0.36, y: 0.5 } : { x: 0.64, y: 0.5 }
  const to = direction === 'right' ? { x: 0.6, y: 0.5 } : { x: 0.4, y: 0.5 }
  await touchPath(page, pointsBetween(box, from, to, 3), 4)
}

async function expectCurrentPageCoversStage(page: Page, pageNo: number): Promise<void> {
  const [stage, current] = await Promise.all([
    singleStageBox(page),
    page.getByRole('img', { name: new RegExp(`Mushaf page ${pageNo},`, 'i') }).boundingBox(),
  ])
  expect(current).not.toBeNull()
  const visibleWidth = Math.max(0, Math.min(stage.right, current!.x + current!.width) - Math.max(stage.left, current!.x))
  expect(visibleWidth).toBeGreaterThanOrEqual(stage.width * 0.85)
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

test.describe('Mushaf responsive behavior', () => {
  test('@mobile Single + Fit width reaches the bottom with native touch and survives rotation', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await openMushaf(page, FIT_WIDTH)
    await expectNoHorizontalOverflow(page)

    const initial = await stageScroll(page)
    expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight)
    await panStageUp(page)
    await expect.poll(async () => (await stageScroll(page)).scrollTop).toBeGreaterThan(initial.scrollTop)
    await expect(page).toHaveURL(/#\/m\/42$/)
    await reachStageBottomWithTouch(page)
    await waitForStageScrollIdle(page)

    const portraitOffset = (await stageScroll(page)).scrollTop
    expect(portraitOffset).toBeGreaterThan(0)
    await page.setViewportSize({ width: 844, height: 390 })
    await expectNoHorizontalOverflow(page)
    await expect.poll(async () => {
      const landscape = await stageScroll(page)
      const maximum = landscape.scrollHeight - landscape.clientHeight
      return landscape.scrollTop > 0 && landscape.scrollTop <= maximum + 0.5
    }).toBe(true)
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42,/i })).toBeVisible()
    await reachStageBottomWithTouch(page)
    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('@mobile Single + Fit width resets the real stage when page navigation commits', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await openMushaf(page, FIT_WIDTH)
    await expectNoHorizontalOverflow(page)
    await panStageUp(page)
    await expect.poll(async () => (await stageScroll(page)).scrollTop).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Next Mushaf page' }).click()

    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()
    await expect.poll(async () => (await stageScroll(page)).scrollTop).toBe(0)
  })

  test('Single + Fit width wheel reachability covers tablet and desktop viewports', async ({ page }) => {
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1180, height: 820 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      await openMushaf(page, FIT_WIDTH)
      await expectNoHorizontalOverflow(page)
      const before = await stageScroll(page)
      const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
      await stage.hover()
      await page.mouse.wheel(0, 800)
      await expect.poll(async () => (await stageScroll(page)).scrollTop).toBeGreaterThan(before.scrollTop)
      await stage.press('End')
      await expect.poll(async () => {
        const metrics = await stageScroll(page)
        return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 2
      }).toBe(true)
      await expect(page).toHaveURL(/#\/m\/42$/)
    }
  })

  test('@mobile compact mode matrix keeps pages reachable and Scroll ignores horizontal gestures', async ({ page }) => {
    const cases = [
      { label: 'Single/Fit page', prefs: FIT_PAGE },
      { label: 'Single/Fit width', prefs: FIT_WIDTH },
      { label: 'Scroll/Fit page', prefs: SCROLL_FIT_PAGE },
      { label: 'Scroll/Fit width', prefs: SCROLL_FIT_WIDTH },
    ]
    for (const viewport of [{ width: 844, height: 390 }, { width: 768, height: 1024 }]) {
      for (const mode of cases) {
        await test.step(`${mode.label} at ${viewport.width}x${viewport.height}`, async () => {
          await page.setViewportSize(viewport)
          await openMushaf(page, mode.prefs, {
            disableCompactLandscapeFitWidth: !mode.prefs.mushafFitWidth,
          })
          await expectNoHorizontalOverflow(page)
          const metrics = await stageScroll(page)
          if (mode.prefs.mushafViewMode === 'fit-page' && !mode.prefs.mushafFitWidth) {
            expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 2)
          } else {
            expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight)
          }
          if (mode.prefs.mushafViewMode === 'continuous') {
            if (!mode.prefs.mushafFitWidth) {
              const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
              const stageBox = await stage.boundingBox()
              expect(stageBox).not.toBeNull()
              const readyPages = await stage.getByRole('img', { name: /Mushaf page \d+,/i }).all()
              expect(readyPages.length).toBeGreaterThan(0)
              for (const readyPage of readyPages) {
                const pageBox = await readyPage.boundingBox()
                expect(pageBox).not.toBeNull()
                expect(pageBox!.width).toBeLessThanOrEqual(stageBox!.width + 1)
                expect(pageBox!.height).toBeLessThanOrEqual(stageBox!.height + 1)
              }
            }
            await fastHorizontalFlick(page, 'right')
            await expect(page).toHaveURL(/#\/m\/42$/)
            await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()
            await wheelUntilExactMushafPage(page, 43)
            await expect(page.getByRole('img', { name: /Mushaf page 43,/i })).toBeVisible()
          } else if (metrics.scrollHeight > metrics.clientHeight + 2) {
            const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
            await stage.press('End')
            await expect.poll(async () => {
              const reached = await stageScroll(page)
              return reached.scrollTop + reached.clientHeight >= reached.scrollHeight - 2
            }).toBe(true)
            const current = Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 42)
            await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${current},`, 'i') })).toBeVisible()
          }
        })
      }
    }
  })

  test('@mobile native flick previews, commits, reverses, and advances one ready page at a time', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    await expectReadySingleNeighbor(page, 'next', 43)
    const box = await singleStageBox(page)
    await withActiveTouch(
      page,
      pointsBetween(box, { x: 0.3, y: 0.5 }, { x: 0.7, y: 0.5 }, 3),
      async () => expect(page.locator('[data-mushaf-cell="next"]')).toHaveAttribute('data-mushaf-cell-page', '43'),
      8,
    )
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()

    await expectReadySingleNeighbor(page, 'previous', 42)
    await fastHorizontalFlick(page, 'left')
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()

    await expectReadySingleNeighbor(page, 'next', 43)
    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()
    await expectReadySingleNeighbor(page, 'next', 44)
    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/44$/)
    await expect(page.getByRole('img', { name: /Mushaf page 44/i })).toBeVisible()
  })

  test('@mobile slow short drag cancels while a diagonal Fit-width pan scrolls without navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    let box = await singleStageBox(page)
    await touchPath(page, pointsBetween(box, { x: 0.42, y: 0.5 }, { x: 0.55, y: 0.5 }, 6), 45)
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()

    await page.setViewportSize({ width: 844, height: 390 })
    await openMushaf(page, FIT_WIDTH)
    box = await stageBox(page)
    const before = await stageScroll(page)
    await touchPath(page, pointsBetween(box, { x: 0.55, y: 0.8 }, { x: 0.48, y: 0.2 }, 6))
    await expect.poll(async () => (await stageScroll(page)).scrollTop).toBeGreaterThan(before.scrollTop)
    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('@mobile Mushaf boundaries resist outward gestures without exposing blank content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE, { pageNo: 1 })
    let box = await singleStageBox(page)
    await withActiveTouch(
      page,
      pointsBetween(box, { x: 0.62, y: 0.5 }, { x: 0.3, y: 0.5 }, 4),
      async () => expectCurrentPageCoversStage(page, 1),
    )
    await expect(page).toHaveURL(/#\/m\/1$/)
    await expect(page.getByRole('img', { name: /Mushaf page 1,/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous Mushaf page' })).toBeDisabled()

    await openMushaf(page, FIT_PAGE, { pageNo: 604 })
    box = await singleStageBox(page)
    await withActiveTouch(
      page,
      pointsBetween(box, { x: 0.38, y: 0.5 }, { x: 0.7, y: 0.5 }, 4),
      async () => expectCurrentPageCoversStage(page, 604),
    )
    await expect(page).toHaveURL(/#\/m\/604$/)
    await expect(page.getByRole('img', { name: /Mushaf page 604,/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next Mushaf page' })).toBeDisabled()
  })

  test('@mobile cancellation, Settings suspension, and resize all restore usable idle navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    let box = await singleStageBox(page)
    await touchCancel(page, pointsBetween(box, { x: 0.3, y: 0.5 }, { x: 0.62, y: 0.5 }, 3))
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42,/i })).toBeVisible()
    await fastHorizontalFlick(page, 'left')
    await expect(page).toHaveURL(/#\/m\/41$/)
    await expect(page.getByRole('img', { name: /Mushaf page 41,/i })).toBeVisible()
    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/42$/)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible()

    box = await singleStageBox(page)
    const dialog = page.getByRole('dialog', { name: 'Mushaf settings' })
    await withActiveTouch(
      page,
      pointsBetween(box, { x: 0.32, y: 0.5 }, { x: 0.62, y: 0.5 }, 3),
      async () => {
        await page.getByRole('button', { name: 'Open settings' }).click()
        await expect(dialog).toBeVisible()
      },
    )
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/#\/m\/42$/)
    await dialog.getByRole('button', { name: 'Close settings' }).click()
    await fastHorizontalFlick(page, 'left')
    await expect(page).toHaveURL(/#\/m\/41$/)
    await expect(page.getByRole('img', { name: /Mushaf page 41/i })).toBeVisible()

    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/42$/)

    box = await singleStageBox(page)
    await withActiveTouch(
      page,
      pointsBetween(box, { x: 0.32, y: 0.5 }, { x: 0.62, y: 0.5 }, 3),
      async () => page.setViewportSize({ width: 430, height: 800 }),
    )
    await fastHorizontalFlick(page, 'left')
    await expect(page).toHaveURL(/#\/m\/41$/)
    await expect(page.getByRole('img', { name: /Mushaf page 41/i })).toBeVisible()
  })

  test('@mobile reduced motion commits the same physical route without animation travel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    await expectReadySingleNeighbor(page, 'next', 43)
    await expect.poll(() => page.locator('.qar-react-mushaf-page-strip').evaluate(
      (element) => getComputedStyle(element).transitionDuration,
    )).toBe('0s')

    const box = await singleStageBox(page)
    const session = await beginTouchPath(
      page,
      pointsBetween(box, { x: 0.35, y: 0.5 }, { x: 0.62, y: 0.5 }, 3),
      4,
    )
    await finishTouch(session)
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43,/i })).toBeVisible()
  })

  test('Scroll retains its anchor, protected intent, history entry, and momentum beyond three pages', async ({ page }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await openSeededReactMushafRoute(page, SCROLL_FIT_WIDTH, { route: '/#/s/1' })
    await expect(page.getByRole('main', { name: 'Verse reader' })).toBeVisible()
    await page.goto('/#/m/42?wird=1')
    await expect(page.getByRole('img', { name: /Mushaf page 42,/i })).toBeVisible()
    await expect(page.getByRole('img', { name: /Mushaf page 43,/i })).toBeAttached()
    await expectNoHorizontalOverflow(page)

    await page.evaluate(() => {
      const state = window as Window & { __mushafAnchorTopBefore?: number }
      const originalReplaceState = history.replaceState.bind(history)
      history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
        if (String(url).includes('#/m/43')) {
          const anchor = document.querySelector<HTMLElement>('[role="img"][aria-label^="Mushaf page 43,"]')
          if (anchor) state.__mushafAnchorTopBefore = anchor.getBoundingClientRect().top
        }
        originalReplaceState(data, unused, url)
      }
    })
    await wheelUntilExactMushafPage(page, 43)
    await expect(page).toHaveURL(/#\/m\/43\?wird=1$/)
    const anchorTopBeforeShift = await page.evaluate(() => (
      window as Window & { __mushafAnchorTopBefore?: number }
    ).__mushafAnchorTopBefore)
    expect(anchorTopBeforeShift).toBeDefined()
    await expect.poll(async () => {
      const anchorTopAfterShift = (await page.getByRole('img', { name: /Mushaf page 43,/i }).boundingBox())?.y
      return anchorTopAfterShift === undefined
        ? Number.POSITIVE_INFINITY
        : Math.abs(anchorTopAfterShift - anchorTopBeforeShift!)
    }).toBeLessThanOrEqual(2)

    await wheelUntilExactMushafPage(page, 44)
    await expect(page).toHaveURL(/#\/m\/44\?wird=1$/)
    await expect(page.getByRole('img', { name: /Mushaf page 44,/i })).toBeVisible()
    const momentumPage = await wheelUntilMushafPage(page, 46, 24)
    expect(momentumPage).toBeGreaterThanOrEqual(46)
    await expect(page).toHaveURL(new RegExp(`#\/m\/${momentumPage}\\?wird=1$`))
    await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${momentumPage},`, 'i') })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/#\/s\/1$/)
  })

  test('Scroll mode preserves monotonic dominance and anchors through one uninterrupted wheel burst', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, SCROLL_FIT_WIDTH)
    await expectNoHorizontalOverflow(page)
    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/42$/)

    await page.evaluate(() => {
      type FlingProof = {
        anchorDeltas: number[]
        pendingAnchor?: { page: number; top: number }
        routes: number[]
      }
      const state = window as Window & { __mushafFlingProof?: FlingProof }
      const proof: FlingProof = { anchorDeltas: [], routes: [42] }
      state.__mushafFlingProof = proof
      const originalReplaceState = history.replaceState.bind(history)
      history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
        const pageNo = Number(/#\/m\/(\d+)/.exec(String(url))?.[1] ?? 0)
        if (pageNo > 0) {
          const anchor = document.querySelector<HTMLElement>(`[role="img"][aria-label^="Mushaf page ${pageNo},"]`)
          if (anchor) proof.pendingAnchor = { page: pageNo, top: anchor.getBoundingClientRect().top }
          proof.routes.push(pageNo)
        }
        originalReplaceState(data, unused, url)
      }
      const stack = document.querySelector('.qar-react-mushaf-continuous-stack')
      if (!stack) throw new Error('Continuous Mushaf stack is unavailable')
      new MutationObserver(() => {
        const pending = proof.pendingAnchor
        if (!pending) return
        const anchor = document.querySelector<HTMLElement>(`[role="img"][aria-label^="Mushaf page ${pending.page},"]`)
        if (anchor) proof.anchorDeltas.push(Math.abs(anchor.getBoundingClientRect().top - pending.top))
        proof.pendingAnchor = undefined
      }).observe(stack, { childList: true })
    })

    await burstWheelAcrossWindow(page)

    const dominantPage = Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0)
    expect(dominantPage).toBeGreaterThanOrEqual(45)
    await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${dominantPage},`, 'i') })).toBeVisible()
    const proof = await page.evaluate(() => (
      window as Window & {
        __mushafFlingProof?: { anchorDeltas: number[]; routes: number[] }
      }
    ).__mushafFlingProof)
    expect(proof).toBeDefined()
    expect(proof!.routes.length).toBeGreaterThan(2)
    for (let index = 1; index < proof!.routes.length; index += 1) {
      expect(proof!.routes[index]).toBeGreaterThanOrEqual(proof!.routes[index - 1]!)
    }
    expect(proof!.anchorDeltas.length).toBeGreaterThan(0)
    expect(Math.max(...proof!.anchorDeltas)).toBeLessThanOrEqual(2)
  })

  test('Settings overlay blocks page-turn keys through the active Mushaf settings dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    await page.getByRole('button', { name: 'Open settings' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mushaf settings' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/#\/m\/42$/)
  })

  test('tap and Escape leave Mushaf controls usable through visible outcomes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    const bookmark = page.getByRole('button', { name: /Bookmark Mushaf page 42/i })
    await expect(bookmark).toBeVisible()

    await page.locator('.qar-react-mushaf-page-stage').click()
    await expect(page).toHaveURL(/#\/m\/42$/)
    await page.keyboard.press('Escape')
    await expect(bookmark).toBeVisible()
    await expect(page.getByLabel('Mushaf page 42', { exact: true })).toBeVisible()
  })

  test('Mushaf chrome remains inside safe geometry without overlapping page content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    const metrics = await page.evaluate(() => {
      const box = (selector: string): Box | null => {
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
      return {
        bookmark: box('.qar-react-mushaf-bookmark-toggle'),
        counter: box('.qar-react-mushaf-page-counter'),
        documentWidth: (document.scrollingElement ?? document.documentElement).clientWidth,
        nav: box('nav[aria-label="Primary navigation"]'),
        page: box('[data-mushaf-cell="current"] svg'),
        surah: box('.qar-react-mushaf-page-surah'),
      }
    })
    expect(metrics.bookmark).not.toBeNull()
    expect(metrics.counter).not.toBeNull()
    expect(metrics.nav).not.toBeNull()
    expect(metrics.page).not.toBeNull()
    expect(metrics.surah).not.toBeNull()
    expect(boxesOverlap(metrics.counter!, metrics.bookmark!)).toBe(false)
    expect(metrics.surah!.right).toBeLessThanOrEqual(metrics.documentWidth)
    expect(metrics.nav!.bottom).toBeLessThanOrEqual(metrics.page!.top)
    expect(metrics.counter!.top).toBeGreaterThanOrEqual(metrics.page!.bottom)
  })

  test('compact landscape defaults to Fit width and preserves an explicit user opt-out', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await openMushaf(page, FIT_PAGE)
    const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
    await expect(stage).toBeVisible()
    expect((await stageScroll(page)).scrollHeight).toBeGreaterThan((await stageScroll(page)).clientHeight)

    await page.getByRole('button', { name: 'Open settings' }).click()
    const dialog = page.getByRole('dialog', { name: 'Mushaf settings' })
    await expect(dialog).toBeVisible()
    const fitWidth = dialog.getByRole('switch', { name: 'Fit width' })
    await expect(fitWidth).toBeChecked()
    await fitWidth.click()
    await expect(fitWidth).not.toBeChecked()
    await dialog.getByRole('button', { name: 'Close settings' }).click()
    await expect(page.getByRole('region', { name: 'Scrollable Mushaf pages' })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('private Furatiyyah framing', () => {
  test.skip(!PRIVATE_MUSHAF_ENABLED, 'Private Mushaf journeys require QURANATLAS_PRIVATE_MUSHAF=1.')

  test('@mobile keeps reviewed Full and Text framing reachable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openPrivateMushaf(page, FIT_WIDTH, { mushafPageFraming: 0 })
    const pageImage = page.getByRole('img', { name: /Mushaf page 42,/i })
    const fullFrame = await pageImage.locator('.qar-react-mushaf-page-frame').evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      imageWidth: Number.parseFloat(getComputedStyle(element.querySelector('img')!).width),
      placement: {
        height: element.querySelector('img')!.style.height,
        left: element.querySelector('img')!.style.left,
        top: element.querySelector('img')!.style.top,
        width: element.querySelector('img')!.style.width,
      },
      width: element.getBoundingClientRect().width,
    }))
    expect(Math.abs(fullFrame.imageWidth - fullFrame.width)).toBeLessThanOrEqual(1)
    expect(fullFrame.placement).toEqual({ height: '100%', left: '0%', top: '0%', width: '100%' })

    await page.getByRole('button', { name: 'Open settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Mushaf settings' })
    await expect(settings).toBeVisible()
    await settings.getByRole('button', { name: 'Text focus' }).click()
    await expect(settings.getByRole('button', { name: 'Text focus' })).toHaveAttribute('aria-pressed', 'true')
    const textFrame = await page.locator('[data-mushaf-cell="current"] .qar-react-mushaf-page-frame').evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      imageWidth: Number.parseFloat(getComputedStyle(element.querySelector('img')!).width),
      placement: {
        height: element.querySelector('img')!.style.height,
        left: element.querySelector('img')!.style.left,
        top: element.querySelector('img')!.style.top,
        width: element.querySelector('img')!.style.width,
      },
      width: element.getBoundingClientRect().width,
    }))
    expect(textFrame.height).toBeGreaterThan(fullFrame.height)
    expect(textFrame.imageWidth).toBeGreaterThan(textFrame.width)
    expect(textFrame.placement).toEqual({ height: '100%', left: '0%', top: '0%', width: expect.stringMatching(/^119\./) })

    const textEdgeEvidence = await page.locator('[data-mushaf-cell="current"] img').evaluate((source) => {
      const sourceWidth = source.naturalWidth
      const sourceHeight = source.naturalHeight
      const cropRight = Math.floor(sourceWidth * 0.8385)
      const canvas = document.createElement('canvas')
      canvas.width = 12
      canvas.height = sourceHeight
      const context = canvas.getContext('2d')
      if (!context) return null
      context.drawImage(source, cropRight - 6, 0, 12, sourceHeight, 0, 0, 12, sourceHeight)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      let edgeInkPixels = 0
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index]! + pixels[index + 1]! + pixels[index + 2]! < 480) edgeInkPixels += 1
      }
      return { edgeInkPixels, totalPixels: canvas.width * canvas.height }
    })
    expect(textEdgeEvidence).not.toBeNull()
    expect(textEdgeEvidence!.edgeInkPixels).toBeGreaterThan(0)
    expect(textEdgeEvidence!.edgeInkPixels / textEdgeEvidence!.totalPixels).toBeLessThan(0.5)

    const slider = settings.getByRole('slider', { name: "Qur'an text size" })
    await slider.press('Home')
    for (let step = 0; step < 50; step += 1) await slider.press('ArrowRight')
    await expect(slider).toHaveAttribute('aria-valuenow', '50')
    await settings.getByRole('button', { name: 'Close settings' }).click()
    const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
    await expect(stage).toBeVisible()
    const verticalReachability = await stage.evaluate((element) => {
      const frame = element.querySelector<HTMLElement>('[data-mushaf-cell="current"] .qar-react-mushaf-page-frame')
      if (!frame) return false
      const stageBox = element.getBoundingClientRect()
      const frameBox = frame.getBoundingClientRect()
      return element.scrollHeight > element.clientHeight
        || (frameBox.top >= stageBox.top && frameBox.bottom <= stageBox.bottom)
    })
    expect(verticalReachability).toBe(true)
    await expectNoHorizontalOverflow(page)
  })

  test('preserves the private route, counter, and bookmark across ten turns and a sustained Scroll anchor', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openPrivateMushaf(page, FIT_PAGE)
    const bookmark = page.getByRole('button', { name: 'Bookmark Mushaf page 42' })
    await bookmark.click()
    await expect(page.getByRole('button', { name: 'Remove bookmark for Mushaf page 42' })).toBeVisible()
    for (let expectedPage = 43; expectedPage <= 52; expectedPage += 1) {
      await expect(page.locator(`[data-mushaf-cell="next"][data-mushaf-cell-page="${expectedPage}"] img`)).toHaveCount(1)
      await page.keyboard.press('ArrowLeft')
      await expect(page).toHaveURL(new RegExp(`#\\/m\\/${expectedPage}$`))
    }
    await expect(page.getByRole('img', { name: /Mushaf page 52,/i })).toBeVisible()

    await openPrivateMushaf(page, SCROLL_FIT_WIDTH)
    const stage = page.getByRole('region', { name: 'Scrollable Mushaf pages' })
    await stage.hover()
    for (let turn = 0; turn < 5; turn += 1) await page.mouse.wheel(0, 750)
    await expect.poll(() => Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0)).toBeGreaterThanOrEqual(43)
    const dominantPage = Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0)
    await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${dominantPage},`, 'i') })).toBeVisible()
  })
})
