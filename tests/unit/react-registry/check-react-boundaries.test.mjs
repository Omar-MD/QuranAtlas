import { describe, expect, it } from 'vitest'

import { checkReactBoundaryText } from '../../../scripts/check-react-boundaries.mjs'

describe('check-react-boundaries', () => {
  it('rejects imports of retired style partials through deep relative paths', () => {
    expect(checkReactBoundaryText('src/components/reader/Verse.tsx', "import '../../../src/styles/index.css'")).toEqual([
      'src/components/reader/Verse.tsx imports ../../../src/styles/index.css: React and Storybook code must use src/design-system/** styles.',
    ])
  })

  it('rejects Storybook CSS imports of retired styles', () => {
    expect(checkReactBoundaryText('.storybook/preview.css', "@import '../src/styles/index.css';")).toEqual([
      '.storybook/preview.css imports ../src/styles/index.css: React and Storybook CSS must use src/design-system/** styles.',
    ])
  })

  it('rejects retired legacy class selectors in feature code', () => {
    expect(checkReactBoundaryText('src/app/routes/read/ReaderRoute.tsx', '<div className="qa-old-row" />')).toEqual([
      'src/app/routes/read/ReaderRoute.tsx uses retired legacy styling classes; use qar: utilities and React semantic tokens.',
    ])
  })
})
