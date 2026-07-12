import { describe, expect, it } from 'vitest'

import {
  canContinueMushafEditionSetup,
  createInitialMushafEditionSetupState,
  mushafEditionSetupReducer,
} from '../../../src/app/routes/onboarding/onboarding-flow'
import type { MushafEditionOption } from '../../../src/launch/mushaf-edition-setup'

const quranWs: MushafEditionOption = { id: 'qalun-quran-ws-v1', label: 'Qalun Quran.ws' }
const furatiyyah: MushafEditionOption = { id: 'qalun-furatiyyah-2023-v1', label: 'Qalun Furatiyyah 2023' }

describe('React onboarding flow reducer', () => {
  it('auto-selects the only available Mushaf edition', () => {
    const state = createInitialMushafEditionSetupState([quranWs])

    expect(state.selectedEditionId).toBe('qalun-quran-ws-v1')
    expect(canContinueMushafEditionSetup(state, [quranWs])).toBe(true)
  })

  it('requires one valid edition choice when multiple editions are available', () => {
    const editions = [quranWs, furatiyyah]
    const initial = createInitialMushafEditionSetupState(editions)

    expect(initial.selectedEditionId).toBeNull()
    expect(canContinueMushafEditionSetup(initial, editions)).toBe(false)

    const ignored = mushafEditionSetupReducer(initial, { type: 'selectMushafEdition', value: 'unknown' }, editions)
    expect(ignored).toEqual(initial)

    const selected = mushafEditionSetupReducer(initial, { type: 'selectMushafEdition', value: furatiyyah.id }, editions)
    expect(selected.selectedEditionId).toBe(furatiyyah.id)
    expect(canContinueMushafEditionSetup(selected, editions)).toBe(true)
  })
})
