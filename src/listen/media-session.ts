// navigator.mediaSession wiring. Lock-screen / Bluetooth headset / car
// stereo controls. Required for credible audio app — without it,
// pause-on-headset-unplug doesn't work.
//
// Action handlers delegate to the AudioPlayerAPI (player-bridge.ts) so
// the bridge is the single source of imperative truth — media-session
// just translates platform events into bridge calls. Position state
// updates are throttled to 1 Hz because lock-screen scrubbers have
// second-level resolution.

import { logger } from '../core/logger'

export interface MediaSessionDeps {
  play: () => void
  pause: () => void
  prev: () => void
  next: () => void
  seek: (ms: number) => void
}

const SEEK_OFFSET_MS_DEFAULT = 10_000
let positionStateThrottleAt = 0

function hasMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

export function registerActionHandlers(deps: MediaSessionDeps): void {
  if (!hasMediaSession()) { return }
  const ms = navigator.mediaSession
  try {
    ms.setActionHandler('play', () => deps.play())
    ms.setActionHandler('pause', () => deps.pause())
    ms.setActionHandler('previoustrack', () => deps.prev())
    ms.setActionHandler('nexttrack', () => deps.next())
    ms.setActionHandler('seekbackward', (e) => {
      const offset = (e as { seekOffset?: number }).seekOffset ?? SEEK_OFFSET_MS_DEFAULT
      deps.seek(currentPositionMs() - offset)
    })
    ms.setActionHandler('seekforward', (e) => {
      const offset = (e as { seekOffset?: number }).seekOffset ?? SEEK_OFFSET_MS_DEFAULT
      deps.seek(currentPositionMs() + offset)
    })
    ms.setActionHandler('seekto', (e) => {
      const t = (e as { seekTime?: number }).seekTime
      if (typeof t === 'number') { deps.seek(t * 1000) }
    })
  } catch (error) {
    logger.warn('mediaSession.setActionHandler failed:', { error })
  }
}

let lastPositionMs = 0
function currentPositionMs(): number {
  return lastPositionMs
}

export function setMetadata(opts: {
  title: string
  artist: string
  album: string
  artworkBase?: string
}): void {
  if (!hasMediaSession() || typeof window === 'undefined' || !('MediaMetadata' in window)) { return }
  const base = opts.artworkBase ?? '/icons'
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: opts.title,
      artist: opts.artist,
      album: opts.album,
      artwork: [
        { src: `${base}/audio-art-512.png`, sizes: '512x512', type: 'image/png' },
        { src: `${base}/audio-art-256.png`, sizes: '256x256', type: 'image/png' },
        { src: `${base}/audio-art-96.png`, sizes: '96x96', type: 'image/png' },
      ],
    })
  } catch (error) {
    logger.warn('mediaSession.metadata failed:', { error })
  }
}

export function setPlaybackState(state: 'playing' | 'paused' | 'none'): void {
  if (!hasMediaSession()) { return }
  try {
    navigator.mediaSession.playbackState = state
  } catch {
    // Ignore — older browsers may not expose this property.
  }
}

export function updatePositionState(opts: { durationMs: number; positionMs: number; speed: number }): void {
  lastPositionMs = opts.positionMs
  if (!hasMediaSession()) { return }
  const ms = navigator.mediaSession
  if (typeof ms.setPositionState !== 'function') { return }
  // 1 Hz throttle — lock-screen scrubber resolution is seconds.
  const now = Date.now()
  if (now - positionStateThrottleAt < 1000) { return }
  positionStateThrottleAt = now
  try {
    ms.setPositionState({
      duration: Math.max(0, opts.durationMs / 1000),
      playbackRate: opts.speed,
      position: Math.max(0, Math.min(opts.positionMs, opts.durationMs) / 1000),
    })
  } catch {
    // setPositionState throws when position > duration; safe to ignore.
  }
}

export function clear(): void {
  if (!hasMediaSession()) { return }
  try {
    navigator.mediaSession.metadata = null
    navigator.mediaSession.playbackState = 'none'
    for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto'] as const) {
      navigator.mediaSession.setActionHandler(action, null)
    }
  } catch {
    // Ignore — we're tearing down.
  }
}
