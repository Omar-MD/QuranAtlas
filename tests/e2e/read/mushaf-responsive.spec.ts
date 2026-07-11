import { expect, test, type CDPSession, type Page } from '@playwright/test'

import { expectNoHorizontalOverflow } from '../fixtures/react-a11y'
import { openSeededReactMushafRoute } from '../fixtures/react-golden-routes'

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
}

async function finishTouch(session: CDPSession): Promise<void> {
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await session.detach()
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
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await session.detach()
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
    const scrollEnd = stage.evaluate((element) => new Promise<void>((resolve) => {
      element.addEventListener('scrollend', () => resolve(), { once: true })
    }))
    await page.mouse.wheel(0, 120)
    await scrollEnd
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
  const box = await singleStageBox(page)
  const from = direction === 'right' ? { x: 0.38, y: 0.5 } : { x: 0.62, y: 0.5 }
  const to = direction === 'right' ? { x: 0.56, y: 0.5 } : { x: 0.44, y: 0.5 }
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

    const portraitOffset = (await stageScroll(page)).scrollTop
    await page.setViewportSize({ width: 844, height: 390 })
    await expectNoHorizontalOverflow(page)
    await expect.poll(async () => {
      const landscape = await stageScroll(page)
      const expectedOffset = Math.min(portraitOffset, landscape.scrollHeight - landscape.clientHeight)
      return Math.abs(landscape.scrollTop - expectedOffset)
    }).toBeLessThanOrEqual(2)
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
    const box = await singleStageBox(page)
    const session = await beginTouchPath(page, pointsBetween(box, { x: 0.3, y: 0.5 }, { x: 0.58, y: 0.5 }, 3), 8)

    await expect(page.locator('[data-mushaf-cell="next"]')).toHaveAttribute('data-mushaf-cell-page', '43')
    await finishTouch(session)
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()

    await fastHorizontalFlick(page, 'left')
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()

    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()
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
    let outwardTouch = await beginTouchPath(page, pointsBetween(box, { x: 0.62, y: 0.5 }, { x: 0.3, y: 0.5 }, 4))
    await expectCurrentPageCoversStage(page, 1)
    await finishTouch(outwardTouch)
    await expect(page).toHaveURL(/#\/m\/1$/)
    await expect(page.getByRole('img', { name: /Mushaf page 1,/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Previous Mushaf page' })).toBeDisabled()

    await openMushaf(page, FIT_PAGE, { pageNo: 604 })
    box = await singleStageBox(page)
    outwardTouch = await beginTouchPath(page, pointsBetween(box, { x: 0.38, y: 0.5 }, { x: 0.7, y: 0.5 }, 4))
    await expectCurrentPageCoversStage(page, 604)
    await finishTouch(outwardTouch)
    await expect(page).toHaveURL(/#\/m\/604$/)
    await expect(page.getByRole('img', { name: /Mushaf page 604,/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next Mushaf page' })).toBeDisabled()
  })

  test('@mobile cancellation, Settings suspension, and resize all restore usable idle navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    let box = await singleStageBox(page)
    await touchCancel(page, pointsBetween(box, { x: 0.3, y: 0.5 }, { x: 0.62, y: 0.5 }, 3))
    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/43$/)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible()

    box = await singleStageBox(page)
    const activeTouch = await beginTouchPath(page, pointsBetween(box, { x: 0.32, y: 0.5 }, { x: 0.62, y: 0.5 }, 3))
    await page.getByRole('button', { name: 'Open settings' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('[aria-label="Mushaf settings"]')).toBeVisible()
    await finishTouch(activeTouch).catch(() => undefined)
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(/#\/m\/43$/)
    await dialog.getByRole('button', { name: 'Close settings' }).click()
    await fastHorizontalFlick(page, 'left')
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()

    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/43$/)

    box = await singleStageBox(page)
    const resizeTouch = await beginTouchPath(page, pointsBetween(box, { x: 0.32, y: 0.5 }, { x: 0.62, y: 0.5 }, 3))
    await page.setViewportSize({ width: 430, height: 800 })
    await finishTouch(resizeTouch).catch(() => undefined)
    await fastHorizontalFlick(page, 'left')
    await expect(page).toHaveURL(/#\/m\/42$/)
    await expect(page.getByRole('img', { name: /Mushaf page 42/i })).toBeVisible()
  })

  test('@mobile reduced motion commits the same physical route without animation travel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)

    await fastHorizontalFlick(page, 'right')

    await expect(page).toHaveURL(/#\/m\/43$/)
    await expect(page.getByRole('img', { name: /Mushaf page 43/i })).toBeVisible()
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

  test('Scroll mode native touch momentum changes dominance without horizontal page turns', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, SCROLL_FIT_WIDTH)
    await expectNoHorizontalOverflow(page)
    await fastHorizontalFlick(page, 'right')
    await expect(page).toHaveURL(/#\/m\/42$/)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await panStageUp(page)
      if (Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0) > 42) break
    }
    const dominantPage = Number(/#\/m\/(\d+)/.exec(page.url())?.[1] ?? 0)
    expect(dominantPage).toBeGreaterThan(42)
    await expect(page.getByRole('img', { name: new RegExp(`Mushaf page ${dominantPage},`, 'i') })).toBeVisible()
  })

  test('Settings overlay blocks page-turn keys through the active Mushaf settings dialog', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openMushaf(page, FIT_PAGE)
    await page.getByRole('button', { name: 'Open settings' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('[aria-label="Mushaf settings"]')).toBeVisible()
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
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator('[aria-label="Mushaf settings"]')).toBeVisible()
    const fitWidth = dialog.getByRole('switch', { name: 'Fit width' })
    await expect(fitWidth).toBeChecked()
    await fitWidth.click()
    await expect(fitWidth).not.toBeChecked()
    await dialog.getByRole('button', { name: 'Close settings' }).click()
    await expect(page.getByRole('region', { name: 'Scrollable Mushaf pages' })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })
})
