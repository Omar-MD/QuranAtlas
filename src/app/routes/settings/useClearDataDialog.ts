import { useReducer } from 'react'

import { clearReactApplicationData } from '../../../storage/clear-data'

type ClearDataState = {
  error: string | null
  input: string
  open: boolean
  pending: boolean
  blocked: boolean
}

type ClearDataAction =
  | { type: 'close' }
  | { type: 'blocked' }
  | { type: 'error'; message: string }
  | { type: 'input'; value: string }
  | { type: 'open' }
  | { type: 'pending' }

const initialState: ClearDataState = {
  error: null,
  input: '',
  open: false,
  pending: false,
  blocked: false,
}

function reducer(state: ClearDataState, action: ClearDataAction): ClearDataState {
  switch (action.type) {
    case 'close':
      return initialState
    case 'blocked':
      return { ...state, blocked: true, error: null, pending: false }
    case 'error':
      return { ...state, blocked: false, error: action.message, pending: false }
    case 'input':
      return { ...state, blocked: false, input: action.value, error: null }
    case 'open':
      return { ...initialState, open: true }
    case 'pending':
      return { ...state, blocked: false, pending: true, error: null }
  }
}

export function useClearDataDialog() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const canConfirm = state.input.trim() === 'DELETE' && !state.pending

  async function confirm() {
    if (!canConfirm) return
    dispatch({ type: 'pending' })
    try {
      const result = await clearReactApplicationData()
      if (result === 'blocked') {
        dispatch({ type: 'blocked' })
        return
      }
      dispatch({ type: 'close' })
      window.location.href = `${window.location.origin}${window.location.pathname}`
    } catch {
      dispatch({ type: 'error', message: 'Could not clear all local data. Please try again.' })
    }
  }

  return {
    canConfirm,
    close: () => dispatch({ type: 'close' }),
    confirm,
    open: () => dispatch({ type: 'open' }),
    setInput: (value: string) => dispatch({ type: 'input', value }),
    state,
  }
}
