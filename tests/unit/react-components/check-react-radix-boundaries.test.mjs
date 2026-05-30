import { describe, expect, it } from 'vitest'

import { checkReactRadixBoundaryText } from '../../../scripts/check-react-radix-boundaries.mjs'

describe('check-react-radix-boundaries', () => {
  it('allows Radix imports in the owned UI layer', () => {
    expect(checkReactRadixBoundaryText('src/components/ui/overlays.tsx', "import * as Dialog from '@radix-ui/react-dialog'")).toEqual([])
  })

  it('rejects direct Radix imports outside the owned UI layer', () => {
    expect(checkReactRadixBoundaryText('src/app/App.tsx', "import * as Dialog from '@radix-ui/react-dialog'")).toEqual([
      'src/app/App.tsx imports @radix-ui/react-dialog: direct Radix imports are restricted to src/components/ui/**.',
    ])
  })
})
