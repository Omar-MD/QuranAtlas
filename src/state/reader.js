const _state = {
  currentSurah: null,
  currentSurahNum: null,
  currentVerseKey: null,
  fontMultiplier: 1.0,
  translationVisible: true,
  scrollY: 0,
  renderedCount: 0,
  isRendering: false,
  scrollAppendRafPending: false,
  lastTrackedVerse: null,
}

export function get() { return _state }
export function set(patch) { Object.assign(_state, patch) }
