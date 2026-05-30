import { describe, expect, it } from 'vitest'

import { checkReactUiForbiddenPatternText } from '../../../scripts/check-react-ui-forbidden-patterns.mjs'

describe('check-react-ui-forbidden-patterns', () => {
  it('rejects raw controls in React feature code', () => {
    expect(checkReactUiForbiddenPatternText('src/app/App.tsx', '<button>Raw</button><input />')).toEqual([
      'src/app/App.tsx uses raw <button>; use src/components/ui.',
      'src/app/App.tsx uses raw <input>; use src/components/ui.',
    ])
  })

  it('allows raw controls inside the owned UI layer and stories', () => {
    expect(checkReactUiForbiddenPatternText('src/components/ui/button.tsx', '<button />')).toEqual([])
    expect(checkReactUiForbiddenPatternText('src/components/ui/ui.stories.tsx', '<button />')).toEqual([])
  })
})
