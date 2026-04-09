import { expect, test } from '@playwright/test'

import { CACHE_DATASET } from '../../src/core/constants.js'

const SW_READY_TIMEOUT_MS = 10000
const MESSAGE_TIMEOUT_MS = SW_READY_TIMEOUT_MS
const IS_PREVIEW_MODE = process.env.PLAYWRIGHT_USE_PREVIEW === '1'

async function openApp(page) {
  await page.goto('/')
  await expect(page.locator('#app-shell')).toBeVisible({ timeout: 10000 })
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 10000 })
}

async function waitForActiveController(page) {
  const state = await page.evaluate(async ({ timeoutMs }) => {
    if (!('serviceWorker' in navigator)) {
      return { supported: false, active: false, controlled: false }
    }

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])

    if (!registration?.active) {
      return { supported: true, active: false, controlled: !!navigator.serviceWorker.controller }
    }

    if (navigator.serviceWorker.controller) {
      return { supported: true, active: true, controlled: true }
    }

    const controlled = await new Promise((resolve) => {
      const onControllerChange = () => {
        clearTimeout(timer)
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
        resolve(!!navigator.serviceWorker.controller)
      }

      const timer = setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
        resolve(!!navigator.serviceWorker.controller)
      }, timeoutMs)

      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

      if (navigator.serviceWorker.controller) {
        onControllerChange()
      }
    })

    return {
      supported: true,
      active: true,
      controlled,
    }
  }, { timeoutMs: SW_READY_TIMEOUT_MS })

  expect(state).toEqual({ supported: true, active: true, controlled: true })
}

test.describe('Service Worker integration', () => {
  test.skip(!IS_PREVIEW_MODE,
    'Service worker integration requires PLAYWRIGHT_USE_PREVIEW=1 so Playwright runs against vite preview.'
  )

  test('service worker registers and claims the page on first load', async ({ page }) => {
    await openApp(page)

    await waitForActiveController(page)
  })

  test('PURGE_DATASET_CACHE clears the corpus cache and notifies the client', async ({ page }) => {
    await openApp(page)
    await waitForActiveController(page)

    const purgeResult = await page.evaluate(async ({ cacheName, timeoutMs }) => {
      const cache = await caches.open(cacheName)
      const seededUrl = '/dataset/__purge-check__.json'

      await cache.put(seededUrl, new Response('{"ok":true}', {
        headers: { 'Content-Type': 'application/json' },
      }))

      return new Promise((resolve) => {
        const timer = setTimeout(async () => {
          navigator.serviceWorker.removeEventListener('message', onMessage)
          const remaining = await caches.open(cacheName).then((reopenedCache) => reopenedCache.match(seededUrl))
          resolve({
            notified: false,
            cleared: !remaining,
          })
        }, timeoutMs)

        async function onMessage(event) {
          if (event.data?.type !== 'DATASET_PURGED') {
            return
          }

          clearTimeout(timer)
          navigator.serviceWorker.removeEventListener('message', onMessage)
          const remaining = await caches.open(cacheName).then((reopenedCache) => reopenedCache.match(seededUrl))
          resolve({
            notified: true,
            cleared: !remaining,
          })
        }

        navigator.serviceWorker.addEventListener('message', onMessage)
        navigator.serviceWorker.controller?.postMessage({ type: 'PURGE_DATASET_CACHE' })
      })
    }, {
      cacheName: CACHE_DATASET,
      timeoutMs: MESSAGE_TIMEOUT_MS,
    })

    expect(purgeResult).toEqual({ notified: true, cleared: true })
  })

  test('SKIP_WAITING activates a waiting service worker', async ({ page }) => {
    await openApp(page)
    await waitForActiveController(page)

    const skipWaitingResult = await page.evaluate(async ({ timeoutMs }) => {
      const controller = navigator.serviceWorker.controller
      if (!controller) {
        return { hadWaiting: false, controlled: false, switched: false, controllerScriptUrl: null }
      }

      const originalScriptUrl = controller.scriptURL
      const nextScriptUrl = `/sw.js?task15-skip-waiting=${Date.now()}`
      const registration = await navigator.serviceWorker.register(nextScriptUrl, {
        scope: '/',
      })

      const waitingWorker = await new Promise((resolve) => {
        const startedAt = Date.now()

        const checkWaitingWorker = () => {
          if (registration.waiting) {
            resolve(registration.waiting)
            return
          }

          if (registration.installing?.state === 'redundant' || Date.now() - startedAt >= timeoutMs) {
            resolve(null)
            return
          }

          setTimeout(checkWaitingWorker, 50)
        }

        checkWaitingWorker()
      })

      if (!waitingWorker) {
        return {
          hadWaiting: false,
          controlled: !!navigator.serviceWorker.controller,
          switched: false,
          controllerScriptUrl: navigator.serviceWorker.controller?.scriptURL ?? null,
        }
      }

      const controllerChanged = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), timeoutMs)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          clearTimeout(timer)
          resolve(true)
        }, { once: true })

        waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      })

      await navigator.serviceWorker.ready

      return {
        hadWaiting: true,
        controlled: !!navigator.serviceWorker.controller,
        switched: controllerChanged && navigator.serviceWorker.controller?.scriptURL !== originalScriptUrl,
        controllerScriptUrl: navigator.serviceWorker.controller?.scriptURL ?? null,
      }
    }, {
      timeoutMs: MESSAGE_TIMEOUT_MS,
    })

    expect(skipWaitingResult).toMatchObject({ hadWaiting: true, controlled: true, switched: true })
    expect(skipWaitingResult.controllerScriptUrl).toContain('task15-skip-waiting=')
  })
})