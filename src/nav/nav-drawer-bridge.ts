/**
 * Imperative bridge for the NavDrawer Svelte component. Mirrors the
 * pattern of more-sheet-bridge (which this replaces 2026-04-25) so
 * MarginHeader can open the drawer without a circular import or
 * window global.
 */

export type DrawerTab = 'read' | 'study'
export type ReadSubTab = 'surahs' | 'bookmarks'

let _open: ((tab?: DrawerTab, subTab?: ReadSubTab) => void) | null = null
let _close: (() => void) | null = null
let _toggle: ((tab?: DrawerTab) => void) | null = null

export function registerNavDrawer(
  open: (tab?: DrawerTab, subTab?: ReadSubTab) => void,
  close: () => void,
  toggle?: (tab?: DrawerTab) => void
): void {
  _open = open
  _close = close
  _toggle = toggle ?? null
}

export function openNavDrawer(tab?: DrawerTab, subTab?: ReadSubTab): void { _open?.(tab, subTab) }
export function closeNavDrawer(): void { _close?.() }
export function toggleNavDrawer(tab?: DrawerTab): void {
  if (_toggle) { _toggle(tab); return }
  _open?.(tab)
}
