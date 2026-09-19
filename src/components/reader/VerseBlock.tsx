import { Bookmark, Copy } from 'lucide-react'
import { useState } from 'react'

import type { ReaderVerse } from '../../data/reader-corpus'
import { pulseBookmarkLanding } from '../../continuity/bookmarks/pulse'
import { cn } from '../../design-system/utils/cn'
import { Button, ChoiceButton, Status } from '../ui'
import { TranslationFootnote } from './TranslationFootnote'

export type VerseBlockProps = {
  continuationVerses?: ReaderVerse[]
  /** When present this verse is a passage primary: the covered range renders
      as one bracketed group with the numbering eyebrow (S2). */
  passageRange?: { from: number; to: number } | null
  /** Whether the shared numbering explainer is open for this passage (S2 a11y:
      the "Why?" eyebrow is a button with a live expanded state). */
  passageExplainerOpen?: boolean
  onOpenPassageExplainer?: (range: { from: number; to: number }) => void
  surahName: string
  verse: ReaderVerse
  bookmarked?: boolean
  onSelect?: () => void
  onToggleBookmark?: () => void
  onCopyReference?: () => void
  selected?: boolean
  translationVisible?: boolean
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
  bookmarked = false,
  continuationVerses = [],
  onOpenPassageExplainer,
  onSelect,
  onCopyReference,
  onToggleBookmark,
  passageRange = null,
  passageExplainerOpen = false,
  selected = false,
  surahName,
  translationVisible = true,
  verse,
}: VerseBlockProps) {
  const [copyError, setCopyError] = useState(false)
  const [copying, setCopying] = useState(false)
  const [openFootnote, setOpenFootnote] = useState<string | null>(null)
  const isPassage = passageRange != null && continuationVerses.length > 0
  const hasTranslation =
    translationVisible &&
    verse.translationRole !== 'none' &&
    verse.translationRole !== 'continuation' &&
    Boolean(verse.translation)
  const tokens = parseTranslationTokens(verse.translation ?? '')
  const openFootnoteText = openFootnote ? verse.footnotes[openFootnote] : null
  const footnotePanelId = openFootnote ? `fn-${verse.key}-${openFootnote}` : undefined

  function handleToggleBookmark() {
    if (!bookmarked && onToggleBookmark) pulseBookmarkLanding(verse.key)
    onToggleBookmark?.()
  }

  async function copyReference() {
    setCopyError(false)
    setCopying(true)
    const reference = isPassage
      ? `${surahName} ${verse.surah}:${passageRange?.from}–${passageRange?.to}`
      : `${surahName} ${verse.key}`
    const text = `${reference} — ${verse.translation ?? ''}`
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      onCopyReference?.()
    } catch {
      setCopyError(true)
    } finally {
      setCopying(false)
    }
  }

  return (
    <article
      aria-label={`${surahName} ${isPassage && passageRange ? `${passageRange.from} to ${passageRange.to}` : verse.verse}`}
      className={cn('qar-reader-verse', isPassage && 'qar-reader-verse--passage')}
      data-selected={selected ? 'true' : 'false'}
      data-bookmarked={bookmarked ? 'true' : 'false'}
      data-testid={`verse-${verse.key}`}
      data-token-key={verse.key}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: verse selection must be keyboard reachable without nesting buttons inside a button
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
          event.preventDefault()
          onSelect?.()
        }
      }}
    >
      <div className="qar-reader-verse-gutter">
        <span aria-hidden="true" className="qar-reader-verse-medallion">
          {verse.verse}
        </span>
      </div>
      <div className="qar-reader-verse-body">
        <p className="qar-reader-verse-arabic" data-reader-arabic-line="true" dir="rtl" lang="ar">
          {verse.arabic}
        </p>
        {isPassage
          ? continuationVerses.map((continuation) => (
              <p
                className="qar-reader-verse-arabic qar-reader-verse-continuation-line"
                data-token-key={continuation.key}
                data-reader-arabic-line="true"
                dir="rtl"
                key={continuation.key}
                lang="ar"
              >
                <span aria-hidden="true" className="qar-reader-verse-continuation-num">
                  {continuation.verse}
                </span>
                {continuation.arabic}
              </p>
            ))
          : null}
        {isPassage && passageRange ? (
          <ChoiceButton
            aria-expanded={passageExplainerOpen}
            aria-label={`Translation covers ${verse.surah}:${passageRange.from} to ${passageRange.to} — why?`}
            className="qar-reader-passage-label"
            data-testid={`passage-label-${verse.key}`}
            onClick={(event) => {
              event.stopPropagation()
              onOpenPassageExplainer?.(passageRange)
            }}
          >
            Translation covers {verse.surah}:{passageRange.from}–{passageRange.to} · Why?
          </ChoiceButton>
        ) : null}
        {hasTranslation && (
          <p className="qar-reader-verse-translation" data-reader-translation="true" dir="ltr">
            {tokens.map((token, index) =>
              token.type === 'text' ? (
                <span key={`${verse.key}-text-${index}`}>{token.value}</span>
              ) : (
                <TranslationFootnote
                  controlsId={verse.footnotes[token.marker] ? `fn-${verse.key}-${token.marker}` : undefined}
                  key={`${verse.key}-fn-${token.marker}`}
                  marker={token.marker}
                  onToggle={() => setOpenFootnote((value) => (value === token.marker ? null : token.marker))}
                  open={openFootnote === token.marker}
                />
              ),
            )}
          </p>
        )}
        {translationVisible &&
        !hasTranslation &&
        verse.translationRole !== 'continuation' &&
        verse.translationRole !== 'none' ? (
          <p className="qar-reader-verse-translation-offline" role="status">
            Translation unavailable offline
          </p>
        ) : null}
        {translationVisible && openFootnote && openFootnoteText && (
          <div className="qar-reader-fn-panel" data-reader-footnote-panel="true" id={footnotePanelId} role="note">
            <span className="qar-reader-fn-panel-number" aria-hidden="true">
              [{openFootnote}]
            </span>
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
        {selected ? (
          <div className="qar-reader-verse-actions" data-verse-actions="true">
            <Button
              onClick={(event) => {
                event.stopPropagation()
                handleToggleBookmark()
              }}
              size="sm"
              variant="secondary"
            >
              <Bookmark fill={bookmarked ? 'currentColor' : 'none'} size={14} strokeWidth={1.9} />
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </Button>
            <Button
              onClick={(event) => {
                event.stopPropagation()
                void copyReference()
              }}
              loading={copying}
              size="sm"
              variant="secondary"
            >
              <Copy aria-hidden="true" size={14} strokeWidth={1.9} />
              Copy reference
            </Button>
          </div>
        ) : null}
        {copyError ? (
          <Status
            title="Could not copy reference"
            description="Try copying again or select the text to copy."
            tone="error"
          />
        ) : null}
      </div>
    </article>
  )
}
