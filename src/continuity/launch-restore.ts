import { startTransition, useEffect, useRef, useState } from 'react'

import type { SettingRecord } from '../storage/types'
import type { QuranRef } from './verse-key'
import { ensureReactMvpAssetContractReset } from '../launch/asset-contract-reset'
import {
  beginRequiredReaderCoreDownload,
  readActiveReaderProfile,
  resolveOfflineDownloadOffer,
  type OfflineDownloadOffer,
} from '../launch/offline-download-setup'
import { resolveMushafEditionSetup } from '../launch/mushaf-edition-setup'
import { nativeSettingsReader } from '../storage/native-reader-store'
import { retireSearchData } from '../launch/search-retirement'

export type SavedPosition = QuranRef
export type LaunchRestoreState =
  | { status: 'loading'; hash: string; sourceHash: string }
  | { status: 'ready'; hash: string; sourceHash: string; offlineOffer?: OfflineDownloadOffer | null }

// Only app-internal non-reader screens are excluded by exact hash. Unknown
// addresses (e.g. retired '#/search?...' deep links) already fail the
// isValidReaderHash allowlist below, so stale surfaces fall back to the saved
// reader position without persisting the unsupported hash.
const EXCLUDED = new Set(['#/onboarding', '#/settings', '#/assets'])

export function isValidReaderHash(hash: string): boolean {
  return (
    /^#\/s\/(?:[1-9]|[1-9]\d|10\d|11[0-4])(?:\/\d{1,3})?$/.test(hash) ||
    /^#\/m\/(?:[1-9]\d{0,2})$/.test(hash) ||
    hash === '#/surahs' ||
    hash === '#/bookmarks' ||
    hash === '#/about'
  )
}

export function shouldPersistLastSurface(hash: string): boolean {
  return !EXCLUDED.has(hash) && isValidReaderHash(hash)
}

export function resolveLaunchRoute({
  currentPosition,
  lastSurface,
}: {
  currentPosition?: SavedPosition
  lastSurface?: string
}): string {
  if (lastSurface && shouldPersistLastSurface(lastSurface)) return lastSurface
  if (currentPosition) return `#/s/${currentPosition.surah}/${currentPosition.verse}`
  return '#/s/1'
}

export function isLaunchHash(hash: string): boolean {
  return hash === '' || hash === '#' || hash === '#/'
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asSavedPosition(value: unknown): SavedPosition | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<SavedPosition>
  const { surah, verse } = candidate
  if (!Number.isFinite(surah) || !Number.isFinite(verse)) return undefined
  return { surah: Math.floor(surah as number), verse: Math.floor(verse as number) }
}

export type LaunchSettingsReader = {
  settings: {
    get: (key: string) => Promise<SettingRecord | undefined>
  }
}

async function readSetting(db: LaunchSettingsReader, key: string): Promise<unknown> {
  return (await db.settings.get(key))?.value
}

export async function loadLaunchRouteFromDb(db: LaunchSettingsReader): Promise<string> {
  const [lastSurface, currentPosition] = await Promise.all([
    readSetting(db, 'lastSurface'),
    readSetting(db, 'currentPosition'),
  ])

  return resolveLaunchRoute({
    lastSurface: asString(lastSurface),
    currentPosition: asSavedPosition(currentPosition),
  })
}

export async function resolveHashWithLaunchState(db: LaunchSettingsReader, hash: string): Promise<string> {
  if (hash === '#/onboarding' || isLaunchHash(hash)) return loadLaunchRouteFromDb(db)
  return hash
}

// S1 (approved Step 5): first run boots straight into the reader — no setup
// gate, no edition chooser, no download offer before content. Launch restore
// answers "is an offer pending" as data and never chooses UI modes (§9 B2):
// the offer renders as a standalone overlay beside the reader, downloads in
// place, and never round-trips through a hash or a resolver re-run.
export function useLaunchRestore(hash: string, refreshVersion = 0): LaunchRestoreState {
  const [state, setState] = useState<LaunchRestoreState>(() => ({
    status: 'loading',
    hash,
    sourceHash: hash,
  }))
  const hasResolvedOnceRef = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshVersion intentionally retriggers restoration.
  useEffect(() => {
    let active = true
    const canKeepReady = hasResolvedOnceRef.current && !isLaunchHash(hash) && hash !== '#/onboarding'

    if (canKeepReady) {
      // Preserve a pending offline offer across in-session navigation: the
      // one-shot prompt stays up until the user decides or dismisses it.
      startTransition(() => {
        setState((current) => ({
          status: 'ready',
          hash,
          sourceHash: hash,
          offlineOffer: current.status === 'ready' ? (current.offlineOffer ?? null) : null,
        }))
      })
      return () => {
        active = false
      }
    }

    async function resolve() {
      const assetContract = await ensureReactMvpAssetContractReset()
      const resolvedHash = await resolveHashWithLaunchState(nativeSettingsReader(), hash)
      // The edition resolver runs for its side effects only (persisting the
      // shipped default edition on a fresh profile); its outcome never gates
      // the launch — the reader renders from bundled data in every state. Its
      // availability-index revalidation is network work, so it must not delay
      // first reader paint either (P1): it runs concurrently with the reader
      // becoming usable.
      void resolveMushafEditionSetup({ contractWasValid: assetContract.hadValidContract }).catch(() => undefined)
      // Search retirement runs once per launch resolution after the short-lived
      // native reads complete and before reader-core downloads start. It is
      // fire-and-forget by contract: a blocked upgrade (older tab) or cache
      // failure must never block or fail launch resolution; cleanup retries on
      // later launches.
      void retireSearchData()
      if (!active) return
      hasResolvedOnceRef.current = true
      // First usable reader content waits only on required local contract and
      // profile/route work (P1). Everything below is optional availability or
      // enqueue work that must not strand the reader when offline or slow.
      setState({ status: 'ready', hash: resolvedHash, sourceHash: hash, offlineOffer: null })
      // The verse/reader-text pack is required offline data: it enqueues
      // automatically for every launch-resolved reader. The enqueue must not
      // block launch resolution; reconcileOfflinePacks resumes pending packs
      // at ready regardless.
      const profile = await readActiveReaderProfile().catch(() => null)
      if (profile) await beginRequiredReaderCoreDownload(profile).catch(() => undefined)
      const offer = await resolveOfflineDownloadOffer().catch(() => null)
      if (!active) return
      // The pending offer lands as data on the already-usable reader: the
      // overlay appears beside it instead of holding first paint hostage.
      // Guard on sourceHash so a superseded resolution never revives an old
      // offer for a different launch hash.
      setState((current) =>
        current.status === 'ready' && current.sourceHash === hash ? { ...current, offlineOffer: offer } : current,
      )
    }

    setState({ status: 'loading', hash, sourceHash: hash })
    void resolve().catch(() => {
      if (active) {
        hasResolvedOnceRef.current = true
        // A failed launch resolution still lands in the reader (bundled data).
        setState({
          status: 'ready',
          hash: isLaunchHash(hash) || hash === '#/onboarding' ? '#/s/1' : hash,
          sourceHash: hash,
          offlineOffer: null,
        })
      }
    })

    return () => {
      active = false
    }
  }, [hash, refreshVersion])

  return state
}
