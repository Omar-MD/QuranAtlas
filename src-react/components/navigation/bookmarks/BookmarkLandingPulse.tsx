import { createBookmarkPulseId } from '../../../continuity/bookmarks/pulse'

export function BookmarkLandingPulse({ verseKey }: { verseKey: string }) {
  return <span className="qar:text-sm qar:text-muted" id={createBookmarkPulseId(verseKey)}>Bookmark landing {verseKey}</span>
}
