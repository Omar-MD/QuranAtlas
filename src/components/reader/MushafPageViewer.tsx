import { forwardRef, type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark } from 'lucide-react'

import type { MushafResolvedPage, ReactInlineMushafSvg } from '../../packs/mushaf-page-asset'
import { Button, IconButton } from '../ui'
import type { MushafViewMode } from './MushafModeControl'

const SCROLL_COOLDOWN_MS = 500
const WHEEL_THRESHOLD = 120
const SCROLL_BOUNDARY_EPSILON = 4

export type MushafPageViewerProps = {
  adjacentPages?: {
    next?: MushafPreviewPage | null
    previous?: MushafPreviewPage | null
  }
  bookmarked?: boolean
  chromeVisible?: boolean
  fitWidth?: boolean
  inlineSvg: ReactInlineMushafSvg
  onNavigate?: (page: number) => void
  onToggleChrome?: (visible: boolean) => void
  onToggleBookmark?: () => void
  onViewModeChange?: (mode: MushafViewMode) => void
  resolved: MushafResolvedPage
  surahLabel?: string
  transitionDirection?: 'next' | 'previous'
  viewMode?: MushafViewMode
}

export type MushafPreviewPage = {
  inlineSvg: ReactInlineMushafSvg
  resolved: MushafResolvedPage
}

export function MushafPageViewer({
  adjacentPages,
  bookmarked = false,
  chromeVisible = true,
  fitWidth = false,
  inlineSvg,
  onNavigate,
  onToggleBookmark,
  onToggleChrome,
  resolved,
  surahLabel,
  transitionDirection = 'next',
  viewMode = 'auto',
}: MushafPageViewerProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const currentCellRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    captureElement: HTMLElement
    dragging: boolean
    pointerId: number
    startX: number
    startY: number
    width: number
  } | null>(null)
  const suppressNextClickRef = useRef(false)
  const wheelCooldownRef = useRef(0)
  const wheelAccumRef = useRef(0)
  const scrollRouteCooldownRef = useRef(0)
  const scrollPositioningRef = useRef(false)
  const [dragState, setDragState] = useState({ active: false, deltaX: 0 })
  const ratio = inlineSvg.viewBox.width / inlineSvg.viewBox.height
  const isScrollMode = viewMode === 'continuous'
  const isFitWidth = fitWidth
  const stripStyle = {
    '--qa-react-mushaf-drag-x': `${dragState.deltaX}px`,
  } as CSSProperties

  function navigateTo(page: number) {
    const next = Math.min(resolved.pageCount, Math.max(1, page))
    if (next !== resolved.page) {
      try {
        const el = sectionRef.current
        if (el) {
          const q = el.querySelector('.qar-react-mushaf-page-stage')
          if (q instanceof HTMLElement && typeof q.scrollTo === 'function') q.scrollTo(0, 0)
        }
      } catch {
        /* no-op */
      }
      onNavigate?.(next)
    }
  }

  const advance = useCallback(() => {
    navigateTo(resolved.page + 1)
  }, [resolved.page, resolved.pageCount, onNavigate])

  const returnPrevious = useCallback(() => {
    navigateTo(resolved.page - 1)
  }, [resolved.page, resolved.pageCount, onNavigate])

  const revealChrome = useCallback(() => {
    if (!chromeVisible) onToggleChrome?.(true)
  }, [chromeVisible, onToggleChrome])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.altKey || event.ctrlKey) return
      if (isEditableTarget(event.target)) return
      if (readerOverlayOpen()) return
      if (event.key === 'Escape') {
        if (!chromeVisible) {
          event.preventDefault()
          onToggleChrome?.(true)
        }
        return
      }
      if (isScrollMode) {
        const stage = stageRef.current
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          if (stage && canScrollDown(stage)) {
            stage.scrollBy({ behavior: 'smooth', top: stage.clientHeight * 0.82 })
          } else {
            advance()
          }
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          if (stage && canScrollUp(stage)) {
            stage.scrollBy({ behavior: 'smooth', top: -stage.clientHeight * 0.82 })
          } else {
            returnPrevious()
          }
        }
      } else {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          advance()
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          returnPrevious()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (!isScrollMode) return undefined
    const stage = stageRef.current
    const current = currentCellRef.current
    if (!stage || !current) return undefined
    const frame = window.requestAnimationFrame(() => {
      scrollPositioningRef.current = true
      stage.scrollTo({ behavior: 'auto', top: Math.max(0, current.offsetTop - 12) })
      window.requestAnimationFrame(() => {
        scrollPositioningRef.current = false
      })
    })
    return () => {
      scrollPositioningRef.current = false
      window.cancelAnimationFrame(frame)
    }
  }, [adjacentPages?.next?.resolved.page, adjacentPages?.previous?.resolved.page, isScrollMode, resolved.page])

  useEffect(() => {
    if (!isScrollMode) return undefined

    const stage = stageRef.current

    function onWheel(event: WheelEvent) {
      if (readerOverlayOpen()) return
      if (stage && event.target instanceof Node && !stage.contains(event.target)) return
      const now = Date.now()
      if (now - wheelCooldownRef.current < SCROLL_COOLDOWN_MS) return

      if (stage instanceof HTMLElement && stage.scrollHeight > stage.clientHeight) {
        const atBottom = !canScrollDown(stage)
        const atTop = !canScrollUp(stage)

        if (atBottom && event.deltaY > 0) {
          wheelAccumRef.current += event.deltaY
        } else if (atTop && event.deltaY < 0) {
          wheelAccumRef.current += event.deltaY
        } else {
          wheelAccumRef.current = 0
          return
        }
      } else {
        wheelAccumRef.current += event.deltaY
      }

      if (wheelAccumRef.current >= WHEEL_THRESHOLD) {
        wheelAccumRef.current = 0
        wheelCooldownRef.current = now
        advance()
      } else if (wheelAccumRef.current <= -WHEEL_THRESHOLD) {
        wheelAccumRef.current = 0
        wheelCooldownRef.current = now
        returnPrevious()
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      wheelAccumRef.current = 0
      wheelCooldownRef.current = 0
    }
  }, [advance, isScrollMode, returnPrevious])

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (readerOverlayOpen()) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (isScrollMode) return
    const captureElement = event.target instanceof HTMLElement
      ? event.target.closest('button') ?? event.currentTarget
      : event.currentTarget
    dragRef.current = {
      captureElement,
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: Math.max(1, event.currentTarget.getBoundingClientRect().width),
    }
    captureElement.setPointerCapture?.(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.dragging) {
      if (Math.abs(deltaX) < 5) return
      if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return
      drag.dragging = true
      setDragState({ active: true, deltaX: 0 })
    }
    event.preventDefault()
    const maxDrag = drag.width * 0.95
    setDragState({ active: true, deltaX: Math.max(-maxDrag, Math.min(maxDrag, deltaX)) })
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    drag.captureElement.releasePointerCapture?.(event.pointerId)
    if (!drag.dragging) {
      setDragState({ active: false, deltaX: 0 })
      return
    }
    suppressNextClickRef.current = true
    window.setTimeout(() => {
      suppressNextClickRef.current = false
    }, 0)
    setDragState({ active: false, deltaX: 0 })

    const threshold = Math.max(40, drag.width * 0.12)
    const deltaX = dragState.deltaX
    if (deltaX <= -threshold) advance()
    else if (deltaX >= threshold) returnPrevious()
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      setDragState({ active: false, deltaX: 0 })
    }
  }

  function handleZoneClick(action: () => void) {
    return (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressNextClickRef.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      action()
    }
  }

  function handleStageScroll() {
    if (!isScrollMode || scrollPositioningRef.current) return
    const stage = stageRef.current
    const current = currentCellRef.current
    if (!stage || !current) return
    const now = Date.now()
    if (now - scrollRouteCooldownRef.current < SCROLL_COOLDOWN_MS) return

    const viewportMidpoint = stage.scrollTop + (stage.clientHeight / 2)
    const currentMidpoint = current.offsetTop + (current.offsetHeight / 2)
    const movementThreshold = Math.max(32, current.offsetHeight * 0.55)

    if (adjacentPages?.next && viewportMidpoint > currentMidpoint + movementThreshold) {
      scrollRouteCooldownRef.current = now
      advance()
    } else if (adjacentPages?.previous && viewportMidpoint < currentMidpoint - movementThreshold) {
      scrollRouteCooldownRef.current = now
      returnPrevious()
    }
  }

  function handleStageClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!isScrollMode || suppressNextClickRef.current) return
    if (event.target instanceof HTMLElement && event.target.closest('button')) return
    onToggleChrome?.(!chromeVisible)
  }

  return (
    <section
      aria-label="Mushaf page viewer"
      className="qar-react-mushaf-page-surface qar:bg-canvas qar:text-text"
      data-mushaf-chrome-visible={chromeVisible ? 'true' : 'false'}
      data-mushaf-dragging={dragState.active ? 'true' : 'false'}
      data-mushaf-fit-width={isFitWidth ? 'true' : 'false'}
      data-mushaf-layout-mode={isScrollMode ? 'scroll' : 'single'}
      data-mushaf-transition-direction={transitionDirection}
      data-mushaf-view-mode={viewMode}
      onFocusCapture={revealChrome}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={sectionRef}
    >
      <div
        aria-label={isScrollMode ? 'Scrollable Mushaf pages' : undefined}
        className="qar-react-mushaf-page-stage"
        onClick={handleStageClick}
        onScroll={handleStageScroll}
        ref={stageRef}
        style={{
          '--qa-react-mushaf-page-ratio': String(ratio),
        } as CSSProperties}
        tabIndex={isScrollMode ? 0 : undefined}
      >
        <div
          aria-label={`Mushaf page ${resolved.page}, ${resolved.riwayahLabel}, beginning near ${resolved.firstVerse.surah}:${resolved.firstVerse.verse}`}
          className="qar-react-mushaf-page-frame qar:text-text"
          data-mushaf-page={resolved.page}
          key={resolved.page}
          role="img"
        >
          {isScrollMode ? (
            <div className="qar-react-mushaf-continuous-stack">
              {adjacentPages?.previous ? <MushafPageCell hidden={false} page={adjacentPages.previous} position="previous" /> : null}
              <MushafPageCell hidden={false} page={{ inlineSvg, resolved }} position="current" ref={currentCellRef} />
              {adjacentPages?.next ? <MushafPageCell hidden={false} page={adjacentPages.next} position="next" /> : null}
            </div>
          ) : (
            <div className="qar-react-mushaf-page-strip" style={stripStyle}>
              <MushafPageCell hidden page={adjacentPages?.previous ?? null} position="previous" />
              <MushafPageCell hidden={false} page={{ inlineSvg, resolved }} position="current" />
              <MushafPageCell hidden page={adjacentPages?.next ?? null} position="next" />
            </div>
          )}
        </div>
        <Button
          aria-label="Toggle reader chrome"
          aria-pressed={chromeVisible}
          className="qar-react-mushaf-center-toggle"
          onClick={handleZoneClick(() => onToggleChrome?.(!chromeVisible))}
          size="sm"
          tabIndex={-1}
          type="button"
          variant="ghost"
        >
          <span className="qar:sr-only">Toggle reader chrome</span>
        </Button>
        {!isScrollMode ? (
          <>
            <Button
              aria-label="Advance Mushaf page from left edge"
              className="qar-react-mushaf-edge qar-react-mushaf-edge--left"
              disabled={resolved.page >= resolved.pageCount}
              onClick={handleZoneClick(advance)}
              size="sm"
              tabIndex={-1}
              type="button"
              variant="ghost"
            >
              <span className="qar:sr-only">Next page</span>
            </Button>
            <Button
              aria-label="Return to previous Mushaf page from right edge"
              className="qar-react-mushaf-edge qar-react-mushaf-edge--right"
              disabled={resolved.page <= 1}
              onClick={handleZoneClick(returnPrevious)}
              size="sm"
              tabIndex={-1}
              type="button"
              variant="ghost"
            >
              <span className="qar:sr-only">Previous page</span>
            </Button>
          </>
        ) : null}
      </div>
      {surahLabel ? (
        <div className="qar-react-mushaf-page-surah" dir="rtl" lang="ar">
          {surahLabel}
        </div>
      ) : null}
      <div className="qar-react-mushaf-page-counter" aria-label={`Mushaf page ${resolved.page}`}>
        {resolved.page}
      </div>
      {onToggleBookmark ? (
        <IconButton
          aria-pressed={bookmarked}
          className="qar-react-mushaf-bookmark-toggle"
          label={bookmarked ? `Remove bookmark for Mushaf page ${resolved.page}` : `Bookmark Mushaf page ${resolved.page}`}
          onClick={onToggleBookmark}
        >
          <Bookmark aria-hidden="true" fill={bookmarked ? 'currentColor' : 'none'} size={17} strokeWidth={1.85} />
        </IconButton>
      ) : null}
    </section>
  )
}

const MushafPageCell = forwardRef<HTMLDivElement, {
  hidden: boolean
  page: MushafPreviewPage | null
  position: 'current' | 'next' | 'previous'
}>(function MushafPageCell({
  hidden,
  page,
  position,
}, ref) {
  return (
    <div
      aria-hidden={hidden ? true : undefined}
      className="qar-react-mushaf-page-cell"
      data-mushaf-cell={position}
      data-mushaf-cell-page={page?.resolved.page}
      ref={ref}
    >
      {page ? (
        <div
          className="qar-react-mushaf-page-fit"
          dangerouslySetInnerHTML={{ __html: page.inlineSvg.markup }}
        />
      ) : (
        <div className="qar-react-mushaf-page-fit qar-react-mushaf-page-fit--empty" />
      )}
    </div>
  )
})

function canScrollDown(element: HTMLElement): boolean {
  return element.scrollTop + element.clientHeight < element.scrollHeight - SCROLL_BOUNDARY_EPSILON
}

function canScrollUp(element: HTMLElement): boolean {
  return element.scrollTop > SCROLL_BOUNDARY_EPSILON
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

function readerOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"], .qar-react-nav-drawer-overlay, .qar-react-settings-backdrop'))
}
