import type { PackStatus } from '../pack-status'

export type SearchPack = {
  id: string
  url: string
  status: PackStatus
}

export function createSearchPack(id = 'baseline', status: PackStatus = 'not-installed'): SearchPack {
  return { id, status, url: `/dataset/search/${id}/index.json` }
}
