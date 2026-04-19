/**
 * Shortcuts cheatsheet — opened by `?` (also reachable from More → Shortcuts
 * if ever wired). Grouped by Universal · Go-to · Reader · Command sheet,
 * so users can learn progressively. Escape or backdrop click dismisses.
 */

import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'

let scrim = null
let sheet = null
let escHandler = null

const GROUPS = [
  {
    title: 'Universal',
    rows: [
      { keys: ['/'],                 desc: 'Open command sheet' },
      { keys: ['\u2318', 'K'],       desc: 'Open command sheet (alias)', mac: true },
      { keys: ['?'],                 desc: 'Show this shortcut list' },
      { keys: ['Esc'],               desc: 'Close sheet · back from FVR' },
    ],
  },
  {
    title: 'Go to',
    rows: [
      { keys: ['g', 'h'], desc: 'Home (continue reading)' },
      { keys: ['g', 's'], desc: 'Surah list' },
      { keys: ['g', 'r'], desc: 'Review hub' },
      { keys: ['g', 'a'], desc: 'About' },
      { keys: ['g', 'p'], desc: 'Preferences (settings)' },
    ],
  },
  {
    title: 'Reader',
    rows: [
      { keys: ['j'],       desc: 'Next verse' },
      { keys: ['k'],       desc: 'Previous verse' },
      { keys: [']'],       desc: 'Next surah' },
      { keys: ['['],       desc: 'Previous surah' },
      { keys: ['Home'],    desc: 'First verse' },
      { keys: ['End'],     desc: 'Last verse' },
      { keys: ['m'],       desc: 'Mark current verse' },
      { keys: ['t'],       desc: 'Toggle translation' },
      { keys: ['+'],       desc: 'Bigger font' },
      { keys: ['-'],       desc: 'Smaller font' },
      { keys: ['0'],       desc: 'Reset font size' },
      { keys: ['d'],       desc: 'Cycle theme' },
      { keys: ['Long-press'], desc: 'Mark a verse (touch)', gesture: true },
    ],
  },
  {
    title: 'Command sheet',
    rows: [
      { keys: ['\u2191', '\u2193'], desc: 'Move selection' },
      { keys: ['Tab'],              desc: 'Next result group' },
      { keys: ['\u21B5'],           desc: 'Activate' },
      { keys: ['Esc'],              desc: 'Close' },
    ],
  },
]

function isMac() {
  return /Mac|iPhone|iPod|iPad/.test(navigator.platform)
}

function makeKbd(label, gesture) {
  const k = document.createElement('kbd')
  k.className = 'qa-sc-kbd' + (gesture ? ' qa-sc-kbd--gesture' : '')
  k.textContent = label
  return k
}

function renderGroup(g) {
  const wrap = document.createElement('section')
  wrap.className = 'qa-sc-group'
  const h = document.createElement('h2')
  h.className = 'qa-sc-group-title'
  h.textContent = g.title
  wrap.appendChild(h)

  const list = document.createElement('div')
  list.className = 'qa-sc-list'
  for (const r of g.rows) {
    // Hide the ⌘K row on non-Mac — Ctrl+K is already listed implicitly (same binding).
    if (r.mac && !isMac()) { continue }

    const row = document.createElement('div')
    row.className = 'qa-sc-row'
    const keys = document.createElement('div')
    keys.className = 'qa-sc-keys'
    for (const label of r.keys) {
      keys.appendChild(makeKbd(label, r.gesture))
    }
    const desc = document.createElement('div')
    desc.className = 'qa-sc-desc'
    desc.textContent = r.desc
    row.appendChild(keys)
    row.appendChild(desc)
    list.appendChild(row)
  }
  wrap.appendChild(list)
  return wrap
}

export function openShortcutsSheet() {
  if (sheet) { return }

  scrim = document.createElement('div')
  scrim.className = 'qa-sheet-backdrop'
  scrim.addEventListener('click', closeShortcutsSheet)

  sheet = document.createElement('div')
  sheet.className = 'qa-sheet qa-sheet--bottom qa-sheet--shortcuts'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'Keyboard shortcuts')

  const grip = document.createElement('div')
  grip.className = 'qa-sheet-grip'
  grip.setAttribute('aria-hidden', 'true')

  const hdr = document.createElement('div')
  hdr.className = 'qa-sheet-hdr'
  const title = document.createElement('div')
  title.className = 'qa-sheet-title'
  title.textContent = 'Keyboard shortcuts'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'qa-sheet-close'
  close.setAttribute('aria-label', 'Close')
  close.textContent = '\u2715'
  close.addEventListener('click', closeShortcutsSheet)
  hdr.appendChild(title)
  hdr.appendChild(close)

  const body = document.createElement('div')
  body.className = 'qa-sheet-body qa-sc-body'
  for (const g of GROUPS) {
    body.appendChild(renderGroup(g))
  }

  sheet.appendChild(grip)
  sheet.appendChild(hdr)
  sheet.appendChild(body)

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  escHandler = (e) => { if (e.key === 'Escape') { closeShortcutsSheet() } }
  document.addEventListener('keydown', escHandler)

  emit(Events.SHEET_OPENED, { name: 'shortcuts' })
}

export function closeShortcutsSheet() {
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null }
  if (sheet?.parentNode) { sheet.parentNode.removeChild(sheet) }
  if (scrim?.parentNode) { scrim.parentNode.removeChild(scrim) }
  sheet = null
  scrim = null
  emit(Events.SHEET_CLOSED, { name: 'shortcuts' })
}

export function isShortcutsSheetOpen() {
  return sheet !== null
}
