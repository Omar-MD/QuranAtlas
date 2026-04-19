const _state = {
  query: '',
  results: [],
  focusIndex: 0,
  isOpen: false,
}

export function get() { return _state }
export function set(patch) { Object.assign(_state, patch) }
