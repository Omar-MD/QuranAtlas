// Playwright `globalSetup` hook: runs once before the suite. Boots the app,
// captures cookies + localStorage + IDB into a JSON snapshot at
// `tests/e2e/.auth/onboarded.json`. Specs opt
// in via `test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })` to
// skip per-test cold-boot setup.
//
// Audit ref: docs/audits/2026-04-29-architecture-red-team.md §7 P1.6 (R-15).
// Spec ref: docs/superpowers/specs/2026-04-30-n15-global-setup-design.md.
// See tests/e2e/AGENTS.md for the onboarded storage-state policy.

import { chromium, type FullConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
// Pin to the canonical version constants — never hard-code. If migrations.js
// bumps DB_VERSION and this import lags, every spec breaks at boot, surfaced
// fast.
const HERE = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = resolve(HERE, '.auth/onboarded.json')

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!
  mkdirSync(dirname(STATE_PATH), { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()

  // Boot once. Fresh fixture now shows the launch splash and enters the
  // default reader automatically; wait for a verse so IDB/cache reset and
  // launch restore have completed before capturing the reusable state.
  await page.goto('/')
  await page
    .locator('.qa-verse')
    .first()
    .waitFor({ state: 'visible', timeout: 25_000 })

  // Re-navigate to root (NOT reload) so the hash clears and the router's
  // LAUNCH_RESTORE handler fires from the captured state.
  await page.goto('/')
  await page
    .locator('.qa-verse')
    .first()
    .waitFor({ state: 'visible', timeout: 25_000 })

  // Capture cookies + localStorage + IDB.  `indexedDB: true` requires
  // Playwright ≥1.51; repo runs 1.59.1.
  await context.storageState({ path: STATE_PATH, indexedDB: true })

  await browser.close()
}
