import { expect, type BrowserContext, type ConsoleMessage, type Page, type Request, type Response } from '@playwright/test'

import { applySchema, DB_NAME, DB_VERSION } from '../../../src/core/db/migrations.js'

export type GoldenTheme = 'light' | 'sepia' | 'dark'
export type NightMode = 'off' | 'on' | 'auto'
export type ParityTargetId = 'svelte' | 'react'
export type GoldenViewportId =
  | 'phone-small'
  | 'phone-standard'
  | 'tablet-portrait'
  | 'phone-landscape'
  | 'desktop'
  | 'desktop-wide'

export type GoldenFixture = {
  id: string
  route: string
  seed: string
  viewports: GoldenViewportId[]
  themes: GoldenTheme[]
  nightModes?: NightMode[]
  proofOwners: string[]
  assertions: string[]
  acceptedDifference: 'none' | string
}

export type ParityTarget = {
  id: ParityTargetId
  baseURL: string
  buildDir: string
  productionMarker?: 'quranatlas-react-deploy-target'
}

export type PageGuard = {
  failures: string[]
  dispose: () => void
}

const APPLY_SCHEMA_SOURCE = `
  const _applySchema = ${applySchema.toString()}
  _applySchema(db, tx)
`

const REACT_PREVIEW_PORT = process.env.REACT_PARITY_PORT ?? '4181'
const SVELTE_PREVIEW_PORT = process.env.SVELTE_PARITY_PORT ?? '4180'
const MVP_ASSET_CONTRACT_ID = 'mvp-default-assets-qaloon-bridges-v1'

export const PARITY_TARGETS: Record<ParityTargetId, ParityTarget> = {
  svelte: {
    id: 'svelte',
    baseURL: process.env.SVELTE_BASE_URL ?? `http://127.0.0.1:${SVELTE_PREVIEW_PORT}`,
    buildDir: 'dist',
  },
  react: {
    id: 'react',
    baseURL: process.env.REACT_BASE_URL ?? `http://127.0.0.1:${REACT_PREVIEW_PORT}`,
    buildDir: 'dist-react',
    productionMarker: 'quranatlas-react-deploy-target',
  },
}

export function targetUrl(target: ParityTargetId, route = '/') {
  const normalizedRoute = route.startsWith('/') || route.startsWith('#') ? route : `/${route}`
  return new URL(normalizedRoute, PARITY_TARGETS[target].baseURL).toString()
}

export async function expectReactProductionPreflight(page: Page) {
  await page.goto(targetUrl('react', '/'))
  await expect(page.locator('meta[name="quranatlas-react-deploy-target"]')).toHaveAttribute('content', 'production')
  await expect(page.locator('#react-root')).toBeVisible()
}

export async function clearTargetStorage(page: Page, target: ParityTargetId) {
  await page.goto(targetUrl(target, '/'))
  await page.evaluate(
    async ({ dbName }) => {
      localStorage.clear()
      sessionStorage.clear()
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      }
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        request.onblocked = () => resolve()
      })
    },
    { dbName: DB_NAME },
  )
}

export async function seedTargetState(page: Page, target: ParityTargetId, seed: string) {
  await clearTargetStorage(page, target)
  if (seed === 'fresh-browser') {
    await page.goto('about:blank')
    return
  }

  const seedJson = JSON.stringify(seed)
  const nativeDbVersion = target === 'react' ? DB_VERSION * 10 : DB_VERSION
  await page.evaluate(`(() => new Promise((resolve, reject) => {
    const open = indexedDB.open(${JSON.stringify(DB_NAME)}, ${nativeDbVersion})
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction(['settings', 'bookmarks'], 'readwrite')
      const settings = tx.objectStore('settings')
      const bookmarks = tx.objectStore('bookmarks')
      const now = Date.now()
      const seedName = ${seedJson}

      settings.put({ key: 'onboardingComplete', value: true })
      settings.put({ key: 'mvpAssetContractId', value: ${JSON.stringify(MVP_ASSET_CONTRACT_ID)} })
      settings.put({ key: 'riwayah', value: 'qaloon' })
      settings.put({ key: 'quranTextStyleId', value: 'uthmani-kfgqpc-v1' })
      settings.put({ key: 'mushafEditionId', value: 'qalun-quran-ws-v1' })
      settings.put({ key: 'translationId', value: 'bridges' })
      settings.put({ key: 'translationVisible', value: true })

      if (seedName === 'onboarded-last-surface-reader') {
        settings.put({ key: 'lastSurface', value: '#/s/1' })
      }

      if (seedName === 'onboarded-hafs-mushaf-missing') {
        settings.put({ key: 'riwayah', value: 'hafs' })
        settings.put({ key: 'quranTextStyleId', value: 'hafs-uthmani-kfgqpc-v1' })
        settings.put({ key: 'mushafEditionId', value: 'hafs-quran-ws-v1' })
      }

      if (seedName === 'onboarded-bookmarks-populated') {
        bookmarks.put({
          riwayah: 'qaloon',
          verseKey: '1:1',
          surah: 1,
          createdAt: now,
        })
      }

      if (seedName === 'onboarded-wird-plan-active') {
        settings.put({
          key: 'wirdPlan',
          value: {
            id: 'react-parity-seeded-wird',
            start: { surah: 1, verse: 1 },
            cursor: { surah: 1, verse: 3 },
            targetDays: 2,
            targetEndOn: '2026-05-05',
            createdAt: now,
            updatedAt: now,
          },
        })
      }

      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
    open.onerror = () => reject(open.error)
    open.onupgradeneeded = (event) => {
      const db = event.target.result
      const tx = open.transaction
      ${APPLY_SCHEMA_SOURCE}
    }
  }))()`)
  await page.goto('about:blank')
}

export async function seedReactBookmarks(page: Page, records: Array<{ riwayah?: string; verseKey: string }>) {
  await page.evaluate(
    ({ dbName, rows }) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open(dbName)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('bookmarks', 'readwrite')
        const store = tx.objectStore('bookmarks')
        const now = Date.now()
        for (const row of rows) {
          const [surahRaw] = row.verseKey.split(':')
          store.put({
            riwayah: row.riwayah ?? 'qaloon',
            verseKey: row.verseKey,
            surah: Number(surahRaw),
            createdAt: now,
          })
        }
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
      }
      open.onerror = () => reject(open.error)
    }),
    { dbName: DB_NAME, rows: records },
  )
}

export async function withSeededTargets(page: Page, seed: string) {
  await seedTargetState(page, 'svelte', seed)
  await seedTargetState(page, 'react', seed)
}

export function installPageGuards(page: Page, label: string, allowedUrlPatterns: RegExp[] = []): PageGuard {
  const failures: string[] = []
  const isAllowed = (url: string) => allowedUrlPatterns.some((pattern) => pattern.test(url))
  const onPageError = (error: Error) => failures.push(`${label} page error: ${error.message}`)
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') failures.push(`${label} console error: ${message.text()}`)
  }
  const onRequestFailed = (request: Request) => {
    const url = request.url()
    if (!isAllowed(url)) failures.push(`${label} request failed: ${url} ${request.failure()?.errorText ?? ''}`.trim())
  }
  const onResponse = (response: Response) => {
    const url = response.url()
    const status = response.status()
    if (status >= 400 && !isAllowed(url)) failures.push(`${label} HTTP ${status}: ${url}`)
  }

  page.on('pageerror', onPageError)
  page.on('console', onConsole)
  page.on('requestfailed', onRequestFailed)
  page.on('response', onResponse)

  return {
    failures,
    dispose: () => {
      page.off('pageerror', onPageError)
      page.off('console', onConsole)
      page.off('requestfailed', onRequestFailed)
      page.off('response', onResponse)
    },
  }
}

export async function expectNoGuardFailures(guard: PageGuard) {
  expect(guard.failures).toEqual([])
}

export async function newParityPage(context: BrowserContext, target: ParityTargetId) {
  const page = await context.newPage()
  await page.goto(targetUrl(target, '/'))
  return page
}

export const GOLDEN_VIEWPORTS: Record<GoldenViewportId, { width: number; height: number }> = {
  'phone-small': { width: 320, height: 568 },
  'phone-standard': { width: 375, height: 812 },
  'tablet-portrait': { width: 768, height: 1024 },
  'phone-landscape': { width: 812, height: 375 },
  desktop: { width: 1280, height: 900 },
  'desktop-wide': { width: 1440, height: 960 },
}

export const GOLDEN_FIXTURES: GoldenFixture[] = [
  {
    id: 'launch-fresh-onboarding',
    route: '',
    seed: 'fresh-browser',
    viewports: ['phone-small', 'phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light'],
    proofOwners: ['tests/e2e/onboard/react-golden.spec.ts'],
    assertions: ['first-run route mounts', 'keyboard setup completes', 'tokenized source states render', 'touch targets hold', 'no horizontal overflow', 'axe clean'],
    acceptedDifference: 'none',
  },
  {
    id: 'launch-restore-reader',
    route: '',
    seed: 'onboarded-last-surface-reader',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['empty hash resolves to launchable reader route', 'settings route is excluded from restore'],
    acceptedDifference: 'none',
  },
  {
    id: 'reader-surah-start',
    route: '#/s/1',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-small', 'phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    nightModes: ['off', 'on', 'auto'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts', 'src-react/components/reader/reader.stories.tsx'],
    assertions: ['verse rows render Qalun baseline', 'translation lane follows active settings', 'reader chrome does not overlap text'],
    acceptedDifference: 'none',
  },
  {
    id: 'reader-ayah-deeplink',
    route: '#/s/2/255',
    seed: 'onboarded-translation-visible',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['ayah target is visible', 'focusable controls keep names', 'saved current position remains valid'],
    acceptedDifference: 'none',
  },
  {
    id: 'mushaf-ready',
    route: '#/m/1',
    seed: 'onboarded-qaloon-page-pack-verified',
    viewports: ['phone-small', 'phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    nightModes: ['off', 'on', 'auto'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts', 'src-react/components/reader/reader.stories.tsx'],
    assertions: ['Mushaf page renders unframed', 'page chip and view mode controls work', 'jump input restores focus'],
    acceptedDifference: 'none',
  },
  {
    id: 'mushaf-missing-pack',
    route: '#/m/1',
    seed: 'onboarded-hafs-mushaf-missing',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['missing active Mushaf pack shows an explicit asset gate', 'Qalun page SVG is not loaded under Hafs settings'],
    acceptedDifference: 'none',
  },
  {
    id: 'surah-directory',
    route: '#/surahs',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['Surah rows render', 'keyboard can open a Surah row', 'current reader route updates after selection'],
    acceptedDifference: 'none',
  },
  {
    id: 'bookmarks-populated',
    route: '#/bookmarks',
    seed: 'onboarded-bookmarks-populated',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['riwayah-scoped bookmarks state renders', 'empty and populated labels are accessible'],
    acceptedDifference: 'none',
  },
  {
    id: 'settings-over-reader',
    route: '#/settings',
    seed: 'onboarded-last-surface-reader',
    viewports: ['phone-standard', 'tablet-portrait', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    nightModes: ['off', 'on', 'auto'],
    proofOwners: ['tests/e2e/configure/react-golden.spec.ts', 'src-react/components/settings/settings.stories.tsx'],
    assertions: ['settings route renders', 'source controls are keyboard reachable', 'no horizontal overflow'],
    acceptedDifference: 'none',
  },
  {
    id: 'about-page',
    route: '#/about',
    seed: 'onboarded-qaloon-baseline',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'sepia', 'dark'],
    proofOwners: ['tests/e2e/configure/react-golden.spec.ts'],
    assertions: ['About content renders without removed-scope product claims', 'no horizontal overflow'],
    acceptedDifference: 'none',
  },
  {
    id: 'search-results',
    route: '#/search?q=mercy',
    seed: 'onboarded-search-index-verified',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['query route renders the unsupported-route state', 'fake preview search results are absent'],
    acceptedDifference: 'none',
  },
  {
    id: 'search-index-unavailable',
    route: '#/search',
    seed: 'onboarded-search-index-unavailable',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['search route renders the unsupported-route state', 'no silent fallback claim is shown'],
    acceptedDifference: 'none',
  },
  {
    id: 'daily-wird-no-plan',
    route: '#/s/1',
    seed: 'onboarded-wird-no-plan',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts', 'tests/e2e/navigate/react-golden.spec.ts'],
    assertions: ['no full Daily Wird card renders in reader content without a plan', 'drawer remains the setup entry point', 'status copy does not claim progress before setup'],
    acceptedDifference: 'none',
  },
  {
    id: 'daily-wird-active',
    route: '#/s/1',
    seed: 'onboarded-wird-plan-active',
    viewports: ['phone-standard', 'desktop'],
    themes: ['light', 'dark'],
    proofOwners: ['tests/e2e/read/react-golden.spec.ts'],
    assertions: ['reader route exposes compact Daily Wird chrome status', 'drawer detail reflects active plan', 'progress status is announced'],
    acceptedDifference: 'none',
  },
  {
    id: 'offline-shell-installed-assets',
    route: '#/s/1',
    seed: 'onboarded-offline-installed-assets',
    viewports: ['desktop'],
    themes: ['light'],
    proofOwners: ['tests/e2e/infra/react-offline.spec.ts'],
    assertions: ['React app shell loads offline from preview build', 'installed text route renders', 'uninstalled optional packs show unavailable-offline state'],
    acceptedDifference: 'none',
  },
]
