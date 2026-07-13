import { useCallback, useEffect, useRef, useState } from 'react'

export const MUSHAF_CHROME_DISCOVERY_MS = 2_500

export type MushafChromePin = 'drawer' | 'focus' | 'interaction' | 'recovery'

export type MushafChromeController = {
  visible: boolean
  hide: () => void
  reveal: () => void
  toggle: () => void
  setPinned: (source: MushafChromePin, pinned: boolean) => void
}

export function useMushafChromeVisibility(readable: boolean): MushafChromeController {
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(false)
  const readableRef = useRef(false)
  const discoveryStartedRef = useRef(false)
  const deadlineRef = useRef<number | null>(null)
  const remainingRef = useRef(MUSHAF_CHROME_DISCOVERY_MS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinsRef = useRef(new Set<MushafChromePin>())

  const updateVisible = useCallback((next: boolean) => {
    visibleRef.current = next
    setVisible(next)
  }, [])

  const clearDiscoveryTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
    deadlineRef.current = null
  }, [])

  const startDiscoveryTimer = useCallback((duration: number) => {
    clearDiscoveryTimer()
    if (duration <= 0) {
      remainingRef.current = 0
      updateVisible(false)
      return
    }
    remainingRef.current = duration
    deadlineRef.current = Date.now() + duration
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      deadlineRef.current = null
      remainingRef.current = 0
      updateVisible(false)
    }, duration)
  }, [clearDiscoveryTimer, updateVisible])

  const hide = useCallback(() => updateVisible(false), [updateVisible])
  const reveal = useCallback(() => updateVisible(true), [updateVisible])
  const toggle = useCallback(() => updateVisible(!visibleRef.current), [updateVisible])

  const setPinned = useCallback((source: MushafChromePin, pinned: boolean) => {
    const pins = pinsRef.current
    const wasPinned = pins.size > 0
    if (pinned) pins.add(source)
    else pins.delete(source)
    const isPinned = pins.size > 0

    if (!wasPinned && isPinned) {
      const deadline = deadlineRef.current
      if (deadline !== null) remainingRef.current = Math.max(0, deadline - Date.now())
      clearDiscoveryTimer()
      updateVisible(true)
      return
    }

    if (wasPinned && !isPinned && discoveryStartedRef.current) {
      startDiscoveryTimer(remainingRef.current)
    }
  }, [clearDiscoveryTimer, startDiscoveryTimer, updateVisible])

  useEffect(() => {
    const becameReadable = !readableRef.current && readable
    readableRef.current = readable
    if (becameReadable && !discoveryStartedRef.current) {
      discoveryStartedRef.current = true
      remainingRef.current = MUSHAF_CHROME_DISCOVERY_MS
      updateVisible(true)
      if (pinsRef.current.size === 0) startDiscoveryTimer(MUSHAF_CHROME_DISCOVERY_MS)
      return
    }

    // React StrictMode replays effect cleanup and setup without ending the
    // mounted route session. Restore the same remaining one-shot timer after
    // that replay; ordinary rerenders do not rerun this readable-keyed effect.
    if (readable
      && discoveryStartedRef.current
      && timerRef.current === null
      && remainingRef.current > 0
      && pinsRef.current.size === 0) {
      startDiscoveryTimer(remainingRef.current)
    }
  }, [readable, startDiscoveryTimer, updateVisible])

  useEffect(() => clearDiscoveryTimer, [clearDiscoveryTimer])

  return { hide, reveal, setPinned, toggle, visible }
}
