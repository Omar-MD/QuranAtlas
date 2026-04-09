import { expect, test } from '@playwright/test'

const ROUTE_LOAD_BUDGET_MS = 500
const ROUTE_LOAD_TIMEOUT_MS = 2000

async function seedSavedPosition(page, surah, verse) {
  await page.evaluate(
    async ({ surah, verse }) => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('quran-atlas')

        request.onerror = () => reject(request.error)
        request.onsuccess = (event) => {
          const db = event.target.result
          const tx = db.transaction('positions', 'readwrite')

          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error ?? new Error('Failed to seed saved position'))

          tx.objectStore('positions').put({
            id: `s${surah}`,
            surah,
            verse,
            savedAt: Date.now(),
          })
        }
      })
    },
    { surah, verse }
  )
}

async function measureRouteLoad(page, {
  hash,
  expectedHeaderText,
  targetVerse = null,
  expectedResumeText = null,
  requireScrolled = false,
}) {
  return page.evaluate(
    async ({ hash, expectedHeaderText, targetVerse, expectedResumeText, requireScrolled, timeoutMs }) => {
      const container = document.getElementById('main-content')
      if (!container) {
        throw new Error('main-content container not found')
      }

      container.scrollTop = 0

      const isReady = () => {
        const header = document.querySelector('[data-surah-header]')
        if (!header || !header.textContent?.includes(expectedHeaderText)) {
          return false
        }

        if (expectedResumeText) {
          const resumeIndicator = document.querySelector('[data-resume-indicator]')
          if (!resumeIndicator || !resumeIndicator.textContent?.includes(expectedResumeText)) {
            return false
          }
        }

        if (targetVerse !== null) {
          const verse = container.querySelector(`[data-verse="${targetVerse}"]`)
          if (!verse) {
            return false
          }

          const containerRect = container.getBoundingClientRect()
          const verseRect = verse.getBoundingClientRect()
          const isVisible = verseRect.bottom > containerRect.top && verseRect.top < containerRect.bottom

          if (!isVisible) {
            return false
          }
        }

        if (requireScrolled && container.scrollTop <= 0) {
          return false
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
      expectedResumeText,
      requireScrolled,
      timeoutMs: ROUTE_LOAD_TIMEOUT_MS,
    }
  )
}

test.describe('Performance budgets', () => {
  test('Al-Baqarah initial render shows the first verse within 500ms', async ({ page }) => {
    await page.goto('/#/s/1')
    await expect(page.locator('[data-verse="1"]')).toBeVisible({ timeout: 10000 })

    const renderTime = await measureRouteLoad(page, {
      hash: '#/s/2',
      expectedHeaderText: 'Al-Baqarah',
      targetVerse: 1,
    })

    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah')
    await expect(page.locator('[data-verse="1"]')).toBeVisible()
    expect(renderTime).toBeLessThanOrEqual(ROUTE_LOAD_BUDGET_MS)
  })

  test('surah load and saved-position restore complete within 500ms', async ({ page }) => {
    await page.goto('/#/s/1')
    await expect(page.locator('[data-verse="1"]')).toBeVisible({ timeout: 10000 })

    await seedSavedPosition(page, 2, 50)

    const loadTime = await measureRouteLoad(page, {
      hash: '#/s/2',
      expectedHeaderText: 'Al-Baqarah',
      expectedResumeText: 'Resume reading: Al-Baqarah 50',
      requireScrolled: true,
    })

    await expect(page.locator('[data-surah-header]')).toContainText('Al-Baqarah')
    await expect(page.locator('[data-resume-indicator]')).toContainText('Resume reading: Al-Baqarah 50')

    const scrollTop = await page.evaluate(() => document.getElementById('main-content')?.scrollTop ?? 0)

    expect(scrollTop).toBeGreaterThan(0)
    expect(loadTime).toBeLessThanOrEqual(ROUTE_LOAD_BUDGET_MS)
  })
})