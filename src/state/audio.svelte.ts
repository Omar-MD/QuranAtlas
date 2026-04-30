// Sole writer for the audio runes + owner of the single global <audio>
// element. Per data-model.md cross-cutting invariant: exactly one
// HTMLAudioElement instance lives in the app — owned here, mounted into
// App.svelte's body, never duplicated. Multiple <audio> elements break
// iOS media-session binding (it picks the most-recently-played) and risk
// concurrent playback races.
//
// This module is the *runtime* state owner. The persistence layer
// (`state/audio-position.svelte.ts`) is a separate sole-writer for the
// IDB store. Settings persistence lives in `settings/audio.ts`.
//
// Cross-tab gating (`safety/sync.ts::registerTopic('audio.playback')`)
// is wired in `audio/cross-tab.ts` and consumes the runes here via
// `pauseFromCrossTab()`.

import type { AudioPositionRecord } from '../core/db/types'

export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'
export type VerseKey = `${number}:${number}`

export interface AudioStateShape {
  status: AudioStatus
  reciter: string | null
  surah: number | null
  currentVerse: VerseKey | null
  positionMs: number
  durationMs: number
  bufferedRanges: Array<[number, number]>
  /** Most recent error code surfaced via the toast pipe. Null when
   *  status !== 'error'. */
  errorCode: string | null
}

export const audioState: AudioStateShape = $state({
  status: 'idle',
  reciter: null,
  surah: null,
  currentVerse: null,
  positionMs: 0,
  durationMs: 0,
  bufferedRanges: [],
  errorCode: null,
})

let audioEl: HTMLAudioElement | null = null

export function getOrCreateAudioElement(): HTMLAudioElement {
  if (audioEl) { return audioEl }
  if (typeof document === 'undefined') {
    throw new Error('audio: cannot create <audio> outside browser')
  }
  const el = document.createElement('audio')
  // iOS Safari refuses autoplay-on-load when preload='auto'; 'metadata'
  // lets duration arrive without bytes streaming until play() is called
  // from a user gesture.
  el.preload = 'metadata'
  el.crossOrigin = 'anonymous'
  el.setAttribute('data-qa-audio', 'global')
  audioEl = el
  return el
}

export function getAudioElement(): HTMLAudioElement | null {
  return audioEl
}

/** Test-only: drop the singleton so tests get a fresh element. */
export function _resetAudioElementForTest(): void {
  if (audioEl && audioEl.parentNode) {
    audioEl.parentNode.removeChild(audioEl)
  }
  audioEl = null
  audioState.status = 'idle'
  audioState.reciter = null
  audioState.surah = null
  audioState.currentVerse = null
  audioState.positionMs = 0
  audioState.durationMs = 0
  audioState.bufferedRanges = []
  audioState.errorCode = null
}

export function isPlaying(): boolean {
  return audioState.status === 'playing'
}

export function isLive(): boolean {
  return audioState.status === 'playing' || audioState.status === 'paused' || audioState.status === 'loading'
}

export function applyResumeFromIDB(rec: AudioPositionRecord): void {
  audioState.reciter = rec.reciter
  audioState.surah = rec.surah
  audioState.currentVerse = `${rec.surah}:${rec.ayah}` as VerseKey
  audioState.positionMs = rec.ms
}

export function captureBufferedRanges(el: HTMLAudioElement): void {
  const tr = el.buffered
  const out: Array<[number, number]> = []
  for (let i = 0; i < tr.length; i++) {
    out.push([tr.start(i) * 1000, tr.end(i) * 1000])
  }
  audioState.bufferedRanges = out
}
