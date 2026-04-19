/**
 * Verse-tap edge indicators — lazily-created left/right visual cues that
 * briefly surface when a verse number is tapped. Also emits AMBIENT_SURFACE
 * so the dock/pill flash in sync with the indicator fade.
 *
 * Extracted from reader/index.js. DOM-handle plumbing permitted here per
 * spec section 5 (see scripts/check-no-feature-state.js allow-list).
 */

import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'

// Edge indicator state
let edgeL = null
let edgeR = null
let edgeTapHandler = null
let edgeFadeTimer = null

export function ensureEdgeIndicators() {
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

export function showEdges(verseEl) {
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

export function teardownEdgeIndicators() {
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
