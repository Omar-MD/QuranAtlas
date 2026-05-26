export type SavedPosition = { surah: number; verse: number }

const EXCLUDED = new Set(['#/onboarding', '#/settings', '#/assets', '#/search'])

export function isValidReaderHash(hash: string): boolean {
  return /^#\/s\/(?:[1-9]|[1-9]\d|10\d|11[0-4])(?:\/\d{1,3})?$/.test(hash)
    || /^#\/m\/(?:[1-9]\d{0,2})$/.test(hash)
    || hash === '#/surahs'
    || hash === '#/bookmarks'
    || hash === '#/about'
}

export function shouldPersistLastSurface(hash: string): boolean {
  return !EXCLUDED.has(hash) && isValidReaderHash(hash)
}

export function resolveLaunchRoute({
  currentPosition,
  lastSurface,
  onboardingComplete,
}: {
  currentPosition?: SavedPosition
  lastSurface?: string
  onboardingComplete: boolean
}): string {
  if (!onboardingComplete) return '#/onboarding'
  if (lastSurface && shouldPersistLastSurface(lastSurface)) return lastSurface
  if (currentPosition) return `#/s/${currentPosition.surah}/${currentPosition.verse}`
  return '#/s/1'
}
