import { describe, expect, it } from 'vitest'

import { validateRegistryData } from '../../../scripts/check-react-component-registry.mjs'

const baseComponent = {
  id: 'button',
  name: 'Button',
  maturity: 'primitive',
  exportPath: 'src-react/components/ui/button.tsx',
  namedExport: 'Button',
  allowedVariants: ['primary'],
  allowedSizes: ['md'],
  slots: ['root'],
  dependencies: { radix: [], icons: [] },
  tokenNamespaces: ['--qa-react-*'],
  stories: [{ path: 'src-react/components/ui/ui.stories.tsx', states: ['default'] }],
  tests: [{ path: 'tests/unit/react-components/ui-components.test.tsx', behaviors: ['click'] }],
  accessibility: ['visible focus'],
  visualProof: { status: 'covered', references: ['tests/e2e/react-visual/README.md'] },
  owner: { surface: 'react-design-system', package: 'src-react/components/ui' },
  allowedConsumers: ['src-react/**'],
  forbiddenUses: ['Do not import Radix directly from feature code.'],
}

describe('check-react-component-registry', () => {
  it('accepts a complete registry', () => {
    expect(validateRegistryData({ schemaVersion: 1, components: [baseComponent] }, { checkFiles: false })).toEqual([])
  })

  it('rejects duplicate ids and missing required fields', () => {
    const invalid = { ...baseComponent }
    delete invalid.namedExport
    expect(validateRegistryData({ schemaVersion: 1, components: [invalid, baseComponent] }, { checkFiles: false })).toContain('components[0] missing required field namedExport')
  })
})
