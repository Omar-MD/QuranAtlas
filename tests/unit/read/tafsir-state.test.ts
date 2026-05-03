import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('read/tafsir-state.svelte.ts', () => {
  let savedTafsirId = 'muyassar'

  beforeEach(() => {
    vi.resetModules()
    savedTafsirId = 'muyassar'

    vi.doMock('../../../src/data/dataset', () => ({
      getTafsirs: vi.fn(async () => [
        { id: 'muyassar', name: 'Tafsir Muyassar', language: 'ar', availableInManifest: true },
        { id: 'mukhtasar', name: 'Al-Mukhtasar fi al-Tafsir', language: 'ar', availableInManifest: false },
      ]),
      loadTafsirForSurah: vi.fn(async (id: string) => {
        if (id === 'mukhtasar') {
          return {
            tafsirId: 'muyassar',
            tafsirVersion: 'fallback-pack',
            language: 'ar',
            surahNo: 2,
            entries: [{
              id: '2:255',
              startKey: '2:255',
              endKey: '2:255',
              ayahKeys: ['2:255'],
              sourceGranularity: 'ayah',
              text: '<p>Fallback tafsir</p>',
            }],
          }
        }

        return {
          tafsirId: 'muyassar',
          tafsirVersion: 'default-pack',
          language: 'ar',
          surahNo: 2,
          entries: [{
            id: '2:255-257',
            startKey: '2:255',
            endKey: '2:257',
            ayahKeys: ['2:255', '2:256', '2:257'],
            sourceGranularity: 'range',
            text: '<p>Ayat al-Kursi range tafsir</p>',
          }],
        }
      }),
    }))

    vi.doMock('../../../src/configure/tafsir', () => ({
      loadTafsirId: vi.fn(async () => savedTafsirId),
      resolveSavedTafsirId: vi.fn(async (availableIds: string[]) => {
        return availableIds.includes(savedTafsirId) ? savedTafsirId : 'muyassar'
      }),
      setTafsirId: vi.fn(async (id: string) => { savedTafsirId = id }),
    }))
  })

  it('opens inline tafsir preview and resolves grouped ranges for the active verse', async () => {
    const state = await import('../../../src/read/tafsir-state.svelte.ts')

    await state.openTafsirPreview('2:256')

    expect(state.tafsirState.previewOpen).toBe(true)
    expect(state.tafsirState.activeVerseKey).toBe('2:256')
    expect(state.tafsirState.pack?.tafsirId).toBe('muyassar')
    expect(state.getActiveTafsirEntry()?.startKey).toBe('2:255')
    expect(state.formatTafsirRange(state.getActiveTafsirEntry())).toBe('2:255-257')
  })

  it('updates selected source and accepts runtime fallback back to Muyassar', async () => {
    const state = await import('../../../src/read/tafsir-state.svelte.ts')

    await state.openTafsirPreview('2:255')
    await state.selectTafsirSource('mukhtasar')

    expect(savedTafsirId).toBe('mukhtasar')
    expect(state.tafsirState.pack?.tafsirId).toBe('muyassar')
    expect(state.tafsirState.selectedId).toBe('mukhtasar')
    expect(state.tafsirState.fallbackId).toBe('muyassar')
  })

  it('syncs the active preview source from settings without clobbering the selected id on fallback', async () => {
    const state = await import('../../../src/read/tafsir-state.svelte.ts')

    await state.openTafsirPreview('2:255')
    await state.syncTafsirSourceFromSettings('mukhtasar')

    expect(state.tafsirState.selectedId).toBe('mukhtasar')
    expect(state.tafsirState.pack?.tafsirId).toBe('muyassar')
    expect(state.tafsirState.fallbackId).toBe('muyassar')
  })
})
