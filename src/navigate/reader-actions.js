/**
 * Reader action API backing the single-key shortcuts (j/k/[/]/Home/End).
 *
 * Reads and writes the `reader` state rune directly — the same source the
 * ambient pill and indicator already read. Writing back to the rune on
 * keyboard navigation means the pill updates immediately; observeScroll
 * will catch the rune up to IDB via savePosition once the scroll settles.
 */

import { getSurahs } from '../data/dataset.js'
import { announce } from '../a11y/announcer.js'
import { reader } from '../read/state.svelte'
import { settings } from '../configure/state.svelte'

let surahMetaCache = null

export async function initReaderActions() {
  try {
    surahMetaCache = await getSurahs()
  } catch {
    surahMetaCache = []
  }
  return () => { /* no subscriptions to clean up — state is read from the rune */ }
}

function getCurrent() {
  const surah = reader.currentSurahNum ?? null
  const vk = reader.currentVerseKey
  const verse = vk ? (parseInt(vk.split(':')[1] ?? '1', 10) || 1) : 1
  return { surah, verse }
}

function getSurahCount(n) {
  const meta = (surahMetaCache || []).find(s => s.n === n)
  if (!meta) { return null }
  const riwayah = settings.riwayah ?? 'qaloon'
  return meta?.counts?.[riwayah] ?? meta?.count ?? null
}

function scrollToVerseInDOM(verseNum) {
  const main = document.getElementById('main-content')
  if (!main) { return false }
  const el = main.querySelector(`[data-verse="${verseNum}"]`)
  if (!el) { return false }
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
  return true
}

export function nextVerse() {
  const { surah, verse } = getCurrent()
  if (!surah) { return false }
  const max = getSurahCount(surah)
  const target = Math.min(verse + 1, max || 1)
  if (target === verse) { return false }
  reader.currentVerseKey = `${surah}:${target}`
  announce(`Verse ${surah}:${target}`)
  return scrollToVerseInDOM(target)
}

export function prevVerse() {
  const { surah, verse } = getCurrent()
  if (!surah) { return false }
  const target = Math.max(verse - 1, 1)
  if (target === verse) { return false }
  reader.currentVerseKey = `${surah}:${target}`
  announce(`Verse ${surah}:${target}`)
  return scrollToVerseInDOM(target)
}

export function firstVerse() {
  const { surah } = getCurrent()
  if (!surah) { return false }
  reader.currentVerseKey = `${surah}:1`
  announce(`Verse ${surah}:1`)
  return scrollToVerseInDOM(1)
}

export function lastVerse() {
  const { surah } = getCurrent()
  if (!surah) { return false }
  const max = getSurahCount(surah)
  if (!max) { return false }
  reader.currentVerseKey = `${surah}:${max}`
  announce(`Verse ${surah}:${max}`)
  return scrollToVerseInDOM(max)
}

export function nextSurah() {
  const { surah } = getCurrent()
  if (!surah) { return false }
  const next = Math.min(surah + 1, 114)
  if (next === surah) { return false }
  window.location.hash = `#/s/${next}`
  return true
}

export function prevSurah() {
  const { surah } = getCurrent()
  if (!surah) { return false }
  const prev = Math.max(surah - 1, 1)
  if (prev === surah) { return false }
  window.location.hash = `#/s/${prev}`
  return true
}
