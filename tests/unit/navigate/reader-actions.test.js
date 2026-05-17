import { beforeEach, describe, expect, it, vi } from 'vitest'

const { announce } = vi.hoisted(() => ({
  announce: vi.fn(),
}))

vi.mock('../../../src/a11y/announcer.js', () => ({
  announce,
}))

vi.mock('../../../src/read/tafsir-bridge.ts', () => ({
  openTafsirPreview: vi.fn(),
}))

vi.mock('../../../src/data/dataset.js', () => ({
  getSurahs: vi.fn(async () => [
    { n: 2, counts: { hafs: 286, warsh: 285, qaloon: 285 } },
  ]),
}))

import { settings } from '../../../src/configure/state.svelte'
import { reader } from '../../../src/read/state.svelte'
import {
  initReaderActions,
  lastVerse,
  nextVerse,
} from '../../../src/navigate/reader-actions.js'

describe('navigate/reader-actions.js', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<main id="main-content"><article data-verse="255"></article><article data-verse="285"></article><article data-verse="286"></article></main>'
    announce.mockReset()
    settings.riwayah = 'qaloon'
    reader.currentSurahNum = 2
    reader.currentVerseKey = '2:255'
    await initReaderActions()
  })

  it('uses the active riwayah verse count for nextVerse clamping', () => {
    reader.currentVerseKey = '2:285'

    expect(nextVerse()).toBe(false)
    expect(reader.currentVerseKey).toBe('2:285')
  })

  it('uses the active riwayah verse count for lastVerse navigation', () => {
    expect(lastVerse()).toBe(true)
    expect(reader.currentVerseKey).toBe('2:285')
    expect(announce).toHaveBeenCalledWith('Verse 2:285')
  })
})
