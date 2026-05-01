/**
 * Reading typography preferences: line spacing, word spacing, reader margin.
 * Each persists as an enum step in IDB settings store, applied via data-*
 * attribute on <html>. Sole writer for the three keys.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from '../settings/state.svelte.ts'
import type { Riwayah } from './riwayah'
import { on } from '../core/events.ts'
import { Events } from '../core/constants'

const OPTIONS = ['xs', 'sm', 'md', 'lg', 'xl'] as const
type Step = typeof OPTIONS[number]
const DEFAULT: Step = 'md'

const DIMENSIONS = {
  lineSpacing: { idbKey: 'lineSpacing', attr: 'data-line-spacing' },
  wordSpacing: { idbKey: 'wordSpacing', attr: 'data-word-spacing' },
  readerMargin: { idbKey: 'readerMargin', attr: 'data-reader-margin' },
  verseSpacing: { idbKey: 'verseSpacing', attr: 'data-verse-spacing' },
} as const

export type Dimension = keyof typeof DIMENSIONS
export type ReadingStep = Step

const ALL_DIMENSIONS = Object.keys(DIMENSIONS) as Dimension[]

// Floor values are the line-height (unitless multiplier) at the xs step,
// chosen so KFGQPC tashkeel (especially shadda + alif khanjariyya
// stacks) clears the baseline above without overlap. md (floor + 0.20)
// now lands at ~2.12 across all three riwayat — the conventional Madinah
// mushaf leading.
const RIWAYAH_FLOOR: Record<Riwayah, number> = { hafs: 1.92, warsh: 1.92, qaloon: 1.92 }
const STEP_DELTA: Record<Step, number> = { xs: 0.00, sm: 0.10, md: 0.20, lg: 0.30, xl: 0.40 }

export function lineHeightFor(riwayah: Riwayah, step: Step): number {
  return Number((RIWAYAH_FLOOR[riwayah] + STEP_DELTA[step]).toFixed(3))
}

function currentRiwayah(): Riwayah {
  if (typeof document === 'undefined') { return 'qaloon' }
  const v = document.documentElement.getAttribute('data-riwayah')
  return (v === 'hafs' || v === 'warsh' || v === 'qaloon') ? v : 'qaloon'
}

function applyArabicLineHeight(riwayah: Riwayah, step: Step): void {
  if (typeof document === 'undefined') { return }
  document.documentElement.style.setProperty('--qa-line-height-arabic', String(lineHeightFor(riwayah, step)))
}

function isStep(v: unknown): v is Step {
  return typeof v === 'string' && (OPTIONS as readonly string[]).includes(v)
}

export function getReadingOptions(): Step[] {
  return [...OPTIONS]
}

export function applyReadingStep(dim: Dimension, step: Step): void {
  document.documentElement.setAttribute(DIMENSIONS[dim].attr, step)
  if (dim === 'lineSpacing') {
    applyArabicLineHeight(currentRiwayah(), step)
  }
}

export async function loadReadingSettings(): Promise<Record<Dimension, Step>> {
  const result: Record<Dimension, Step> = {
    lineSpacing: DEFAULT,
    wordSpacing: DEFAULT,
    readerMargin: DEFAULT,
    verseSpacing: DEFAULT,
  }
  await Promise.all(ALL_DIMENSIONS.map(async (dim) => {
    try {
      const rec = await get('settings', DIMENSIONS[dim].idbKey)
      const raw = (rec as { value?: unknown } | undefined)?.value
      if (isStep(raw)) { result[dim] = raw }
    } catch (error) {
      logger.error('Failed to load reading typography setting', { dim, error })
    }
  }))
  return result
}

export async function setReadingStep(dim: Dimension, step: Step): Promise<boolean> {
  if (!isStep(step)) { return false }
  applyReadingStep(dim, step)
  Object.assign(settings, { [dim]: step })
  try {
    await put('settings', { key: DIMENSIONS[dim].idbKey, value: step })
  } catch (error) {
    logger.error('Failed to save reading typography setting', { dim, step, error })
  }
  return true
}

export async function resetReadingTypography(): Promise<boolean> {
  await Promise.all(ALL_DIMENSIONS.map((dim) => setReadingStep(dim, DEFAULT)))
  return true
}

/**
 * "Reading flow" — coordinated knob that drives all four spacing dimensions
 * (line, word, margin, verse) together. The Settings UI exposes a single
 * slider over this; the four IDB keys remain individually-addressable so a
 * future advanced view can split them again.
 */
const FLOW_DIMS: Dimension[] = ['lineSpacing', 'wordSpacing', 'readerMargin', 'verseSpacing']

export async function setReadingFlow(step: Step): Promise<boolean> {
  if (!isStep(step)) { return false }
  const results = await Promise.all(FLOW_DIMS.map((d) => setReadingStep(d, step)))
  return results.every(Boolean)
}

/**
 * Returns the shared step when all four flow dimensions match, else null
 * (mixed state — UI shows the slider thumb at md but treats it as default).
 */
export function getReadingFlowStep(values: Record<Dimension, Step>): Step | null {
  const first = values[FLOW_DIMS[0]!]
  return FLOW_DIMS.every((d) => values[d] === first) ? first : null
}

export async function initReadingTypography(): Promise<void> {
  const loaded = await loadReadingSettings()
  for (const dim of ALL_DIMENSIONS) {
    applyReadingStep(dim, loaded[dim])
  }
  Object.assign(settings, loaded)
  on(Events.SETTINGS_RIWAYAH_CHANGED, ({ to }) => {
    const stepAttr = document.documentElement.getAttribute('data-line-spacing')
    const step: Step = (OPTIONS as readonly string[]).includes(stepAttr ?? '') ? (stepAttr as Step) : DEFAULT
    applyArabicLineHeight(to, step)
  })
}
