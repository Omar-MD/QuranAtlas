import { Bookmark, ChevronDown, Menu, Settings } from 'lucide-react'
import type { ReactNode } from 'react'

import { ChoiceButton, IconButton } from '../ui'
import { ReadingViewToggle } from './ReadingViewToggle'

export type ReaderMode = 'verse' | 'mushaf'

export type ReaderPositionBookmark = {
  saved: boolean
  label: string
  onToggle: () => void
}

// Reader chrome bar (brief §4.9): menu · surah selector (title button, S5) ·
// Verses/Mushaf labelled segmented (desktop) · position bookmark · settings.
// The Bookmark glyph toggles the reading position — never a Bookmarks
// destination (that lives in the navigation drawer with its count badge).
export function ReaderChrome({
  mode,
  onOpenNavigation,
  onOpenSelector,
  onOpenSettings,
  onModeChange,
  positionBookmark,
  surahName,
  visible = true,
  verseRange,
  wirdStatus,
}: {
  mode: ReaderMode
  onOpenNavigation?: () => void
  onOpenSelector?: () => void
  onOpenSettings?: () => void
  onModeChange?: (mode: ReaderMode) => void
  positionBookmark?: ReaderPositionBookmark
  surahName?: string
  visible?: boolean
  verseRange?: string
  wirdStatus?: ReactNode
}) {
  return (
    <nav
      aria-label="Primary navigation"
      aria-hidden={!visible}
      className={`qar-reader-chrome${visible ? '' : ' qar-reader-chrome--hidden'}`}
      inert={!visible ? true : undefined}
    >
      <div className="qar-reader-chrome-left">
        <IconButton
          className="qar-reader-chrome-icon"
          id="reader-navigation-trigger"
          label="Open navigation"
          onClick={onOpenNavigation}
        >
          <Menu aria-hidden="true" size={22} strokeWidth={1.7} />
        </IconButton>
      </div>
      {surahName ? (
        <ChoiceButton
          className="qar-reader-chrome-title"
          id="reader-surah-selector-trigger"
          lang="en"
          onClick={onOpenSelector}
        >
          <span className="qar:overflow-hidden qar:text-ellipsis">
            {surahName}
            {verseRange ? (
              <>
                {' '}
                <span className="qar-reader-chrome-title-range">· {verseRange}</span>
              </>
            ) : null}
          </span>
          {/* S5/D2: the accessible name extends the visible label with the
              selector purpose — never a bare aria-label. */}
          <span className="qar:sr-only">— Choose surah</span>
          <ChevronDown aria-hidden="true" className="qar:text-muted" size={14} strokeWidth={2} />
        </ChoiceButton>
      ) : null}
      <div className="qar-reader-chrome-right">
        {wirdStatus}
        {onModeChange ? (
          <span className="qar-reader-chrome-view-toggle">
            <ReadingViewToggle compact mode={mode} onModeChange={onModeChange} />
          </span>
        ) : null}
        {positionBookmark ? (
          <IconButton
            aria-pressed={positionBookmark.saved}
            className="qar-reader-chrome-icon"
            label={positionBookmark.label}
            onClick={positionBookmark.onToggle}
          >
            <Bookmark
              aria-hidden="true"
              fill={positionBookmark.saved ? 'currentColor' : 'none'}
              size={20}
              strokeWidth={1.7}
            />
          </IconButton>
        ) : null}
        <IconButton
          className="qar-reader-chrome-icon"
          id="reader-settings-trigger"
          label="Open settings"
          onClick={onOpenSettings}
        >
          <Settings aria-hidden="true" size={22} strokeWidth={1.6} />
        </IconButton>
      </div>
    </nav>
  )
}
