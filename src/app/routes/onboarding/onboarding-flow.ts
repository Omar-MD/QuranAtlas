import type { MushafEditionOption } from '../../../launch/mushaf-edition-setup'

export type MushafEditionSetupFlowState = {
  selectedEditionId: string | null
}

export type MushafEditionSetupFlowAction = {
  type: 'selectMushafEdition'
  value: string
}

export type OnboardingSourceOption = {
  id: string
  label: string
  disabled: boolean
}

export function createInitialMushafEditionSetupState(editions: MushafEditionOption[]): MushafEditionSetupFlowState {
  return {
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
        ? { selectedEditionId: action.value }
        : state
    default:
      return state
  }
}

export function canContinueMushafEditionSetup(state: MushafEditionSetupFlowState, editions: MushafEditionOption[]): boolean {
  return state.selectedEditionId !== null && editions.some((edition) => edition.id === state.selectedEditionId)
}
