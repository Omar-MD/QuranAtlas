const _state = {
  broadcastChannel: null,
  deferredQueue: [],
}

export function get() { return _state }
export function set(patch) { Object.assign(_state, patch) }
