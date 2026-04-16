/**
 * Command sheet — ⌘K surface, single unified search/actions overlay.
 * Renders scoped result groups (Surahs, Verses, Actions) based on query.
 */

import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { getSurahs } from '../data/dataset.js'
import { getMeaning } from '../data/surah-meanings.js'

const MAX_SURAH_MATCHES = 6

let scrim = null
let sheet = null
let input = null
let results = null
let isOpen = false
let escapeHandler = null
let inputHandler = null
let surahCache = null
let activeIndex = 0
let flatItems = []
let keyHandler = null

export async function initCommandSheet() {
  destroyCommandSheet()

  scrim = document.createElement('div')
  scrim.className = 'qa-cmd-scrim qa-cmd--hidden'
  scrim.addEventListener('click', closeCommandSheet)

  sheet = document.createElement('div')
  sheet.className = 'qa-cmd-sheet qa-cmd--hidden'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Command sheet')

  const inputRow = document.createElement('div')
  inputRow.className = 'qa-cmd-input-row'

  const glyph = document.createElement('span')
  glyph.className = 'qa-cmd-input-glyph'
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = '\u2315'

  input = document.createElement('input')
  input.type = 'search'
  input.className = 'qa-cmd-input'
  input.setAttribute('placeholder', 'Search surah, verse, tag, or command')
  input.setAttribute('aria-label', 'Search surah, verse, tag, or command')
  input.setAttribute('autocomplete', 'off')
  input.maxLength = 50

  const hint = document.createElement('span')
  hint.className = 'qa-cmd-input-hint'
  hint.textContent = 'esc'

  inputRow.appendChild(glyph)
  inputRow.appendChild(input)
  inputRow.appendChild(hint)

  results = document.createElement('div')
  results.className = 'qa-cmd-results'
  results.setAttribute('role', 'listbox')

  sheet.appendChild(inputRow)
  sheet.appendChild(results)

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  escapeHandler = (e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      closeCommandSheet()
    }
  }
  document.addEventListener('keydown', escapeHandler)

  keyHandler = onKeydown
  document.addEventListener('keydown', keyHandler)

  inputHandler = () => { render() }
  input.addEventListener('input', inputHandler)

  surahCache = await getSurahs()

  return destroyCommandSheet
}

export function openCommandSheet() {
  if (!sheet || !scrim || !input) { return }
  scrim.classList.remove('qa-cmd--hidden')
  sheet.classList.remove('qa-cmd--hidden')
  isOpen = true
  input.value = ''
  render()
  input.focus()
}

export function closeCommandSheet() {
  if (!sheet || !scrim) { return }
  scrim.classList.add('qa-cmd--hidden')
  sheet.classList.add('qa-cmd--hidden')
  isOpen = false
}

export function destroyCommandSheet() {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler)
    escapeHandler = null
  }
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler)
    keyHandler = null
  }
  if (input && inputHandler) {
    input.removeEventListener('input', inputHandler)
    inputHandler = null
  }
  if (scrim && scrim.parentNode) { scrim.parentNode.removeChild(scrim) }
  if (sheet && sheet.parentNode) { sheet.parentNode.removeChild(sheet) }
  scrim = null
  sheet = null
  input = null
  results = null
  isOpen = false
  surahCache = null
  activeIndex = 0
  flatItems = []
}

function render() {
  if (!results) { return }
  const query = (input?.value || '').trim()
  const groups = resolve(query, surahCache || [])

  while (results.firstChild) { results.removeChild(results.firstChild) }
  flatItems = []

  if (groups.length === 0 || groups.every(g => g.items.length === 0)) {
    const empty = document.createElement('div')
    empty.className = 'qa-cmd-empty'
    empty.textContent = 'No matches'
    results.appendChild(empty)
    activeIndex = 0
    return
  }

  for (const group of groups) {
    if (group.items.length === 0) { continue }
    results.appendChild(renderGroup(group))
  }

  activeIndex = 0
  applyActive()
}

function applyActive() {
  for (let i = 0; i < flatItems.length; i++) {
    const el = flatItems[i].el
    const on = i === activeIndex
    el.classList.toggle('qa-cmd--active', on)
    el.setAttribute('aria-selected', on ? 'true' : 'false')
  }
}

function renderGroup(group) {
  const wrap = document.createElement('div')
  wrap.className = 'qa-cmd-group'

  const head = document.createElement('div')
  head.className = 'qa-cmd-group-head'

  const title = document.createElement('span')
  title.className = 'qa-cmd-group-title'
  title.textContent = group.title

  const count = document.createElement('span')
  count.className = 'qa-cmd-group-count'
  count.textContent = String(group.items.length)

  head.appendChild(title)
  head.appendChild(count)
  wrap.appendChild(head)

  for (const item of group.items) {
    wrap.appendChild(renderItem(item))
  }
  return wrap
}

function renderItem(item) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'qa-cmd-item'
  el.setAttribute('role', 'option')
  el.setAttribute('data-kind', item.kind)
  if (item.surah != null) { el.setAttribute('data-surah', String(item.surah)) }
  if (item.verse != null) { el.setAttribute('data-verse', String(item.verse)) }

  const glyph = document.createElement('span')
  glyph.className = 'qa-cmd-item-glyph'
  glyph.setAttribute('aria-hidden', 'true')
  glyph.textContent = item.glyph || ''

  const body = document.createElement('span')
  body.className = 'qa-cmd-item-body'

  const label = document.createElement('span')
  label.className = 'qa-cmd-item-label'
  label.textContent = item.label

  body.appendChild(label)

  if (item.meta) {
    const meta = document.createElement('span')
    meta.className = 'qa-cmd-item-meta'
    meta.textContent = item.meta
    body.appendChild(meta)
  }

  el.appendChild(glyph)
  el.appendChild(body)

  el.addEventListener('click', () => { activate(item) })

  flatItems.push({ el, item })

  return el
}

function activate(item) {
  closeCommandSheet()
  if (item.kind === 'surah') {
    emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah })
  } else if (item.kind === 'verse') {
    emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah, verse: item.verse })
  } else if (item.kind === 'action') {
    if (item.href) { window.location.hash = item.href }
  }
}

function onKeydown(e) {
  const isK = e.key === 'k' || e.key === 'K'
  if (isK && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    if (isOpen) { closeCommandSheet() } else { openCommandSheet() }
    return
  }
  if (!isOpen) { return }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (flatItems.length === 0) { return }
    activeIndex = (activeIndex + 1) % flatItems.length
    applyActive()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (flatItems.length === 0) { return }
    activeIndex = (activeIndex - 1 + flatItems.length) % flatItems.length
    applyActive()
  } else if (e.key === 'Enter') {
    if (flatItems.length === 0) { return }
    e.preventDefault()
    activate(flatItems[activeIndex].item)
  }
}

function resolve(query, surahs) {
  if (!query) { return [{ title: 'Actions', items: defaultActions() }] }

  const numericRef = query.match(/^(\d+):(\d+)$/)
  if (numericRef) {
    const s = parseInt(numericRef[1], 10)
    const v = parseInt(numericRef[2], 10)
    const meta = surahs.find(x => x.n === s)
    if (!meta || s < 1 || s > 114 || v < 1 || v > meta.count) { return [] }
    return [{
      title: 'Verses',
      items: [{
        kind: 'verse',
        glyph: `${s}:${v}`,
        surah: s,
        verse: v,
        label: `${s}:${v} \u00B7 ${meta.name}`,
        meta: getMeaning(s) || '',
      }],
    }]
  }

  const numericOnly = query.match(/^(\d+)$/)
  if (numericOnly) {
    const s = parseInt(numericOnly[1], 10)
    const meta = surahs.find(x => x.n === s)
    if (!meta) { return [] }
    return [{
      title: 'Surahs',
      items: [surahItem(meta)],
    }]
  }

  const q = query.toLowerCase()
  const matches = surahs.filter(s => {
    const name = (s.name || '').toLowerCase()
    const meaning = (getMeaning(s.n) || '').toLowerCase()
    return name.includes(q) || meaning.includes(q)
  }).slice(0, MAX_SURAH_MATCHES)

  if (matches.length === 0) { return [] }
  return [{ title: 'Surahs', items: matches.map(surahItem) }]
}

function surahItem(s) {
  return {
    kind: 'surah',
    glyph: String(s.n),
    surah: s.n,
    label: s.name,
    meta: getMeaning(s.n) || '',
  }
}

function defaultActions() {
  return [
    { kind: 'action', glyph: '\u2726', label: 'Open Review',   href: '#/review' },
    { kind: 'action', glyph: '\u22EF', label: 'Open Settings', href: '#/settings' },
  ]
}
