/**
 * Arabic font preference per riwayah. Each riwayah remembers its own choice
 * (Amiri Quran default, KFGQPC riwayah-specific cut, or Scheherazade New).
 * Sole writer for `settings['arabicFont_{riwayah}']`. Active font tracks the
 * current riwayah via the SETTINGS_RIWAYAH_CHANGED listener.
 */

import { get, put } from '../core/db.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { logger } from '../core/logger.js'
import { settings, type Riwayah, type ArabicFont } from '../state/settings.svelte.ts'

const FONT_OPTIONS: readonly ArabicFont[] = ['amiri-quran', 'kfgqpc', 'scheherazade'] as const
const DEFAULT_FONT: ArabicFont = 'amiri-quran'

export type { ArabicFont }

export function getArabicFontOptions(): ArabicFont[] {
  return [...FONT_OPTIONS]
}

function isArabicFont(v: unknown): v is ArabicFont {
  return typeof v === 'string' && (FONT_OPTIONS as readonly string[]).includes(v)
}

function storageKey(r: Riwayah): string {
  return `arabicFont_${r}`
}

function runeKey(r: Riwayah): 'arabicFontHafs' | 'arabicFontWarsh' | 'arabicFontQaloon' {
  return (r === 'hafs' ? 'arabicFontHafs' : r === 'warsh' ? 'arabicFontWarsh' : 'arabicFontQaloon')
}

export async function loadArabicFont(r: Riwayah): Promise<ArabicFont> {
  try {
    const rec = await get('settings', storageKey(r))
    const raw = (rec as { value?: unknown } | undefined)?.value
    return isArabicFont(raw) ? raw : DEFAULT_FONT
  } catch (error) {
    logger.error('Failed to load arabic font:', { error, riwayah: r })
    return DEFAULT_FONT
  }
}

export function applyArabicFont(font: ArabicFont): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-arabic-font', font)
  }
}

export async function setArabicFont(r: Riwayah, next: ArabicFont): Promise<boolean> {
  if (!isArabicFont(next)) { return false }
  const prev = await loadArabicFont(r)
  const rune = runeKey(r)
  ;(settings as Record<string, unknown>)[rune] = next
  if (settings.riwayah === r) { applyArabicFont(next) }
  if (prev === next) { return true }
  try {
    await put('settings', { key: storageKey(r), value: next })
  } catch (error) {
    logger.error('Failed to save arabic font:', { error, riwayah: r })
    return false
  }
  emit(Events.SETTINGS_ARABIC_FONT_CHANGED, { riwayah: r, from: prev, to: next })
  return true
}

export async function initArabicFont(): Promise<void> {
  const [hafs, warsh, qaloon] = await Promise.all([
    loadArabicFont('hafs'),
    loadArabicFont('warsh'),
    loadArabicFont('qaloon'),
  ])
  ;(settings as Record<string, unknown>).arabicFontHafs = hafs
  ;(settings as Record<string, unknown>).arabicFontWarsh = warsh
  ;(settings as Record<string, unknown>).arabicFontQaloon = qaloon
  const active = settings.riwayah === 'hafs' ? hafs : settings.riwayah === 'warsh' ? warsh : qaloon
  applyArabicFont(active)

  on(Events.SETTINGS_RIWAYAH_CHANGED, ({ to }) => {
    const next = to === 'hafs' ? settings.arabicFontHafs
      : to === 'warsh' ? settings.arabicFontWarsh
      : settings.arabicFontQaloon
    applyArabicFont(next)
  })
}
