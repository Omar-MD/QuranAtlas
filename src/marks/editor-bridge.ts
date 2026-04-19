/**
 * Imperative bridge for opening the mark editor from vanilla-JS consumers.
 *
 * Pattern mirrors src/core/ui-bridge.ts (Step 7.5 of the migration plan).
 * Editor.svelte calls registerEditor(openHandler) in onMount; vanilla/TS
 * consumers (reader hooks, command-sheet) call openEditor(verseKey).
 *
 * This module will remain after the migration — the hooks-via-props pattern
 * in Reader.svelte imports openEditor from here (Step 5.6 in the plan).
 */

let _open: ((verseKey: string) => void) | null = null

export function registerEditor(open: (verseKey: string) => void): void {
  _open = open
}

export function openEditor(verseKey: string): void {
  _open?.(verseKey)
}
