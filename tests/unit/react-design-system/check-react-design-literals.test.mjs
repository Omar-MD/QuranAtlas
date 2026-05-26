import { describe, expect, it } from 'vitest'
import { checkReactDesignText } from '../../../scripts/check-react-design-literals.mjs'

describe('checkReactDesignText', () => {
  it('rejects built-in palette utilities and raw literals', () => {
    const failures = checkReactDesignText('src-react/components/Button.tsx', 'className="qar:bg-blue-500 qar:text-[#fff]" style={{ color: "red" }}')
    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining('forbidden Tailwind palette utility'),
      expect.stringContaining('unapproved arbitrary utility'),
      expect.stringContaining('inline color style'),
    ]))
  })

  it('allows semantic token utilities', () => {
    const failures = checkReactDesignText('src-react/components/Button.tsx', 'className="qar:bg-accent qar:text-text qar:rounded-control"')
    expect(failures).toEqual([])
  })
})
