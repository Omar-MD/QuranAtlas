import { describe, expect, it } from 'vitest'

import { checkReactMushafAssetText, checkReactMushafOutputFiles } from '../../../scripts/check-react-mushaf-assets.mjs'

describe('check-react-mushaf-assets', () => {
  it('rejects legacy Mushaf paths in React code', () => {
    expect(checkReactMushafAssetText('src-react/app/App.tsx', "'/dataset/mushaf-pages/qaloon/pages/001.svg'")).toEqual([
      'src-react/app/App.tsx contains legacy React Mushaf path /dataset/mushaf-pages/qaloon/pages/001.svg.',
    ])
  })

  it('rejects SVG bodies in React build output', () => {
    expect(checkReactMushafOutputFiles([
      { path: 'dist-react/assets/page.svg', text: '<svg viewBox="0 0 10 10"></svg>' },
    ])).toEqual(['dist-react/assets/page.svg contains a Mushaf SVG body; React must install page packs on demand.'])
  })
})
