/**
 * Cross-tab safety and synchronization module.
 * Handles BroadcastChannel topic dispatch + IDB versionchange reload banner.
 * Permitted cross-module import (safety exception).
 *
 * Topic-dispatch model (audit R-10 / C-2 / C-5 / CC-4, 2026-04-29):
 * sync.ts owns no feature knowledge — it routes incoming envelopes to
 * handlers registered via `registerTopic(topic, fn)`. Each feature
 * registers its own handler at boot (e.g. settings/riwayah.ts:initRiwayah
 * registers the 'settings.riwayah' topic). The pre-fix import-cycle
 * `safety/sync.ts ↔ settings/riwayah.ts` is dissolved by removing the
 * `import { applyRiwayah }` direction; settings/riwayah.ts still imports
 * the outgoing `broadcast*` helpers (one-way dependency).
 *
 * Per-feature `broadcast*Change` wrappers stay as thin convenience
 * functions over the generic `broadcast(topic, payload)` so existing
 * call sites don't churn. Future audio/sync v2 work should add a single
 * registerTopic call rather than another bespoke message type.
 *
 * Public API:
 * - init() — set up channel + versionchange listener; returns cleanup function
 * - registerTopic(topic, fn) — feature handler for incoming messages
 * - broadcast(topic, payload) — generic outgoing broadcast
 * - broadcastMarkChange / broadcastEdgeChange / broadcastBookmarkChange /
 *   broadcastRiwayahChange — back-compat wrappers
 * - onMarkChange(callback) — legacy handler registry for marks (kept
 *   alive because marks/store consumes it directly; new code should
 *   prefer registerTopic('marks', …))
 * - reset() — full reset for testing
 */

import { on, emit } from '../core/events'
import { Events } from '../core/constants'
import { logger } from '../core/logger'
import { sync } from '../state/sync.svelte.ts'
const syncState = { get: () => sync, set: (p: Partial<typeof sync>) => Object.assign(sync, p) }

const CHANNEL_NAME = 'quran-atlas:sync'

type MarkChangeHandler = (data: { verseKeys: string[] }) => void
type Riwayah = 'hafs' | 'warsh' | 'qaloon'

type TopicHandler = (payload: unknown) => void

let markChangeHandlers: MarkChangeHandler[] = []
let topicHandlers: Map<string, TopicHandler> = new Map()
let bannerElement: HTMLElement | null = null
let unsubVersionChange: (() => void) | null = null
let suppressVersionChangeBanner = false

/**
 * Register a handler for inbound BroadcastChannel messages on a topic.
 * Each topic has at most one handler (overwrites if called twice — call
 * during init only).
 */
export function registerTopic(topic: string, fn: TopicHandler): () => void {
  topicHandlers.set(topic, fn)
  return () => {
    if (topicHandlers.get(topic) === fn) {
      topicHandlers.delete(topic)
    }
  }
}

/**
 * Generic broadcast — `payload` is whatever the topic owner expects on
 * the receive side. Future features should prefer this over adding
 * another bespoke `broadcast*Change` function.
 */
export function broadcast(topic: string, payload: unknown): void {
  const channel = syncState.get().broadcastChannel as BroadcastChannel | null
  if (!channel) {
    return
  }
  channel.postMessage({ topic, payload })
}

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

  // Wire built-in topic handlers (feature-owned topics register from
  // their own init module — e.g. settings/riwayah.ts registers
  // 'settings.riwayah' inside initRiwayah).
  registerCoreTopicHandlers()

  // Set up versionchange listener
  unsubVersionChange = on(Events.DB_VERSION_CHANGE, handleVersionChange)

  return () => { destroy() }
}

/**
 * Per-topic outgoing wrappers. Thin convenience over `broadcast()` so
 * call sites don't churn. Only call after IDB transaction oncomplete
 * (or, for riwayah, after the IDB put succeeds).
 */
export function broadcastMarkChange(verseKeys: string[]): void {
  broadcast('marks', { verseKeys })
}

export function broadcastEdgeChange(edgeIds: string[]): void {
  broadcast('edges', { edgeIds })
}

export function broadcastBookmarkChange(verseKeys: string[], riwayah: Riwayah): void {
  broadcast('bookmarks', { verseKeys, riwayah })
}

export function broadcastRiwayahChange(next: Riwayah): void {
  broadcast('settings.riwayah', { value: next })
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
 * Handle incoming BroadcastChannel messages. Dumb dispatcher: looks up
 * the handler registered for `topic` and calls it with `payload`.
 *
 * Built-in topics ('marks', 'edges', 'bookmarks') wire default handlers
 * during init() so the existing event-bus contracts (SYNC_UPDATE_RECEIVED
 * etc.) keep firing without each consumer needing to registerTopic.
 * Feature-owned topics like 'settings.riwayah' register from their own
 * init module — that is what dissolves the import cycle.
 *
 * Pre-fix message envelopes used { type: 'marks:changed', verseKeys, … }
 * with one shape per topic. The new envelope is { topic, payload }; we
 * still accept the legacy shape for one release in case a peer tab on
 * an older bundle is sending it.
 */
function handleChannelMessage(event: MessageEvent): void {
  const data = event.data
  if (!data || typeof data !== 'object') { return }

  // Legacy envelope — translate to topic+payload and fall through.
  // Removed once no in-the-wild bundle still sends `type:`.
  let topic: string | undefined
  let payload: unknown
  if (typeof (data as { topic?: unknown }).topic === 'string') {
    topic = (data as { topic: string }).topic
    payload = (data as { payload?: unknown }).payload
  } else if (typeof (data as { type?: unknown }).type === 'string') {
    const legacyType = (data as { type: string }).type
    switch (legacyType) {
      case 'marks:changed':
        topic = 'marks'
        payload = { verseKeys: (data as { verseKeys?: string[] }).verseKeys }
        break
      case 'edges:changed':
        topic = 'edges'
        payload = { edgeIds: (data as { edgeIds?: string[] }).edgeIds }
        break
      case 'bookmarks:changed':
        topic = 'bookmarks'
        payload = { verseKeys: (data as { verseKeys?: string[] }).verseKeys, riwayah: (data as { riwayah?: string }).riwayah }
        break
      case 'riwayah:changed':
        topic = 'settings.riwayah'
        payload = { value: (data as { value?: string }).value }
        break
      default:
        return
    }
  } else {
    return
  }

  const handler = topic ? topicHandlers.get(topic) : undefined
  if (!handler) {
    return
  }
  try {
    handler(payload)
  } catch (error) {
    logger.error('Sync topic handler error:', { topic, error })
  }
}

// Per-element validation for inbound BroadcastChannel arrays. Audit
// R-21 (2026-04-29): a peer tab on a hostile bundle could post arrays
// with arbitrary element shapes (proto-pollution payloads, unbounded
// strings). Cap element count + verse-key shape + edge-id shape so a
// downstream consumer that spreads the array can't be poisoned.
const VERSE_KEY_RE = /^\d+:\d+$/
const EDGE_ID_RE = /^[a-zA-Z0-9_-]+$/
const MAX_VERSE_KEYS = 10_000   // a single broadcast > 10k keys is hostile
const MAX_EDGE_IDS = 10_000

function validVerseKeys(arr: unknown): arr is string[] {
  if (!Array.isArray(arr)) return false
  if (arr.length > MAX_VERSE_KEYS) return false
  return arr.every((k) => typeof k === 'string' && k.length <= 12 && VERSE_KEY_RE.test(k))
}

function validEdgeIds(arr: unknown): arr is string[] {
  if (!Array.isArray(arr)) return false
  if (arr.length > MAX_EDGE_IDS) return false
  return arr.every((id) => typeof id === 'string' && id.length <= 64 && EDGE_ID_RE.test(id))
}

// Default in-tree handlers for marks / edges / bookmarks. Feature-owned
// topics (settings.riwayah, future audio, etc.) registerTopic from their
// own init modules.
function registerCoreTopicHandlers(): void {
  registerTopic('marks', (payload) => {
    const p = (payload || {}) as { verseKeys?: unknown }
    if (!validVerseKeys(p.verseKeys)) {
      logger.warn('Sync rejected marks payload: invalid verseKeys array')
      return
    }
    for (const handler of markChangeHandlers) {
      try {
        handler({ verseKeys: p.verseKeys })
      } catch (error) {
        logger.error('Sync handler error:', { error })
      }
    }
    emit(Events.SYNC_UPDATE_RECEIVED, { verseKeys: p.verseKeys })
  })
  registerTopic('edges', (payload) => {
    const p = (payload || {}) as { edgeIds?: unknown }
    if (!validEdgeIds(p.edgeIds)) {
      logger.warn('Sync rejected edges payload: invalid edgeIds array')
      return
    }
    emit(Events.SYNC_EDGES_UPDATED, { edgeIds: p.edgeIds })
  })
  registerTopic('bookmarks', (payload) => {
    const p = (payload || {}) as { verseKeys?: unknown; riwayah?: string }
    if (!validVerseKeys(p.verseKeys)) {
      logger.warn('Sync rejected bookmarks payload: invalid verseKeys array')
      return
    }
    if (p.riwayah !== 'hafs' && p.riwayah !== 'warsh' && p.riwayah !== 'qaloon') {
      logger.warn('Sync rejected bookmarks payload: invalid riwayah')
      return
    }
    emit(Events.SYNC_BOOKMARKS_UPDATED, { verseKeys: p.verseKeys, riwayah: p.riwayah })
  })
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
  topicHandlers = new Map()
  suppressVersionChangeBanner = false
  const channel = syncState.get().broadcastChannel as BroadcastChannel | null
  if (channel) {
    channel.close()
    syncState.set({ broadcastChannel: null })
  }
  unsubVersionChange = null
}
