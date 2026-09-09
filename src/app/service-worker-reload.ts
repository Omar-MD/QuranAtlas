/**
 * vite-plugin-pwa (registerType: 'autoUpdate', injectRegister: 'auto') registers
 * the service worker from a script injected into the document; the new worker
 * skipWaiting()s and claims clients on deploy. Reload at most once per page
 * load when the controller changes so the open tab deterministically picks up
 * the new app shell without a reload loop. A first install (controller going
 * null → worker) is not an update: nothing stale is on the page, so skip it.
 */
export function installServiceWorkerReloadGuard(): void {
  if (!('serviceWorker' in navigator)) return

  const hadControllerAtLoad = navigator.serviceWorker.controller !== null
  let reloadedOnControllerChange = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtLoad || reloadedOnControllerChange) return
    reloadedOnControllerChange = true
    window.location.reload()
  })
}
