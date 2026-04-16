/**
 * Ambient reference pill — top of reader route.
 * Shows "{surah}:{verse} · {Surah Name}" with a ⌘K hint.
 * Hides on non-reader routes.
 */

import { getSurahs } from '../data/dataset.js'
import { on } from '../core/events.js'
import { Events } from '../core/constants.js'

let pillEl = null
let refTextEl = null
let surahsById = null
let currentSurah = null
let currentVerse = 1
let unsubLoaded = null
let unsubPosition = null
let hashHandler = null

export async function initAmbientPill() {
  const topBar = document.getElementById('top-bar')
  if (!topBar) { return () => {} }

  destroyAmbientPill()

  pillEl = document.createElement('div')
  pillEl.className = 'qa-pill-ref'
  pillEl.setAttribute('role', 'button')
  pillEl.setAttribute('tabindex', '0')
  pillEl.setAttribute('aria-label', 'Current reading position')

  refTextEl = document.createElement('span')
  refTextEl.className = 'qa-pill-ref-text'
  refTextEl.textContent = ''

  const hint = document.createElement('span')
  hint.className = 'qa-pill-ref-hint'
  hint.textContent = '\u2318K'

  pillEl.appendChild(refTextEl)
  pillEl.appendChild(hint)
  topBar.appendChild(pillEl)

  unsubLoaded = on(Events.READER_SURAH_LOADED, async ({ surah }) => {
    await ensureSurahCache()
    currentSurah = surah
    currentVerse = 1
    render()
  })

  unsubPosition = on(Events.READER_POSITION_CHANGED, ({ surah, verse }) => {
    currentSurah = surah
    currentVerse = verse
    render()
  })

  hashHandler = applyRouteVisibility
  window.addEventListener('hashchange', hashHandler)
  applyRouteVisibility()

  return destroyAmbientPill
}

export function destroyAmbientPill() {
  if (unsubLoaded) { unsubLoaded(); unsubLoaded = null }
  if (unsubPosition) { unsubPosition(); unsubPosition = null }
  if (hashHandler) {
    window.removeEventListener('hashchange', hashHandler)
    hashHandler = null
  }
  if (pillEl && pillEl.parentNode) {
    pillEl.parentNode.removeChild(pillEl)
  }
  pillEl = null
  refTextEl = null
  currentSurah = null
  currentVerse = 1
  surahsById = null
}

async function ensureSurahCache() {
  if (surahsById) { return }
  const list = await getSurahs()
  surahsById = new Map(list.map(s => [s.n, s]))
}

function render() {
  if (!refTextEl || !currentSurah) { return }
  const meta = surahsById?.get(currentSurah)
  const name = meta?.name || ''
  refTextEl.textContent = name
    ? `${currentSurah}:${currentVerse} \u00B7 ${name}`
    : `${currentSurah}:${currentVerse}`
}

function applyRouteVisibility() {
  if (!pillEl) { return }
  const hash = window.location.hash || ''
  const isReader = hash.startsWith('#/s/')
  pillEl.classList.toggle('qa-pill-ref--hidden', !isReader)
}
