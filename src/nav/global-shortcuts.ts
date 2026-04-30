// Boot-mounted global keyboard shortcuts. Survives lazy-mount of overlay
// components (CommandSheet, NavDrawer, Panel, etc.) — the listener is
// registered on `document` by app-bootstrap and never torn down. Audit
// N22 (2026-05-01) extracted this from CommandSheet.svelte's onMount so
// ⌘K can open the (lazy-mounted) command sheet on first keystroke.
//
// Handlers cover: ⌘K open command sheet, /, ?, g-chord nav (g h, g s,
// g r, g a, g p), reader hotkeys (j, k, ], [, Home, End, m, t, d, n, +,
// -, 0).
//
// Sheet-internal handlers (Esc, Tab, Arrow, Enter) STAY inside
// CommandSheet.svelte — they only matter while the sheet is open and
// tear down with it. While the sheet is open we exit early here so we
// don't double-handle.

import { commandSheetBridge, openCommandSheet, closeCommandSheet } from './command-sheet-bridge'
import { openShortcutsSheet, isShortcutsSheetOpen } from './shortcuts-sheet.js'
import { setTheme, cycleTheme } from '../settings/theme'
import { toggleNightMode } from '../settings/night-mode'
import { setFontSize, loadFontSize, getFontSizeOptions, resetFontSize } from '../settings/font-size'
import { toggleTranslation } from '../settings/panel-bridge'
import { announce } from '../a11y/announcer'
import { loadGlobalPosition } from '../reader/global-position'
import {
  nextVerse as readerNextVerse,
  prevVerse as readerPrevVerse,
  nextSurah as readerNextSurah,
  prevSurah as readerPrevSurah,
  firstVerse as readerFirstVerse,
  lastVerse as readerLastVerse,
  markCurrent as readerMarkCurrent,
} from './reader-actions.js'

let gChordTimer: ReturnType<typeof setTimeout> | null = null
let gChordPending = false

function isTextEntry(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) { return false }
  return ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable
}

function isReaderRoute(): boolean {
  return (window.location?.hash || '').startsWith('#/s/')
}

function clearChord(): void {
  gChordPending = false
  if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
}

async function gotoHome(): Promise<void> {
  try {
    const pos = await loadGlobalPosition()
    if (pos?.surah) {
      window.location.hash = (pos.verse ?? 0) > 1 ? `#/s/${pos.surah}/${pos.verse}` : `#/s/${pos.surah}`
      return
    }
  } catch { /* ignore */ }
  window.location.hash = '#/s/1'
}

async function bumpFont(dir: number): Promise<void> {
  const order = getFontSizeOptions()
  const cur = await loadFontSize()
  const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(cur) + dir))
  const next = order[idx]
  if (next === cur || next == null) { return }
  await setFontSize(next)
  announce(`Font size: ${next}`)
}

function handleGlobalKeydown(e: KeyboardEvent): void {
  const isK = e.key === 'k' || e.key === 'K'
  if (isK && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    if (commandSheetBridge.isOpen()) { closeCommandSheet() } else { openCommandSheet() }
    return
  }

  if (isShortcutsSheetOpen()) { return }

  // While the command sheet is open, all key handling stays inside
  // CommandSheet.svelte — exit early so we don't double-handle Esc/Tab/Arrow/Enter.
  if (commandSheetBridge.isOpen()) { return }

  if (isTextEntry(e.target)) { return }
  if (e.metaKey || e.ctrlKey || e.altKey) { return }

  if (e.key === '/') { e.preventDefault(); openCommandSheet(); return }
  if (e.key === '?') { e.preventDefault(); openShortcutsSheet(); return }

  if (e.key === 'g' || e.key === 'G') {
    gChordPending = true
    if (gChordTimer) { clearTimeout(gChordTimer) }
    gChordTimer = setTimeout(() => { gChordPending = false; gChordTimer = null }, 900)
    return
  }
  if (gChordPending) {
    const k = e.key.toLowerCase()
    if (k === 'h') { e.preventDefault(); clearChord(); void gotoHome(); return }
    if (k === 's') { e.preventDefault(); clearChord(); window.location.hash = '#/surahs'; return }
    if (k === 'r') { e.preventDefault(); clearChord(); window.location.hash = '#/review'; return }
    if (k === 'a') { e.preventDefault(); clearChord(); window.location.hash = '#/about'; return }
    if (k === 'p') { e.preventDefault(); clearChord(); window.location.hash = '#/settings'; return }
    clearChord()
  }

  if (!isReaderRoute()) { return }

  switch (e.key) {
    case 'j': e.preventDefault(); readerNextVerse(); return
    case 'k': e.preventDefault(); readerPrevVerse(); return
    case ']': e.preventDefault(); readerNextSurah(); return
    case '[': e.preventDefault(); readerPrevSurah(); return
    case 'Home': e.preventDefault(); readerFirstVerse(); return
    case 'End':  e.preventDefault(); readerLastVerse();  return
    case 'm': case 'M': e.preventDefault(); readerMarkCurrent(); return
    case 't': case 'T': e.preventDefault(); void toggleTranslation(); return
    case 'd': case 'D': e.preventDefault(); void cycleTheme(); return
    case 'n': case 'N':
      e.preventDefault()
      void toggleNightMode().then((on) => announce(on ? 'Night mode on' : 'Night mode off'))
      return
    case '+': case '=': e.preventDefault(); void bumpFont(+1); return
    case '-': case '_': e.preventDefault(); void bumpFont(-1); return
    case '0': e.preventDefault(); void resetFontSize().then(() => announce('Font size reset')); return
  }
}

export function initGlobalShortcuts(): () => void {
  document.addEventListener('keydown', handleGlobalKeydown)
  return () => {
    document.removeEventListener('keydown', handleGlobalKeydown)
    if (gChordTimer) { clearTimeout(gChordTimer); gChordTimer = null }
  }
}
