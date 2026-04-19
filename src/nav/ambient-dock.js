/**
 * Ambient 4-glyph dock — floats above the reader.
 * - Surfaces on AMBIENT_SURFACE event (tap on reader body, verse-number tap, etc.).
 * - Auto-fades 2.8s after last surface signal on reader routes.
 * - Persistent on non-reader routes (it's the only nav affordance there).
 */

import { get } from '../core/db.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { openCommandSheet } from './command-sheet.js'
import * as ambientState from '../state/ambient-chrome.js'

const AUTO_FADE_MS = 2800
const HIDE_DELTA = 40
const SHOW_NEAR_TOP = 20

let scrollTarget = null
let scrollHandler = null
let hashHandler = null
let surfaceUnsub = null
let routeChangeUnsub = null
let lastTop = 0

const TABS = [
  { id: 'read',   label: 'Read',   icon: '\uD83D\uDCD6', matches: (h) => h.startsWith('#/s/') },
  { id: 'search', label: 'Search', icon: '\u2315',       matches: () => false },
  { id: 'review', label: 'Review', icon: '\u2726',       matches: (h) => h.startsWith('#/review') || h.startsWith('#/t/') },
  { id: 'more',   label: 'More',   icon: '\u22EF',       matches: (h) => h.startsWith('#/settings') || h.startsWith('#/about') },
]

function isReaderRoute(hash) {
  return (hash || '').startsWith('#/s/')
}

export async function initAmbientDock() {
  const footer = document.getElementById('bottom-nav')
  if (!footer) { return () => {} }

  destroyAmbientDock()

  const lastSurah = await getLastSurah()

  for (const t of TABS) {
    const a = document.createElement('a')
    a.className = 'qa-dock-item'
    a.setAttribute('data-tab', t.id)
    a.setAttribute('aria-label', t.label)

    if (t.id === 'read')   { a.href = `#/s/${lastSurah}` }
    else if (t.id === 'review') { a.href = '#/review' }
    else { a.href = '#' }

    a.addEventListener('click', (e) => {
      if (t.id === 'search') {
        e.preventDefault()
        openCommandSheet()
      } else if (t.id === 'more') {
        e.preventDefault()
        emit(Events.AMBIENT_SURFACE, { reason: 'dock' })
        if (window.__qaOpenMoreSheet) {
          window.__qaOpenMoreSheet()
        } else {
          window.location.hash = '#/settings'
        }
      } else {
        emit(Events.AMBIENT_SURFACE, { reason: 'dock' })
      }
    })

    const icon = document.createElement('span')
    icon.className = 'qa-dock-icon'
    icon.textContent = t.icon

    const label = document.createElement('span')
    label.className = 'qa-dock-label'
    label.textContent = t.label

    a.appendChild(icon)
    a.appendChild(label)
    footer.appendChild(a)
  }

  hashHandler = () => {
    updateActive(footer)
    applyRoutePersistence(footer)
  }
  updateActive(footer)
  applyRoutePersistence(footer)
  window.addEventListener('hashchange', hashHandler)

  // Re-apply when the router navigates via pushState/replaceState (no native
  // hashchange fires for those). ROUTER_ROUTE_CHANGE is emitted after each
  // successful route settle, covering the initial boot-time navigation to
  // #/onboarding (and any subsequent replaceState-based navigation).
  routeChangeUnsub = on(Events.ROUTER_ROUTE_CHANGE, () => {
    updateActive(footer)
    applyRoutePersistence(footer)
  })

  scrollTarget = document.getElementById('main-content')
  if (scrollTarget) {
    scrollHandler = () => {
      const top = scrollTarget.scrollTop
      const delta = top - lastTop
      if (!isReaderRoute(window.location.hash)) { return }
      if (top < SHOW_NEAR_TOP) {
        reveal(footer)
      } else if (delta > HIDE_DELTA) {
        footer.classList.add('qa-dock--hidden')
        lastTop = top
      } else if (delta < -HIDE_DELTA) {
        reveal(footer)
        lastTop = top
      }
    }
    scrollTarget.addEventListener('scroll', scrollHandler, { passive: true })
  }

  surfaceUnsub = on(Events.AMBIENT_SURFACE, () => {
    if (isReaderRoute(window.location.hash)) {
      reveal(footer)
      scheduleFade(footer)
    }
  })

  return destroyAmbientDock
}

function reveal(footer) {
  footer.classList.remove('qa-dock--hidden')
}

function scheduleFade(footer) {
  const { dockFadeTimerHandle } = ambientState.get()
  if (dockFadeTimerHandle) { clearTimeout(dockFadeTimerHandle) }
  ambientState.set({
    dockFadeTimerHandle: setTimeout(() => {
      if (isReaderRoute(window.location.hash)) {
        footer.classList.add('qa-dock--hidden')
      }
      ambientState.set({ dockFadeTimerHandle: null })
    }, AUTO_FADE_MS),
  })
}

function applyRoutePersistence(footer) {
  const hash = window.location.hash || ''
  if (hash.startsWith('#/onboarding')) {
    footer.classList.add('qa-dock--hidden')
    const { dockFadeTimerHandle: t } = ambientState.get()
    if (t) { clearTimeout(t); ambientState.set({ dockFadeTimerHandle: null }) }
    return
  }
  if (isReaderRoute(hash)) {
    footer.classList.add('qa-dock--hidden')
  } else {
    footer.classList.remove('qa-dock--hidden')
    const { dockFadeTimerHandle: t } = ambientState.get()
    if (t) { clearTimeout(t); ambientState.set({ dockFadeTimerHandle: null }) }
  }
}

export function destroyAmbientDock() {
  const { dockFadeTimerHandle } = ambientState.get()
  if (dockFadeTimerHandle) { clearTimeout(dockFadeTimerHandle); ambientState.set({ dockFadeTimerHandle: null }) }
  if (scrollTarget && scrollHandler) {
    scrollTarget.removeEventListener('scroll', scrollHandler)
  }
  if (hashHandler) { window.removeEventListener('hashchange', hashHandler) }
  if (surfaceUnsub) { surfaceUnsub(); surfaceUnsub = null }
  if (routeChangeUnsub) { routeChangeUnsub(); routeChangeUnsub = null }
  scrollTarget = null
  scrollHandler = null
  hashHandler = null
  lastTop = 0

  const footer = document.getElementById('bottom-nav')
  if (footer) {
    while (footer.firstChild) { footer.removeChild(footer.firstChild) }
    footer.classList.remove('qa-dock--hidden')
  }
}

function updateActive(footer) {
  const hash = window.location.hash || ''
  for (const el of footer.querySelectorAll('.qa-dock-item')) {
    const tab = TABS.find(t => t.id === el.getAttribute('data-tab'))
    const active = tab?.matches(hash)
    el.classList.toggle('qa-dock-item--active', !!active)
    if (active) { el.setAttribute('aria-current', 'page') } else { el.removeAttribute('aria-current') }
  }
}

async function getLastSurah() {
  try {
    const rec = await get('settings', 'lastSurface')
    const val = rec?.value || ''
    const m = val.match(/^#\/s\/(\d+)/)
    if (m) { return parseInt(m[1], 10) }
  } catch { /* ignore */ }
  return 1
}
