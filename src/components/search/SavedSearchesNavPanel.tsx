import { useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react'

import { cn } from '../../design-system/utils/cn'
import type { SavedSearchRecord } from '../../storage/types'
import { Button } from '../ui'
import { modeLabel } from './search-labels'

type SwipePoint = { x: number; y: number }
type TouchStart = { key: string; t: number; x: number; y: number }

const REVEAL_PX = 76
const SNAP_THRESHOLD_PX = 38
const VELOCITY_SNAP = 0.45
const AXIS_LOCK_PX = 8
const SUPPRESS_CLICK_MS = 600

export function SavedSearchesNavPanel({
  lastDeleted,
  onDelete,
  onLoad,
  onUndoDelete,
  records,
}: {
  lastDeleted?: SavedSearchRecord | null
  onDelete: (id: string) => void
  onLoad: (record: SavedSearchRecord) => void
  onUndoDelete?: () => void
  records: SavedSearchRecord[]
}) {
  const [openSwipeKey, setOpenSwipeKey] = useState<string | null>(null)
  const [activeSwipe, setActiveSwipe] = useState<{ dx: number; key: string } | null>(null)
  const touchStartRef = useRef<TouchStart | null>(null)
  const activeSwipeDxRef = useRef(0)
  const scrollAxisRef = useRef<'horizontal' | 'vertical' | null>(null)
  const suppressClickRef = useRef<{ at: number; key: string } | null>(null)

  function loadSearch(record: SavedSearchRecord) {
    const suppressed = suppressClickRef.current
    if (suppressed?.key === record.id && Date.now() - suppressed.at < SUPPRESS_CLICK_MS) {
      suppressClickRef.current = null
      return
    }
    if (openSwipeKey === record.id) {
      setOpenSwipeKey(null)
      return
    }
    onLoad(record)
  }

  function rowBaseDx(key: string): number {
    return openSwipeKey === key ? -REVEAL_PX : 0
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
    const touchStart = touchStartRef.current
    if (!touchStart || touchStart.key !== key) return null
    const dx = point.x - touchStart.x
    const dy = point.y - touchStart.y
    const nextAxis = scrollAxisRef.current ?? ((Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX)
      ? Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      : null)

    if (nextAxis !== scrollAxisRef.current) {
      scrollAxisRef.current = nextAxis
    }
    if (nextAxis !== 'horizontal') return nextAxis

    const nextDx = rowBaseDx(key) + dx
    const clampedDx = Math.max(-REVEAL_PX * 1.18, Math.min(0, nextDx))
    activeSwipeDxRef.current = clampedDx
    setActiveSwipe({ dx: clampedDx, key })
    return nextAxis
  }

  function endSwipe(point: SwipePoint | null, key: string): 'horizontal' | 'vertical' | null {
    const touchStart = touchStartRef.current
    if (!touchStart || touchStart.key !== key) {
      touchStartRef.current = null
      setActiveSwipe(null)
      scrollAxisRef.current = null
      activeSwipeDxRef.current = 0
      return null
    }

    const wasHorizontal = scrollAxisRef.current === 'horizontal'
    if (wasHorizontal) {
      suppressClickRef.current = { at: Date.now(), key }
    }
    if (point && wasHorizontal) {
      const dx = point.x - touchStart.x
      const dt = Math.max(1, performance.now() - touchStart.t)
      const velocity = -dx / dt
      const activeDx = activeSwipeDxRef.current
      if (activeDx <= -SNAP_THRESHOLD_PX || velocity > VELOCITY_SNAP) {
        setOpenSwipeKey(key)
      } else {
        setOpenSwipeKey(null)
      }
    }
    touchStartRef.current = null
    setActiveSwipe(null)
    scrollAxisRef.current = null
    activeSwipeDxRef.current = 0
    return wasHorizontal ? 'horizontal' : scrollAxisRef.current
  }

  function onTouchStart(event: TouchEvent<HTMLButtonElement>, key: string): void {
    const touch = event.touches[0]
    if (!touch) return
    beginSwipe({ x: touch.clientX, y: touch.clientY }, key)
  }

  function onTouchMove(event: TouchEvent<HTMLButtonElement>, key: string): void {
    const touch = event.touches[0]
    if (!touch) return
    if (moveSwipe({ x: touch.clientX, y: touch.clientY }, key) === 'horizontal') {
      event.stopPropagation()
    }
  }

  function onTouchEnd(event: TouchEvent<HTMLButtonElement>, key: string): void {
    const touch = event.changedTouches[0]
    if (endSwipe(touch ? { x: touch.clientX, y: touch.clientY } : null, key) === 'horizontal') {
      event.stopPropagation()
    }
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, key: string): void {
    if (event.pointerType === 'touch') return
    if (event.button !== 0) return
    beginSwipe({ x: event.clientX, y: event.clientY }, key)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>, key: string): void {
    if (event.pointerType === 'touch') return
    if (moveSwipe({ x: event.clientX, y: event.clientY }, key) === 'horizontal') {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>, key: string): void {
    if (event.pointerType === 'touch') return
    if (endSwipe({ x: event.clientX, y: event.clientY }, key) === 'horizontal') {
      event.preventDefault()
      event.stopPropagation()
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  function rowStyle(key: string): CSSProperties | undefined {
    if (activeSwipe?.key !== key) return undefined
    return { transform: `translateX(${activeSwipe.dx}px)`, transition: 'none' }
  }

  function deleteStyle(key: string): CSSProperties | undefined {
    if (activeSwipe?.key !== key) return undefined
    return { opacity: Math.min(1, Math.abs(activeSwipe.dx) / REVEAL_PX), transition: 'none' }
  }

  return (
    <aside aria-label="Saved searches" className="qar-react-nav-drawer-saved-searches">
      <div className="qar-react-nav-drawer-saved-searches-head">
        <p className="qar-react-nav-drawer-saved-searches-kicker">Search</p>
        <h2 className="qar-react-nav-drawer-saved-searches-title">Saved searches</h2>
      </div>
      {lastDeleted ? (
        <div className="qar-react-nav-drawer-saved-searches-undo" role="status">
          <p>
            Deleted <bdi>{lastDeleted.intent.name}</bdi>
          </p>
          <Button disabled={!onUndoDelete} onClick={onUndoDelete} size="sm" type="button" variant="secondary">
            Undo
          </Button>
        </div>
      ) : null}
      {records.length === 0 ? (
        <p className="qar-react-nav-drawer-list-state" role="status">
          No saved searches yet.
        </p>
      ) : (
        <ul className="qar-react-nav-drawer-saved-searches-list">
          {records.map((record) => (
            <li
              className={cn('qar-react-nav-drawer-saved-searches-row', openSwipeKey === record.id && 'qar-react-nav-drawer-saved-searches-row--swiped')}
              key={record.id}
            >
              <Button
                aria-label={`Load saved search ${record.intent.name}`}
                className="qar-react-nav-drawer-saved-searches-row-btn"
                onClick={() => loadSearch(record)}
                onPointerDown={(event) => onPointerDown(event, record.id)}
                onPointerMove={(event) => onPointerMove(event, record.id)}
                onPointerUp={(event) => onPointerUp(event, record.id)}
                onTouchEnd={(event) => onTouchEnd(event, record.id)}
                onTouchMove={(event) => onTouchMove(event, record.id)}
                onTouchStart={(event) => onTouchStart(event, record.id)}
                style={rowStyle(record.id)}
                type="button"
                unstyled
              >
                <span className="qar-react-nav-drawer-saved-searches-mode">{modeLabel(record.intent.queryMode)}</span>
                <span className="qar-react-nav-drawer-saved-searches-copy" dir="auto">
                  <span className="qar-react-nav-drawer-saved-searches-name"><bdi>{record.intent.name}</bdi></span>
                  <span className="qar-react-nav-drawer-saved-searches-query"><bdi>{record.intent.queryText}</bdi></span>
                </span>
                <span className="qar-react-nav-drawer-saved-searches-chev" aria-hidden="true">›</span>
              </Button>
              <Button
                aria-label={`Delete saved search ${record.intent.name}`}
                className="qar-react-nav-drawer-saved-searches-row-del"
                onClick={() => {
                  setOpenSwipeKey(null)
                  onDelete(record.id)
                }}
                style={deleteStyle(record.id)}
                type="button"
                unstyled
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
