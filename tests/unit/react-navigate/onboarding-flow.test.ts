import { describe, expect, it } from 'vitest'

import {
  canCompleteOnboarding,
  createInitialOnboardingState,
  onboardingReducer,
  type OnboardingSourceOption,
} from '../../../src-react/app/routes/onboarding/onboarding-flow'

const riwayat: OnboardingSourceOption[] = [
  { id: 'qaloon', label: 'Qaloon an Nafi', disabled: false },
  { id: 'hafs', label: 'Hafs an Asim', disabled: true },
]
const translations: OnboardingSourceOption[] = [
  { id: 'bridges', label: 'Bridges', disabled: false },
  { id: 'saheeh', label: 'Saheeh International', disabled: true },
]

describe('React onboarding flow reducer', () => {
  it('starts on Riwayah with the baseline available selections', () => {
    const state = createInitialOnboardingState({ riwayat, translations })

    expect(state.step).toBe('riwayah')
    expect(state.selectedRiwayah).toBe('qaloon')
    expect(state.selectedTranslation).toBe('bridges')
  })

  it('moves to Translation and only completes when both choices are available', () => {
    const initial = createInitialOnboardingState({ riwayat, translations })
    const translationStep = onboardingReducer(initial, { type: 'next' })

    expect(translationStep.step).toBe('translation')
    expect(canCompleteOnboarding(translationStep)).toBe(true)

    const unavailable = onboardingReducer(translationStep, { type: 'selectTranslation', value: 'saheeh' })
    expect(unavailable.selectedTranslation).toBe('bridges')
  })
})
