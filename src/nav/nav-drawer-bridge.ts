/**
 * Imperative bridge for the NavDrawer Svelte component. Mirrors the
 * pattern of more-sheet-bridge (which this replaces 2026-04-25) so
 * MarginHeader can open the drawer without a circular import or
 * window global.
 */

let _open: (() => void) | null = null
let _close: (() => void) | null = null

export function registerNavDrawer(open: () => void, close: () => void): void {
  _open = open
  _close = close
}

export function openNavDrawer(): void { _open?.() }
export function closeNavDrawer(): void { _close?.() }
