import type { VerseMetadata } from '../../metadata/metadata-state'
import { KnowledgeChips } from './KnowledgeChips'
import { TranslationFootnote } from './TranslationFootnote'
import { VerseNumber } from './VerseNumber'

export type VerseBlockProps = {
  arabic: string
  metadata?: VerseMetadata | null
  translation?: string
  verseKey: string
  verse: number
}

export function VerseBlock({ arabic, metadata = null, translation, verse, verseKey }: VerseBlockProps) {
  return (
    <article
      className="qar:grid qar:gap-3 qar:border-b qar:border-border qar:px-5 qar:py-6"
      data-testid={`verse-${verseKey}`}
      data-token-key={verseKey}
    >
      <div className="qar:flex qar:items-start qar:justify-between qar:gap-4">
        <p className="qar:m-0 qar:flex-1 qar:text-right qar:font-arabic qar:text-3xl qar:leading-loose" dir="rtl" lang="ar">
          {arabic}
        </p>
        <VerseNumber verse={verse} />
      </div>
      {translation && (
        <p className="qar:m-0 qar:max-w-3xl qar:font-translation qar:text-base qar:leading-relaxed qar:text-muted">
          {translation} <TranslationFootnote marker="1" text="Footnotes disclose inline without changing the global translation setting." />
        </p>
      )}
      <KnowledgeChips metadata={metadata} />
    </article>
  )
}
