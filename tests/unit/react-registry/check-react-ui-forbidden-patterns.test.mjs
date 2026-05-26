import { describe, expect, it } from 'vitest'

import { checkReactUiForbiddenPatternText } from '../../../scripts/check-react-ui-forbidden-patterns.mjs'

describe('check-react-ui-forbidden-patterns', () => {
  it('rejects raw controls in React feature code', () => {
    expect(checkReactUiForbiddenPatternText('src-react/app/App.tsx', '<button>Raw</button><input />')).toEqual([
      'src-react/app/App.tsx uses raw <button>; use src-react/components/ui.',
      'src-react/app/App.tsx uses raw <input>; use src-react/components/ui.',
    ])
  })

  it('allows raw controls inside the owned UI layer and stories', () => {
    expect(checkReactUiForbiddenPatternText('src-react/components/ui/button.tsx', '<button />')).toEqual([])
    expect(checkReactUiForbiddenPatternText('src-react/components/ui/ui.stories.tsx', '<button />')).toEqual([])
  })
})
