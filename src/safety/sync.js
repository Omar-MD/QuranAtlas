/**
 * Cross-tab safety and synchronization module.
 * Handles BroadcastChannel mark sync and IDB versionchange reload banner.
 * Permitted cross-module import (safety exception).
 *
 * Public API:
 * - init() — set up channel + versionchange listener; returns cleanup function
 * - broadcastMarkChange(verseKeys) — notify other tabs of mark changes
 * - onMarkChange(callback) — register handler for incoming mark changes
 * - reset() — full reset for testing
 */

import { on, emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import * as syncState from '../state/sync.js'

const CHANNEL_NAME = 'quran-atlas:sync'

let markChangeHandlers = []
let bannerElement = null
let unsubVersionChange = null
let suppressVersionChangeBanner = false

/**
 * Initialize the safety sync module.
 * Sets up BroadcastChannel (if available) and versionchange listener.
 * @returns {Function} cleanup function
 */
export function init() {
  // Prevent duplicate init
  if (unsubVersionChange) {
    destroy()
  }

  // Set up BroadcastChannel if supported
  if (typeof BroadcastChannel !== 'undefined') {
    const bc = new BroadcastChannel(CHANNEL_NAME)
    bc.onmessage = handleChannelMessage
    syncState.set({ broadcastChannel: bc })
  }

  // Set up versionchange listener
  unsubVersionChange = on(Events.DB_VERSION_CHANGE, handleVersionChange)

  return () => { destroy() }
}

/**
 * Broadcast a mark change to other tabs.
 * Only call after IDB transaction oncomplete.
 * @param {string[]} verseKeys - verse keys that changed
 */
export function broadcastMarkChange(verseKeys) {
  const channel = syncState.get().broadcastChannel
  if (!channel) {
    return
  }
  channel.postMessage({ type: 'marks:changed', verseKeys })
}

/**
 * Register a handler for incoming mark changes from other tabs.
 * @param {Function} callback - receives { verseKeys: string[] }
 * @returns {Function} unsubscribe function
 */
export function onMarkChange(callback) {
  markChangeHandlers.push(callback)
  return () => {
    markChangeHandlers = markChangeHandlers.filter(h => h !== callback)
  }
}

/**
 * Close the channel and clean up all listeners.
 */
function destroy() {
  const channel = syncState.get().broadcastChannel
  if (channel) {
    channel.close()
    syncState.set({ broadcastChannel: null })
  }
  if (unsubVersionChange) {
    unsubVersionChange()
    unsubVersionChange = null
  }
}

/**
 * Handle incoming BroadcastChannel messages.
 */
function handleChannelMessage(event) {
  const { type, verseKeys } = event.data || {}
  if (type === 'marks:changed' && Array.isArray(verseKeys)) {
    for (const handler of markChangeHandlers) {
      try {
        handler({ verseKeys })
      } catch (error) {
        logger.error('Sync handler error:', {
          error,
        })
      }
    }
    emit(Events.SYNC_UPDATE_RECEIVED, /** @type {import('../core/constants.js').SyncUpdateReceivedPayload} */({ verseKeys }))
  }
}

/**
 * Suppress the next versionchange banner.
 * Call before triggering a self-initiated deleteDB (e.g. clear all data).
 */
export function suppressNextVersionChange() {
  suppressVersionChangeBanner = true
}

/**
 * Handle database version change event.
 * Renders a non-dismissible reload banner.
 */
function handleVersionChange() {
  if (suppressVersionChangeBanner) {
    suppressVersionChangeBanner = false
    return
  }

  if (bannerElement) {
    return
  }

  const appShell = document.getElementById('app-shell') || document.body
  if (!appShell) {
    logger.error('Safety sync: no valid container found')
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
 * Remove the reload banner (for testing).
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
 * Reset the module state (for testing).
 */
export function reset() {
  removeBanner()
  markChangeHandlers = []
  suppressVersionChangeBanner = false
  const channel = syncState.get().broadcastChannel
  if (channel) {
    channel.close()
    syncState.set({ broadcastChannel: null })
  }
  unsubVersionChange = null
}
