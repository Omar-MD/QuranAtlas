/**
 * Ambient 4-glyph dock — replaces the old Read/Review/About bottom nav.
 * Reuses the <footer id="bottom-nav"> mount point from index.html.
 * Auto-hides on scroll-down in #main-content, reveals on scroll-up / near top.
 */

import { get } from '../core/db.js'

const HIDE_DELTA = 40
const SHOW_NEAR_TOP = 20

let scrollTarget = null
let scrollHandler = null
let hashHandler = null
let lastTop = 0

const TABS = [
  { id: 'read',   label: 'Read',   icon: '\uD83D\uDCD6', matches: (h) => h.startsWith('#/s/') || h === '' || h === '#' },
  { id: 'search', label: 'Search', icon: '\u2315',       matches: () => false },
  { id: 'review', label: 'Review', icon: '\u2726',       matches: (h) => h.startsWith('#/review') || h.startsWith('#/t/') },
  { id: 'more',   label: 'More',   icon: '\u22EF',       matches: (h) => h.startsWith('#/settings') || h.startsWith('#/about') },
]

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
    else if (t.id === 'more')   { a.href = '#/settings' }
    else if (t.id === 'search') {
      a.href = '#'
      a.addEventListener('click', (e) => {
        e.preventDefault()
        const toggle = document.querySelector('.qa-nav-toggle')
        if (toggle) { toggle.click() }
      })
    }

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

  hashHandler = () => updateActive(footer)
  updateActive(footer)
  window.addEventListener('hashchange', hashHandler)

  scrollTarget = document.getElementById('main-content')
  if (scrollTarget) {
    scrollHandler = () => {
      const top = scrollTarget.scrollTop
      const delta = top - lastTop
      if (top < SHOW_NEAR_TOP) {
        footer.classList.remove('qa-dock--hidden')
      } else if (delta > HIDE_DELTA) {
        footer.classList.add('qa-dock--hidden')
        lastTop = top
      } else if (delta < -HIDE_DELTA) {
        footer.classList.remove('qa-dock--hidden')
        lastTop = top
      }
    }
    scrollTarget.addEventListener('scroll', scrollHandler, { passive: true })
  }

  return destroyAmbientDock
}

export function destroyAmbientDock() {
  if (scrollTarget && scrollHandler) {
    scrollTarget.removeEventListener('scroll', scrollHandler)
  }
  if (hashHandler) {
    window.removeEventListener('hashchange', hashHandler)
  }
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
