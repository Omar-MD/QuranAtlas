/**
 * Ambient reference pill — surfaces on reader tap, auto-fades after 2.8s.
 * Shows "{surah}:{verse} · {Surah Name}" plus a ⌘K hint.
 */

import { getSurahs } from '../data/dataset.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { openCommandSheet } from './command-sheet.js'

const AUTO_FADE_MS = 2800

let pillEl = null
let refTextEl = null
let surahsById = null
let currentSurah = null
let currentVerse = 1
let unsubLoaded = null
let unsubPosition = null
let unsubSurface = null
let unsubHide = null
let hashHandler = null
let readerTapHandler = null
let fadeTimer = null

export async function initAmbientPill() {
  const topBar = document.getElementById('top-bar')
  if (!topBar) { return () => {} }

  destroyAmbientPill()

  pillEl = document.createElement('div')
  pillEl.className = 'qa-pill-ref qa-pill-ref--hidden'
  pillEl.setAttribute('role', 'button')
  pillEl.setAttribute('tabindex', '0')
  pillEl.setAttribute('aria-label', 'Current reading position — press Cmd+K to open command sheet')

  refTextEl = document.createElement('span')
  refTextEl.className = 'qa-pill-ref-text'
  refTextEl.textContent = ''

  const hint = document.createElement('span')
  hint.className = 'qa-pill-ref-hint'
  hint.textContent = '\u2318K'

  pillEl.appendChild(refTextEl)
  pillEl.appendChild(hint)
  topBar.appendChild(pillEl)

  pillEl.addEventListener('click', () => { openCommandSheet() })
  pillEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openCommandSheet()
    }
  })

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

  unsubSurface = on(Events.AMBIENT_SURFACE, () => {
    reveal()
    scheduleFade()
  })

  unsubHide = on(Events.AMBIENT_HIDE, () => {
    pillEl?.classList.add('qa-pill-ref--hidden')
  })

  readerTapHandler = (e) => {
    if (!isReaderRoute()) { return }
    if (e.target.closest('.qa-pill-ref, #bottom-nav, .qa-cmd-sheet, .qa-cmd-scrim, .qa-mark-modal, .qa-mark-backdrop, .qa-sheet-backdrop, .qa-sheet')) {
      return
    }
    emit(Events.AMBIENT_SURFACE, { reason: 'tap' })
  }
  document.addEventListener('click', readerTapHandler, { passive: true })

  hashHandler = applyRouteVisibility
  window.addEventListener('hashchange', hashHandler)
  applyRouteVisibility()

  return destroyAmbientPill
}

export function destroyAmbientPill() {
  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null }
  if (unsubLoaded) { unsubLoaded(); unsubLoaded = null }
  if (unsubPosition) { unsubPosition(); unsubPosition = null }
  if (unsubSurface) { unsubSurface(); unsubSurface = null }
  if (unsubHide) { unsubHide(); unsubHide = null }
  if (readerTapHandler) {
    document.removeEventListener('click', readerTapHandler)
    readerTapHandler = null
  }
  if (hashHandler) {
    window.removeEventListener('hashchange', hashHandler)
    hashHandler = null
  }
  if (pillEl && pillEl.parentNode) { pillEl.parentNode.removeChild(pillEl) }
  pillEl = null
  refTextEl = null
  currentSurah = null
  currentVerse = 1
  surahsById = null
}

function reveal() {
  if (!pillEl || !isReaderRoute()) { return }
  pillEl.classList.remove('qa-pill-ref--hidden')
}

function scheduleFade() {
  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null }
  fadeTimer = setTimeout(() => {
    pillEl?.classList.add('qa-pill-ref--hidden')
    fadeTimer = null
  }, AUTO_FADE_MS)
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

function isReaderRoute() {
  return (window.location.hash || '').startsWith('#/s/')
}

function applyRouteVisibility() {
  if (!pillEl) { return }
  if (!isReaderRoute()) {
    pillEl.classList.add('qa-pill-ref--hidden')
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null }
  } else {
    pillEl.classList.add('qa-pill-ref--hidden')
  }
}
