/**
 * Reader route handler.
 * Renders surah content with Arabic text, translation, and basmala rules.
 * Supports chunked rendering, position tracking, and session restore.
 */

import { getSurah, getSurahs } from '../data/dataset.js'
import { get } from '../core/db.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { clearUndoToast, clearUndoRecord } from '../core/ui.js'
import { unobserve } from './scroll-tracker.js'
import { announce } from '../a11y/announcer.js'
import * as readerState from '../state/reader.js'
import {
  renderVerseChunk,
  renderSurahHeader,
  renderBasmala,
  renderSurahEnd,
  renderSkeleton,
  renderError,
} from './render.js'
import { CHUNK_SIZE } from './chunked-append.js'
import { initPositionTracking, teardownPositionTracking } from './position.js'

// Maximum time to wait for surah data fetch before showing error
// 5000ms hard cutoff; 800ms is the performance *goal*, not the error threshold
const SKELETON_TIMEOUT_MS = 5000

let cleanupIndicatorsFn = null
let cleanupLongPressFn = null

// Edge indicator state
let edgeL = null
let edgeR = null
let edgeTapHandler = null
let edgeFadeTimer = null

/**
 * Fetch surah data with navigation guard.
 * Returns { surah, surahs, surahMeta, translationVisible, savedPosition } or null if navigated away.
 */
async function fetchSurahData({ surahNum }) {
  performance.mark('reader:fetch-start')
  const surah = await getSurah(surahNum)
  performance.mark('reader:fetch-end')
  performance.measure('reader:surah-fetch', 'reader:fetch-start', 'reader:fetch-end')

  if (readerState.get().currentSurahNum !== surahNum) { return null }

  const [surahs, translationVisible, savedPosition] = await Promise.all([
    getSurahs(),
    get('settings', 'translationVisible').then(r => r?.value ?? true),
    get('positions', `s${surahNum}`),
  ])

  if (readerState.get().currentSurahNum !== surahNum) { return null }

  readerState.set({ currentSurah: surah })
  const surahMeta = surahs.find(s => s.n === surahNum)
  readerState.set({ translationVisible })

  return { surah, surahs, surahMeta, translationVisible, savedPosition }
}

/**
 * Render surah content: header, basmala, verse chunks, end marker.
 */
function renderSurahContent({ mainContent, surah, surahMeta, translationVisible, _savedPosition, _targetVerse, surahNum }) {
  mainContent.innerHTML = ''
  renderSurahHeader(mainContent, surahMeta)
  renderBasmala(mainContent, surahNum)

  readerState.set({ renderedCount: 0 })
  readerState.set({ isRendering: true })
  renderVerseChunk(mainContent, surah, translationVisible, 0, CHUNK_SIZE)
  readerState.set({ isRendering: false })

  renderSurahEnd(mainContent, surahMeta)
}

/**
 * Emit load event, set up indicators and long press, perf marks, announce.
 * Returns array of cleanup functions.
 */
function finalizeSurah({ surahNum, surahMeta, surah, initIndicators, setupLongPress, mainContent }) {
  // initIndicators must run before READER_SURAH_LOADED so its READER_SURAH_LOADED
  // listener fires for the current load (not just future loads) and can decorate
  // any verses already rendered by renderSurahContent above.
  cleanupIndicatorsFn = initIndicators()
  cleanupLongPressFn = setupLongPress(mainContent)
  emit(Events.READER_SURAH_LOADED, /** @type {import('../core/constants.js').ReaderSurahLoadedPayload} */({ surah: surahNum }))
  // Surface the ambient dock briefly so the user sees nav chrome on every surah load.
  emit(Events.AMBIENT_SURFACE, /** @type {import('../core/constants.js').AmbientSurfacePayload} */({ reason: 'surah-load' }))
  performance.mark('reader:first-verse')
  performance.measure('reader:total-load', 'reader:fetch-start', 'reader:first-verse')
  announce(`${surahMeta?.name ?? `Surah ${surahNum}`} loaded, ${surah.ar.length} verses`)

  return [
    () => { if (cleanupIndicatorsFn) { cleanupIndicatorsFn(); cleanupIndicatorsFn = null } },
    () => { if (cleanupLongPressFn) { cleanupLongPressFn(); cleanupLongPressFn = null } },
  ]
}

/**
 * Internal cleanup — resets all module state and removes listeners.
 */
export function cleanup() {
  clearUndoToast()
  clearUndoRecord()
  unobserve()
  teardownPositionTracking()
  if (cleanupIndicatorsFn) { cleanupIndicatorsFn(); cleanupIndicatorsFn = null }
  if (cleanupLongPressFn) { cleanupLongPressFn(); cleanupLongPressFn = null }
  teardownEdgeIndicators()
  readerState.set({
    currentSurah: null,
    currentSurahNum: null,
    renderedCount: 0,
    lastTrackedVerse: null,
    translationVisible: true,
    scrollAppendRafPending: false,
  })
}

export async function init(
  params,
  {
    initIndicators = () => () => {},
    setupLongPress = () => () => {},
    savePosition: shouldSavePosition = true,
  } = {}
) {
  const surahNum = parseInt(params.surah, 10)
  if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
    return
  }

  if (readerState.get().currentSurahNum !== null && readerState.get().currentSurahNum !== surahNum) {
    cleanup()
  }
  readerState.set({ currentSurahNum: surahNum })

  const mainContent = document.getElementById('main-content')
  if (!mainContent) {
    return
  }

  renderSkeleton(mainContent)
  ensureEdgeIndicators()

  const timeout = setTimeout(() => {
    readerState.set({ currentSurahNum: null, currentSurah: null })
    renderError(mainContent, surahNum, () => init({ surah: String(surahNum) }))
  }, SKELETON_TIMEOUT_MS)

  try {
    const data = await fetchSurahData({ surahNum })
    if (!data) {
      clearTimeout(timeout)
      return
    }

    clearTimeout(timeout)

    const targetVerse = params.ayah ? parseInt(params.ayah, 10) : null

    renderSurahContent({
      mainContent,
      surah: data.surah, surahMeta: data.surahMeta,
      translationVisible: data.translationVisible,
      savedPosition: data.savedPosition, targetVerse,
      surahNum,
    })

    initPositionTracking({
      mainContent, surahNum, shouldSavePosition,
      surah: data.surah, surahMeta: data.surahMeta,
      savedPosition: data.savedPosition, targetVerse,
    })

    const finalCleanups = finalizeSurah({
      surahNum, surahMeta: data.surahMeta, surah: data.surah,
      initIndicators, setupLongPress, mainContent,
    })

    return () => {
      cleanup()
      finalCleanups.forEach(fn => fn())
    }
  } catch (_error) {
    clearTimeout(timeout)
    renderError(mainContent, surahNum, () => init({ surah: String(surahNum) }))
  }
}

function ensureEdgeIndicators() {
  if (!edgeL) {
    edgeL = document.createElement('span')
    edgeL.className = 'qa-edge-indicator qa-edge-indicator--left'
    edgeL.setAttribute('aria-hidden', 'true')
    document.body.appendChild(edgeL)
  }
  if (!edgeR) {
    edgeR = document.createElement('span')
    edgeR.className = 'qa-edge-indicator qa-edge-indicator--right'
    edgeR.setAttribute('aria-hidden', 'true')
    document.body.appendChild(edgeR)
  }

  if (!edgeTapHandler) {
    edgeTapHandler = (e) => {
      const numEl = e.target.closest('.qa-verse-number')
      if (!numEl) { return }
      const verseEl = numEl.closest('.qa-verse')
      if (!verseEl) { return }
      showEdges(verseEl)
    }
    document.addEventListener('click', edgeTapHandler, { passive: true })
  }
}

function showEdges(verseEl) {
  if (!edgeL || !edgeR) { return }
  const rect = verseEl.getBoundingClientRect()
  const centerY = rect.top + rect.height / 2
  edgeL.style.top = `${centerY}px`
  edgeR.style.top = `${centerY}px`
  edgeL.classList.add('qa-edge-indicator--visible')
  edgeR.classList.add('qa-edge-indicator--visible')

  if (edgeFadeTimer) { clearTimeout(edgeFadeTimer) }
  edgeFadeTimer = setTimeout(() => {
    edgeL?.classList.remove('qa-edge-indicator--visible')
    edgeR?.classList.remove('qa-edge-indicator--visible')
    edgeFadeTimer = null
  }, 1600)

  emit(Events.AMBIENT_SURFACE, /** @type {import('../core/constants.js').AmbientSurfacePayload} */({ reason: 'verse-tap' }))
}

function teardownEdgeIndicators() {
  if (edgeFadeTimer) { clearTimeout(edgeFadeTimer); edgeFadeTimer = null }
  if (edgeTapHandler) {
    document.removeEventListener('click', edgeTapHandler)
    edgeTapHandler = null
  }
  if (edgeL?.parentNode) { edgeL.parentNode.removeChild(edgeL) }
  if (edgeR?.parentNode) { edgeR.parentNode.removeChild(edgeR) }
  edgeL = null
  edgeR = null
}

