import { shouldPersistLastSurface } from './launch-restore'

export function normalizeLastSurface(hash: string): string | null {
  return shouldPersistLastSurface(hash) ? hash : null
}
