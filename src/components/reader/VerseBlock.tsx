import { useState } from 'react'

import type { VerseMetadata } from '../../metadata/metadata-state'
import type { TranslationRole } from '../../data/reader-corpus'
import { pulseBookmarkLanding } from '../../continuity/bookmarks/pulse'
import { cn } from '../../design-system/utils/cn'
import { Button } from '../ui'
import { KnowledgeChips } from './KnowledgeChips'
import { TranslationFootnote } from './TranslationFootnote'
import { VerseNumber } from './VerseNumber'

export type VerseBlockProps = {
  arabic: string
  footnotes?: Record<string, string>
  metadata?: VerseMetadata | null
  onSelect?: () => void
  selected?: boolean
  translation?: string
  translationRole?: TranslationRole
  translationVisible?: boolean
  verseKey: string
  verse: number
  bookmarked?: boolean
  divided?: boolean
  onToggleBookmark?: () => void
  showBookmarkHint?: boolean
}

type TranslationToken = { type: 'text'; value: string } | { type: 'footnote'; marker: string }

const FOOTNOTE_RE = /\[(\d+)\]/g

function parseTranslationTokens(translation: string): TranslationToken[] {
  const tokens: TranslationToken[] = []
  let lastIndex = 0
  for (const match of translation.matchAll(FOOTNOTE_RE)) {
    const start = match.index ?? 0
    if (start > lastIndex) tokens.push({ type: 'text', value: translation.slice(lastIndex, start) })
    tokens.push({ type: 'footnote', marker: match[1] ?? '' })
    lastIndex = start + match[0].length
  }
  if (lastIndex < translation.length) tokens.push({ type: 'text', value: translation.slice(lastIndex) })
  return tokens
}

export function VerseBlock({
  arabic,
  bookmarked = false,
  divided = false,
  footnotes = {},
  metadata = null,
  onSelect,
  onToggleBookmark,
  selected = false,
  showBookmarkHint = false,
  translation,
  translationRole = 'identity',
  translationVisible = true,
  verse,
  verseKey,
}: VerseBlockProps) {
  const [openFootnote, setOpenFootnote] = useState<string | null>(null)
  const hasTranslation = translationVisible && translationRole !== 'none' && (translationRole === 'continuation' || Boolean(translation))
  const tokens = parseTranslationTokens(translation ?? '')
  const openFootnoteText = openFootnote ? footnotes[openFootnote] : null
  const footnotePanelId = openFootnote ? `fn-${verseKey}-${openFootnote}` : undefined
  function handleToggleBookmark() {
    if (!bookmarked && onToggleBookmark) pulseBookmarkLanding(verseKey)
    onToggleBookmark?.()
  }

  return (
    <article
      className={cn(
        'qar-reader-verse',
        divided && 'qar-reader-verse--divided',
        bookmarked && 'qar-reader-verse--bookmarked',
      )}
      data-selected={selected ? 'true' : 'false'}
      data-bookmarked={bookmarked ? 'true' : 'false'}
      data-testid={`verse-${verseKey}`}
      data-token-key={verseKey}
    >
      <div className="qar-reader-verse-head">
        <VerseNumber bookmarked={bookmarked} onSelect={onSelect} onToggleBookmark={handleToggleBookmark} verse={verse} />
        {showBookmarkHint && <span className="qar-reader-verse-bookmark-hint">tap to bookmark</span>}
      </div>
      <div className="qar-reader-verse-body">
        <p className="qar-reader-verse-arabic" data-reader-arabic-line="true" dir="rtl" lang="ar">
          {arabic}
        </p>
        {hasTranslation && translationRole === 'continuation' && (
          <p className="qar-reader-verse-translation qar-reader-verse-continuation" data-reader-translation="true" dir="ltr">
            ↑ continued from the previous Hafs-keyed verse
          </p>
        )}
        {hasTranslation && translationRole !== 'continuation' && (
          <p className="qar-reader-verse-translation" data-reader-translation="true" dir="ltr">
            {tokens.map((token, index) => (
              token.type === 'text'
                ? <span key={`${verseKey}-text-${index}`}>{token.value}</span>
                : (
                    <TranslationFootnote
                      controlsId={footnotes[token.marker] ? `fn-${verseKey}-${token.marker}` : undefined}
                      key={`${verseKey}-fn-${token.marker}`}
                      marker={token.marker}
                      onToggle={() => setOpenFootnote((value) => value === token.marker ? null : token.marker)}
                      open={openFootnote === token.marker}
                    />
                  )
            ))}
          </p>
        )}
        {translationVisible && openFootnote && openFootnoteText && (
          <div
            className="qar-reader-fn-panel"
            data-reader-footnote-panel="true"
            id={footnotePanelId}
            role="note"
          >
            <span className="qar-reader-fn-panel-number" aria-hidden="true">[{openFootnote}]</span>
            <span>{openFootnoteText}</span>
            <Button
              aria-label="Close footnote"
              className="qar-reader-fn-close"
              onClick={() => setOpenFootnote(null)}
              size="sm"
              variant="ghost"
            >
              ×
            </Button>
          </div>
        )}
        {selected && <KnowledgeChips metadata={metadata} />}
      </div>
    </article>
  )
}
