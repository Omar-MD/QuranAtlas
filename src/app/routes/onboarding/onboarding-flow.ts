import type { MushafEditionOption } from '../../../launch/mushaf-edition-setup'

export type MushafEditionSetupFlowState = {
  persistenceStatus: 'idle' | 'saving' | 'error'
  selectedEditionId: string | null
}

export type MushafEditionSetupFlowAction =
  | { type: 'selectMushafEdition'; value: string }
  | { type: 'startPersistence' }
  | { type: 'persistenceFailed' }
  | { type: 'persistenceSucceeded' }

export type OnboardingSourceOption = {
  id: string
  label: string
  disabled: boolean
}

export function createInitialMushafEditionSetupState(editions: MushafEditionOption[]): MushafEditionSetupFlowState {
  return {
    persistenceStatus: 'idle',
    selectedEditionId: editions.length === 1 ? editions[0]?.id ?? null : null,
  }
}

export function mushafEditionSetupReducer(
  state: MushafEditionSetupFlowState,
  action: MushafEditionSetupFlowAction,
  editions: MushafEditionOption[],
): MushafEditionSetupFlowState {
  switch (action.type) {
    case 'selectMushafEdition':
      return editions.some((edition) => edition.id === action.value)
        ? { persistenceStatus: 'idle', selectedEditionId: action.value }
        : state
    case 'startPersistence':
      return { ...state, persistenceStatus: 'saving' }
    case 'persistenceFailed':
      return { ...state, persistenceStatus: 'error' }
    case 'persistenceSucceeded':
      return { ...state, persistenceStatus: 'idle' }
    default:
      return state
  }
}

export function canContinueMushafEditionSetup(state: MushafEditionSetupFlowState, editions: MushafEditionOption[]): boolean {
  return state.selectedEditionId !== null && editions.some((edition) => edition.id === state.selectedEditionId)
}
