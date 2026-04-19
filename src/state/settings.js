const _state = {
  theme: 'auto',
  fontSize: 'md',
  translationId: null,
  translationVisible: true,
}

export function get() { return _state }
export function set(patch) { Object.assign(_state, patch) }
