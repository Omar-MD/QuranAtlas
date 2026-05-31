import type { SearchGraphRef } from './schema'

export interface ParsedSearchReference {
  ref: SearchGraphRef
  surah: number
  ayah: number
}

const MAX_SURAH = 114
const MAX_AYAH = 286

const REFERENCE_PATTERNS = [
  /^\s*(\d{1,3})\s*:\s*(\d{1,3})\s*$/i,
  /^\s*surah\s+(\d{1,3})\s+(?:ayah\s+)?(\d{1,3})\s*$/i,
  /^\s*s(?:urah)?\s*(\d{1,3})\s*a(?:yah)?\s*(\d{1,3})\s*$/i,
]

export function parseSearchReference(input: string): ParsedSearchReference | null {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = pattern.exec(input)
    if (!match) continue
    const surah = Number(match[1])
    const ayah = Number(match[2])
    if (!isValidSearchReference(surah, ayah)) return null
    return { ref: `${surah}:${ayah}`, surah, ayah }
  }
  return null
}

export function isValidSearchReference(surah: number, ayah: number): boolean {
  return Number.isInteger(surah)
    && Number.isInteger(ayah)
    && surah >= 1
    && surah <= MAX_SURAH
    && ayah >= 1
    && ayah <= MAX_AYAH
}
