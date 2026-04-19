const _state = {
  view: 'all',
  groupBy: 'tag',
  sort: 'recent',
  activeTag: null,
  activeTags: [],
  surahFilter: null,
}

export function get() { return _state }
export function set(patch) { Object.assign(_state, patch) }
