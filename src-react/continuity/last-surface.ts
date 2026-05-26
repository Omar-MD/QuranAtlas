import { shouldPersistLastSurface } from './launch-restore'
import type { QuranAtlasReactDb } from '../storage/db'

export function normalizeLastSurface(hash: string): string | null {
  return shouldPersistLastSurface(hash) ? hash : null
}

export async function writeLastSurface(db: QuranAtlasReactDb, hash: string): Promise<void> {
  const normalized = normalizeLastSurface(hash)
  if (!normalized) return
  await db.settings.put({ key: 'lastSurface', value: normalized })
}
