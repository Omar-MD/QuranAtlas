import { expect, test } from '@playwright/test'

const ROUTE_LOAD_BUDGET_MS = 2000
const MUSHAF_ROUTE_LOAD_BUDGET_MS = 3000
const MUSHAF_PAGE_TURN_FALLBACK_BUDGET_MS = 900
// Give-up threshold — must be strictly larger than the budget so a slow
// render fails with a budget assertion, not a confusing timeout error.
const ROUTE_LOAD_TIMEOUT_MS = 10000

async function measureRouteLoad(page, { hash, expectedHeaderText, targetVerse = null }) {
  return page.evaluate(
    async ({ hash, expectedHeaderText, targetVerse, timeoutMs }) => {
      const container = document.getElementById('main-content')
      if (!container) {
        throw new Error('main-content container not found')
      }

      container.scrollTop = 0

      const isReady = () => {
        const header = document.querySelector('[data-surah-header]')
        // The surah meta line is rendered uppercase ("SURAH 2 · 286 VERSES")
        // so compare case-insensitively.
        if (!header || !header.textContent?.toLowerCase().includes(expectedHeaderText.toLowerCase())) {
          return false
        }

        if (targetVerse !== null) {
          // Check that verse 1 exists in the DOM — the reader renders it
          // immediately on navigation. Viewport-visibility is skipped here
          // because smooth-scroll animations can leave verse 1 temporarily
          // off-screen while the DOM is already fully settled.
          const verse = container.querySelector(`[data-verse="${targetVerse}"]`)
          if (!verse) {
            return false
          }
        }

        return true
      }

      return new Promise((resolve, reject) => {
        let rafId = 0
        let settled = false

        const observer = new MutationObserver(() => {
          finishIfReady()
        })

        const timeoutId = window.setTimeout(() => {
          cleanup()
          reject(new Error(`Timed out waiting for ${hash} to render`))
        }, timeoutMs)

        const start = performance.now()

        function cleanup() {
          if (settled) {
            return
          }

          settled = true
          observer.disconnect()
          window.clearTimeout(timeoutId)
          if (rafId) {
            window.cancelAnimationFrame(rafId)
          }
        }

        function finishIfReady() {
          if (!settled && isReady()) {
            const elapsed = performance.now() - start
            cleanup()
            resolve(elapsed)
            return true
          }

          return false
        }

        function tick() {
          if (!finishIfReady()) {
            rafId = window.requestAnimationFrame(tick)
          }
        }

        observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style'],
        })

        rafId = window.requestAnimationFrame(tick)
        window.location.hash = hash
        finishIfReady()
      })
    },
    {
      hash,
      expectedHeaderText,
      targetVerse,
      timeoutMs: ROUTE_LOAD_TIMEOUT_MS,
    }
  )
}

async function measureMushafRouteLoad(page, { hash, pageNumber }) {
  return page.evaluate(
    async ({ hash, pageNumber, timeoutMs }) => {
      const container = document.getElementById('main-content')
      if (!container) {
        throw new Error('main-content container not found')
      }

      const targetSelector = `.qa-mushaf-page-figure[data-page="${pageNumber}"] .qa-mushaf-svg`

      return new Promise((resolve, reject) => {
        let rafId = 0
        let settled = false

        const observer = new MutationObserver(() => {
          finishIfReady()
        })

        const timeoutId = window.setTimeout(() => {
          cleanup()
          reject(new Error(`Timed out waiting for ${hash} to render`))
        }, timeoutMs)

        const start = performance.now()

        function cleanup() {
          if (settled) return
          settled = true
          observer.disconnect()
          window.clearTimeout(timeoutId)
          if (rafId) window.cancelAnimationFrame(rafId)
        }

        function finishIfReady() {
          if (!settled && container.querySelector(targetSelector)) {
            const elapsed = performance.now() - start
            cleanup()
            resolve(elapsed)
            return true
          }
          return false
        }

        function tick() {
          if (!finishIfReady()) {
            rafId = window.requestAnimationFrame(tick)
          }
        }

        observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'data-page'],
        })

        rafId = window.requestAnimationFrame(tick)
        window.location.hash = hash
        finishIfReady()
      })
    },
    {
      hash,
      pageNumber,
      timeoutMs: ROUTE_LOAD_TIMEOUT_MS,
    }
  )
}

test.describe('Performance budgets', () => {
  test('Al-Baqarah initial render shows the first verse within 2000ms', async ({ page }) => {
    await page.goto('/#/s/1')
    await expect(page.locator('[data-verse="1"]')).toBeVisible({ timeout: 10000 })

    const renderTime = await measureRouteLoad(page, {
      hash: '#/s/2',
      expectedHeaderText: 'SURAH 2',
      targetVerse: 1,
    })

    await expect(page.locator('[data-surah-header]')).toContainText('SURAH 2')
    await expect(page.locator('[data-verse="1"]')).toBeVisible()
    expect(renderTime).toBeLessThanOrEqual(ROUTE_LOAD_BUDGET_MS)
  })

  test('Mushaf page route renders inline SVG within 3000ms', async ({ page }) => {
    await page.goto('/#/s/1')
    await expect(page.locator('[data-verse="1"]')).toBeVisible({ timeout: 10000 })

    const renderTime = await measureMushafRouteLoad(page, {
      hash: '#/m/42',
      pageNumber: 42,
    })

    await expect(page.locator('.qa-mushaf-page-figure[data-page="42"] .qa-mushaf-svg')).toBeVisible()
    expect(renderTime).toBeLessThanOrEqual(MUSHAF_ROUTE_LOAD_BUDGET_MS)
  })

  test('Mushaf page turn uses warmed SVG without long tasks', async ({ page }) => {
    const prefetch = page.waitForResponse((response) => response.url().endsWith('/dataset/mushaf-pages/qaloon/pages/002.svg')).catch(() => null)
    await page.goto('/#/m/1')
    await expect(page.locator('.qa-mushaf-page-figure[data-page="1"]')).toBeVisible({ timeout: 10000 })
    await prefetch

    const supportsLongTask = await page.evaluate(() => {
      window.__qaMushafLongTasks = []
      const supported = PerformanceObserver.supportedEntryTypes?.includes('longtask') ?? false
      if (!supported) return false
      const observer = new PerformanceObserver((list) => {
        window.__qaMushafLongTasks.push(...list.getEntries().map((entry) => ({
          startTime: entry.startTime,
          duration: entry.duration,
        })))
      })
      observer.observe({ type: 'longtask', buffered: true })
      window.__qaMushafLongTaskObserver = observer
      return true
    })

    const startedAt = await page.evaluate(() => performance.now())
    await page.getByRole('button', { name: 'Advance Mushaf page' }).click()
    await expect(page.locator('.qa-mushaf-page-figure[data-page="2"]')).toBeVisible({ timeout: 10000 })
    const endedAt = await page.evaluate(() => performance.now())

    const longTasks = await page.evaluate(({ startedAt, endedAt }) => {
      window.__qaMushafLongTaskObserver?.disconnect()
      return (window.__qaMushafLongTasks ?? [])
        .filter((entry) => entry.startTime >= startedAt && entry.startTime <= endedAt && entry.duration > 50)
    }, { startedAt, endedAt })

    if (supportsLongTask) {
      expect(longTasks).toEqual([])
    } else {
      // WebKit/Firefox may not expose PerformanceLongTaskTiming; this local
      // fallback keeps the action-start-to-visible window below a perceptible
      // page-turn delay on the Chromium CI hardware used for this project.
      expect(endedAt - startedAt).toBeLessThanOrEqual(MUSHAF_PAGE_TURN_FALLBACK_BUDGET_MS)
    }

    const transition = await page.locator('.qa-mushaf-page-figure[data-page="2"]').evaluate((element) => getComputedStyle(element).transitionProperty)
    expect(transition).toContain('opacity')
    expect(transition).toContain('transform')
  })
})
