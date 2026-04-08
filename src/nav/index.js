/**
 * Nav panel: surah list, search, filter, dispatch.
 * Renders into #nav-surface. Hamburger toggle injected into #top-bar.
 */

import { getSurahs } from '../data/dataset.js'
import { emit, on } from '../core/events.js'
import { Events } from '../core/constants.js'
import { parseNavigationInput } from '../safety/input-validator.js'
import { announce } from '../a11y/announcer.js'

let surahs = []
let currentSurah = null
let isOpen = false
let shouldAutoClose = false
let backdrop = null
let unsubPosition = null
let unsubLoaded = null
let unsubVisibility = null
let hamburgerToggle = null
let escapeHandler = null
let mediaQuery = null
let mediaQueryHandler = null

/**
 * Initialize the nav panel.
 */
export async function init() {
  surahs = await getSurahs()

  mediaQuery = window.matchMedia('(max-width: 768px)')
  shouldAutoClose = mediaQuery.matches
  mediaQueryHandler = (e) => {
    shouldAutoClose = e.matches
  }
  mediaQuery.addEventListener('change', mediaQueryHandler)

  renderNavPanel()
  renderHamburgerToggle()
  setupEventListeners()
  setupEscapeListener()
  setupVisibilityReRead()
}

/**
 * Tear down the nav panel, removing all listeners and resetting state.
 */
export function destroy() {
  if (mediaQuery && mediaQueryHandler) {
    mediaQuery.removeEventListener('change', mediaQueryHandler)
  }
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
  }
  if (unsubPosition) { unsubPosition() }
  if (unsubLoaded) { unsubLoaded() }
  if (unsubVisibility) { unsubVisibility() }
  if (backdrop && backdrop.parentNode) { backdrop.remove() }

  surahs = []
  currentSurah = null
  isOpen = false
  shouldAutoClose = false
  backdrop = null
  unsubPosition = null
  unsubLoaded = null
  unsubVisibility = null
  hamburgerToggle = null
  escapeHandler = null
  mediaQuery = null
  mediaQueryHandler = null
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
  searchWrap.className = 'qa-nav-search-section'

  const searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.className = 'qa-nav-search'
  searchInput.placeholder = 'Search surah or verse'
  searchInput.setAttribute('aria-label', 'Search surah or verse')
  searchInput.maxLength = 50

  searchInput.addEventListener('input', () => {
    filterSurahList(searchInput.value)
    searchInput.removeAttribute('aria-invalid')
    const visible = document.querySelectorAll('.qa-nav-item:not([hidden])')
    if (searchInput.value.trim()) {
      announce(`${visible.length} surahs found`)
    }
  })

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(searchInput)
    }
  })

  searchWrap.appendChild(searchInput)
  navSurface.appendChild(searchWrap)

  // Surah list
  const list = document.createElement('ul')
  list.className = 'qa-nav-list'
  list.setAttribute('role', 'list')
  list.setAttribute('aria-label', 'Surah list')

  surahs.forEach(s => {
    list.appendChild(createSurahItem(s))
  })

  navSurface.appendChild(list)

  // Backdrop
  if (backdrop && backdrop.parentNode) { backdrop.remove() }
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
    emit(Events.NAVIGATION_NAVIGATE, { surah: s.n })
    if (shouldAutoClose) { closeNav() }
  })

  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      emit(Events.NAVIGATION_NAVIGATE, { surah: s.n })
      if (shouldAutoClose) { closeNav() }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = [...document.querySelectorAll('.qa-nav-item:not([hidden])')]
      const idx = items.indexOf(li)
      const next = e.key === 'ArrowDown' ? items[idx + 1] : items[idx - 1]
      if (next) { next.focus() }
    }
  })

  if (currentSurah === s.n) {
    li.classList.add('qa-nav-current')
    li.setAttribute('aria-current', 'page')
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
    const arabic = item.querySelector('.qa-nav-item-arabic')?.textContent || ''

    if (surahNum.startsWith(q) || name.includes(q) || arabic.includes(q)) {
      item.removeAttribute('hidden')
    } else {
      item.setAttribute('hidden', '')
    }
  })
}

function handleSearchSubmit(searchInput) {
  const result = parseNavigationInput(searchInput.value, surahs)

  if (result.valid) {
    searchInput.removeAttribute('aria-invalid')
    emit(Events.NAVIGATION_NAVIGATE, { surah: result.surah, verse: result.verse })
    searchInput.value = ''
    filterSurahList('')
    if (shouldAutoClose) { closeNav() }
  } else {
    searchInput.setAttribute('aria-invalid', 'true')
    announce('Invalid search input')
  }
}

function renderHamburgerToggle() {
  const topBar = document.getElementById('top-bar')
  if (!topBar) { return }

  const existing = topBar.querySelector('.qa-nav-toggle')
  if (existing) { existing.remove() }

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
  if (searchInput) {
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

  if (hamburgerToggle) {
    hamburgerToggle.focus()
  }
}

function updateHighlight(surahNum) {
  currentSurah = surahNum

  document.querySelectorAll('.qa-nav-current').forEach(el => {
    el.classList.remove('qa-nav-current')
    el.removeAttribute('aria-current')
  })

  const item = document.querySelector(`.qa-nav-item[data-surah="${surahNum}"]`)
  if (item) {
    item.classList.add('qa-nav-current')
    item.setAttribute('aria-current', 'page')
    if (isOpen && item.scrollIntoView) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}

function setupEventListeners() {
  if (unsubPosition) { unsubPosition() }
  unsubPosition = on('reader:position-changed', ({ surah }) => {
    updateHighlight(surah)
  })

  if (unsubLoaded) { unsubLoaded() }
  unsubLoaded = on('reader:surah-loaded', ({ surah }) => {
    updateHighlight(surah)
  })
}

function setupEscapeListener() {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
  }
  escapeHandler = (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeNav()
    }
  }
  document.addEventListener('keydown', escapeHandler)
}

/**
 * Re-read surah list when tab becomes visible (may have been updated in another tab).
 */
function setupVisibilityReRead() {
  if (unsubVisibility) { unsubVisibility() }
  unsubVisibility = on(Events.DB_VISIBILITY_VISIBLE, async () => {
    // Re-fetch surah list to catch any updates from other tabs
    const freshSurahs = await getSurahs()
    if (freshSurahs && freshSurahs.length > 0) {
      surahs = freshSurahs
      // Re-render to show any updates
      const navSurface = document.getElementById('nav-surface')
      if (navSurface && isOpen) {
        renderNavPanel()
      }
    }
  })
}
