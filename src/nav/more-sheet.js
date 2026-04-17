/**
 * "More" bottom sheet — opened from the dock ⋯ button.
 * First-level entries: Settings · Review hub · Surah list · About · Clear data.
 * Settings opens a second-level "Settings" view via settings/panel.js.
 */

import { openSettingsSheet } from '../settings/panel.js'
import { showClearDataConfirmation } from '../settings/clear-data.js'
import { emit } from '../core/events.js'
import { Events } from '../core/constants.js'

let scrim = null
let sheet = null
let escHandler = null

export function openMoreSheet() {
  if (sheet) { return }

  scrim = document.createElement('div')
  scrim.className = 'qa-sheet-backdrop'
  scrim.addEventListener('click', closeMoreSheet)

  sheet = document.createElement('div')
  sheet.className = 'qa-sheet qa-sheet--bottom'
  sheet.setAttribute('role', 'dialog')
  sheet.setAttribute('aria-modal', 'true')
  sheet.setAttribute('aria-label', 'More')

  const grip = document.createElement('div')
  grip.className = 'qa-sheet-grip'
  grip.setAttribute('aria-hidden', 'true')

  const hdr = document.createElement('div')
  hdr.className = 'qa-sheet-hdr'
  const title = document.createElement('div')
  title.className = 'qa-sheet-title'
  title.textContent = 'More'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'qa-sheet-close'
  close.setAttribute('aria-label', 'Close')
  close.textContent = '\u2715'
  close.addEventListener('click', closeMoreSheet)
  hdr.appendChild(title)
  hdr.appendChild(close)

  const body = document.createElement('div')
  body.className = 'qa-sheet-body'

  const entries = [
    { icon: 'Aa', label: 'Settings',      meta: 'Theme · font · translation', onClick: () => { closeMoreSheet(); openSettingsSheet() } },
    { icon: '\u2726', label: 'Review hub',    meta: 'All your marks',             onClick: () => { closeMoreSheet(); window.location.hash = '#/review' } },
    { icon: '\u2630', label: 'Surah list',    meta: 'Browse all 114 surahs',      onClick: () => { closeMoreSheet(); window.location.hash = '#/surahs' } },
    { icon: '\u24D8', label: 'About',         meta: 'Credits · version',          onClick: () => { closeMoreSheet(); window.location.hash = '#/about' } },
    { icon: '\u232B', label: 'Clear data',    meta: 'Remove all marks and settings', danger: true,
      onClick: () => { closeMoreSheet(); showClearDataConfirmation() } },
  ]

  for (const e of entries) {
    const row = document.createElement('button')
    row.type = 'button'
    row.className = 'qa-sheet-row'
    if (e.danger) { row.classList.add('qa-sheet-row--danger') }
    const ic = document.createElement('span')
    ic.className = 'qa-sheet-row-icon'
    ic.textContent = e.icon
    const col = document.createElement('span')
    col.className = 'qa-sheet-row-body'
    const lbl = document.createElement('span')
    lbl.className = 'qa-sheet-row-label'
    lbl.textContent = e.label
    const meta = document.createElement('span')
    meta.className = 'qa-sheet-row-meta'
    meta.textContent = e.meta
    col.appendChild(lbl)
    col.appendChild(meta)
    row.appendChild(ic)
    row.appendChild(col)
    row.addEventListener('click', e.onClick)
    body.appendChild(row)
  }

  sheet.appendChild(grip)
  sheet.appendChild(hdr)
  sheet.appendChild(body)

  document.body.appendChild(scrim)
  document.body.appendChild(sheet)

  escHandler = (e) => { if (e.key === 'Escape') { closeMoreSheet() } }
  document.addEventListener('keydown', escHandler)

  emit(Events.SHEET_OPENED, { name: 'more' })
}

export function closeMoreSheet() {
  if (escHandler) { document.removeEventListener('keydown', escHandler); escHandler = null }
  if (sheet?.parentNode) { sheet.parentNode.removeChild(sheet) }
  if (scrim?.parentNode) { scrim.parentNode.removeChild(scrim) }
  sheet = null
  scrim = null
  emit(Events.SHEET_CLOSED, { name: 'more' })
}
