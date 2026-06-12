const WIRD_PROGRESS_QUERY_KEY = 'wird'
const WIRD_PROGRESS_QUERY_VALUE = '1'

export function hasWirdProgressIntent(hash = currentHash()): boolean {
  const query = hash.split('?')[1]
  if (!query) return false
  return new URLSearchParams(query).get(WIRD_PROGRESS_QUERY_KEY) === WIRD_PROGRESS_QUERY_VALUE
}

export function withWirdProgressIntent(hash: string): string {
  const [routePath, query = ''] = hash.split('?')
  const params = new URLSearchParams(query)
  params.set(WIRD_PROGRESS_QUERY_KEY, WIRD_PROGRESS_QUERY_VALUE)
  const nextQuery = params.toString()
  return nextQuery ? `${routePath}?${nextQuery}` : routePath
}

function currentHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash
}
