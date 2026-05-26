import { useEffect, useRef, useState } from 'react'

import { MushafPageViewer } from '../../../components/reader/MushafPageViewer'
import type { ReaderAssetState } from '../../../components/reader/ReaderAssetGate'
import { ReaderAssetGate } from '../../../components/reader/ReaderAssetGate'
import { ReaderPageShell } from '../../../components/reader/ReaderPageShell'
import type { MushafViewMode } from '../../../components/reader/MushafModeControl'
import {
  loadMushafPageAsset,
  type MushafReadyPageAssetState,
  type MushafPageAssetState,
} from '../../../packs/mushaf-page-asset'
import type { Riwayah } from '../../../storage/types'
import { openReactDb } from '../../../storage/db'
import { REACT_ROUTES } from '../../router/routes'

type MushafRouteProps = {
  assetState?: ReaderAssetState
  page: number
}

const DEFAULT_RIWAYAH: Riwayah = 'qaloon'
const DEFAULT_MUSHAF_EDITION_ID = 'qalun-quran-ws-v1'

export function MushafRoute({ assetState = 'ready', page }: MushafRouteProps) {
  const [state, setState] = useState<MushafPageAssetState>({ status: 'loading' })
  const [visiblePage, setVisiblePage] = useState<MushafReadyPageAssetState | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'previous'>('next')
  const [viewMode, setViewMode] = useState<MushafViewMode>('auto')
  const requestId = useRef(0)
  const visiblePageRef = useRef<MushafReadyPageAssetState | null>(null)

  useEffect(() => {
    if (assetState !== 'ready') return
    const id = ++requestId.current
    const controller = new AbortController()
    setState((current) => current.status === 'ready' ? current : { status: 'loading' })
    void loadActiveMushafSettings().then((settings) =>
      loadMushafPageAsset({
        mushafEditionId: settings.mushafEditionId,
        page,
        riwayah: settings.riwayah,
        signal: controller.signal,
      }),
    ).then((next) => {
      if (requestId.current !== id) return
      setState(next)
      if (next.status === 'ready') {
        setTransitionDirection((visiblePageRef.current?.resolved.page ?? page) <= next.resolved.page ? 'next' : 'previous')
        visiblePageRef.current = next
        setVisiblePage(next)
      }
      if (next.status === 'ready' && next.resolved.page !== page) {
        window.history.replaceState(null, '', REACT_ROUTES.mushaf(next.resolved.page))
      }
    })
    return () => {
      requestId.current += 1
      controller.abort()
    }
  }, [assetState, page])

  return (
    <ReaderPageShell
      label={`Page ${page}`}
      mode="mushaf"
      onModeChange={(nextMode) => {
        if (nextMode === 'verse') window.location.hash = REACT_ROUTES.surah(1)
      }}
    >
      {assetState !== 'ready' ? (
        <ReaderAssetGate label="Qalun" state={assetState} />
      ) : visiblePage ? (
        <MushafPageViewer
          inlineSvg={visiblePage.inlineSvg}
          onNavigate={(nextPage) => {
            window.location.hash = REACT_ROUTES.mushaf(nextPage)
          }}
          onViewModeChange={setViewMode}
          resolved={visiblePage.resolved}
          transitionDirection={transitionDirection}
          viewMode={viewMode}
        />
      ) : state.status === 'unavailable' ? (
        <ReaderAssetGate label={state.riwayah === 'qaloon' ? 'Qalun' : state.riwayah} state="missing" />
      ) : state.status === 'error' ? (
        <ReaderAssetGate label="Mushaf" state="error" />
      ) : (
        <section className="qar:m-5 qar:min-h-28 qar:rounded-surface qar:border qar:border-border qar:bg-surface qar:p-4" aria-label="Loading Mushaf page" aria-live="polite" />
      )}
    </ReaderPageShell>
  )
}

async function loadActiveMushafSettings(): Promise<{ riwayah: Riwayah; mushafEditionId: string }> {
  try {
    const db = await openReactDb()
    const [riwayah, mushafEditionId] = await Promise.all([
      db.settings.get('riwayah'),
      db.settings.get('mushafEditionId'),
    ])
    return {
      riwayah: isRiwayah(riwayah?.value) ? riwayah.value : DEFAULT_RIWAYAH,
      mushafEditionId: typeof mushafEditionId?.value === 'string' ? mushafEditionId.value : DEFAULT_MUSHAF_EDITION_ID,
    }
  } catch {
    return { riwayah: DEFAULT_RIWAYAH, mushafEditionId: DEFAULT_MUSHAF_EDITION_ID }
  }
}

function isRiwayah(value: unknown): value is Riwayah {
  return value === 'hafs' || value === 'warsh' || value === 'qaloon'
}
