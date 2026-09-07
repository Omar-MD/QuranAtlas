import { useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react'

export const SWIPE_REVEAL_PX = 76
export const SWIPE_SNAP_THRESHOLD_PX = 38
export const SWIPE_VELOCITY_SNAP = 0.45
export const SWIPE_AXIS_LOCK_PX = 8
export const SWIPE_SUPPRESS_CLICK_MS = 600

type SwipePoint = { x: number; y: number }
type TouchStart = { key: string; t: number; x: number; y: number }

export function useSwipeToDelete() {
  const [openSwipeKey, setOpenSwipeKey] = useState<string | null>(null)
  const [activeSwipe, setActiveSwipe] = useState<{ dx: number; key: string } | null>(null)
  const touchStartRef = useRef<TouchStart | null>(null)
  const activeSwipeDxRef = useRef(0)
  const scrollAxisRef = useRef<'horizontal' | 'vertical' | null>(null)
  const suppressClickRef = useRef<{ at: number; key: string } | null>(null)

  function rowBaseDx(key: string): number {
    return openSwipeKey === key ? -SWIPE_REVEAL_PX : 0
  }

  function beginSwipe(point: SwipePoint, key: string): void {
    if (openSwipeKey && openSwipeKey !== key) setOpenSwipeKey(null)
    const restingDx = rowBaseDx(key)
    touchStartRef.current = { key, t: performance.now(), x: point.x, y: point.y }
    activeSwipeDxRef.current = restingDx
    scrollAxisRef.current = null
    setActiveSwipe({ dx: restingDx, key })
  }

  function moveSwipe(point: SwipePoint, key: string): 'horizontal' | 'vertical' | null {
    const start = touchStartRef.current
    if (!start || start.key !== key) return null
    const dx = point.x - start.x
    const dy = point.y - start.y
    const axis =
      scrollAxisRef.current ??
      (Math.abs(dx) > SWIPE_AXIS_LOCK_PX || Math.abs(dy) > SWIPE_AXIS_LOCK_PX
        ? Math.abs(dx) > Math.abs(dy)
          ? 'horizontal'
          : 'vertical'
        : null)
    scrollAxisRef.current = axis
    if (axis !== 'horizontal') return axis
    const nextDx = rowBaseDx(key) + dx
    const clampedDx = Math.max(-SWIPE_REVEAL_PX * 1.18, Math.min(0, nextDx))
    activeSwipeDxRef.current = clampedDx
    setActiveSwipe({ dx: clampedDx, key })
    return axis
  }

  function endSwipe(point: SwipePoint | null, key: string): 'horizontal' | 'vertical' | null {
    const start = touchStartRef.current
    if (!start || start.key !== key) {
      touchStartRef.current = null
      setActiveSwipe(null)
      scrollAxisRef.current = null
      activeSwipeDxRef.current = 0
      return null
    }
    const axis = scrollAxisRef.current
    if (axis === 'horizontal') suppressClickRef.current = { at: Date.now(), key }
    if (point && axis === 'horizontal') {
      const dx = point.x - start.x
      const velocity = -dx / Math.max(1, performance.now() - start.t)
      setOpenSwipeKey(
        activeSwipeDxRef.current <= -SWIPE_SNAP_THRESHOLD_PX || velocity > SWIPE_VELOCITY_SNAP ? key : null,
      )
    }
    touchStartRef.current = null
    setActiveSwipe(null)
    scrollAxisRef.current = null
    activeSwipeDxRef.current = 0
    return axis
  }

  return {
    activeSwipe,
    closeSwipe: () => setOpenSwipeKey(null),
    deleteStyle: (key: string): CSSProperties | undefined =>
      activeSwipe?.key === key
        ? { opacity: Math.min(1, Math.abs(activeSwipe.dx) / SWIPE_REVEAL_PX), transition: 'none' }
        : undefined,
    handleClick: (key: string, onClick: () => void): void => {
      const suppressed = suppressClickRef.current
      if (suppressed?.key === key && Date.now() - suppressed.at < SWIPE_SUPPRESS_CLICK_MS) {
        suppressClickRef.current = null
        return
      }
      if (openSwipeKey === key) {
        setOpenSwipeKey(null)
        return
      }
      onClick()
    },
    isOpen: (key: string) => openSwipeKey === key,
    pointerDown: (event: PointerEvent<HTMLButtonElement>, key: string): void => {
      if (event.pointerType === 'touch' || event.button !== 0) return
      beginSwipe({ x: event.clientX, y: event.clientY }, key)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    pointerMove: (event: PointerEvent<HTMLButtonElement>, key: string): void => {
      if (event.pointerType === 'touch') return
      if (moveSwipe({ x: event.clientX, y: event.clientY }, key) === 'horizontal') {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    pointerUp: (event: PointerEvent<HTMLButtonElement>, key: string): void => {
      if (event.pointerType === 'touch') return
      if (endSwipe({ x: event.clientX, y: event.clientY }, key) === 'horizontal') {
        event.preventDefault()
        event.stopPropagation()
      }
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    },
    rowStyle: (key: string): CSSProperties | undefined =>
      activeSwipe?.key === key ? { transform: `translateX(${activeSwipe.dx}px)`, transition: 'none' } : undefined,
    touchEnd: (event: TouchEvent<HTMLButtonElement>, key: string): void => {
      const touch = event.changedTouches[0]
      if (endSwipe(touch ? { x: touch.clientX, y: touch.clientY } : null, key) === 'horizontal') event.stopPropagation()
    },
    touchMove: (event: TouchEvent<HTMLButtonElement>, key: string): void => {
      const touch = event.touches[0]
      if (touch && moveSwipe({ x: touch.clientX, y: touch.clientY }, key) === 'horizontal') event.stopPropagation()
    },
    touchStart: (event: TouchEvent<HTMLButtonElement>, key: string): void => {
      const touch = event.touches[0]
      if (touch) beginSwipe({ x: touch.clientX, y: touch.clientY }, key)
    },
  }
}
