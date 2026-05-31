import type { PackStatus } from '../pack-status'
import { SEARCH_PACKS_RUNTIME_PREFIX } from '../../../shared/search'

export type SearchPack = {
  id: string
  contentHash: string
  url: string
  status: PackStatus
}

export function createSearchPack(
  id = 'qa-search-core-hafs-v1',
  status: PackStatus = 'not-installed',
  contentHash = '000000000000',
): SearchPack {
  return { id, contentHash, status, url: `${SEARCH_PACKS_RUNTIME_PREFIX}${contentHash}/manifest.json` }
}
