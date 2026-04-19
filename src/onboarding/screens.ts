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

/** Curated keyboard shortcut rows shown on screen 4. */
export const SHORTCUT_ROWS: ShortcutRow[] = [
  { keys: ['/'],          desc: 'Search verses, tags, surahs' },
  { keys: ['?'],          desc: 'Show every shortcut' },
  { keys: ['j'],          desc: 'Next verse',   aux: ['k', 'previous'] },
  { keys: [']'],          desc: 'Next surah',   aux: ['[', 'previous'] },
  { keys: ['m'],          desc: 'Mark the centered verse' },
  { keys: ['t'],          desc: 'Toggle translation' },
  { keys: ['+'],          desc: 'Bigger font',  aux: ['-', 'smaller', '0', 'reset'] },
  { keys: ['g', 'h'],     desc: 'Continue reading' },
  { keys: ['Long-press'], desc: 'Mark & tag a verse', gesture: true },
]

/** Sample tag chips shown on screen 5 (Tags intro). */
export const SAMPLE_CHIPS: Array<{ label: string; color: string }> = [
  { label: 'mercy',    color: '#64a078' },
  { label: 'patience', color: '#6e96b4' },
  { label: 'tawakkul', color: '#b4826e' },
]
