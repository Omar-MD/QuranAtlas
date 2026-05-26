import { REACT_CACHE_PREFIX } from '../offline/cache-names'
import type { MushafPackIdentity } from './mushaf-paths'

export function reactMushafPackCacheName(identity: MushafPackIdentity & { version: string }): string {
  return `${REACT_CACHE_PREFIX}-mushaf-pages-${identity.riwayah}--${identity.mushafEditionId}--${identity.version}`
}

export function assertReactMushafCacheName(cacheName: string): void {
  const escapedPrefix = REACT_CACHE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`^${escapedPrefix}-mushaf-pages-(hafs|warsh|qaloon)--[a-z0-9]+(?:-[a-z0-9]+)*--v\\d+$`).test(cacheName)) {
    throw new Error(`React Mushaf cache names must include riwayah, edition, and version: ${cacheName}`)
  }
}
