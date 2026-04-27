/**
 * Riwayah preference: which Qur'anic transmission the reader displays.
 * Sole writer for `settings['riwayah']`. Default = 'qaloon'.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { settings, type Riwayah } from '../state/settings.svelte.ts'
import { broadcastRiwayahChange } from '../safety/sync'

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
  const r = await loadRiwayah()
  applyRiwayah(r)
  ;(settings as Record<string, unknown>).riwayah = r
  return r
}
