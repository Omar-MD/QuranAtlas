/**
 * Command sheet — ⌘K surface, single unified search.
 * Groups: Surahs · Verses · Tags · Marks · Commands. Only non-empty groups render.
 * Direct-ref input (e.g. 2:255, 67, 114:3) promotes a verse preview card
 * with Open/Mark/Copy actions.
 */

import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'
import { getSurahs, getSurah } from '../data/dataset.js'
import { getMeaning } from '../data/surah-meanings.js'
import { getAll as getAllMarks } from '../marks/store.js'
import { getAllUsedTags, getColorForTag } from '../marks/tags.js'
import { setTheme } from '../settings/theme.js'
import { setFontSize, loadFontSize } from '../settings/font-size.js'
import { get } from '../core/db.js'

const MAX_SURAH = 6
const MAX_TAGS = 5
const MAX_MARKS = 4

let scrim = null
let sheet = null
let input = null
let results = null
let footerEl = null
let isOpen = false
let escapeHandler = null
let inputHandler = null
let surahCache = null
let markCache = null
let tagCache = null
let activeIndex = 0
let flatItems = []
let keyHandler = null
let gChordTimer = null
let gChordPending = false

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
  input.maxLength = 80

  const hint = document.createElement('span')
  hint.className = 'qa-cmd-input-hint'
  hint.textContent = 'esc'

  inputRow.appendChild(glyph)
  inputRow.appendChild(input)
  inputRow.appendChild(hint)

  results = document.createElement('div')
  results.className = 'qa-cmd-results'
  results.setAttribute('role', 'listbox')
  results.setAttribute('aria-label', 'Search results')

  footerEl = document.createElement('div')
  footerEl.className = 'qa-cmd-foot'
  for (const [key, label] of [['\u2191\u2193', 'navigate'], ['\u21B5', 'open'], ['esc', 'close']]) {
    const grp = document.createElement('span')
    grp.className = 'qa-cmd-foot-group'
    const k = document.createElement('span')
    k.className = 'qa-cmd-kbd'
    k.textContent = key
    const l = document.createElement('span')
    l.textContent = label
    grp.appendChild(k)
    grp.appendChild(l)
    footerEl.appendChild(grp)
  }

  sheet.appendChild(inputRow)
  sheet.appendChild(results)
  sheet.appendChild(footerEl)

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

export async function openCommandSheet() {
  if (!sheet || !scrim || !input) { return }
  scrim.classList.remove('qa-cmd--hidden')
  sheet.classList.remove('qa-cmd--hidden')
  isOpen = true
  input.value = ''
  input.focus()
  try {
    markCache = await getAllMarks()
    tagCache = await getAllUsedTags()
  } catch {
    markCache = []
    tagCache = []
  }
  await render()
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
  if (scrim?.parentNode) { scrim.parentNode.removeChild(scrim) }
  if (sheet?.parentNode) { sheet.parentNode.removeChild(sheet) }
  scrim = null
  sheet = null
  input = null
  results = null
  footerEl = null
  isOpen = false
  surahCache = null
  markCache = null
  tagCache = null
  activeIndex = 0
  flatItems = []
  if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
  gChordPending = false
}

async function render() {
  if (!results) { return }
  const query = (input?.value || '').trim()
  while (results.firstChild) { results.removeChild(results.firstChild) }
  flatItems = []

  if (!query) {
    await renderEmptyState()
    activeIndex = 0
    applyActive()
    return
  }

  const refMatch = query.match(/^(\d+)\s*:\s*(\d+)$/)
  if (refMatch) {
    await renderVersePreview(parseInt(refMatch[1], 10), parseInt(refMatch[2], 10))
    activeIndex = 0
    applyActive()
    return
  }

  const groups = resolve(query)
  if (groups.length === 0) {
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

async function renderEmptyState() {
  const recent = []
  try {
    const pos = await get('settings', 'lastSurface')
    const m = (pos?.value || '').match(/^#\/s\/(\d+)(?:\/(\d+))?/)
    if (m) {
      const s = parseInt(m[1], 10)
      const v = m[2] ? parseInt(m[2], 10) : 1
      const meta = surahCache.find(x => x.n === s)
      if (meta) {
        recent.push({
          kind: 'verse', glyph: '\uD83D\uDCD6', surah: s, verse: v,
          label: `${meta.name}${v > 1 ? ` \u00B7 verse ${v}` : ''}`,
          meta: 'Continue reading',
        })
      }
    }
  } catch { /* ignore */ }

  const recentMarks = (markCache || []).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  for (const mk of recentMarks.slice(0, 2)) {
    const [sStr, vStr] = mk.verseKey.split(':')
    const s = parseInt(sStr, 10)
    const v = parseInt(vStr, 10)
    const meta = surahCache.find(x => x.n === s)
    recent.push({
      kind: 'verse', glyph: `${s}:`, surah: s, verse: v,
      label: `${s}:${v}${meta ? ` \u00B7 ${meta.name}` : ''}`,
      meta: mk.tags.slice(0, 3).join(', '),
    })
  }

  if (recent.length > 0) {
    results.appendChild(renderGroup({ title: 'Recent', items: recent }))
  }

  const jumps = [
    { kind: 'action', glyph: '\u2726', label: 'Review hub', meta: 'All your marks', href: '#/review', shortcut: 'G R' },
    { kind: 'action', glyph: '\u2630', label: 'Browse all surahs', meta: '114 surahs', href: '#/surahs', shortcut: 'G S' },
    { kind: 'action', glyph: '\u2699', label: 'Settings', meta: 'Theme · font · translation', href: '#/settings', shortcut: 'G ,' },
  ]
  results.appendChild(renderGroup({ title: 'Jump to', items: jumps }))
}

async function renderVersePreview(s, v) {
  const meta = surahCache.find(x => x.n === s)
  if (!meta || s < 1 || s > 114 || v < 1 || v > meta.count) {
    const empty = document.createElement('div')
    empty.className = 'qa-cmd-empty'
    empty.textContent = meta
      ? `Verse ${v} does not exist in ${meta.name} (max ${meta.count})`
      : `Surah ${s} does not exist (1–114)`
    results.appendChild(empty)
    return
  }

  results.appendChild(renderGroupHeader({ title: 'Verse', count: 'direct match' }))

  const card = document.createElement('div')
  card.className = 'qa-cmd-vcard'
  const ref = document.createElement('div')
  ref.className = 'qa-cmd-vcard-ref'
  ref.textContent = `${s}:${v} \u00B7 ${meta.name}${getMeaning(s) ? ` \u00B7 ${getMeaning(s)}` : ''}`
  const ar = document.createElement('div')
  ar.className = 'qa-cmd-vcard-ar'
  ar.setAttribute('dir', 'rtl')
  ar.textContent = '\u2026'
  const en = document.createElement('div')
  en.className = 'qa-cmd-vcard-en'
  en.textContent = '\u2026'
  card.appendChild(ref)
  card.appendChild(ar)
  card.appendChild(en)
  results.appendChild(card)

  try {
    const data = await getSurah(s)
    ar.textContent = data.ar[v - 1] || ''
    en.textContent = data.en[v - 1] || ''
  } catch {
    ar.textContent = ''
    en.textContent = 'Content unavailable offline'
  }

  const items = [
    { kind: 'verse', glyph: '\u21B5', surah: s, verse: v, label: 'Open verse', meta: `Scroll reader to ${s}:${v}` },
    { kind: 'action', glyph: '\u2726', label: 'Mark this verse', meta: `Open mark editor for ${s}:${v}`, doMark: { verseKey: `${s}:${v}` }, shortcut: 'M' },
    { kind: 'action', glyph: '\u2398', label: 'Copy reference', meta: `"${s}:${v}" to clipboard`, doCopy: `${s}:${v}` },
  ]
  const wrap = document.createElement('div')
  wrap.className = 'qa-cmd-group'
  for (const item of items) {
    wrap.appendChild(renderItem(item))
  }
  results.appendChild(wrap)
}

function applyActive() {
  for (let i = 0; i < flatItems.length; i++) {
    const el = flatItems[i].el
    const on = i === activeIndex
    el.classList.toggle('qa-cmd--active', on)
    el.setAttribute('aria-selected', on ? 'true' : 'false')
    if (on && typeof el.scrollIntoView === 'function') { el.scrollIntoView({ block: 'nearest' }) }
  }
}

function renderGroup(group) {
  const wrap = document.createElement('div')
  wrap.className = 'qa-cmd-group'
  wrap.appendChild(renderGroupHeader({ title: group.title, count: group.items.length }))
  for (const item of group.items) {
    wrap.appendChild(renderItem(item))
  }
  return wrap
}

function renderGroupHeader({ title, count }) {
  const head = document.createElement('div')
  head.className = 'qa-cmd-group-head'
  const t = document.createElement('span')
  t.className = 'qa-cmd-group-title'
  t.textContent = title
  head.appendChild(t)
  if (count !== undefined && count !== null) {
    const c = document.createElement('span')
    c.className = 'qa-cmd-group-count'
    c.textContent = String(count)
    head.appendChild(c)
  }
  return head
}

function renderItem(item) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'qa-cmd-item'
  el.setAttribute('role', 'option')
  el.setAttribute('data-kind', item.kind)
  if (item.surah !== null && item.surah !== undefined) { el.setAttribute('data-surah', String(item.surah)) }
  if (item.verse !== null && item.verse !== undefined) { el.setAttribute('data-verse', String(item.verse)) }

  const glyph = document.createElement('span')
  glyph.className = 'qa-cmd-item-glyph'
  glyph.setAttribute('aria-hidden', 'true')
  if (item.tagColor) {
    glyph.classList.add('qa-cmd-item-glyph--dot')
    glyph.style.setProperty('--qa-cmd-dot', item.tagColor)
  } else {
    glyph.textContent = item.glyph || ''
  }

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

  if (item.shortcut) {
    const kbd = document.createElement('span')
    kbd.className = 'qa-cmd-kbd qa-cmd-item-kbd'
    kbd.textContent = item.shortcut
    el.appendChild(kbd)
  }

  el.addEventListener('click', () => { activate(item) })
  flatItems.push({ el, item })
  return el
}

async function activate(item) {
  if (item.doCopy) {
    try { await navigator.clipboard.writeText(item.doCopy) } catch { /* ignore */ }
    closeCommandSheet()
    return
  }
  if (item.doMark) {
    closeCommandSheet()
    const { openEditor } = await import('../marks/editor.js')
    openEditor(item.doMark.verseKey)
    return
  }
  if (item.doCommand === 'theme-dark')   { await setTheme('dark');   closeCommandSheet(); return }
  if (item.doCommand === 'theme-sepia')  { await setTheme('sepia');  closeCommandSheet(); return }
  if (item.doCommand === 'theme-light')  { await setTheme('light');  closeCommandSheet(); return }
  if (item.doCommand === 'theme-auto')   { await setTheme('auto');   closeCommandSheet(); return }
  if (item.doCommand === 'font-up')      { await bumpFont(+1);       closeCommandSheet(); return }
  if (item.doCommand === 'font-down')    { await bumpFont(-1);       closeCommandSheet(); return }

  closeCommandSheet()
  if (item.kind === 'tag') {
    window.location.hash = `#/t/${encodeURIComponent(item.tag)}`
  } else if (item.kind === 'surah') {
    emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah })
  } else if (item.kind === 'verse') {
    emit(Events.NAVIGATION_NAVIGATE, { surah: item.surah, verse: item.verse })
  } else if (item.kind === 'action' && item.href) {
    window.location.hash = item.href
  }
}

async function bumpFont(dir) {
  const order = ['small', 'medium', 'large']
  const cur = await loadFontSize()
  const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(cur) + dir))
  await setFontSize(order[idx])
}

function onKeydown(e) {
  const isK = e.key === 'k' || e.key === 'K'
  if (isK && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    if (isOpen) { closeCommandSheet() } else { openCommandSheet() }
    return
  }

  if (!isOpen) {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { return }
    if (e.key === 'g' || e.key === 'G') {
      gChordPending = true
      if (gChordTimer) { clearTimeout(gChordTimer) }
      gChordTimer = setTimeout(() => { gChordPending = false; gChordTimer = null }, 900)
      return
    }
    if (gChordPending) {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault(); gChordPending = false; if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
        window.location.hash = '#/review'; return
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault(); gChordPending = false; if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
        window.location.hash = '#/surahs'; return
      }
      if (e.key === ',') {
        e.preventDefault(); gChordPending = false; if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
        window.location.hash = '#/settings'; return
      }
    }
    return
  }

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

function resolve(query) {
  const q = query.toLowerCase()
  const groups = []

  const nMatch = query.match(/^(\d+)$/)
  if (nMatch) {
    const n = parseInt(nMatch[1], 10)
    const meta = surahCache.find(x => x.n === n)
    if (meta) { groups.push({ title: 'Surahs', items: [surahItem(meta)] }) }
  }

  const tagMatches = (tagCache || [])
    .filter(t => t.toLowerCase().includes(q))
    .slice(0, MAX_TAGS)
  if (tagMatches.length > 0) {
    groups.push({
      title: 'Tags',
      items: tagMatches.map(t => {
        const count = (markCache || []).filter(m => m.tags.includes(t)).length
        return {
          kind: 'tag', tag: t, tagColor: getColorForTag(t),
          label: t, meta: `${count} mark${count === 1 ? '' : 's'}`,
        }
      }),
    })
  }

  if (!nMatch) {
    const surahMatches = surahCache.filter(s => {
      const name = (s.name || '').toLowerCase()
      const meaning = (getMeaning(s.n) || '').toLowerCase()
      return name.includes(q) || meaning.includes(q)
    }).slice(0, MAX_SURAH)
    if (surahMatches.length > 0) {
      groups.push({ title: 'Surahs', items: surahMatches.map(surahItem) })
    }
  }

  const markMatches = (markCache || [])
    .filter(m => {
      if (m.verseKey.includes(q)) { return true }
      if (m.tags.some(t => t.toLowerCase().includes(q))) { return true }
      return false
    })
    .slice(0, MAX_MARKS)
  if (markMatches.length > 0) {
    groups.push({
      title: 'Marks',
      items: markMatches.map(m => {
        const [s, v] = m.verseKey.split(':').map(x => parseInt(x, 10))
        const meta = surahCache.find(x => x.n === s)
        return {
          kind: 'verse', glyph: '\u2726', surah: s, verse: v,
          label: `${m.verseKey}${meta ? ` \u00B7 ${meta.name}` : ''}`,
          meta: m.tags.join(', '),
        }
      }),
    })
  }

  const commands = buildCommands(q)
  if (commands.length > 0) {
    groups.push({ title: 'Commands', items: commands })
  }

  return groups
}

function buildCommands(q) {
  const all = [
    { kind: 'action', glyph: '\uD83C\uDF19', label: 'Switch to dark theme',  doCommand: 'theme-dark',  key: 'dark theme switch' },
    { kind: 'action', glyph: '\uD83D\uDCD6', label: 'Switch to sepia theme', doCommand: 'theme-sepia', key: 'sepia theme paper' },
    { kind: 'action', glyph: '\u2600\uFE0F', label: 'Switch to light theme', doCommand: 'theme-light', key: 'light theme' },
    { kind: 'action', glyph: '\u2699\uFE0F', label: 'Follow device theme',   doCommand: 'theme-auto',  key: 'auto theme os' },
    { kind: 'action', glyph: 'A+',           label: 'Increase font size',    doCommand: 'font-up',     key: 'font size larger bigger' },
    { kind: 'action', glyph: 'A-',           label: 'Decrease font size',    doCommand: 'font-down',   key: 'font size smaller' },
  ]
  return all.filter(a => a.key.includes(q) || a.label.toLowerCase().includes(q))
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
