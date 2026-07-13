import {
  Component,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
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
import { mushafImagePlacement } from './mushaf-page-framing'
import { IconButton } from '../ui'
import type { MushafViewMode } from './MushafModeControl'
import { useMushafPageGesture } from './useMushafPageGesture'
import { useReaderInteractionSuspended } from './ReaderInteractionContext'

const EDGE_TAP_RATIO = 0.3
const SCROLL_LINE_PX = 48

export type MushafPageViewerProps = {
  adjacentPages?: {
    next?: MushafPreviewPage | null
    previous?: MushafPreviewPage | null
  }
  bookmarked?: boolean
  chromeVisible?: boolean
  fitWidth?: boolean
  framingValue?: number
  inlineSvg: ReactInlineMushafSvg
  onDominantPageChange?: (page: number) => void
  onNavigate?: (page: number) => void
  onRequestPage?: (page: number) => void
  onToggleChrome?: (visible: boolean) => void
  onToggleBookmark?: () => void
  pages?: readonly MushafPageWindowEntry[]
  retainedPage?: MushafReadyPageAssetState
  resolved: MushafResolvedPage
  surahLabel?: string
  viewMode?: MushafViewMode
}

export type MushafPreviewPage = {
  inlineSvg: ReactInlineMushafSvg
  resolved: MushafResolvedPage
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

type MushafScrollWindowProps = {
  entries: readonly MushafPageWindowEntry[]
  framingValue: number
  onBeforeWindowShift: (previousFirstPage: number, nextFirstPage: number) => void
  onCellRef: (page: number, node: HTMLDivElement | null) => void
}

/**
 * Captures a window shift before React mutates the stack's direct children.
 * A layout-effect correction is too late for a MutationObserver (and can make
 * a fast wheel burst visibly jump), while this lifecycle runs before the
 * leading page is removed or inserted.
 */
class MushafScrollWindow extends Component<MushafScrollWindowProps> {
  getSnapshotBeforeUpdate(previous: Readonly<MushafScrollWindowProps>): null {
    const previousFirstPage = previous.entries[0]?.page
    const nextFirstPage = this.props.entries[0]?.page
    if (previousFirstPage && nextFirstPage && previousFirstPage !== nextFirstPage) {
      this.props.onBeforeWindowShift(previousFirstPage, nextFirstPage)
    }
    return null
  }

  componentDidUpdate(): void {}

  render(): ReactNode {
    const { entries, framingValue, onCellRef } = this.props
    return entries.map((entry) => (
      <MushafPageCell
        entry={entry}
        framingValue={framingValue}
        hidden={false}
        key={entry.page}
        ref={(node) => onCellRef(entry.page, node)}
      />
    ))
  }
}

export function MushafPageViewer({
  adjacentPages,
  bookmarked = false,
  chromeVisible = true,
  fitWidth = false,
  framingValue = 0,
  inlineSvg,
  onDominantPageChange,
  onNavigate,
  onRequestPage,
  onToggleBookmark,
  onToggleChrome,
  pages,
  retainedPage,
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
  const scrollInitializedRef = useRef(false)
  const isScrollModeRef = useRef(false)
  const restoreStageFocusRef = useRef(false)
  const interactionSuspended = useReaderInteractionSuspended()
  const sourceRatio = resolved.displaySize
    ? resolved.displaySize.width / resolved.displaySize.height
    : inlineSvg.viewBox.width / inlineSvg.viewBox.height
  const ratio = resolved.displaySize && resolved.framing
    ? mushafImagePlacement(resolved.displaySize, resolved.framing.textFrame, framingValue).ratio
    : sourceRatio
  const isScrollMode = viewMode === 'continuous'
  const effectivePages = useMemo(
    () => retainReadyMushafPage(
      pages ?? legacyPageEntries(adjacentPages, { inlineSvg, resolved }),
      retainedPage,
    ),
    [adjacentPages, inlineSvg, pages, resolved, retainedPage],
  )
  const orderedPages = useMemo(
    () => [...effectivePages].sort((left, right) => left.page - right.page),
    [effectivePages],
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
    if (readyEntry(effectivePages, page)) navigateTo(page)
    else onRequestPage?.(page)
  }

  const gesture = useMushafPageGesture({
    canNavigate: (direction) => direction === 'next'
      ? readyEntry(effectivePages, resolved.page + 1) !== null
      : readyEntry(effectivePages, resolved.page - 1) !== null,
    disabled: interactionSuspended || isScrollMode,
    onCommit: (direction) => navigateTo(resolved.page + (direction === 'next' ? 1 : -1)),
    onRequestDestination: (direction) => onRequestPage?.(resolved.page + (direction === 'next' ? 1 : -1)),
    stageRef,
  })

  const revealChrome = useCallback(() => {
    if (!chromeVisible) onToggleChrome?.(true)
  }, [chromeVisible, onToggleChrome])

  const setStageNode = useCallback((node: HTMLDivElement | null) => {
    const current = stageRef.current
    if (!node && current && document.activeElement === current) restoreStageFocusRef.current = true
    stageRef.current = node
  }, [])

  const reconcileDominantPage = useCallback(() => {
    if (!isScrollModeRef.current || !scrollInitializedRef.current || ignoreAdjustedScrollRef.current) return
    const measurement = measureDominantReadyPage(stageRef.current, cellRefs.current)
    if (!measurement) return
    anchorRef.current = { page: measurement.page, top: measurement.top }
    if (measurement.page === lastEmittedPageRef.current) return
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
    if (isScrollMode) return undefined
    const stage = stageRef.current
    if (stage && restoreStageFocusRef.current) {
      stage.focus({ preventScroll: true })
      restoreStageFocusRef.current = false
    }
    return undefined
  }, [isScrollMode, resolved.page])

  useLayoutEffect(() => {
    clampStageScroll(stageRef.current)
  }, [fitWidth])

  useLayoutEffect(() => {
    if (!isScrollMode) {
      anchorRef.current = null
      scrollInitializedRef.current = false
      return undefined
    }
    if (!scrollInitializedRef.current) {
      const stage = stageRef.current
      const requestedCell = readyEntry(effectivePages, resolved.page)
        ? cellRefs.current.get(resolved.page)
        : null
      if (!stage || !requestedCell) return undefined
      ignoreAdjustedScrollRef.current = true
      const stageTop = stage.getBoundingClientRect().top
      const requestedTop = requestedCell.getBoundingClientRect().top
      stage.scrollTop += requestedTop - stageTop
      scrollInitializedRef.current = true
      lastEmittedPageRef.current = resolved.page
      anchorRef.current = { page: resolved.page, top: 0 }
      window.requestAnimationFrame(() => {
        ignoreAdjustedScrollRef.current = false
        scheduleReconciliation()
      })
    }
    return undefined
  }, [effectivePages, isScrollMode, pageListKey, resolved.page, scheduleReconciliation])

  useLayoutEffect(() => {
    if (!isScrollMode || !scrollInitializedRef.current) return
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
    const entry = effectivePages.find((candidate) => candidate.page === page)
    if (entry) return entry
    if (page === resolved.page && pages === undefined) {
      return {
        asset: { media: { kind: 'inline-svg', inlineSvg }, resolved, status: 'ready' },
        loadPurpose: 'current',
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

  const preserveAnchorBeforeWindowShift = useCallback((previousFirstPage: number, nextFirstPage: number) => {
    if (!isScrollModeRef.current) return
    const anchor = anchorRef.current
    const stage = stageRef.current
    if (!anchor || !stage || !cellRefs.current.has(anchor.page)) return

    const firstCell = cellRefs.current.get(previousFirstPage)
    if (!firstCell) return
    const cells = [...cellRefs.current.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, cell]) => cell)
    const nextCell = cells[1]
    const firstRect = firstCell.getBoundingClientRect()
    const unitHeight = firstRect.height + (nextCell
      ? Math.max(0, nextCell.getBoundingClientRect().top - firstRect.bottom)
      : 0)
    if (unitHeight <= 0) return

    const shift = nextFirstPage - previousFirstPage
    const nextScrollTop = Math.max(0, stage.scrollTop - (shift * unitHeight))
    if (Math.abs(nextScrollTop - stage.scrollTop) < 0.01) return
    ignoreAdjustedScrollRef.current = true
    stage.scrollTop = nextScrollTop
    window.requestAnimationFrame(() => {
      ignoreAdjustedScrollRef.current = false
      scheduleReconciliation()
    })
  }, [scheduleReconciliation])

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
        key={isScrollMode ? 'scroll' : `single:${resolved.page}`}
        onClick={handleStageClick}
        onScroll={handleStageScroll}
        onScrollEnd={scheduleFinalReconciliation}
        ref={setStageNode}
        role={stageName ? 'region' : undefined}
        style={{ '--qa-react-mushaf-drag-x': `${gesture.dragX}px` } as CSSProperties}
        tabIndex={stageName ? 0 : undefined}
      >
        {isScrollMode ? (
          <div className="qar-react-mushaf-continuous-stack">
            <MushafScrollWindow
              entries={orderedPages}
              framingValue={framingValue}
              onBeforeWindowShift={preserveAnchorBeforeWindowShift}
              onCellRef={setCellRef}
            />
          </div>
        ) : (
          <div
            className="qar-react-mushaf-page-strip"
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && event.propertyName === 'transform') gesture.finishSettle()
            }}
          >
            <MushafPageCell entry={entryFor(resolved.page + 1)} framingValue={framingValue} hidden position="next" />
            <MushafPageCell entry={entryFor(resolved.page)} framingValue={framingValue} hidden={false} position="current" />
            <MushafPageCell entry={entryFor(resolved.page - 1)} framingValue={framingValue} hidden position="previous" />
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

export function retainReadyMushafPage(
  entries: readonly MushafPageWindowEntry[],
  retainedPage?: MushafReadyPageAssetState,
): readonly MushafPageWindowEntry[] {
  if (!retainedPage) return entries
  const retainedEntry: MushafPageWindowEntry = {
    asset: retainedPage,
    loadPurpose: 'current',
    page: retainedPage.resolved.page,
    status: 'ready',
  }
  const matchingIndex = entries.findIndex((entry) => entry.page === retainedEntry.page)
  if (matchingIndex < 0) return [...entries, retainedEntry]
  const matching = entries[matchingIndex]
  if (matching?.status === 'ready' && matching.asset === retainedPage && matching.loadPurpose === 'current') return entries
  return entries.map((entry, index) => index === matchingIndex ? retainedEntry : entry)
}

const MushafPageCell = ({
  entry,
  framingValue,
  hidden,
  position,
  ref,
}: {
  entry: MushafPageWindowEntry | null
  framingValue: number
  hidden: boolean
  position?: 'current' | 'next' | 'previous'
  ref?: (node: HTMLDivElement | null) => void
}) => {
  const media = entry?.status === 'ready' ? entryMedia(entry.asset) : null
  const frameRatio = entry?.status === 'ready' && media?.kind === 'external-image'
    ? mushafImagePlacement(media.source, entry.asset.resolved.framing?.textFrame, framingValue).ratio
    : undefined
  return <div
    aria-hidden={hidden ? true : undefined}
    className="qar-react-mushaf-page-cell"
    data-mushaf-cell={position}
    data-mushaf-cell-page={entry?.page}
    ref={ref}
    style={frameRatio ? { aspectRatio: String(frameRatio) } : undefined}
  >
    {entry?.status === 'ready' && media?.kind === 'inline-svg' ? (
      <div
        aria-label={pageAccessibleName(entry.asset)}
        className="qar-react-mushaf-page-fit qar:text-text"
        dangerouslySetInnerHTML={{ __html: media.inlineSvg.markup }}
        role="img"
      />
    ) : entry?.status === 'ready' && media?.kind === 'external-image' ? (
      <div aria-label={pageAccessibleName(entry.asset)} className="qar-react-mushaf-page-fit" role="img">
        <div className="qar-react-mushaf-page-frame" style={{ aspectRatio: String(mushafImagePlacement(media.source, entry.asset.resolved.framing?.textFrame, framingValue).ratio) }}>
          <img
            alt=""
            className="qar-react-mushaf-page-image"
            draggable={false}
            src={media.source.assetUrl}
            style={mushafImagePlacement(media.source, entry.asset.resolved.framing?.textFrame, framingValue).image}
          />
        </div>
      </div>
    ) : entry ? (
      <div aria-live="polite" className="qar-react-mushaf-page-status" role="status">
        {entry.status === 'loading'
          ? `Loading Mushaf page ${entry.page}`
          : `Mushaf page ${entry.page} is unavailable. Use page navigation to retry.`}
      </div>
    ) : null}
  </div>
}

function readyEntry(
  entries: readonly MushafPageWindowEntry[],
  page: number,
): MushafReadyPageAssetState | null {
  const entry = entries.find((candidate) => candidate.page === page)
  return entry?.status === 'ready' ? entry.asset : null
}

function legacyPageEntries(
  adjacentPages: MushafPageViewerProps['adjacentPages'],
  current: MushafPreviewPage,
): MushafPageWindowEntry[] {
  const legacyPages = [adjacentPages?.previous, current, adjacentPages?.next]
    .filter((page): page is MushafPreviewPage => Boolean(page))
  return [...new Map(legacyPages.map((page) => [page.resolved.page, page])).values()]
    .map((page): MushafPageWindowEntry => ({
      asset: { media: { kind: 'inline-svg', inlineSvg: page.inlineSvg }, resolved: page.resolved, status: 'ready' },
      loadPurpose: 'current',
      page: page.resolved.page,
      status: 'ready',
    }))
    .sort((left, right) => left.page - right.page)
}

function pageAccessibleName(asset: MushafReadyPageAssetState): string {
  const { resolved } = asset
  return `Mushaf page ${resolved.page}, ${resolved.riwayahLabel}, beginning near ${resolved.firstVerse.surah}:${resolved.firstVerse.verse}`
}

function entryMedia(asset: MushafReadyPageAssetState): NonNullable<MushafReadyPageAssetState['media']> {
  return asset.media
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
