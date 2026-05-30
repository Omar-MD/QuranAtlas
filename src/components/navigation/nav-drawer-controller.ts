import { useEffect, useReducer } from 'react'

export type NavDrawerCloseReason = 'escape' | 'outside' | 'button'

export type NavDrawerState = {
  open: boolean
  returnFocusId: string | null
  routeTransitioning: boolean
}

export type NavDrawerAction =
  | { returnFocusId?: string | null; type: 'open' }
  | { reason: NavDrawerCloseReason; type: 'close' }
  | { type: 'route-transition' }

export const INITIAL_NAV_DRAWER_STATE: NavDrawerState = {
  open: false,
  returnFocusId: null,
  routeTransitioning: false,
}

export function navDrawerReducer(state: NavDrawerState, action: NavDrawerAction): NavDrawerState {
  switch (action.type) {
    case 'open':
      return { open: true, returnFocusId: action.returnFocusId ?? state.returnFocusId, routeTransitioning: false }
    case 'close':
      return { ...state, open: false, routeTransitioning: false }
    case 'route-transition':
      return { ...state, open: false, routeTransitioning: true }
  }
}

export function useNavDrawerController() {
  const [state, dispatch] = useReducer(navDrawerReducer, INITIAL_NAV_DRAWER_STATE)

  useEffect(() => {
    if (!state.open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (!state.routeTransitioning && state.returnFocusId) {
        document.getElementById(state.returnFocusId)?.focus()
      }
    }
  }, [state.open, state.returnFocusId, state.routeTransitioning])

  return { dispatch, state }
}
