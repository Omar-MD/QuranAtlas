// Boot-mounted global keyboard shortcuts. Survives lazy-mount of overlay
// components (NavDrawer, Panel, etc.) because the listener is registered on
// `document` by app-bootstrap and never torn down.
//
// Handlers cover: ?, g-chord nav (g h, g s, g a), reader hotkeys
// (j, k, ], [, Home, End, t, d, n, +, -, 0).

import { openShortcutsSheet, isShortcutsSheetOpen } from './shortcuts-sheet.js'
import { cycleTheme } from '../configure/theme'
import { toggleNightMode } from '../configure/night-mode'
import { setFontSize, loadFontSize, getFontSizeOptions, resetFontSize } from '../configure/font-size'
import { toggleTranslation } from '../configure/panel-bridge'
import { settings } from '../configure/state.svelte'
import { announce } from '../a11y/announcer'
import { loadGlobalPosition } from '../continuity/position'
import type { Riwayah } from '../packs/riwayah'
import {
  nextVerse as readerNextVerse,
  prevVerse as readerPrevVerse,
  nextSurah as readerNextSurah,
  prevSurah as readerPrevSurah,
  firstVerse as readerFirstVerse,
  lastVerse as readerLastVerse,
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
    const pos = await loadGlobalPosition((settings.riwayah ?? 'qaloon') as Riwayah)
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
  if (isShortcutsSheetOpen()) { return }

  if (isTextEntry(e.target)) { return }
  if (e.metaKey || e.ctrlKey || e.altKey) { return }

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
    if (k === 'a') { e.preventDefault(); clearChord(); window.location.hash = '#/about'; return }
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
    case 't': case 'T': e.preventDefault(); void toggleTranslation(); return
    case 'd': case 'D': e.preventDefault(); void cycleTheme(); return
    case 'n': case 'N':
      e.preventDefault()
      void toggleNightMode().then((mode) => announce(mode === 'on' ? 'Night mode on' : 'Night mode off'))
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
