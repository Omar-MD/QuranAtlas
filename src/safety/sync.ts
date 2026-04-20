/**
 * Cross-tab safety and synchronization module.
 * Handles BroadcastChannel mark sync, edge sync, and IDB versionchange reload banner.
 * Permitted cross-module import (safety exception).
 *
 * Public API:
 * - init() — set up channel + versionchange listener; returns cleanup function
 * - broadcastMarkChange(verseKeys) — notify other tabs of mark changes
 * - onMarkChange(callback) — register handler for incoming mark changes
 * - broadcastEdgeChange(edgeIds) — notify other tabs of edge changes
 * - reset() — full reset for testing
 */

import { on, emit } from '../core/events'
import { Events } from '../core/constants'
import { logger } from '../core/logger'
import { sync } from '../state/sync.svelte.ts'
const syncState = { get: () => sync, set: (p: Partial<typeof sync>) => Object.assign(sync, p) }

const CHANNEL_NAME = 'quran-atlas:sync'

type MarkChangeHandler = (data: { verseKeys: string[] }) => void

let markChangeHandlers: MarkChangeHandler[] = []
let bannerElement: HTMLElement | null = null
let unsubVersionChange: (() => void) | null = null
let suppressVersionChangeBanner = false

/**
 * Initialize the safety sync module.
 * Sets up BroadcastChannel (if available) and versionchange listener.
 * Returns a cleanup function.
 */
export function init(): () => void {
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
 */
export function broadcastMarkChange(verseKeys: string[]): void {
  const channel = syncState.get().broadcastChannel as BroadcastChannel | null
  if (!channel) {
    return
  }
  channel.postMessage({ type: 'marks:changed', verseKeys })
}

/**
 * Broadcast an edge change to other tabs.
 * Only call after IDB transaction oncomplete.
 */
export function broadcastEdgeChange(edgeIds: string[]): void {
  const channel = syncState.get().broadcastChannel as BroadcastChannel | null
  if (!channel) {
    return
  }
  channel.postMessage({ type: 'edges:changed', edgeIds })
}

/**
 * Register a handler for incoming mark changes from other tabs.
 * Returns an unsubscribe function.
 */
export function onMarkChange(callback: MarkChangeHandler): () => void {
  markChangeHandlers.push(callback)
  return () => {
    markChangeHandlers = markChangeHandlers.filter(h => h !== callback)
  }
}

/**
 * Close the channel and clean up all listeners.
 */
function destroy(): void {
  const channel = syncState.get().broadcastChannel as BroadcastChannel | null
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
function handleChannelMessage(event: MessageEvent): void {
  const data = (event.data || {}) as { type?: string; verseKeys?: string[]; edgeIds?: string[] }
  if (data.type === 'marks:changed' && Array.isArray(data.verseKeys)) {
    for (const handler of markChangeHandlers) {
      try {
        handler({ verseKeys: data.verseKeys })
      } catch (error) {
        logger.error('Sync handler error:', {
          error,
        })
      }
    }
    emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: data.verseKeys })
  } else if (data.type === 'edges:changed' && Array.isArray(data.edgeIds)) {
    emit(Events.SYNC_EDGES_UPDATED, { edgeIds: data.edgeIds })
  }
}

/**
 * Suppress the next versionchange banner.
 * Call before triggering a self-initiated deleteDB (e.g. clear all data).
 */
export function suppressNextVersionChange(): void {
  suppressVersionChangeBanner = true
}

/**
 * Handle database version change event.
 * Renders a non-dismissible reload banner.
 */
function handleVersionChange(): void {
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
export function removeBanner(): void {
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
export function reset(): void {
  removeBanner()
  markChangeHandlers = []
  suppressVersionChangeBanner = false
  const channel = syncState.get().broadcastChannel as BroadcastChannel | null
  if (channel) {
    channel.close()
    syncState.set({ broadcastChannel: null })
  }
  unsubVersionChange = null
}
