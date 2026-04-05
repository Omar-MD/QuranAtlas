/**
 * Nav panel: surah list, search, filter, dispatch.
 * Renders into #nav-surface. Hamburger toggle injected into #top-bar.
 */

import { getSurahs } from '../data/dataset.js'
import { emit, on } from '../core/events.js'
import { parseNavigationInput } from '../safety/input-validator.js'

let surahs = []
let currentSurah = null
let isOpen = false
let shouldAutoClose = false
let backdrop = null
let unsubPosition = null
let unsubEscape = null
let hamburgerToggle = null

/**
 * Initialize the nav panel.
 */
export async function init() {
  surahs = await getSurahs()
  shouldAutoClose = window.matchMedia('(max-width: 768px)').matches

  renderNavPanel()
  renderHamburgerToggle()
  setupEventListeners()

  window.matchMedia('(max-width: 768px)').addEventListener('change', (e) => {
    shouldAutoClose = e.matches
  })
}

/**
 * Render the nav panel into #nav-surface.
 */
function renderNavPanel() {
  const navSurface = document.getElementById('nav-surface')
  if (!navSurface) { return }

  navSurface.removeAttribute('hidden')

  while (navSurface.firstChild) {
    navSurface.removeChild(navSurface.firstChild)
  }

  // Search section
  const searchWrap = document.createElement('div')
  searchWrap.style.cssText = 'padding:1rem;border-bottom:1px solid var(--qa-border);'

  const searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.className = 'qa-nav-search'
  searchInput.placeholder = 'Search surah or verse'
  searchInput.setAttribute('aria-label', 'Search surah or verse')

  searchInput.addEventListener('input', () => {
    filterSurahList(searchInput.value)
    searchInput.removeAttribute('aria-invalid')
  })

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(searchInput.value)
    }
  })

  searchWrap.appendChild(searchInput)
  navSurface.appendChild(searchWrap)

  // Surah list
  const list = document.createElement('ul')
  list.className = 'qa-nav-list'
  list.setAttribute('role', 'navigation')
  list.setAttribute('aria-label', 'Surah list')

  surahs.forEach(s => {
    list.appendChild(createSurahItem(s))
  })

  navSurface.appendChild(list)

  // Backdrop
  backdrop = document.createElement('div')
  backdrop.className = 'qa-nav-backdrop'
  backdrop.addEventListener('click', closeNav)
  document.body.appendChild(backdrop)
}

function createSurahItem(s) {
  const li = document.createElement('li')
  li.className = 'qa-nav-item'
  li.setAttribute('data-surah', String(s.n))
  li.setAttribute('tabindex', '0')
  li.setAttribute('role', 'button')

  const num = document.createElement('span')
  num.className = 'qa-nav-number'
  num.textContent = String(s.n)

  const info = document.createElement('div')
  info.className = 'qa-nav-info'

  const name = document.createElement('div')
  name.className = 'qa-nav-item-name'
  name.textContent = s.name

  const meta = document.createElement('div')
  meta.className = 'qa-nav-item-meta'
  meta.textContent = `${s.count} verses \u00B7 ${s.type}`

  info.appendChild(name)
  info.appendChild(meta)

  const arabic = document.createElement('span')
  arabic.className = 'qa-nav-item-arabic'
  arabic.textContent = s.arabic

  li.appendChild(num)
  li.appendChild(info)
  li.appendChild(arabic)

  li.addEventListener('click', () => {
    emit('navigation:navigate', { surah: s.n })
    if (shouldAutoClose) { closeNav() }
  })

  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      emit('navigation:navigate', { surah: s.n })
      if (shouldAutoClose) { closeNav() }
    }
  })

  if (currentSurah === s.n) {
    li.classList.add('qa-nav-current')
  }

  return li
}

function filterSurahList(query) {
  const items = document.querySelectorAll('.qa-nav-item')
  const q = query.toLowerCase().trim()

  items.forEach(item => {
    if (!q) {
      item.removeAttribute('hidden')
      return
    }

    const surahNum = item.getAttribute('data-surah')
    const name = item.querySelector('.qa-nav-item-name')?.textContent?.toLowerCase() || ''

    if (surahNum.startsWith(q) || name.includes(q)) {
      item.removeAttribute('hidden')
    } else {
      item.setAttribute('hidden', '')
    }
  })
}

function handleSearchSubmit(value) {
  const searchInput = document.querySelector('.qa-nav-search')
  const result = parseNavigationInput(value, surahs)

  if (result.valid) {
    searchInput.removeAttribute('aria-invalid')
    emit('navigation:navigate', { surah: result.surah, verse: result.verse })
    if (shouldAutoClose) { closeNav() }
    if (!shouldAutoClose) {
      searchInput.value = ''
      filterSurahList('')
    }
  } else {
    searchInput.setAttribute('aria-invalid', 'true')
  }
}

function renderHamburgerToggle() {
  const topBar = document.getElementById('top-bar')
  if (!topBar) { return }

  const toggle = document.createElement('button')
  toggle.className = 'qa-nav-toggle'
  toggle.setAttribute('aria-label', 'Open navigation')
  toggle.setAttribute('aria-expanded', 'false')
  toggle.setAttribute('aria-controls', 'nav-surface')
  toggle.textContent = '\u2630'
  hamburgerToggle = toggle

  toggle.addEventListener('click', () => {
    if (isOpen) {
      closeNav()
    } else {
      openNav()
    }
  })

  topBar.insertBefore(toggle, topBar.firstChild)
}

function openNav() {
  const navSurface = document.getElementById('nav-surface')
  const toggle = document.querySelector('.qa-nav-toggle')

  if (navSurface) { navSurface.classList.add('qa-nav-open') }
  if (backdrop) { backdrop.classList.add('qa-nav-open') }
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'true')
    toggle.setAttribute('aria-label', 'Close navigation')
  }

  isOpen = true

  const searchInput = document.querySelector('.qa-nav-search')
  if (searchInput && typeof searchInput.focus === 'function') {
    searchInput.focus()
  }

  const current = document.querySelector('.qa-nav-current')
  if (current && typeof current.scrollIntoView === 'function') {
    current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function closeNav() {
  const navSurface = document.getElementById('nav-surface')
  const toggle = document.querySelector('.qa-nav-toggle')

  if (navSurface) { navSurface.classList.remove('qa-nav-open') }
  if (backdrop) { backdrop.classList.remove('qa-nav-open') }
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Open navigation')
  }

  isOpen = false

  if (hamburgerToggle && typeof hamburgerToggle.focus === 'function') {
    hamburgerToggle.focus()
  }
}

function updateHighlight(surahNum) {
  currentSurah = surahNum

  document.querySelectorAll('.qa-nav-current').forEach(el => {
    el.classList.remove('qa-nav-current')
  })

  const item = document.querySelector(`.qa-nav-item[data-surah="${surahNum}"]`)
  if (item) {
    item.classList.add('qa-nav-current')
    if (isOpen && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}

function setupEventListeners() {
  if (unsubPosition) { unsubPosition() }
  unsubPosition = on('reader:position-changed', ({ surah }) => {
    updateHighlight(surah)
  })

  on('reader:surah-loaded', ({ surah }) => {
    updateHighlight(surah)
  })

  if (unsubEscape) { unsubEscape() }
  unsubEscape = () => {
    document.removeEventListener('keydown', handleEscapeKey)
  }
  document.addEventListener('keydown', handleEscapeKey)
}

function handleEscapeKey(e) {
  if (e.key === 'Escape' && isOpen) {
    closeNav()
  }
}
