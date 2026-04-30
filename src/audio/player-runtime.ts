// Heart of the audio player: imperative play/pause/seek/setReciter against
// the global <audio> element, runtime state-machine transitions, event
// emit, IDB persistence trigger, cross-tab broadcast trigger.
//
// This module owns the side-effects. UI components (mini-bar, full
// overlay) and non-component callers (long-press menu, command sheet,
// settings, init-graph, cross-tab handler) all call into it.
//
// State invariants:
//   - audioState.status drives mini-bar visibility (idle = hidden).
//   - currentVerse = derived from positionMs + timing JSON ayahAtMs().
//     Recomputed on every timeupdate; emit `audio:verse-changed` only
//     when the verseKey actually changes (no debounce — verse boundaries
//     are second-grain in real recitation).
//   - Mid-playback reciter swap: derive ayah from current verseKey,
//     swap src to new reciter's surah file, seek to that reciter's ayah
//     start (NOT mid-word — see spec §3.4).

import { emit } from '../core/events'
import { Events } from '../core/constants'
import { logger } from '../core/logger'
import { audioState, getOrCreateAudioElement, type VerseKey } from '../state/audio.svelte'
import { settings } from '../state/settings.svelte'
import { loadTiming, ayahAtMs, ayahStartMs, type SurahTiming } from './timing-loader'
import { broadcastStarted, broadcastPaused, broadcastPosition } from './cross-tab'
import { savePosition, loadMostRecent, loadPosition } from '../state/audio-position.svelte'
import {
  registerActionHandlers,
  setMetadata,
  setPlaybackState,
  updatePositionState,
} from './media-session'

const TIMEUPDATE_BROADCAST_THROTTLE_MS = 3000
const POSITION_SAVE_THROTTLE_MS = 10_000

let currentTiming: SurahTiming | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastBroadcastAt = 0
let mediaSessionWired = false

// Imperative API surface (subset of AudioPlayerAPI from the spec).
// Configuration setters live in `settings/audio.ts`; setSpeed mutates
// the live <audio> element directly via setLiveSpeed below so an
// active session reflects the change without restart.

function audioUrl(reciter: string, surah: number): string {
  return `/dataset/audio/${encodeURIComponent(reciter)}/${String(surah).padStart(3, '0')}.mp3`
}

function ensureMediaSession(): void {
  if (mediaSessionWired) { return }
  registerActionHandlers({
    play: () => { void resume() },
    pause: () => { pause() },
    prev: () => { prev() },
    next: () => { next() },
    seek: (ms) => { seek(ms) },
  })
  mediaSessionWired = true
}

function attachElementListeners(el: HTMLAudioElement): void {
  if ((el as HTMLAudioElement & { _qaListenersAttached?: boolean })._qaListenersAttached) { return }
  ;(el as HTMLAudioElement & { _qaListenersAttached?: boolean })._qaListenersAttached = true

  el.addEventListener('loadedmetadata', () => {
    audioState.durationMs = isFinite(el.duration) ? el.duration * 1000 : 0
  })
  el.addEventListener('timeupdate', () => {
    const ms = el.currentTime * 1000
    audioState.positionMs = ms
    if (currentTiming) {
      const ayah = ayahAtMs(currentTiming, ms)
      if (ayah && audioState.surah !== null) {
        const next: VerseKey = `${audioState.surah}:${ayah.ayah}` as VerseKey
        if (audioState.currentVerse !== next) {
          audioState.currentVerse = next
          emit(Events.AUDIO_VERSE_CHANGED, { verseKey: next })
        }
      }
    }
    updatePositionState({
      durationMs: audioState.durationMs,
      positionMs: ms,
      speed: settings.audioSpeed,
    })
    const now = Date.now()
    if (now - lastBroadcastAt > TIMEUPDATE_BROADCAST_THROTTLE_MS && audioState.reciter && audioState.surah !== null) {
      lastBroadcastAt = now
      const ayahNum = parseInt((audioState.currentVerse ?? '0:0').split(':')[1] ?? '0', 10) || 1
      broadcastPosition({
        reciter: audioState.reciter,
        surah: audioState.surah,
        ayah: ayahNum,
        positionMs: ms,
      })
    }
  })
  el.addEventListener('play', () => {
    audioState.status = 'playing'
    setPlaybackState('playing')
    emit(Events.AUDIO_STARTED, { reciter: audioState.reciter, surah: audioState.surah })
  })
  el.addEventListener('pause', () => {
    if (audioState.status !== 'idle') {
      audioState.status = 'paused'
      setPlaybackState('paused')
      emit(Events.AUDIO_PAUSED, { positionMs: audioState.positionMs })
      schedulePositionSave(true)
    }
  })
  el.addEventListener('ended', () => {
    audioState.status = 'idle'
    setPlaybackState('none')
    emit(Events.AUDIO_ENDED, { surah: audioState.surah })
  })
  el.addEventListener('error', () => {
    audioState.status = 'error'
    audioState.errorCode = 'AUDIO_PLAYBACK_ERROR'
    emit(Events.AUDIO_ERROR, { code: 'AUDIO_PLAYBACK_ERROR', message: 'Audio playback error' })
  })
  el.addEventListener('progress', () => {
    const tr = el.buffered
    const out: Array<[number, number]> = []
    for (let i = 0; i < tr.length; i++) {
      out.push([tr.start(i) * 1000, tr.end(i) * 1000])
    }
    audioState.bufferedRanges = out
  })
}

async function loadSurah(reciter: string, surah: number): Promise<void> {
  const el = getOrCreateAudioElement()
  attachElementListeners(el)
  ensureMediaSession()
  audioState.status = 'loading'
  audioState.reciter = reciter
  audioState.surah = surah
  audioState.errorCode = null
  el.src = audioUrl(reciter, surah)
  el.playbackRate = settings.audioSpeed
  currentTiming = await loadTiming(reciter, surah)
  setMetadata({
    title: `Surah ${surah}`,
    artist: reciter,
    album: 'QuranAtlas',
  })
  await new Promise<void>((resolve) => {
    if (el.readyState >= 1 /* HAVE_METADATA */) { resolve(); return }
    const onMeta = () => { el.removeEventListener('loadedmetadata', onMeta); resolve() }
    el.addEventListener('loadedmetadata', onMeta, { once: true })
    el.load()
  })
}

export async function play(target?: { reciter?: string; surah: number; ayah?: number }): Promise<void> {
  if (!target) {
    const recent = await loadMostRecent()
    if (!recent) {
      emit(Events.AUDIO_ERROR, { code: 'AUDIO_NO_RESUME_TARGET', message: 'Pick a surah to start' })
      return
    }
    return play({ reciter: recent.reciter, surah: recent.surah, ayah: recent.ayah })
  }
  const reciter = target.reciter ?? settings.audioReciter
  if (!reciter) {
    emit(Events.AUDIO_ERROR, { code: 'AUDIO_NO_RECITER', message: 'Pick a reciter first' })
    return
  }
  const el = getOrCreateAudioElement()
  if (audioState.reciter !== reciter || audioState.surah !== target.surah) {
    await loadSurah(reciter, target.surah)
    if (target.ayah !== undefined && currentTiming) {
      const t = ayahStartMs(currentTiming, target.ayah)
      if (t !== null) { el.currentTime = t / 1000 }
    } else if (target.ayah === undefined) {
      const saved = await loadPosition(reciter, target.surah)
      if (saved && saved.ms > 0) { el.currentTime = saved.ms / 1000 }
    }
  } else if (target.ayah !== undefined && currentTiming) {
    const t = ayahStartMs(currentTiming, target.ayah)
    if (t !== null) { el.currentTime = t / 1000 }
  }
  try {
    await el.play()
    broadcastStarted({
      reciter,
      surah: target.surah,
      ayah: target.ayah ?? 1,
      positionMs: el.currentTime * 1000,
    })
  } catch (error) {
    logger.warn('audio.play() rejected', { error })
    audioState.status = 'error'
    audioState.errorCode = 'AUDIO_PLAYBACK_ERROR'
  }
}

export async function resume(): Promise<void> {
  const el = getOrCreateAudioElement()
  if (!el.src) { return play() }
  try { await el.play() } catch (error) { logger.warn('audio.resume() rejected', { error }) }
}

export function pause(reason?: string): void {
  const el = getOrCreateAudioElement()
  if (audioState.reciter && audioState.surah !== null) {
    broadcastPaused({
      reciter: audioState.reciter,
      surah: audioState.surah,
      ayah: parseInt((audioState.currentVerse ?? '0:0').split(':')[1] ?? '0', 10) || 1,
      positionMs: audioState.positionMs,
    })
  }
  el.pause()
  if (reason) { logger.info('audio.pause()', { reason }) }
}

export function toggle(): void {
  if (isPlaying()) { pause() } else { void resume() }
}

export function stop(): void {
  const el = getOrCreateAudioElement()
  el.pause()
  el.currentTime = 0
  audioState.status = 'idle'
  audioState.currentVerse = null
}

export function seek(ms: number): void {
  const el = getOrCreateAudioElement()
  el.currentTime = Math.max(0, Math.min(ms, audioState.durationMs)) / 1000
}

export function seekToVerse(ayah: number): void {
  if (!currentTiming) { return }
  const t = ayahStartMs(currentTiming, ayah)
  if (t === null) { return }
  seek(t)
}

export function next(): void {
  if (audioState.surah === null || audioState.surah >= 114) { return }
  void play({ surah: audioState.surah + 1, ayah: 1 })
}

export function prev(): void {
  if (audioState.surah === null || audioState.surah <= 1) { return }
  void play({ surah: audioState.surah - 1, ayah: 1 })
}

export async function setReciterMidPlayback(newReciter: string): Promise<void> {
  if (audioState.surah === null) {
    // Nothing playing — just update settings.
    return
  }
  const surah = audioState.surah
  const ayah = parseInt((audioState.currentVerse ?? `${surah}:1`).split(':')[1] ?? '1', 10) || 1
  await play({ reciter: newReciter, surah, ayah })
}

export function setLiveSpeed(speed: number): void {
  const el = getOrCreateAudioElement()
  el.playbackRate = speed
}

function isPlaying(): boolean {
  return audioState.status === 'playing'
}

function schedulePositionSave(immediate = false): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  const flush = (): void => {
    if (audioState.reciter && audioState.surah !== null) {
      const ayah = parseInt((audioState.currentVerse ?? `${audioState.surah}:1`).split(':')[1] ?? '1', 10) || 1
      void savePosition({
        reciter: audioState.reciter,
        surah: audioState.surah,
        ayah,
        ms: audioState.positionMs,
        lastPlayedAt: Date.now(),
      })
    }
  }
  if (immediate) { flush() }
  saveTimer = setTimeout(() => {
    flush()
    saveTimer = null
  }, POSITION_SAVE_THROTTLE_MS)
}

/** Called by cross-tab handler when another tab takes over playback. */
export function pauseFromCrossTab(): void {
  if (audioState.status === 'playing') {
    const el = getOrCreateAudioElement()
    el.pause()
    audioState.status = 'paused'
  }
}

export function _testReset(): void {
  currentTiming = null
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  lastBroadcastAt = 0
  mediaSessionWired = false
}
