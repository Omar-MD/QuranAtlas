// Cross-tab playback gating + position sync. Newest-press-wins via
// `safety/sync.ts::registerTopic('audio.playback')`; soft-sync handoff
// via `audio.position`. See `docs/superpowers/specs/2026-04-30-audio-
// design.md` §5.
//
// Tab identity: a per-tab UUID stored in sessionStorage so receivers
// dedup self-echo. SessionStorage (not localStorage) so two windows of
// the same tab series get distinct IDs — that's what we want for
// cross-tab gating (two windows are two tabs).

import { broadcast, registerTopic } from '../infra/safety/sync'
import { logger } from '../core/logger'

const TAB_ID_KEY = 'qa.audio.tabId'

let tabId: string | null = null
export function getTabId(): string {
  if (tabId !== null) { return tabId }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(TAB_ID_KEY)
      if (stored) {
        tabId = stored
        return stored
      }
    }
  } catch {
    // sessionStorage may be blocked (private mode); fall through to gen.
  }
  const id = `t_${Math.random().toString(36).slice(2)}_${Date.now()}`
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TAB_ID_KEY, id)
    }
  } catch {
    // Ignore.
  }
  tabId = id
  return id
}

export interface PlaybackEvent {
  kind: 'started' | 'paused'
  reciter: string
  surah: number
  ayah: number
  positionMs: number
  tabId: string
  ts: number
}

export interface PositionEvent {
  reciter: string
  surah: number
  ayah: number
  positionMs: number
  tabId: string
  ts: number
}

export function broadcastStarted(args: { reciter: string; surah: number; ayah: number; positionMs: number }): void {
  const ev: PlaybackEvent = { kind: 'started', tabId: getTabId(), ts: Date.now(), ...args }
  broadcast('audio.playback', ev)
}

export function broadcastPaused(args: { reciter: string; surah: number; ayah: number; positionMs: number }): void {
  const ev: PlaybackEvent = { kind: 'paused', tabId: getTabId(), ts: Date.now(), ...args }
  broadcast('audio.playback', ev)
}

export function broadcastPosition(args: { reciter: string; surah: number; ayah: number; positionMs: number }): void {
  const ev: PositionEvent = { tabId: getTabId(), ts: Date.now(), ...args }
  broadcast('audio.position', ev)
}

function isPlaybackEvent(p: unknown): p is PlaybackEvent {
  if (!p || typeof p !== 'object') { return false }
  const e = p as Record<string, unknown>
  if (e.kind !== 'started' && e.kind !== 'paused') { return false }
  if (typeof e.reciter !== 'string') { return false }
  if (typeof e.surah !== 'number') { return false }
  if (typeof e.ayah !== 'number') { return false }
  if (typeof e.positionMs !== 'number') { return false }
  if (typeof e.tabId !== 'string') { return false }
  return true
}

function isPositionEvent(p: unknown): p is PositionEvent {
  if (!p || typeof p !== 'object') { return false }
  const e = p as Record<string, unknown>
  if (typeof e.reciter !== 'string') { return false }
  if (typeof e.surah !== 'number') { return false }
  if (typeof e.ayah !== 'number') { return false }
  if (typeof e.positionMs !== 'number') { return false }
  if (typeof e.tabId !== 'string') { return false }
  return true
}

export interface CrossTabHandlers {
  onPlaybackTakeover: (ev: PlaybackEvent) => void
  onPositionUpdate?: (ev: PositionEvent) => void
}

export function initCrossTab(handlers: CrossTabHandlers): void {
  registerTopic('audio.playback', (payload) => {
    if (!isPlaybackEvent(payload)) {
      logger.warn('audio.playback rejected: invalid payload')
      return
    }
    if (payload.tabId === getTabId()) { return }
    handlers.onPlaybackTakeover(payload)
  })

  registerTopic('audio.position', (payload) => {
    if (!isPositionEvent(payload)) {
      logger.warn('audio.position rejected: invalid payload')
      return
    }
    if (payload.tabId === getTabId()) { return }
    handlers.onPositionUpdate?.(payload)
  })
}

/** Test-only — reset tab id. */
export function _resetTabIdForTest(): void {
  tabId = null
  try { sessionStorage.removeItem(TAB_ID_KEY) } catch { /* ignore */ }
}
