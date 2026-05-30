export const REACT_ROUTES = {
  home: '#/s/1',
  launch: '#/',
  onboarding: '#/onboarding',
  surah: (surah: number, ayah?: number) => ayah ? `#/s/${surah}/${ayah}` : `#/s/${surah}`,
  mushaf: (page: number) => `#/m/${page}`,
  surahs: '#/surahs',
  search: '#/search',
  bookmarks: '#/bookmarks',
  settings: '#/settings',
  assets: '#/assets',
  about: '#/about',
} as const

export function getInitialReactHash(hash = window.location.hash): string {
  return hash || REACT_ROUTES.launch
}

export type ReactRouteMatch =
  | { type: 'launch' }
  | { type: 'reader'; surah: number; ayah?: number }
  | { type: 'mushaf'; page: number }
  | { type: 'surahs' }
  | { type: 'bookmarks' }
  | { type: 'settings' }
  | { type: 'about' }
  | { type: 'onboarding' }
  | { type: 'unsupported' }

function clampPositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

export function matchReactRoute(hash = getInitialReactHash()): ReactRouteMatch {
  const normalized = hash || REACT_ROUTES.launch
  const routePath = normalized.split('?')[0] ?? normalized
  if (routePath === REACT_ROUTES.launch || routePath === '#') return { type: 'launch' }
  const surahMatch = /^#\/s\/(\d{1,3})(?:\/(\d{1,3}))?$/.exec(routePath)
  if (surahMatch) {
    return {
      type: 'reader',
      surah: Math.min(114, clampPositive(Number(surahMatch[1]), 1)),
      ayah: surahMatch[2] ? clampPositive(Number(surahMatch[2]), 1) : undefined,
    }
  }
  const mushafMatch = /^#\/m\/(\d{1,3})$/.exec(routePath)
  if (mushafMatch) return { type: 'mushaf', page: clampPositive(Number(mushafMatch[1]), 1) }
  if (routePath === REACT_ROUTES.surahs) return { type: 'surahs' }
  if (routePath === REACT_ROUTES.bookmarks) return { type: 'bookmarks' }
  if (routePath === REACT_ROUTES.search) return { type: 'unsupported' }
  if (routePath === REACT_ROUTES.settings) return { type: 'settings' }
  if (routePath === REACT_ROUTES.assets) return { type: 'settings' }
  if (routePath === REACT_ROUTES.about) return { type: 'about' }
  if (routePath === REACT_ROUTES.onboarding) return { type: 'onboarding' }
  return { type: 'unsupported' }
}
