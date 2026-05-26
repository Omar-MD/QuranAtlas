import { describe, expect, it } from 'vitest'

import { checkReactBoundaryText } from '../../../scripts/check-react-boundaries.mjs'

describe('check-react-boundaries', () => {
  it('rejects React imports of Svelte style partials through deep relative paths', () => {
    expect(checkReactBoundaryText('src-react/components/reader/Verse.tsx', "import '../../../src/styles/index.css'")).toEqual([
      'src-react/components/reader/Verse.tsx imports ../../../src/styles/index.css: React and Storybook code must not import Svelte styles.',
    ])
  })

  it('rejects Storybook CSS imports of Svelte styles', () => {
    expect(checkReactBoundaryText('.storybook/preview.css', "@import '../src/styles/index.css';")).toEqual([
      '.storybook/preview.css imports ../src/styles/index.css: React and Storybook CSS must not import Svelte styles.',
    ])
  })

  it('rejects Svelte qa class selectors in React feature code', () => {
    expect(checkReactBoundaryText('src-react/app/routes/read/ReaderRoute.tsx', '<div className="qa-verse-row" />')).toEqual([
      'src-react/app/routes/read/ReaderRoute.tsx uses Svelte qa-* styling classes; use qar: utilities and React semantic tokens.',
    ])
  })
})
