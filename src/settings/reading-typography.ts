/**
 * Reading typography preferences: line spacing, word spacing, reader margin.
 * Each persists as an enum step in IDB settings store, applied via data-*
 * attribute on <html>. Sole writer for the three keys.
 */

import { get, put } from '../core/db.js'
import { logger } from '../core/logger.js'
import { settings } from '../state/settings.svelte.ts'

const OPTIONS = ['xs', 'sm', 'md', 'lg', 'xl'] as const
type Step = typeof OPTIONS[number]
const DEFAULT: Step = 'md'

const DIMENSIONS = {
  lineSpacing: { idbKey: 'lineSpacing', attr: 'data-line-spacing' },
  wordSpacing: { idbKey: 'wordSpacing', attr: 'data-word-spacing' },
  readerMargin: { idbKey: 'readerMargin', attr: 'data-reader-margin' },
} as const

export type Dimension = keyof typeof DIMENSIONS
export type ReadingStep = Step

const ALL_DIMENSIONS = Object.keys(DIMENSIONS) as Dimension[]

function isStep(v: unknown): v is Step {
  return typeof v === 'string' && (OPTIONS as readonly string[]).includes(v)
}

export function getReadingOptions(): Step[] {
  return [...OPTIONS]
}

export function applyReadingStep(dim: Dimension, step: Step): void {
  document.documentElement.setAttribute(DIMENSIONS[dim].attr, step)
}

export async function loadReadingSettings(): Promise<Record<Dimension, Step>> {
  const result: Record<Dimension, Step> = {
    lineSpacing: DEFAULT,
    wordSpacing: DEFAULT,
    readerMargin: DEFAULT,
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

export async function initReadingTypography(): Promise<void> {
  const loaded = await loadReadingSettings()
  for (const dim of ALL_DIMENSIONS) {
    applyReadingStep(dim, loaded[dim])
  }
  Object.assign(settings, loaded)
}
