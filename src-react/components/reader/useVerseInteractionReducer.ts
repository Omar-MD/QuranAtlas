import { useReducer } from 'react'

type VerseInteractionState = {
  selectedVerseKey: string | null
}

type VerseInteractionAction =
  | { type: 'select'; verseKey: string }
  | { type: 'clear' }

function reducer(state: VerseInteractionState, action: VerseInteractionAction): VerseInteractionState {
  if (action.type === 'clear') return { selectedVerseKey: null }
  return { selectedVerseKey: state.selectedVerseKey === action.verseKey ? null : action.verseKey }
}

export function useVerseInteractionReducer() {
  const [state, dispatch] = useReducer(reducer, { selectedVerseKey: null })
  return {
    selectedVerseKey: state.selectedVerseKey,
    clearSelection: () => dispatch({ type: 'clear' }),
    selectVerse: (verseKey: string) => dispatch({ type: 'select', verseKey }),
  }
}
