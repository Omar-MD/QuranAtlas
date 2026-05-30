import { useEffect, useReducer } from 'react'

import { loadOnboardingSourceIndexes } from '../../../data/source-index'
import type { Riwayah } from '../../../storage/types'

export type OnboardingStep = 'riwayah' | 'translation'
export type OnboardingSourceOption = {
  id: string
  label: string
  disabled: boolean
}

export type OnboardingFlowState = {
  step: OnboardingStep
  status: 'loading' | 'ready' | 'error'
  riwayat: OnboardingSourceOption[]
  translations: OnboardingSourceOption[]
  selectedRiwayah: Riwayah
  selectedTranslation: string
  error?: string
}

export type OnboardingFlowAction =
  | { type: 'loadStart' }
  | { type: 'loadSuccess'; riwayat: OnboardingSourceOption[]; translations: OnboardingSourceOption[] }
  | { type: 'loadError'; error: string }
  | { type: 'selectRiwayah'; value: Riwayah }
  | { type: 'selectTranslation'; value: string }
  | { type: 'next' }
  | { type: 'back' }

const FALLBACK_RIWAYAT: OnboardingSourceOption[] = [
  { id: 'qaloon', label: 'Qaloon an Nafi', disabled: false },
  { id: 'hafs', label: 'Hafs an Asim', disabled: true },
  { id: 'warsh', label: 'Warsh an Nafi', disabled: true },
]

const FALLBACK_TRANSLATIONS: OnboardingSourceOption[] = [
  { id: 'bridges', label: 'Bridges', disabled: false },
]

function firstEnabledId(options: OnboardingSourceOption[], fallback: string): string {
  return options.find((option) => !option.disabled)?.id ?? fallback
}

function hasEnabledOption(options: OnboardingSourceOption[], id: string): boolean {
  return options.some((option) => option.id === id && !option.disabled)
}

export function createInitialOnboardingState({
  riwayat = FALLBACK_RIWAYAT,
  translations = FALLBACK_TRANSLATIONS,
}: {
  riwayat?: OnboardingSourceOption[]
  translations?: OnboardingSourceOption[]
} = {}): OnboardingFlowState {
  return {
    step: 'riwayah',
    status: 'loading',
    riwayat,
    translations,
    selectedRiwayah: firstEnabledId(riwayat, 'qaloon') as Riwayah,
    selectedTranslation: firstEnabledId(translations, 'bridges'),
  }
}

export function onboardingReducer(state: OnboardingFlowState, action: OnboardingFlowAction): OnboardingFlowState {
  switch (action.type) {
    case 'loadStart':
      return { ...state, status: 'loading', error: undefined }
    case 'loadSuccess': {
      const selectedRiwayah = hasEnabledOption(action.riwayat, state.selectedRiwayah)
        ? state.selectedRiwayah
        : firstEnabledId(action.riwayat, 'qaloon') as Riwayah
      const selectedTranslation = hasEnabledOption(action.translations, state.selectedTranslation)
        ? state.selectedTranslation
        : firstEnabledId(action.translations, 'bridges')
      return {
        ...state,
        status: 'ready',
        riwayat: action.riwayat.length > 0 ? action.riwayat : FALLBACK_RIWAYAT,
        translations: action.translations.length > 0 ? action.translations : FALLBACK_TRANSLATIONS,
        selectedRiwayah,
        selectedTranslation,
        error: undefined,
      }
    }
    case 'loadError':
      return { ...state, status: 'error', error: action.error }
    case 'selectRiwayah':
      return hasEnabledOption(state.riwayat, action.value) ? { ...state, selectedRiwayah: action.value } : state
    case 'selectTranslation':
      return hasEnabledOption(state.translations, action.value) ? { ...state, selectedTranslation: action.value } : state
    case 'next':
      return state.step === 'riwayah' ? { ...state, step: 'translation' } : state
    case 'back':
      return state.step === 'translation' ? { ...state, step: 'riwayah' } : state
    default:
      return state
  }
}

export function canCompleteOnboarding(state: OnboardingFlowState): boolean {
  return state.step === 'translation'
    && hasEnabledOption(state.riwayat, state.selectedRiwayah)
    && hasEnabledOption(state.translations, state.selectedTranslation)
}

export function useOnboardingFlow() {
  const [state, dispatch] = useReducer(onboardingReducer, undefined, () => createInitialOnboardingState())

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'loadStart' })
    void loadOnboardingSourceIndexes({ signal: controller.signal })
      .then((sources) => dispatch({ type: 'loadSuccess', riwayat: sources.riwayat, translations: sources.translations }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          dispatch({ type: 'loadError', error: error instanceof Error ? error.message : 'Unable to load sources.' })
        }
      })
    return () => controller.abort()
  }, [])

  return { state, dispatch }
}
