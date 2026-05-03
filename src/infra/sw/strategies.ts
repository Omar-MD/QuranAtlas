/**
 * Service-worker route registration. Pure data lives in `route-defs.ts`;
 * this module bridges the table to workbox at SW boot via `registerAll()`.
 *
 * SW-only: do not import from window-side code.
 */

import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, type Strategy } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { ROUTE_DEFS, type RouteDef } from './route-defs'

function buildStrategy(def: RouteDef, cacheName: string): Strategy {
  const plugins = [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({
      maxEntries: def.maxEntries,
      maxAgeSeconds: def.maxAgeDays * 24 * 60 * 60,
      ...(def.purgeOnQuotaError ? { purgeOnQuotaError: true } : {}),
    }),
  ]
  return def.strategy === 'NetworkFirst'
    ? new NetworkFirst({ cacheName, plugins })
    : new CacheFirst({ cacheName, plugins })
}

export function registerAll(): void {
  for (const def of ROUTE_DEFS) {
    if (typeof def.cacheName === 'string') {
      const strategy = buildStrategy(def, def.cacheName)
      registerRoute(def.match, strategy)
    } else {
      const cacheNameFn = def.cacheName
      registerRoute(def.match, async (args) => {
        const cacheName = cacheNameFn(args.url)
        const strategy = buildStrategy(def, cacheName)
        return strategy.handle(args)
      })
    }
  }
}
