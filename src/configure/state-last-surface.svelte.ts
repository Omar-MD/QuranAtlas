// Sole writer for settings.lastSurface — the hash the launch-restore
// path replays on next boot. Pre-fix both core/router.ts and
// review/Hub.svelte called `put('settings', { key: 'lastSurface', ... })`
// directly; an in-flight router write could overtake a Hub write
// posted from the same user action, leaving the user on an unrelated
// surface after reload (audit R-08 / R-25 / CC-3, 2026-04-29).
//
// Routes that handleLaunchRestore explicitly rejects (#/onboarding) are
// skipped here so the in-flight write can't overtake a test fixture's
// seeded lastSurface (preserved router-side comment).

import { put } from '../core/db.js'
import { logger } from '../core/logger.js'

const SKIP_PERSIST = new Set<string>(['#/onboarding'])

export async function persistLastSurface(hash: string): Promise<void> {
  if (SKIP_PERSIST.has(hash)) { return }
  try {
    await put('settings', { key: 'lastSurface', value: hash })
  } catch (error) {
    logger.error('Failed to persist lastSurface', { hash, error })
  }
}
