import { useCallback, useEffect, useRef, useState } from 'react'

export type MushafChromePin = 'drawer' | 'focus' | 'interaction' | 'recovery'

export type MushafChromeController = {
  visible: boolean
  focusMode: boolean
  enterFocus: () => void
  exitFocus: () => void
  hide: () => void
  reveal: () => void
  toggle: () => void
  setPinned: (source: MushafChromePin, pinned: boolean) => void
}

// S4 (approved Step 7-A): chrome is visible by default. Focus mode hides both
// bars until the reader reveals them (handle, page tap, Escape); open overlays
// and recovery surfaces pin the bars regardless. No auto-hide timer — the
// bars never disappear on their own.
export function useMushafChromeVisibility(readable: boolean): MushafChromeController {
  const [focusMode, setFocusMode] = useState(false)
  const pinsRef = useRef(new Set<MushafChromePin>())
  const [pinsSize, setPinsSize] = useState(0)

  const setPinned = useCallback((source: MushafChromePin, pinned: boolean) => {
    const pins = pinsRef.current
    if (pinned) pins.add(source)
    else pins.delete(source)
    setPinsSize(pins.size)
  }, [])

  useEffect(() => {
    if (!readable) setFocusMode(false)
  }, [readable])

  const pinned = pinsSize > 0
  const visible = readable && (!focusMode || pinned)

  return {
    visible,
    focusMode: focusMode && !pinned,
    enterFocus: useCallback(() => setFocusMode(true), []),
    exitFocus: useCallback(() => setFocusMode(false), []),
    hide: useCallback(() => setFocusMode(true), []),
    reveal: useCallback(() => setFocusMode(false), []),
    toggle: useCallback(() => setFocusMode((value) => !value), []),
    setPinned,
  }
}
