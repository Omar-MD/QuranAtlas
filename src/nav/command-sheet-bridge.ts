/**
 * Bridge for the CommandSheet Svelte component.
 * Allows AmbientDock / AmbientPill / keyboard handler to open the
 * command sheet imperatively without a circular import.
 */

let _open: (() => void) | null = null
let _close: (() => void) | null = null

export function registerCommandSheet(open: () => void, close: () => void): void {
  _open = open
  _close = close
}

export function openCommandSheet(): void {
  _open?.()
}

export function closeCommandSheet(): void {
  _close?.()
}
