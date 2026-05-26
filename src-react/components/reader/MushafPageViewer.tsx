import { type CSSProperties, useRef } from 'react'

import type { MushafResolvedPage, ReactInlineMushafSvg } from '../../packs/mushaf-page-asset'
import { Button } from '../ui'
import type { MushafViewMode } from './MushafModeControl'

export type MushafPageViewerProps = {
  inlineSvg: ReactInlineMushafSvg
  onNavigate?: (page: number) => void
  onViewModeChange?: (mode: MushafViewMode) => void
  resolved: MushafResolvedPage
  transitionDirection?: 'next' | 'previous'
  viewMode?: MushafViewMode
}

export function MushafPageViewer({
  inlineSvg,
  onNavigate,
  resolved,
  transitionDirection = 'next',
  viewMode = 'auto',
}: MushafPageViewerProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const ratio = inlineSvg.viewBox.width / inlineSvg.viewBox.height

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

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStart.current
    touchStart.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return
    if (deltaX < 0) advance()
    else returnPrevious()
  }

  return (
    <section
      aria-label={`Mushaf page ${resolved.page}`}
      className="qar-react-mushaf-page-surface qar:bg-canvas qar:text-text"
      data-mushaf-transition-direction={transitionDirection}
      data-mushaf-view-mode={viewMode}
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
          onTouchEnd={handleTouchEnd}
          onTouchStart={(event) => {
            const touch = event.touches[0]
            if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }
          }}
          role="img"
        >
          <div
            className="qar-react-mushaf-page-fit"
            dangerouslySetInnerHTML={{ __html: inlineSvg.markup }}
          />
        </div>
        <Button
          aria-label="Advance Mushaf page from left edge"
          className="qar-react-mushaf-edge qar-react-mushaf-edge--left"
          disabled={resolved.page >= resolved.pageCount}
          onClick={advance}
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
          onClick={returnPrevious}
          size="sm"
          type="button"
          variant="ghost"
        >
          <span className="qar:sr-only">Previous page</span>
        </Button>
      </div>
    </section>
  )
}
