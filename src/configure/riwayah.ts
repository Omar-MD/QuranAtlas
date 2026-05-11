/**
 * Riwayah preference: which Qur'anic transmission the reader displays.
 * Sole writer for `settings['riwayah']`. Default = 'qaloon'.
 */

import { get, put } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import {
  riwayahInstallIntent,
  riwayahPackageState,
  settings,
  type Riwayah,
} from './state.svelte.ts'
import { broadcastRiwayahChange, registerTopic } from '../infra/safety/sync'
import {
  getRiwayahPackageStatus,
  isRiwayahUsable,
  type RiwayahPackageStatus,
} from '../data/riwayah-packages'

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
  try {
    if (!(await isRiwayahUsable(next))) return false
  } catch {
    return false
  }
  const prev = await loadRiwayah()
  if (prev === next) {
    applyRiwayah(next)
    ;(settings as Record<string, unknown>).riwayah = next
    return true
  }
  try {
    await put('settings', { key: 'riwayah', value: next })
  } catch (error) {
    logger.error('Failed to save riwayah:', { error })
    return false
  }
  applyRiwayah(next)
  ;(settings as Record<string, unknown>).riwayah = next
  emit(Events.SETTINGS_RIWAYAH_CHANGED, { from: prev, to: next })
  broadcastRiwayahChange(next)
  return true
}

export async function refreshRiwayahPackageStatus(riwayah: Riwayah): Promise<RiwayahPackageStatus> {
  const status = await getRiwayahPackageStatus(riwayah)
  riwayahPackageState[riwayah] = status
  return status
}

export function beginRiwayahInstall(riwayah: Riwayah): boolean {
  if (!isRiwayah(riwayah) || riwayah === DEFAULT_RIWAYAH) return false
  riwayahInstallIntent.requested = riwayah
  riwayahPackageState[riwayah] = { kind: 'installing', riwayah, cached: 0, total: 0 }
  return true
}

export function failRiwayahInstall(riwayah: Riwayah, message: string): void {
  if (!isRiwayah(riwayah)) return
  const previous = riwayahPackageState[riwayah]
  const totalBytes = previous && 'totalBytes' in previous ? previous.totalBytes : 0
  riwayahPackageState[riwayah] = { kind: 'error', riwayah, message, totalBytes }
  if (riwayahInstallIntent.requested === riwayah) {
    riwayahInstallIntent.requested = null
  }
}

export async function completeRiwayahInstall(riwayah: Riwayah): Promise<boolean> {
  if (!isRiwayah(riwayah)) return false
  const status = await refreshRiwayahPackageStatus(riwayah)
  if (status.kind !== 'installed') return false
  const applied = await setRiwayah(riwayah)
  if (applied) {
    riwayahInstallIntent.previousUsable = riwayah
    if (riwayahInstallIntent.requested === riwayah) {
      riwayahInstallIntent.requested = null
    }
  }
  return applied
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
  try {
    if (await isRiwayahUsable(r)) {
      riwayahInstallIntent.previousUsable = r
    } else if (await isRiwayahUsable(DEFAULT_RIWAYAH)) {
      riwayahInstallIntent.previousUsable = DEFAULT_RIWAYAH
    }
  } catch {
    // Package index may be absent in old cached builds or test harnesses; the
    // active setting still loads, but optional persistence remains gated.
  }
  applyRiwayah(r)
  ;(settings as Record<string, unknown>).riwayah = r
  return r
}
