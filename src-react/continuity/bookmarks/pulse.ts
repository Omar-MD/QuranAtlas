export function createBookmarkPulseId(verseKey: string): string {
  return `bookmark-pulse-${verseKey.replace(':', '-')}`
}
