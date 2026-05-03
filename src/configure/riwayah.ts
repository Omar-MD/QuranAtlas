/**
 * Riwayah preference: which Qur'anic transmission the reader displays.
 * Sole writer for `settings['riwayah']`. Default = 'qaloon'.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { settings, type Riwayah } from './state.svelte.ts'
import { broadcastRiwayahChange, registerTopic } from '../infra/safety/sync'

const RIWAYAH_OPTIONS: readonly Riwayah[] = ['hafs', 'warsh', 'qaloon'] as const
const DEFAULT_RIWAYAH: Riwayah = 'qaloon'

function isRiwayah(v: unknown): v is Riwayah {
  return typeof v === 'string' && (RIWAYAH_OPTIONS as readonly string[]).includes(v)
}

export type { Riwayah }

export function getRiwayahOptions(): Riwayah[] {
  return [...RIWAYAH_OPTIONS]
}

export async function loadRiwayah(): Promise<Riwayah> {
  try {
    const rec = await get('settings', 'riwayah')
    const raw = (rec as { value?: unknown } | undefined)?.value
    return isRiwayah(raw) ? raw : DEFAULT_RIWAYAH
  } catch (error) {
    logger.error('Failed to load riwayah:', { error })
    return DEFAULT_RIWAYAH
  }
}

export function applyRiwayah(r: Riwayah): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-riwayah', r)
  }
}

export async function setRiwayah(next: Riwayah): Promise<boolean> {
  if (!isRiwayah(next)) { return false }
  const prev = await loadRiwayah()
  if (prev === next) {
    applyRiwayah(next)
    return true
  }
  applyRiwayah(next)
  ;(settings as Record<string, unknown>).riwayah = next
  try {
    await put('settings', { key: 'riwayah', value: next })
  } catch (error) {
    logger.error('Failed to save riwayah:', { error })
    return false
  }
  emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: prev, to: next })
  broadcastRiwayahChange(next)
  return true
}

export async function initRiwayah(): Promise<Riwayah> {
  // Register the cross-tab topic handler. settings/riwayah owns its own
  // applyRiwayah / event-emit on incoming messages — sync.ts no longer
  // imports from this module, breaking the audit CC-4 cycle (2026-04-29).
  registerTopic('settings.riwayah', (payload) => {
    const v = (payload || {}) as { value?: unknown }
    if (!isRiwayah(v.value)) { return }
    const next = v.value
    const prev = (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-riwayah') : null) as Riwayah | null
    if (prev === next) { return }
    applyRiwayah(next)
    emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: (prev ?? DEFAULT_RIWAYAH), to: next })
  })
  const r = await loadRiwayah()
  applyRiwayah(r)
  ;(settings as Record<string, unknown>).riwayah = r
  return r
}
