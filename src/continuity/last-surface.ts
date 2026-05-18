import { put } from '../core/db.js'
import { logger } from '../core/logger.js'

const SKIP_PERSIST_PREFIXES = ['#/onboarding', '#/settings', '#/assets']

export async function persistLastSurface(hash: string): Promise<void> {
  if (SKIP_PERSIST_PREFIXES.some((prefix) => hash === prefix || hash.startsWith(`${prefix}?`) || hash.startsWith(`${prefix}/`))) {
    return
  }
  try {
    await put('settings', { key: 'lastSurface', value: hash })
  } catch (error) {
    logger.error('Failed to persist lastSurface', { hash, error })
  }
}
