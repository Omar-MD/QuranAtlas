import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Bookmark } from 'lucide-react'

import type { MushafResolvedPage, ReactInlineMushafSvg } from '../../packs/mushaf-page-asset'
import { Button, IconButton } from '../ui'
import type { MushafViewMode } from './MushafModeControl'

export type MushafPageViewerProps = {
  adjacentPages?: {
    next?: MushafPreviewPage | null
    previous?: MushafPreviewPage | null
  }
  bookmarked?: boolean
  chromeVisible?: boolean
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
  const dragRef = useRef<{
    captureElement: HTMLElement
    dragging: boolean
    pointerId: number
    startX: number
    startY: number
    width: number
  } | null>(null)
  const suppressNextClickRef = useRef(false)
  const [dragState, setDragState] = useState({ active: false, deltaX: 0 })
  const ratio = inlineSvg.viewBox.width / inlineSvg.viewBox.height
  const stripStyle = {
    '--qa-react-mushaf-drag-x': `${dragState.deltaX}px`,
  } as CSSProperties

  function navigateTo(page: number) {
    const next = Math.min(resolved.pageCount, Math.max(1, page))
    if (next !== resolved.page) onNavigate?.(next)
  }

  function advance() {
    navigateTo(resolved.page + 1)
  }

  function returnPrevious() {
    navigateTo(resolved.page - 1)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.altKey || event.ctrlKey) return
      if (isEditableTarget(event.target)) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        advance()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        returnPrevious()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (viewMode !== 'continuous') return
    const currentCell = sectionRef.current?.querySelector<HTMLElement>('[data-mushaf-cell="current"]')
    const frame = window.requestAnimationFrame(() => {
      currentCell?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [resolved.page, viewMode])

  useEffect(() => {
    if (viewMode !== 'continuous') return undefined
    let frame = 0
    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const visiblePage = centeredContinuousPage(sectionRef.current)
        if (visiblePage && visiblePage !== resolved.page) navigateTo(visiblePage)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  })

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
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
      if (Math.abs(deltaX) < 10) return
      if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return
      drag.dragging = true
      setDragState({ active: true, deltaX: 0 })
    }
    event.preventDefault()
    const maxDrag = drag.width * 0.82
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
    const threshold = Math.max(72, drag.width * 0.18)
    const deltaX = dragState.deltaX
    suppressNextClickRef.current = true
    window.setTimeout(() => {
      suppressNextClickRef.current = false
    }, 0)
    setDragState({ active: false, deltaX: 0 })
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

  return (
    <section
      aria-label={`Mushaf page ${resolved.page}`}
      className="qar-react-mushaf-page-surface qar:bg-canvas qar:text-text"
      data-mushaf-dragging={dragState.active ? 'true' : 'false'}
      data-mushaf-transition-direction={transitionDirection}
      data-mushaf-view-mode={viewMode}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      ref={sectionRef}
    >
      <div
        className="qar-react-mushaf-page-stage"
        style={{ '--qa-react-mushaf-page-ratio': String(ratio) } as CSSProperties}
      >
        <div
          aria-label={`Mushaf page ${resolved.page}, ${resolved.riwayahLabel}, beginning near ${resolved.firstVerse.surah}:${resolved.firstVerse.verse}`}
          className="qar-react-mushaf-page-frame qar:text-text"
          data-mushaf-page={resolved.page}
          key={resolved.page}
          role="img"
        >
          {viewMode === 'continuous' ? (
            <div className="qar-react-mushaf-continuous-stack">
              {adjacentPages?.previous ? <MushafPageCell page={adjacentPages.previous} position="previous" /> : null}
              <MushafPageCell page={{ inlineSvg, resolved }} position="current" />
              {adjacentPages?.next ? <MushafPageCell page={adjacentPages.next} position="next" /> : null}
            </div>
          ) : (
            <div className="qar-react-mushaf-page-strip" style={stripStyle}>
              <MushafPageCell page={adjacentPages?.previous ?? null} position="previous" />
              <MushafPageCell page={{ inlineSvg, resolved }} position="current" />
              <MushafPageCell page={adjacentPages?.next ?? null} position="next" />
            </div>
          )}
        </div>
        <Button
          aria-label="Toggle reader chrome"
          aria-pressed={chromeVisible}
          className="qar-react-mushaf-center-toggle"
          onClick={handleZoneClick(() => onToggleChrome?.(!chromeVisible))}
          size="sm"
          type="button"
          variant="ghost"
        >
          <span className="qar:sr-only">Toggle reader chrome</span>
        </Button>
        <Button
          aria-label="Advance Mushaf page from left edge"
          className="qar-react-mushaf-edge qar-react-mushaf-edge--left"
          disabled={resolved.page >= resolved.pageCount}
          onClick={handleZoneClick(advance)}
          size="sm"
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
          type="button"
          variant="ghost"
        >
          <span className="qar:sr-only">Previous page</span>
        </Button>
      </div>
      <div className="qar-react-mushaf-page-counter" aria-label={`Mushaf page ${resolved.page} of ${resolved.pageCount}`}>
        {surahLabel ? <span className="qar-react-mushaf-page-surah">{surahLabel}</span> : null}
        {resolved.page} / {resolved.pageCount}
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

function MushafPageCell({
  page,
  position,
}: {
  page: MushafPreviewPage | null
  position: 'current' | 'next' | 'previous'
}) {
  return (
    <div
      aria-hidden={position === 'current' ? undefined : true}
      className="qar-react-mushaf-page-cell"
      data-mushaf-cell={position}
      data-mushaf-cell-page={page?.resolved.page}
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
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

function centeredContinuousPage(root: HTMLElement | null): number | null {
  if (!root) return null
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  if (!viewportHeight) return null
  const centerY = viewportHeight / 2
  let closest: { distance: number; page: number } | null = null
  for (const element of root.querySelectorAll<HTMLElement>('[data-mushaf-cell-page]')) {
    const page = Number(element.dataset.mushafCellPage)
    if (!Number.isInteger(page)) continue
    const rect = element.getBoundingClientRect()
    if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue
    const distance = rect.top <= centerY && rect.bottom >= centerY
      ? 0
      : Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY))
    if (!closest || distance < closest.distance) closest = { distance, page }
  }
  return closest?.page ?? null
}
