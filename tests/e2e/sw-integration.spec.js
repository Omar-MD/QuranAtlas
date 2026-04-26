import { expect, test } from '@playwright/test'

import { CACHE_DATASET } from '../../src/core/constants.js'

const SW_READY_TIMEOUT_MS = 10000
const MESSAGE_TIMEOUT_MS = SW_READY_TIMEOUT_MS

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

// Service worker tests require a production build (SW is only emitted by
// vite-plugin-pwa during `vite build`).  They run exclusively on the
// "Offline (Preview)" project via the @offline tag.
test.describe('Service Worker integration @offline', () => {
  test('service worker registers and claims the page on first load @offline', async ({ page }) => {
    await openApp(page)

    await waitForActiveController(page)
  })

  test('PURGE_DATASET_CACHE clears the corpus cache and notifies the client @offline', async ({ page }) => {
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

  test('a new SW auto-activates without waiting (skipWaiting in install) @offline', async ({ page }) => {
    // Since 51289 (PR #51), src/sw.js calls self.skipWaiting() unconditionally
    // in the install handler. The new SW must therefore transition installing
    // → activating → activated without ever entering the `waiting` state, and
    // the page's controller must change to the new script URL automatically
    // — no SKIP_WAITING message, no UpdateBanner prompt. This is required by
    // the iOS PWA stale-precache fix (WebKit #199110) and is the single
    // source of truth for SW activation timing.
    await openApp(page)
    await waitForActiveController(page)

    const result = await page.evaluate(async ({ timeoutMs }) => {
      const controller = navigator.serviceWorker.controller
      if (!controller) {
        return { autoActivated: false, controllerScriptUrl: null, sawWaiting: false }
      }

      const originalScriptUrl = controller.scriptURL
      const nextScriptUrl = `/sw.js?task15-skip-waiting=${Date.now()}`

      // Race controllerchange against a poll that detects the (forbidden)
      // `waiting` state. With unconditional skipWaiting, controllerchange
      // wins; if the SW ever sits in `waiting`, that flag flips and the
      // assertion fails — locking in the contract.
      const controllerChanged = new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), timeoutMs)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          clearTimeout(timer)
          resolve(true)
        }, { once: true })
      })

      const registration = await navigator.serviceWorker.register(nextScriptUrl, { scope: '/' })

      let sawWaiting = false
      const waitingWatch = (async () => {
        const startedAt = Date.now()
        while (Date.now() - startedAt < timeoutMs) {
          if (registration.waiting) { sawWaiting = true; return }
          if (navigator.serviceWorker.controller?.scriptURL?.includes('task15-skip-waiting=')) { return }
          await new Promise(r => setTimeout(r, 25))
        }
      })()

      const switched = await controllerChanged
      await waitingWatch
      await navigator.serviceWorker.ready

      return {
        autoActivated: switched && navigator.serviceWorker.controller?.scriptURL !== originalScriptUrl,
        controllerScriptUrl: navigator.serviceWorker.controller?.scriptURL ?? null,
        sawWaiting,
      }
    }, {
      timeoutMs: MESSAGE_TIMEOUT_MS,
    })

    expect(result).toMatchObject({ autoActivated: true, sawWaiting: false })
    expect(result.controllerScriptUrl).toContain('task15-skip-waiting=')
  })
})