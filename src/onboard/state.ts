// Module-level helpers callable without mounting Onboarding.svelte.
// app-bootstrap.ts::handleLaunchRestore reads `isComplete()` to decide
// whether the first-run flow needs to take over the launch route; pulling
// that single IDB read out of the component file lets the bootstrap
// avoid forcing the full Svelte component into the launch path's eager
// import graph (audit R-31, 2026-04-29).

import { get, put } from '../core/db.js'

export async function isComplete(): Promise<boolean> {
  try {
    const rec = await get('settings', 'onboardingComplete')
    return rec?.value === true
  } catch {
    return false
  }
}

export async function markComplete(): Promise<void> {
  try {
    await put('settings', { key: 'onboardingComplete', value: true })
  } catch {
    /* ignore */
  }
}
