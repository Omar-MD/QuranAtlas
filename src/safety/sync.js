/**
 * Safety sync module.
 * Handles IDB versionchange events by showing a non-dismissible reload banner.
 * Prevents data corruption when schema upgrades occur in other tabs.
 */

import { on } from '../core/events.js'
import { Events } from '../core/constants.js'

let bannerElement = null
let unsubHandler = null

/**
 * Initialize the safety sync module.
 * Sets up listener for DB_VERSION_CHANGE events.
 * @returns {Function} cleanup function
 */
export function init() {
  // Prevent duplicate listeners if re-initialized
  if (unsubHandler) {
    return unsubHandler
  }
  
  const unsub = on(Events.DB_VERSION_CHANGE, handleVersionChange)
  unsubHandler = unsub
  return unsub
}

/**
 * Handle database version change event.
 * Renders a non-dismissible reload banner.
 */
function handleVersionChange() {
  if (bannerElement) {
    return // Already showing
  }

  const appShell = document.getElementById('app-shell') || document.body
  if (!appShell) {
    console.error('Safety sync: no valid container found')
    return
  }

  // Create backdrop
  const backdrop = document.createElement('div')
  backdrop.className = 'qa-sync-backdrop'
  backdrop.setAttribute('role', 'alert')
  backdrop.setAttribute('aria-live', 'assertive')

  // Create banner
  bannerElement = document.createElement('div')
  bannerElement.className = 'qa-sync-banner'

  const title = document.createElement('h2')
  title.className = 'qa-sync-title'
  title.textContent = 'Update Required'

  const message = document.createElement('p')
  message.className = 'qa-sync-message'
  message.textContent = 'QuranAtlas has been updated in another tab. Please reload to continue.'

  const reloadBtn = document.createElement('button')
  reloadBtn.className = 'qa-sync-reload-btn'
  reloadBtn.textContent = 'Reload Now'
  reloadBtn.addEventListener('click', () => {
    window.location.reload()
  })

  bannerElement.appendChild(title)
  bannerElement.appendChild(message)
  bannerElement.appendChild(reloadBtn)
  backdrop.appendChild(bannerElement)

  // Insert at the beginning of app-shell to block interaction
  appShell.insertBefore(backdrop, appShell.firstChild)

  // Prevent interaction with rest of app
  appShell.style.pointerEvents = 'none'
  bannerElement.style.pointerEvents = 'auto'
}

/**
 * Remove the reload banner (for testing purposes).
 */
export function removeBanner() {
  if (bannerElement) {
    const backdrop = bannerElement.parentElement
    if (backdrop) {
      backdrop.remove()
    }
    bannerElement = null

    const appShell = document.getElementById('app-shell')
    if (appShell) {
      appShell.style.pointerEvents = ''
    }
  }
}

/**
 * Reset the module state (for testing purposes).
 * Clears the unsubscribe handler so init() can be called again.
 */
export function reset() {
  removeBanner()
  unsubHandler = null
}
