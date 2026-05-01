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

/**
 * Sample tag chips shown on screen 5 (Tags intro). The dot color for each
 * chip is bound by CSS via `data-chip="<label>"` — see
 * `.qa-onb-chip-dot[data-chip=...]` in `src/styles/surfaces/onboarding.css`.
 * Adding a new chip without a matching CSS rule renders a transparent dot.
 */
export const SAMPLE_CHIPS: Array<{ label: string }> = [
  { label: 'mercy'    },
  { label: 'patience' },
  { label: 'tawakkul' },
]
