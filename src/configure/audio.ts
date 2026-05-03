// Sole writer for all `settings.audio*` keys. Mirrors the riwayah / theme
// /font-size pattern: load from IDB on init, apply to runes, persist on
// set. Audio settings cluster under one module because they're tightly
// related (reciter ↔ speed ↔ repeat all live in the player overlay) and
// keeping them together avoids 7 thin modules with the same boilerplate.
//
// Cross-tab sync for these keys is intentionally NOT registered as a
// `registerTopic` channel today — settings runes propagate via the
// `settings` IDB topic on existing 'marks'/'edges'/'bookmarks' patterns
// when added; for v2.0 audio, settings drift between tabs is tolerable
// (each tab sets its own preference). Cross-tab playback gating uses
// `audio.playback` topic separately (see `state/audio.svelte.ts`).

import { get, put } from '../core/db'
import { logger } from '../core/logger'
import {
  settings,
  type AudioSpeed,
  type AudioRepeat,
  type AudioRepeatMode,
  type AudioAutoScrollMode,
  type AudioLoopRange,
} from './state.svelte'

const SPEED_OPTIONS: readonly AudioSpeed[] = [0.75, 1, 1.25, 1.5, 2] as const
const REPEAT_MODES: readonly AudioRepeatMode[] = ['off', 'verse', 'range', 'surah'] as const
const AUTOSCROLL_MODES: readonly AudioAutoScrollMode[] = ['smart', 'always', 'off'] as const

function isSpeed(v: unknown): v is AudioSpeed {
  return typeof v === 'number' && (SPEED_OPTIONS as readonly number[]).includes(v)
}

function isRepeatMode(v: unknown): v is AudioRepeatMode {
  return typeof v === 'string' && (REPEAT_MODES as readonly string[]).includes(v)
}

function isAutoScrollMode(v: unknown): v is AudioAutoScrollMode {
  return typeof v === 'string' && (AUTOSCROLL_MODES as readonly string[]).includes(v)
}

function isRepeat(v: unknown): v is AudioRepeat {
  if (!v || typeof v !== 'object') { return false }
  const r = v as { mode?: unknown; count?: unknown }
  if (!isRepeatMode(r.mode)) { return false }
  if (r.count !== undefined && typeof r.count !== 'number') { return false }
  return true
}

function isLoopRange(v: unknown): v is { from: string; to: string } {
  if (!v || typeof v !== 'object') { return false }
  const r = v as { from?: unknown; to?: unknown }
  return typeof r.from === 'string' && typeof r.to === 'string'
}

async function loadKey<T>(key: string, validator: (v: unknown) => v is T, fallback: T): Promise<T> {
  try {
    const rec = await get('settings', key)
    const raw = (rec as { value?: unknown } | undefined)?.value
    return validator(raw) ? raw : fallback
  } catch (error) {
    logger.error(`Failed to load setting ${key}:`, { error })
    return fallback
  }
}

async function persist(key: string, value: unknown): Promise<boolean> {
  try {
    await put('settings', { key, value })
    return true
  } catch (error) {
    logger.error(`Failed to persist setting ${key}:`, { error })
    return false
  }
}

export async function setAudioReciter(id: string | null): Promise<boolean> {
  if (id !== null && (typeof id !== 'string' || id.length === 0 || id.length > 80)) {
    return false
  }
  ;(settings as Record<string, unknown>).audioReciter = id
  return persist('audioReciter', id)
}

export async function setAudioSpeed(speed: AudioSpeed): Promise<boolean> {
  if (!isSpeed(speed)) { return false }
  ;(settings as Record<string, unknown>).audioSpeed = speed
  return persist('audioSpeed', speed)
}

export async function setAudioRepeat(repeat: AudioRepeat): Promise<boolean> {
  if (!isRepeat(repeat)) { return false }
  ;(settings as Record<string, unknown>).audioRepeat = repeat
  return persist('audioRepeat', repeat)
}

export async function setAudioLoopRange(range: AudioLoopRange): Promise<boolean> {
  if (range !== null && !isLoopRange(range)) { return false }
  ;(settings as Record<string, unknown>).audioLoopRange = range
  return persist('audioLoopRange', range)
}

export async function setAudioPrefetchNext(enabled: boolean): Promise<boolean> {
  ;(settings as Record<string, unknown>).audioPrefetchNext = enabled
  return persist('audioPrefetchNext', enabled)
}

export async function setAudioAutoScrollMode(mode: AudioAutoScrollMode): Promise<boolean> {
  if (!isAutoScrollMode(mode)) { return false }
  ;(settings as Record<string, unknown>).audioAutoScrollMode = mode
  return persist('audioAutoScrollMode', mode)
}

export async function setAudioFirstPlayHintShown(shown: boolean): Promise<boolean> {
  ;(settings as Record<string, unknown>).audioFirstPlayHintShown = shown
  return persist('audioFirstPlayHintShown', shown)
}

export async function initAudioSettings(): Promise<void> {
  const [reciter, speed, repeat, loopRange, prefetch, autoscroll, hint] = await Promise.all([
    loadKey('audioReciter', (v): v is string | null => v === null || (typeof v === 'string' && v.length <= 80), null),
    loadKey('audioSpeed', isSpeed, 1 as AudioSpeed),
    loadKey('audioRepeat', isRepeat, { mode: 'off' } as AudioRepeat),
    loadKey<AudioLoopRange>('audioLoopRange', (v): v is AudioLoopRange => v === null || isLoopRange(v), null),
    loadKey('audioPrefetchNext', (v): v is boolean => typeof v === 'boolean', true),
    loadKey('audioAutoScrollMode', isAutoScrollMode, 'smart' as AudioAutoScrollMode),
    loadKey('audioFirstPlayHintShown', (v): v is boolean => typeof v === 'boolean', false),
  ])
  const s = settings as Record<string, unknown>
  s.audioReciter = reciter
  s.audioSpeed = speed
  s.audioRepeat = repeat
  s.audioLoopRange = loopRange
  s.audioPrefetchNext = prefetch
  s.audioAutoScrollMode = autoscroll
  s.audioFirstPlayHintShown = hint
}
