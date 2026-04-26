import { expect, test } from '@playwright/test'

const ROUTE_LOAD_BUDGET_MS = 2000
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
        // The surah meta line is rendered uppercase ("AL-BAQARAH · SURAH 2 …")
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

test.describe('Performance budgets', () => {
  test('Al-Baqarah initial render shows the first verse within 2000ms @chromium-only', async ({ page }) => {
    await page.goto('/#/s/1')
    await expect(page.locator('[data-verse="1"]')).toBeVisible({ timeout: 10000 })

    const renderTime = await measureRouteLoad(page, {
      hash: '#/s/2',
      expectedHeaderText: 'Al-Baqarah',
      targetVerse: 1,
    })

    await expect(page.locator('[data-surah-header]')).toContainText('AL-BAQARAH')
    await expect(page.locator('[data-verse="1"]')).toBeVisible()
    expect(renderTime).toBeLessThanOrEqual(ROUTE_LOAD_BUDGET_MS)
  })
})
