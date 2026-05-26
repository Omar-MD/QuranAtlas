import type { PackLifecycleState } from './pack-status'

export type PackUiState = {
  label: string
  action: 'install' | 'activate' | 'open' | 'retry' | 'unavailable'
  usable: boolean
}

export function packStatusToUiState(state: PackLifecycleState): PackUiState {
  switch (state.status) {
    case 'active':
      return { label: 'Active', action: 'open', usable: true }
    case 'installed':
      return { label: 'Installed', action: 'activate', usable: false }
    case 'installing':
      return { label: 'Installing', action: 'unavailable', usable: false }
    case 'failed':
      return { label: 'Failed', action: 'retry', usable: false }
    case 'unavailable':
      return { label: 'Unavailable', action: 'unavailable', usable: false }
    case 'not-installed':
      return { label: 'Not installed', action: 'install', usable: false }
  }
}
