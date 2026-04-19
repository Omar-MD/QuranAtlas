/**
 * Reader action API backing the single-key shortcuts (j/k/[/]/Home/End/m).
 *
 * Tracks the "current" surah + verse from READER_SURAH_LOADED and
 * READER_POSITION_CHANGED events (same source the ambient pill uses) so
 * shortcut handlers don't need a direct reference to reader module state.
 * Exposes small imperative helpers that scroll the reader or navigate the
 * router — callers are expected to gate on route themselves.
 */

import { on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { getSurahs } from '../data/dataset.js'
import { openEditor } from '../marks/editor.js'
import { announce } from '../a11y/announcer.js'

let currentSurah = null
let currentVerse = 1
let surahMetaCache = null
let unsubLoaded = null
let unsubPosition = null

export async function initReaderActions() {
  try {
    surahMetaCache = await getSurahs()
  } catch {
    surahMetaCache = []
  }

  unsubLoaded = on(Events.READER_SURAH_LOADED, ({ surah }) => {
    currentSurah = surah
    currentVerse = 1
  })

  unsubPosition = on(Events.READER_POSITION_CHANGED, ({ surah, verse }) => {
    currentSurah = surah
    currentVerse = verse
  })

  return () => {
    if (unsubLoaded) { unsubLoaded(); unsubLoaded = null }
    if (unsubPosition) { unsubPosition(); unsubPosition = null }
  }
}

function getSurahCount(n) {
  const meta = (surahMetaCache || []).find(s => s.n === n)
  return meta?.count ?? null
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
  if (!currentSurah) { return false }
  const max = getSurahCount(currentSurah)
  const target = Math.min((currentVerse || 1) + 1, max || 1)
  if (target === currentVerse) { return false }
  currentVerse = target
  announce(`Verse ${currentSurah}:${target}`)
  return scrollToVerseInDOM(target)
}

export function prevVerse() {
  if (!currentSurah) { return false }
  const target = Math.max((currentVerse || 1) - 1, 1)
  if (target === currentVerse) { return false }
  currentVerse = target
  announce(`Verse ${currentSurah}:${target}`)
  return scrollToVerseInDOM(target)
}

export function firstVerse() {
  if (!currentSurah) { return false }
  currentVerse = 1
  announce(`Verse ${currentSurah}:1`)
  return scrollToVerseInDOM(1)
}

export function lastVerse() {
  if (!currentSurah) { return false }
  const max = getSurahCount(currentSurah)
  if (!max) { return false }
  currentVerse = max
  announce(`Verse ${currentSurah}:${max}`)
  return scrollToVerseInDOM(max)
}

export function nextSurah() {
  if (!currentSurah) { return false }
  const next = Math.min(currentSurah + 1, 114)
  if (next === currentSurah) { return false }
  window.location.hash = `#/s/${next}`
  return true
}

export function prevSurah() {
  if (!currentSurah) { return false }
  const prev = Math.max(currentSurah - 1, 1)
  if (prev === currentSurah) { return false }
  window.location.hash = `#/s/${prev}`
  return true
}

export function markCurrent() {
  if (!currentSurah) { return false }
  openEditor(`${currentSurah}:${currentVerse || 1}`)
  return true
}
