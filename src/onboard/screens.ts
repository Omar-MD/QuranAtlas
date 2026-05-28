/**
 * Onboarding screen data types.
 * Logic for rendering each screen lives in the Svelte components;
 * this module holds pure data structures used across screens.
 */

export type ShortcutRow = {
  keys: string[]
  desc: string
  aux?: string[]
  gesture?: boolean
}

/** Curated keyboard shortcut rows shown on the shortcuts screen. */
export const SHORTCUT_ROWS: ShortcutRow[] = [
  { keys: ['?'],          desc: 'Show every shortcut' },
  { keys: ['j'],          desc: 'Next verse',   aux: ['k', 'previous'] },
  { keys: [']'],          desc: 'Next surah',   aux: ['[', 'previous'] },
  { keys: ['t'],          desc: 'Toggle translation' },
  { keys: ['+'],          desc: 'Bigger font',  aux: ['-', 'smaller', '0', 'reset'] },
  { keys: ['g', 'h'],     desc: 'Continue reading' },
]

/**
 * Finish-screen chips shown on the start-reading screen.
 * The dot tone is bound by CSS via `data-chip="<tone>"`.
 */
export const START_READING_ROWS: Array<{ label: string, tone: string }> = [
  { label: 'Verse & Mushaf', tone: 'gold' },
  { label: 'Bookmarks', tone: 'sage' },
  { label: 'Offline-ready', tone: 'ink' },
]
