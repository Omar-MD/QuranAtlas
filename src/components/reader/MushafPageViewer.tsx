import {
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'

import type { MushafPageWindowEntry } from '../../app/routes/read/useMushafPageWindow'
import type {
  MushafReadyPageAssetState,
  MushafResolvedPage,
  ReactInlineMushafSvg,
} from '../../packs/mushaf-page-asset'
import { IconButton } from '../ui'
import type { MushafViewMode } from './MushafModeControl'
import { useMushafPageGesture } from './useMushafPageGesture'
import { useReaderInteractionSuspended } from './ReaderInteractionContext'

const EDGE_TAP_RATIO = 0.3
const SCROLL_LINE_PX = 48

export type MushafPageViewerProps = {
  adjacentPages?: unknown
  bookmarked?: boolean
  chromeVisible?: boolean
  fitWidth?: boolean
  inlineSvg: ReactInlineMushafSvg
  onDominantPageChange?: (page: number) => void
  onNavigate?: (page: number) => void
  onRequestPage?: (page: number) => void
  onToggleChrome?: (visible: boolean) => void
  onToggleBookmark?: () => void
  pages?: readonly MushafPageWindowEntry[]
  resolved: MushafResolvedPage
  surahLabel?: string
  viewMode?: MushafViewMode
}

type ScrollAnchor = {
  page: number
  top: number
}

type VisiblePageMeasurement = {
  area: number
  centerDistance: number
  page: number
  top: number
}

export function MushafPageViewer({
  bookmarked = false,
  chromeVisible = true,
  fitWidth = false,
  inlineSvg,
  onDominantPageChange,
  onNavigate,
  onRequestPage,
  onToggleBookmark,
  onToggleChrome,
  pages = [],
  resolved,
  surahLabel,
  viewMode = 'auto',
}: MushafPageViewerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const cellRefs = useRef(new Map<number, HTMLDivElement>())
  const anchorRef = useRef<ScrollAnchor | null>(null)
  const ignoreAdjustedScrollRef = useRef(false)
  const reconciliationFrameRef = useRef<number | null>(null)
  const finalFrameRef = useRef<number | null>(null)
  const lastEmittedPageRef = useRef(resolved.page)
  const isScrollModeRef = useRef(false)
  const interactionSuspended = useReaderInteractionSuspended()
  const ratio = inlineSvg.viewBox.width / inlineSvg.viewBox.height
  const isScrollMode = viewMode === 'continuous'
  const orderedPages = useMemo(
    () => [...pages].sort((left, right) => left.page - right.page),
    [pages],
  )
  const pageListKey = orderedPages
    .map((entry) => `${entry.page}:${entry.status}`)
    .join('|')
  isScrollModeRef.current = isScrollMode

  function navigateTo(page: number): void {
    if (page !== resolved.page) onNavigate?.(page)
  }

  function requestOrNavigate(page: number): void {
    if (page < 1 || page > resolved.pageCount) return
    if (readyEntry(pages, page)) navigateTo(page)
    else onRequestPage?.(page)
  }

  const gesture = useMushafPageGesture({
    canNavigate: (direction) => direction === 'next'
      ? readyEntry(pages, resolved.page + 1) !== null
      : readyEntry(pages, resolved.page - 1) !== null,
    disabled: interactionSuspended || isScrollMode,
    onCommit: (direction) => navigateTo(resolved.page + (direction === 'next' ? 1 : -1)),
    onRequestDestination: (direction) => onRequestPage?.(resolved.page + (direction === 'next' ? 1 : -1)),
    stageRef,
  })

  const revealChrome = useCallback(() => {
    if (!chromeVisible) onToggleChrome?.(true)
  }, [chromeVisible, onToggleChrome])

  const reconcileDominantPage = useCallback(() => {
    if (!isScrollModeRef.current || ignoreAdjustedScrollRef.current) return
    const measurement = measureDominantReadyPage(stageRef.current, cellRefs.current)
    if (!measurement || measurement.page === lastEmittedPageRef.current) return
    lastEmittedPageRef.current = measurement.page
    onDominantPageChange?.(measurement.page)
  }, [onDominantPageChange])

  const scheduleReconciliation = useCallback(() => {
    if (reconciliationFrameRef.current !== null) return
    reconciliationFrameRef.current = window.requestAnimationFrame(() => {
      reconciliationFrameRef.current = null
      reconcileDominantPage()
    })
  }, [reconcileDominantPage])

  const scheduleFinalReconciliation = useCallback(() => {
    if (finalFrameRef.current !== null) window.cancelAnimationFrame(finalFrameRef.current)
    finalFrameRef.current = window.requestAnimationFrame(() => {
      finalFrameRef.current = window.requestAnimationFrame(() => {
        finalFrameRef.current = null
        reconcileDominantPage()
      })
    })
  }, [reconcileDominantPage])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || event.metaKey || event.altKey || event.ctrlKey) return
      if (interactionSuspended || isEditableTarget(event.target)) return
      if (event.key === 'Escape') {
        if (!chromeVisible) {
          event.preventDefault()
          onToggleChrome?.(true)
        }
        return
      }
      if (!isScrollMode && event.key === 'ArrowLeft') {
        event.preventDefault()
        requestOrNavigate(resolved.page + 1)
        return
      }
      if (!isScrollMode && event.key === 'ArrowRight') {
        event.preventDefault()
        requestOrNavigate(resolved.page - 1)
        return
      }
      if (isScrollMode || fitWidth) scrollStageForKey(event, stageRef.current)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useLayoutEffect(() => {
    if (!isScrollModeRef.current && stageRef.current) stageRef.current.scrollTop = 0
  }, [resolved.page])

  useLayoutEffect(() => {
    clampStageScroll(stageRef.current)
  }, [fitWidth])

  useLayoutEffect(() => {
    if (!isScrollMode) {
      anchorRef.current = null
      return undefined
    }
    const anchor = anchorRef.current
    const stage = stageRef.current
    const cell = anchor ? cellRefs.current.get(anchor.page) : null
    if (anchor && stage && cell) {
      const nextTop = cell.getBoundingClientRect().top - stage.getBoundingClientRect().top
      const delta = nextTop - anchor.top
      if (delta !== 0) {
        ignoreAdjustedScrollRef.current = true
        stage.scrollTop += delta
        window.requestAnimationFrame(() => {
          ignoreAdjustedScrollRef.current = false
          scheduleReconciliation()
        })
      }
    }
    anchorRef.current = null
    return () => {
      const measurement = measureDominantReadyPage(stageRef.current, cellRefs.current, true)
      anchorRef.current = measurement ? { page: measurement.page, top: measurement.top } : null
    }
  }, [isScrollMode, pageListKey, scheduleReconciliation])

  useEffect(() => {
    lastEmittedPageRef.current = resolved.page
  }, [resolved.page])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => {
      clampStageScroll(stage)
      scheduleReconciliation()
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [scheduleReconciliation])

  useEffect(() => () => {
    if (reconciliationFrameRef.current !== null) window.cancelAnimationFrame(reconciliationFrameRef.current)
    if (finalFrameRef.current !== null) window.cancelAnimationFrame(finalFrameRef.current)
  }, [])

  function entryFor(page: number): MushafPageWindowEntry | null {
    const entry = pages.find((candidate) => candidate.page === page)
    if (entry) return entry
    if (page === resolved.page) {
      return {
        asset: { inlineSvg, resolved, status: 'ready' },
        page,
        status: 'ready',
      }
    }
    return null
  }

  function handleStageClick(event: ReactMouseEvent<HTMLDivElement>): void {
    if (gesture.shouldSuppressClick() || isInteractiveTarget(event.target)) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = (event.clientX - rect.left) / rect.width
    if (ratio < EDGE_TAP_RATIO) requestOrNavigate(resolved.page + 1)
    else if (ratio > 1 - EDGE_TAP_RATIO) requestOrNavigate(resolved.page - 1)
    else onToggleChrome?.(!chromeVisible)
  }

  function handleStageScroll(): void {
    if (!isScrollMode || ignoreAdjustedScrollRef.current) return
    scheduleReconciliation()
    scheduleFinalReconciliation()
  }

  function setCellRef(page: number, node: HTMLDivElement | null): void {
    if (node) cellRefs.current.set(page, node)
    else cellRefs.current.delete(page)
  }

  const stageName = fitWidth || isScrollMode ? 'Scrollable Mushaf pages' : undefined

  return (
    <section
      aria-label="Mushaf page viewer"
      className="qar-react-mushaf-page-surface qar:bg-canvas qar:text-text"
      data-mushaf-chrome-visible={chromeVisible ? 'true' : 'false'}
      data-mushaf-fit-width={fitWidth ? 'true' : 'false'}
      data-mushaf-layout-mode={isScrollMode ? 'scroll' : 'single'}
      data-mushaf-view-mode={viewMode}
      onFocusCapture={revealChrome}
      style={{
        '--qa-react-mushaf-page-ratio': String(ratio),
      } as CSSProperties}
    >
      <div
        {...gesture.stageHandlers}
        aria-label={stageName}
        className="qar-react-mushaf-page-stage"
        data-mushaf-gesture-phase={gesture.phase}
        onClick={handleStageClick}
        onScroll={handleStageScroll}
        onScrollEnd={scheduleFinalReconciliation}
        ref={stageRef}
        role={stageName ? 'region' : undefined}
        style={{ '--qa-react-mushaf-drag-x': `${gesture.dragX}px` } as CSSProperties}
        tabIndex={stageName ? 0 : undefined}
      >
        {isScrollMode ? (
          <div className="qar-react-mushaf-continuous-stack">
            {orderedPages.map((entry) => (
              <MushafPageCell
                entry={entry}
                hidden={false}
                key={entry.page}
                ref={(node) => setCellRef(entry.page, node)}
              />
            ))}
          </div>
        ) : (
          <div className="qar-react-mushaf-page-strip" onTransitionEnd={gesture.finishSettle}>
            <MushafPageCell entry={entryFor(resolved.page + 1)} hidden position="next" />
            <MushafPageCell entry={entryFor(resolved.page)} hidden={false} position="current" />
            <MushafPageCell entry={entryFor(resolved.page - 1)} hidden position="previous" />
          </div>
        )}
      </div>
      {surahLabel ? (
        <div className="qar-react-mushaf-page-surah" dir="rtl" lang="ar">
          {surahLabel}
        </div>
      ) : null}
      {chromeVisible ? (
        <nav aria-label="Mushaf page navigation" className="qar-react-mushaf-page-actions">
          <IconButton
            disabled={resolved.page >= resolved.pageCount}
            label="Next Mushaf page"
            onClick={() => requestOrNavigate(resolved.page + 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </IconButton>
          <div aria-label={`Mushaf page ${resolved.page}`} className="qar-react-mushaf-page-counter">
            {resolved.page}
          </div>
          <IconButton
            disabled={resolved.page <= 1}
            label="Previous Mushaf page"
            onClick={() => requestOrNavigate(resolved.page - 1)}
          >
            <ChevronRight aria-hidden="true" />
          </IconButton>
        </nav>
      ) : null}
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

const MushafPageCell = ({
  entry,
  hidden,
  position,
  ref,
}: {
  entry: MushafPageWindowEntry | null
  hidden: boolean
  position?: 'current' | 'next' | 'previous'
  ref?: (node: HTMLDivElement | null) => void
}) => (
  <div
    aria-hidden={hidden ? true : undefined}
    className="qar-react-mushaf-page-cell"
    data-mushaf-cell={position}
    data-mushaf-cell-page={entry?.page}
    ref={ref}
  >
    {entry?.status === 'ready' ? (
      <div
        aria-label={pageAccessibleName(entry.asset)}
        className="qar-react-mushaf-page-fit qar:text-text"
        dangerouslySetInnerHTML={{ __html: entry.asset.inlineSvg.markup }}
        role="img"
      />
    ) : entry ? (
      <div aria-live="polite" className="qar-react-mushaf-page-status" role="status">
        {entry.status === 'loading'
          ? `Loading Mushaf page ${entry.page}`
          : `Mushaf page ${entry.page} is unavailable. Use page navigation to retry.`}
      </div>
    ) : null}
  </div>
)

function readyEntry(
  entries: readonly MushafPageWindowEntry[],
  page: number,
): MushafReadyPageAssetState | null {
  const entry = entries.find((candidate) => candidate.page === page)
  return entry?.status === 'ready' ? entry.asset : null
}

function pageAccessibleName(asset: MushafReadyPageAssetState): string {
  const { resolved } = asset
  return `Mushaf page ${resolved.page}, ${resolved.riwayahLabel}, beginning near ${resolved.firstVerse.surah}:${resolved.firstVerse.verse}`
}

function measureDominantReadyPage(
  stage: HTMLElement | null,
  cells: ReadonlyMap<number, HTMLDivElement>,
  includeNearest = false,
): VisiblePageMeasurement | null {
  if (!stage) return null
  const stageRect = stage.getBoundingClientRect()
  const stageCenter = stageRect.top + (stageRect.height / 2)
  let best: VisiblePageMeasurement | null = null
  for (const [page, cell] of cells) {
    if (!cell.querySelector('[role="img"]')) continue
    const rect = cell.getBoundingClientRect()
    const visibleWidth = Math.max(0, Math.min(rect.right, stageRect.right) - Math.max(rect.left, stageRect.left))
    const visibleHeight = Math.max(0, Math.min(rect.bottom, stageRect.bottom) - Math.max(rect.top, stageRect.top))
    const area = visibleWidth * visibleHeight
    if (!includeNearest && area === 0) continue
    const centerDistance = Math.abs((rect.top + (rect.height / 2)) - stageCenter)
    const measurement = { area, centerDistance, page, top: rect.top - stageRect.top }
    if (!best || area > best.area || (area === best.area && centerDistance < best.centerDistance)) best = measurement
  }
  return best
}

function clampStageScroll(stage: HTMLElement | null): void {
  if (!stage) return
  const maximum = Math.max(0, stage.scrollHeight - stage.clientHeight)
  stage.scrollTop = Math.min(maximum, Math.max(0, stage.scrollTop))
}

function scrollStageForKey(event: KeyboardEvent, stage: HTMLElement | null): void {
  if (!stage) return
  const pageDistance = stage.clientHeight * 0.82
  let top: number | null = null
  if (event.key === 'ArrowDown') top = stage.scrollTop + SCROLL_LINE_PX
  else if (event.key === 'ArrowUp') top = stage.scrollTop - SCROLL_LINE_PX
  else if (event.key === 'PageDown') top = stage.scrollTop + pageDistance
  else if (event.key === 'PageUp') top = stage.scrollTop - pageDistance
  else if (event.key === 'Home') top = 0
  else if (event.key === 'End') top = stage.scrollHeight - stage.clientHeight
  if (top === null) return
  event.preventDefault()
  stage.scrollTop = Math.max(0, top)
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('a, button, input, select, textarea, summary, label, [contenteditable="true"], [role="button"], [role="link"], [role="menuitem"], [role="option"], [role="tab"]') !== null
}
