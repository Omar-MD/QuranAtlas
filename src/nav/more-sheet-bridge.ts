/**
 * Bridge for the MoreSheet Svelte component.
 * Allows imperative code (ambient-dock) to open the More sheet
 * without a circular import or a window global.
 */

let _open: (() => void) | null = null

export function registerMoreSheet(open: () => void): void {
  _open = open
}

export function openMoreSheet(): void {
  _open?.()
}
