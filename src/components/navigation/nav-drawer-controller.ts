import { useReducer } from 'react'

export type NavDrawerState = {
  open: boolean
  returnFocusId: string | null
  routeTransitioning: boolean
}

export type NavDrawerAction =
  | { returnFocusId?: string | null; type: 'open' }
  | { type: 'close' }
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
  return { dispatch, state }
}
