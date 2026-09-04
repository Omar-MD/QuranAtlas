import type { PackLifecycleState } from './pack-status'

export type PackLifecycleEvent =
  | { type: 'install-started' }
  | { type: 'install-verified'; version: string; cachedAt: number }
  | { type: 'activated'; activatedAt: number }
  | { type: 'failed'; error: string }
  | { type: 'removed' }

export function createPackLifecycleState(packId: string): PackLifecycleState {
  return { packId, status: 'not-installed' }
}

export function canActivatePack(state: PackLifecycleState): boolean {
  return state.status === 'installed'
}

export function transitionPackState(state: PackLifecycleState, event: PackLifecycleEvent): PackLifecycleState {
  switch (event.type) {
    case 'install-started':
      return { packId: state.packId, status: 'installing', version: state.version }
    case 'install-verified':
      return { packId: state.packId, status: 'installed', version: event.version, cachedAt: event.cachedAt }
    case 'activated':
      if (!canActivatePack(state)) throw new Error(`${state.packId}: pack must be installed before activation`)
      return { ...state, status: 'active', activatedAt: event.activatedAt }
    case 'failed':
      return { ...state, status: 'failed', error: event.error }
    case 'removed':
      return createPackLifecycleState(state.packId)
  }
}
