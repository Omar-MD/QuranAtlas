const _state = {
  searchQuery: '',
  filter: 'all',
}

export function get() { return _state }
export function set(patch) { Object.assign(_state, patch) }
