import { describe, expect, it } from 'vitest'

import { validateRegistryData } from '../../../scripts/check-react-component-registry.mjs'

const baseComponent = {
  id: 'button',
  name: 'Button',
  maturity: 'primitive',
  exportPath: 'src/components/ui/button.tsx',
  namedExport: 'Button',
  allowedVariants: ['primary'],
  allowedSizes: ['md'],
  slots: ['root'],
  dependencies: { radix: [], icons: [] },
  tokenNamespaces: ['--qa-react-*'],
  stories: [{ path: 'src/components/ui/ui.stories.tsx', states: ['default'] }],
  tests: [{ path: 'tests/unit/react-components/ui-components.test.tsx', behaviors: ['click'] }],
  accessibility: ['visible focus'],
  visualProof: { status: 'covered', references: ['tests/e2e/react-visual/README.md'] },
  owner: { surface: 'react-design-system', package: 'src/components/ui' },
  allowedConsumers: ['src/**'],
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

  it('rejects registry entries whose named export is absent', () => {
    const invalid = { ...baseComponent, namedExport: 'MissingButtonExport' }
    expect(validateRegistryData({ schemaVersion: 1, components: [invalid] })).toContain('button: namedExport MissingButtonExport was not found in src/components/ui/button.tsx')
  })

  it('rejects covered visual proof without concrete references', () => {
    const invalid = { ...baseComponent, visualProof: { status: 'covered', references: [] } }
    expect(validateRegistryData({ schemaVersion: 1, components: [invalid] }, { checkFiles: false })).toContain('button: covered visualProof requires at least one reference')
  })
})
