import { describe, expect, it } from 'vitest'

import { checkReactMushafAssetText, checkReactMushafOutputFiles } from '../../../scripts/check-react-mushaf-assets.mjs'

describe('check-react-mushaf-assets', () => {
  it('rejects legacy Mushaf paths in React code', () => {
    expect(checkReactMushafAssetText('src/app/App.tsx', "'/dataset/mushaf-pages/qaloon/pages/001.svg'")).toEqual([
      'src/app/App.tsx contains legacy React Mushaf path /dataset/mushaf-pages/qaloon/pages/001.svg.',
    ])
  })

  it('rejects a legacy external-image Mushaf path in React code', () => {
    expect(checkReactMushafAssetText('src/app/App.tsx', "'/dataset/mushaf-pages/qaloon/pages/001-2136.webp'")).toEqual([
      'src/app/App.tsx contains legacy React Mushaf path /dataset/mushaf-pages/qaloon/pages/001-2136.webp.',
    ])
  })

  it('rejects SVG bodies in React build output', () => {
    expect(checkReactMushafOutputFiles([
      { path: 'dist/assets/page.svg', text: '<svg viewBox="0 0 10 10"></svg>' },
    ])).toEqual(['dist/assets/page.svg contains a Mushaf SVG body; React must install page packs on demand.'])
  })
})
