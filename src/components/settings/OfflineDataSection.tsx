import { AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, Progress, Status } from '../ui'
import { SettingsGroup } from './SettingsGroup'
import {
  getOfflineDownloadSnapshot,
  pauseOfflinePack,
  readOfflinePackRecords,
  removeOfflinePack,
  requestOfflinePackInstall,
  resumeOfflinePack,
  subscribeOfflineDownloads,
  type OfflineDownloadSnapshotItem,
} from '../../offline/download/offline-pack-downloader'
import {
  buildMushafPackPlan,
  buildReaderCorePackPlan,
  loadDatasetByteSizes,
  mushafPackId,
  readerCorePackId,
  type OfflinePackPlan,
} from '../../offline/download/offline-pack-plan'
import { ensureStoragePersistence } from '../../offline/download/storage-persistence'
import {
  formatOfflinePackSize,
  readActiveReaderProfile,
  type ActiveReaderProfile,
} from '../../launch/offline-download-setup'
import { loadMushafEditionEntries, type MushafEditionIndexEntry } from '../../launch/mushaf-edition-setup'
import { DEFAULT_READER_ASSET_PROFILE } from '../../../shared/reader-assets/default-profile'
import { readNativeSettings } from '../../storage/native-reader-store'
import { subscribeReactReaderPreferencesChanged } from '../../storage/reader-preferences'
import type { OfflinePackRecord, OfflinePackStatus } from '../../storage/types'

// SD-1: snapshot/record status → exact visible status string (e2e contract).
const STATUS_TEXT: Record<OfflinePackStatus, string> = {
  installing: 'Downloading',
  'paused-user': 'Paused',
  'paused-network': 'Waiting for connection',
  installed: 'Downloaded',
  failed: 'Failed',
}

type SectionMetadata = {
  profile: ActiveReaderProfile
  entry: MushafEditionIndexEntry | null
  byteSizes: Map<string, number> | null
}

type RemoveTarget = {
  packId: string
  rowName: string
}

type ResolvedRow = {
  packId: string
  kind: 'reader-core' | 'mushaf-pages'
  rowName: string
  status: OfflinePackStatus | 'not-installed'
  sizeText: string
  item: OfflineDownloadSnapshotItem | null
  record: OfflinePackRecord | null
  planBuildable: boolean
}

function planBytesFor(kind: 'reader-core' | 'mushaf-pages', metadata: SectionMetadata): number | null {
  if (kind === 'reader-core') {
    return buildReaderCorePackPlan(metadata.profile, metadata.byteSizes).totalBytes
  }
  return metadata.entry ? buildMushafPackPlan(metadata.entry).totalBytes : null
}

function resolveRows({
  hydrated,
  metadata,
  records,
  snapshot,
}: {
  hydrated: boolean
  metadata: SectionMetadata
  records: OfflinePackRecord[]
  snapshot: OfflineDownloadSnapshotItem[]
}): ResolvedRow[] {
  const readerId = readerCorePackId(metadata.profile)
  const mushafId = mushafPackId({
    mushafEditionId: metadata.profile.mushafEditionId,
    riwayah: metadata.profile.riwayah,
  })
  return (
    [
      {
        kind: 'reader-core',
        packId: readerId,
        fallbackName: 'Reader texts',
        planBuildable: true,
      },
      {
        kind: 'mushaf-pages',
        packId: mushafId,
        fallbackName: 'Mushaf edition',
        planBuildable: metadata.entry != null,
      },
    ] as const
  ).map((spec) => {
    const record = records.find((candidate) => candidate.packId === spec.packId) ?? null
    const item = snapshot.find((candidate) => candidate.packId === spec.packId) ?? null
    // Once the subscription has hydrated, the snapshot mirrors the record store
    // 1:1 — absence there means the pack was deleted, so the stale mount-time
    // record must not resurrect a Downloaded row.
    const status: OfflinePackStatus | 'not-installed' =
      item?.status ?? (hydrated ? 'not-installed' : (record?.status ?? 'not-installed'))
    // The reader row's name is static; the edition label inference applies to
    // the mushaf row only.
    const rowName =
      spec.kind === 'reader-core'
        ? 'Reader texts'
        : (item?.label ?? (hydrated ? null : record?.label) ?? metadata.entry?.label ?? spec.fallbackName)
    return {
      packId: spec.packId,
      kind: spec.kind,
      rowName,
      status,
      // SD-P3: only not-installed rows render a size segment; build the plan
      // lazily so progress ticks never rebuild 458-file plans.
      sizeText: status === 'not-installed' ? formatOfflinePackSize(planBytesFor(spec.kind, metadata)) : '',
      item,
      record,
      planBuildable: spec.planBuildable,
    }
  })
}

export function OfflineDataSection() {
  const [snapshot, setSnapshot] = useState<OfflineDownloadSnapshotItem[]>(getOfflineDownloadSnapshot)
  const [records, setRecords] = useState<OfflinePackRecord[] | null>(null)
  const [metadata, setMetadata] = useState<SectionMetadata | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const cancelRemoveRef = useRef<HTMLButtonElement>(null)
  const recordsRef = useRef<OfflinePackRecord[] | null>(null)
  // §3 safety rules: the section tracks the edition id it last resolved and
  // re-derives only when the native edition id actually changed.
  const resolvedEditionIdRef = useRef<string | null>(null)
  const metadataRef = useRef<SectionMetadata | null>(null)
  const applyRecords = useCallback((rows: OfflinePackRecord[]) => {
    recordsRef.current = rows
    setRecords(rows)
  }, [])

  // Records seed row state at mount; the subscription keeps live state and
  // re-reads the store when the snapshot reveals removals.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount effect subscribes once; applyRecords is stable.
  useEffect(() => {
    const controller = new AbortController()
    void readOfflinePackRecords()
      .then((loaded) => {
        if (!controller.signal.aborted) applyRecords(loaded)
      })
      .catch(() => {
        if (!controller.signal.aborted) applyRecords([])
      })
    const unsubscribe = subscribeOfflineDownloads((items) => {
      setSnapshot(items)
      setHydrated((current) => current || items.length > 0)
      // Cross-tab removal: a pack id known to this section that vanished from
      // the snapshot means the durable store changed underneath us — re-read
      // records instead of trusting the mount-time copy.
      const known = recordsRef.current
      if (known?.some((record) => !items.some((item) => item.packId === record.packId))) {
        void readOfflinePackRecords()
          .then((fresh) => applyRecords(fresh))
          .catch(() => undefined)
      }
    })
    // §3 wiring: the shared preferences event fires on every settings write
    // and carries no edition id — read the native one and bump the metadata
    // reload only on an actual edition change. A failed re-derivation keeps
    // the shown metadata; the metadata effect's abort + null-profile guards
    // discard stale or failed reads (latest-request-wins, preserve-on-failure).
    const unsubscribePreferences = subscribeReactReaderPreferencesChanged(() => {
      void readNativeSettings(['mushafEditionId'])
        .then(([mushafEditionId]) => {
          const editionId =
            typeof mushafEditionId?.value === 'string'
              ? mushafEditionId.value
              : DEFAULT_READER_ASSET_PROFILE.mushafEditionId
          if (editionId === resolvedEditionIdRef.current) return
          setReloadKey((key) => key + 1)
        })
        .catch(() => undefined)
    })
    return () => {
      controller.abort()
      unsubscribe()
      unsubscribePreferences()
    }
  }, [])

  // Plan metadata resolution: profile from settings, edition entry + byte sizes
  // from the dataset indexes. Re-runs on the window `online` event and on
  // overlay reopen (remount). Fetches follow the abort-on-unmount pattern.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey intentionally retriggers metadata resolution.
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      readActiveReaderProfile().catch(() => null),
      loadMushafEditionEntries().catch(() => null),
      loadDatasetByteSizes().catch(() => null),
    ]).then(([profile, entries, byteSizes]) => {
      if (controller.signal.aborted || profile == null) return
      // §3 preserve-on-failure: a FAILED entries or byteSizes leg on a
      // refresh keeps the prior metadata wholesale — profile included, since
      // the new pack id must never pair with the old entry's file list — and
      // leaves the tracked edition id untouched so `online`/reopen recovery
      // still works. Initial resolution (no prior metadata) keeps the
      // degraded semantics. Confirmed reads (empty entries, no matching
      // edition) apply as today.
      if ((entries === null || byteSizes === null) && metadataRef.current != null) return
      const entry = entries?.find((candidate) => candidate.mushafEditionId === profile.mushafEditionId) ?? null
      const nextMetadata = { profile, entry, byteSizes }
      metadataRef.current = nextMetadata
      resolvedEditionIdRef.current = profile.mushafEditionId
      setMetadata(nextMetadata)
    })
    const handleOnline = () => setReloadKey((key) => key + 1)
    window.addEventListener('online', handleOnline)
    return () => {
      controller.abort()
      window.removeEventListener('online', handleOnline)
    }
  }, [reloadKey])

  const startDownload = useCallback(
    async (kind: 'reader-core' | 'mushaf-pages') => {
      if (!metadata) return
      let plan: OfflinePackPlan | null = null
      if (kind === 'reader-core') {
        plan = buildReaderCorePackPlan(metadata.profile, metadata.byteSizes)
      } else if (metadata.entry) {
        plan = buildMushafPackPlan(metadata.entry)
      }
      if (!plan) return
      const persisted = await ensureStoragePersistence()
      await requestOfflinePackInstall(plan, { persisted })
    },
    [metadata],
  )

  const retryFailedPack = useCallback(async (packId: string, fallback: OfflinePackRecord | null) => {
    // The mount-time record copy may predate this failure — resolve a fresh
    // record for the plan rebuild, falling back to the row's seed.
    const fresh =
      (await readOfflinePackRecords().catch(() => [] as OfflinePackRecord[])).find(
        (candidate) => candidate.packId === packId,
      ) ?? fallback
    if (!fresh) return
    // Retry rebuilds the plan from the record's embedded files: no network needed.
    await requestOfflinePackInstall(
      {
        packId: fresh.packId,
        kind: fresh.kind,
        label: fresh.label,
        files: fresh.files,
        totalBytes: fresh.totalBytes,
      },
      { persisted: fresh.persisted },
    )
  }, [])

  const pausePack = useCallback((packId: string) => {
    void pauseOfflinePack(packId)
  }, [])

  const resumePack = useCallback((packId: string) => {
    void (async () => {
      // User-activated consent boundary (may prompt in Firefox).
      await ensureStoragePersistence()
      await resumeOfflinePack(packId)
    })()
  }, [])

  const confirmRemove = useCallback(() => {
    const target = removeTarget
    setRemoveTarget(null)
    if (target) void removeOfflinePack(target.packId)
  }, [removeTarget])

  const loading = records == null || metadata == null
  const resolved = loading ? null : resolveRows({ hydrated, metadata, records, snapshot })
  const readerRow = resolved?.find((row) => row.kind === 'reader-core') ?? null
  const mushafRow = resolved?.find((row) => row.kind === 'mushaf-pages') ?? null
  const bothInstalled = readerRow?.status === 'installed' && mushafRow?.status === 'installed'
  const editionFallbackName = metadata?.entry?.label ?? 'Mushaf edition'

  return (
    <SettingsGroup description="Saved on this device for reading without a connection." title="Offline reading data">
      <div aria-busy={loading ? 'true' : undefined}>
        {bothInstalled ? <p className="qar:m-0 qar:text-sm qar:text-muted">Downloaded</p> : null}
        {readerRow && mushafRow ? (
          <>
            <OfflineDataRow
              onStartDownload={startDownload}
              onPause={pausePack}
              onRemoveTarget={setRemoveTarget}
              onRetry={retryFailedPack}
              onResume={resumePack}
              row={readerRow}
            />
            <OfflineDataRow
              onStartDownload={startDownload}
              onPause={pausePack}
              onRemoveTarget={setRemoveTarget}
              onRetry={retryFailedPack}
              onResume={resumePack}
              row={mushafRow}
            />
          </>
        ) : (
          <>
            <div className="qar-react-settings-row">
              <div className="qar-react-settings-row-copy">
                <span className="qar-react-settings-row-label">Reader texts</span>
              </div>
            </div>
            <div className="qar-react-settings-row">
              <div className="qar-react-settings-row-copy">
                <span className="qar-react-settings-row-label">{editionFallbackName}</span>
              </div>
            </div>
          </>
        )}
      </div>
      <Dialog
        initialFocusRef={cancelRemoveRef}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        open={removeTarget != null}
        title={removeTarget ? `Remove ${removeTarget.rowName}?` : ''}
      >
        <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
          This removes the downloaded files from this device. You can download them again.
        </p>
        <div className="qar:flex qar:flex-wrap qar:justify-end qar:gap-2">
          <Button onClick={() => setRemoveTarget(null)} ref={cancelRemoveRef} variant="ghost">
            Cancel
          </Button>
          <Button onClick={confirmRemove} variant="danger">
            Remove
          </Button>
        </div>
      </Dialog>
    </SettingsGroup>
  )
}

function OfflineDataRow({
  onPause,
  onRemoveTarget,
  onRetry,
  onResume,
  onStartDownload,
  row,
}: {
  onPause: (packId: string) => void
  onRemoveTarget: (target: RemoveTarget) => void
  onRetry: (packId: string, fallback: OfflinePackRecord | null) => Promise<void>
  onResume: (packId: string) => void
  onStartDownload: (kind: 'reader-core' | 'mushaf-pages') => Promise<void>
  row: ResolvedRow
}) {
  // The failed state can come from the live snapshot alone (a pack enqueued
  // after this section mounted has no mount-time record) — never gate the
  // recovery path on the stale record copy.
  if (row.status === 'failed') {
    return (
      <>
        <OfflineRowShell rowName={row.rowName} statusText={STATUS_TEXT.failed} />
        <Status
          action={
            <Button
              onClick={() => {
                void onRetry(row.packId, row.record)
              }}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          }
          description={row.item?.error ?? row.record?.error}
          icon={<AlertTriangle aria-hidden="true" size={18} />}
          title="Failed"
          tone="error"
        />
      </>
    )
  }

  const installing = row.status === 'installing'
  return (
    <div className="qar-react-settings-row">
      <div className="qar-react-settings-row-copy">
        <span className="qar-react-settings-row-label">{row.rowName}</span>
        <span className="qar:text-sm qar:text-muted">
          {row.status === 'not-installed' ? `Not downloaded · ${row.sizeText}` : STATUS_TEXT[row.status]}
        </span>
        {installing && row.item ? (
          <>
            <Progress
              label={`Downloading ${row.rowName}`}
              value={
                row.item.totalBytes != null && row.item.totalBytes > 0
                  ? Math.min(100, Math.round((100 * row.item.bytesDone) / row.item.totalBytes))
                  : 0
              }
            />
            <span className="qar:text-sm qar:text-muted">
              {row.item.filesDone} of {row.item.fileCount} files
            </span>
          </>
        ) : null}
      </div>
      <div className="qar:flex qar:items-center">
        {row.status === 'not-installed' ? (
          <Button
            disabled={!row.planBuildable}
            onClick={() => {
              void onStartDownload(row.kind)
            }}
            size="sm"
            variant="secondary"
          >
            Download
          </Button>
        ) : null}
        {installing ? (
          <Button onClick={() => onPause(row.packId)} size="sm" variant="secondary">
            Pause
          </Button>
        ) : null}
        {row.status === 'paused-user' || row.status === 'paused-network' ? (
          <Button onClick={() => onResume(row.packId)} size="sm" variant="secondary">
            Resume
          </Button>
        ) : null}
        {row.status === 'installed' ? (
          <Button
            onClick={() => onRemoveTarget({ packId: row.packId, rowName: row.rowName })}
            size="sm"
            variant="danger"
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function OfflineRowShell({ rowName, statusText }: { rowName: string; statusText: string }) {
  return (
    <div className="qar-react-settings-row">
      <div className="qar-react-settings-row-copy">
        <span className="qar-react-settings-row-label">{rowName}</span>
        <span className="qar:text-sm qar:text-muted">{statusText}</span>
      </div>
    </div>
  )
}
