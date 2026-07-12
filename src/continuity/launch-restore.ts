import { useEffect, useRef, useState } from 'react'

import type { SettingRecord } from '../storage/types'
import { ensureReactMvpAssetContractReset } from '../launch/asset-contract-reset'
import { resolveMushafEditionSetup, type MushafEditionSetupState } from '../launch/mushaf-edition-setup'
import { nativeSettingsReader } from '../storage/native-reader-store'

export type SavedPosition = { surah: number; verse: number }
export type LaunchRestoreState =
  | { status: 'loading'; hash: string; sourceHash: string }
  | { status: 'ready'; hash: string; sourceHash: string }
  | { status: 'setup'; hash: string; sourceHash: string; setup: Exclude<MushafEditionSetupState, { status: 'complete' }> }

const EXCLUDED = new Set(['#/onboarding', '#/settings', '#/assets', '#/search'])

export function isValidReaderHash(hash: string): boolean {
  return /^#\/s\/(?:[1-9]|[1-9]\d|10\d|11[0-4])(?:\/\d{1,3})?$/.test(hash)
    || /^#\/m\/(?:[1-9]\d{0,2})$/.test(hash)
    || hash === '#/surahs'
    || hash === '#/bookmarks'
    || hash === '#/about'
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
  onboardingComplete?: boolean
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

export function useLaunchRestore(hash: string, refreshVersion = 0): LaunchRestoreState {
  const [state, setState] = useState<LaunchRestoreState>(() => ({
    status: 'loading',
    hash,
    sourceHash: hash,
  }))
  const hasResolvedOnceRef = useRef(false)
  const setupPendingRef = useRef(false)

  useEffect(() => {
    let active = true
    const canKeepReady = hasResolvedOnceRef.current
      && !setupPendingRef.current
      && !isLaunchHash(hash)
      && hash !== '#/onboarding'

    if (canKeepReady) {
      setState({ status: 'ready', hash, sourceHash: hash })
      return () => {
        active = false
      }
    }

    async function resolve() {
      const assetContract = await ensureReactMvpAssetContractReset()
      const resolvedHash = await resolveHashWithLaunchState(nativeSettingsReader(), hash)
      const setup = await resolveMushafEditionSetup({ contractWasValid: assetContract.hadValidContract })
      if (active) {
        hasResolvedOnceRef.current = true
        if (setup.status === 'complete') {
          setupPendingRef.current = false
          setState({ status: 'ready', hash: resolvedHash, sourceHash: hash })
        } else {
          setupPendingRef.current = true
          setState({ status: 'setup', hash: resolvedHash, sourceHash: hash, setup })
        }
      }
    }

    setState({ status: 'loading', hash, sourceHash: hash })
    void resolve().catch(() => {
      if (active) {
        hasResolvedOnceRef.current = true
        setupPendingRef.current = true
        setState({
          status: 'setup',
          hash: isLaunchHash(hash) || hash === '#/onboarding' ? '#/s/1' : hash,
          sourceHash: hash,
          setup: { status: 'choose', editions: [] },
        })
      }
    })

    return () => {
      active = false
    }
  }, [hash, refreshVersion])

  return state
}
