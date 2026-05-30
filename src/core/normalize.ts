/**
 * Canonicalization pipeline for tag labels.
 *
 * Converts raw user input into a deterministic normalized form used for
 * graph clustering and index lookup.
 *
 * Three-layer representation:
 *   raw        — exact user input (post trim+collapse only), for display
 *   normalized — pipeline output (this function), fuzzy-match key
 *   canonical  — normalized + alias-resolved (see resolveCanonical)
 */

import { resolveCanonical } from './aliases'

const HARAKAT_RE = /[\u064B-\u0652\u0670\u0640]/g
const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF]/g

const ARABIC_FOLD: Array<[RegExp, string]> = [
  [/[\u0622\u0623\u0625\u0671]/g, '\u0627'], // آ أ إ ٱ → ا
  [/[\u0649]/g, '\u064A'],                     // ى → ي
  [/[\u0629]/g, '\u0647'],                     // ة → ه
  [/[\u0624]/g, '\u0648'],                     // ؤ → و
  [/[\u0626]/g, '\u064A'],                     // ئ → ي
]

export function normalize(input: string): string {
  let s = input
    .normalize('NFKC')
    .replace(HARAKAT_RE, '')
    .replace(ZERO_WIDTH_RE, '')
  for (const [re, to] of ARABIC_FOLD) {
    s = s.replace(re, to)
  }
  s = s
    .replace(/'/g, '')         // strip ASCII apostrophes
    .replace(/-/g, ' ')        // hyphens → spaces
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
  return s
}

export function canonicalize(input: string): string {
  return resolveCanonical(normalize(input))
}
