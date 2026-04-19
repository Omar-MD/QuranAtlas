const _state = {
  isOpen: false,
  currentVerseKey: null,
  selectedTags: [],
  draftNote: '',
}

export function get() { return _state }
export function set(patch) { Object.assign(_state, patch) }
