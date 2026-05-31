import {
  SEARCH_PACK_REGISTRY_RUNTIME_URL,
  assertSearchPackRegistry,
  type SearchPackRegistry,
} from '../../../shared/search'

export async function fetchSearchPackRegistry(fetcher: typeof fetch = fetch): Promise<SearchPackRegistry> {
  const response = await fetcher(SEARCH_PACK_REGISTRY_RUNTIME_URL)
  if (!response.ok) throw new Error('failed to fetch Search pack registry')
  const registry = await response.json() as SearchPackRegistry
  assertSearchPackRegistry(registry)
  return registry
}

export function selectCompatibleSearchPack(
  registry: SearchPackRegistry,
  appVersion = '0.0.0',
  workerVersion = '1.0.0',
) {
  return registry.packs.find((pack) =>
    compareVersion(appVersion, pack.minAppVersion) >= 0
    && compareVersion(workerVersion, pack.minWorkerVersion) >= 0
  ) ?? null
}

export function assertSearchRegistryRuntimeUrl(url: string): void {
  if (url !== SEARCH_PACK_REGISTRY_RUNTIME_URL) {
    throw new Error('Search registry must be fetched from /search-packs/registry.json')
  }
}

function compareVersion(left: string, right: string): number {
  const a = left.split('.').map(Number)
  const b = right.split('.').map(Number)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}
