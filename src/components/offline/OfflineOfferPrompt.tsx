import { useCallback, useEffect, useRef, useState } from 'react'

import { OfflineDownloadProgress } from './OfflineDownloadProgress'
import { Button, Dialog, Sheet, Status } from '../ui'
import {
  getOfflineDownloadSnapshot,
  pauseOfflinePack,
  readOfflinePackRecords,
  requestOfflinePackInstall,
  resumeOfflinePack,
  subscribeOfflineDownloads,
  type OfflineDownloadSnapshotItem,
} from '../../offline/download/offline-pack-downloader'
import { ensureStoragePersistence } from '../../offline/download/storage-persistence'
import { readerCorePackId } from '../../offline/download/offline-pack-plan'
import {
  formatOfflinePackSize,
  startOfflineDownloadFromOnboarding,
  type OfflineDownloadOffer,
} from '../../launch/offline-download-setup'
import type { OfflinePackRecord } from '../../storage/types'

// S1 offline offer (approved Step 5): a standalone overlay rendered only after
// the reader has rendered. Desktop Dialog; mobile bottom sheet. Downloading
// happens in place — the overlay never navigates, and dismissing it never
// cancels a running download (§9 B2: no hash round-trip, no resolver re-run).
export function OfflineOfferPrompt({ offer, onLater }: { offer: OfflineDownloadOffer; onLater: () => void }) {
  const [snapshot, setSnapshot] = useState<OfflineDownloadSnapshotItem[]>(getOfflineDownloadSnapshot)
  const [consentFailed, setConsentFailed] = useState(false)
  const retryRef = useRef<HTMLButtonElement>(null)
  const isDesktopViewport = () =>
    typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 768px)').matches

  useEffect(() => subscribeOfflineDownloads(setSnapshot), [])

  useEffect(() => {
    if (consentFailed) retryRef.current?.focus()
  }, [consentFailed])

  const readerPackId = readerCorePackId(offer.profile)
  const mushafPackId = offer.mushafPlan.packId
  const readerItem = snapshot.find((item) => item.packId === readerPackId) ?? null
  const mushafItem = snapshot.find((item) => item.packId === mushafPackId) ?? null
  const downloading = mushafItem?.status === 'installing'
  const installed = mushafItem?.status === 'installed'
  const anyPaused = mushafItem?.status === 'paused-user' || mushafItem?.status === 'paused-network'
  const anyFailed = mushafItem?.status === 'failed'

  const startDownload = useCallback(async () => {
    setConsentFailed(false)
    try {
      await startOfflineDownloadFromOnboarding(offer)
    } catch {
      setConsentFailed(true)
    }
  }, [offer])

  const retryFailed = useCallback(async () => {
    // Mirrors the Settings retry: resolve fresh records and rebuild each
    // failed pack's plan from the record's embedded files — re-enqueueing
    // needs no network.
    const records = await readOfflinePackRecords().catch(() => [] as OfflinePackRecord[])
    for (const record of records) {
      const retryable =
        (record.packId === readerPackId && readerItem?.status === 'failed') ||
        (record.packId === mushafPackId && mushafItem?.status === 'failed')
      if (!retryable) continue
      await requestOfflinePackInstall(
        {
          packId: record.packId,
          kind: record.kind,
          label: record.label,
          files: record.files,
          totalBytes: record.totalBytes,
        },
        { persisted: record.persisted },
      )
    }
  }, [mushafItem?.status, mushafPackId, readerItem?.status, readerPackId])

  const togglePause = useCallback(async () => {
    if (anyPaused) {
      // User-activated consent boundary (may prompt in Firefox).
      await ensureStoragePersistence()
      await Promise.all([resumeOfflinePack(readerPackId), resumeOfflinePack(mushafPackId)])
    } else {
      await Promise.all([pauseOfflinePack(readerPackId), pauseOfflinePack(mushafPackId)])
    }
  }, [anyPaused, mushafPackId, readerPackId])

  const body = (
    <>
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        Save the {offer.editionLabel} page images ({formatOfflinePackSize(offer.mushafPlan.totalBytes)}) so you can read
        them without a connection.
      </p>
      {consentFailed ? (
        <Status
          action={
            <Button
              onClick={() => {
                void startDownload()
              }}
              ref={retryRef}
              size="sm"
              variant="secondary"
            >
              Try again
            </Button>
          }
          description="The download could not be started. Check your connection and try again."
          title="Connect to the internet to download"
          tone="error"
        />
      ) : null}
      {installed ? (
        <>
          <Status title="Ready for offline reading" tone="success" />
          <Button onClick={onLater} variant="secondary">
            Continue reading
          </Button>
        </>
      ) : downloading || anyPaused || anyFailed ? (
        <>
          {anyFailed ? (
            <Status
              action={
                <Button
                  onClick={() => {
                    void retryFailed()
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Try again
                </Button>
              }
              description="Check your connection and try again; the download continues where it stopped."
              title="Download failed"
              tone="error"
            />
          ) : (
            <OfflineDownloadProgress
              fileCountHidden={!(readerItem && mushafItem)}
              items={[readerItem, mushafItem]}
              label="Downloading offline reading data"
            />
          )}
          <div className="qar:grid qar:gap-2">
            <Button
              onClick={() => {
                onLater()
              }}
              variant="primary"
            >
              Continue reading
            </Button>
            {anyFailed ? null : (
              <Button
                onClick={() => {
                  void togglePause()
                }}
                variant="secondary"
              >
                {anyPaused ? 'Resume' : 'Pause'}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="qar:grid qar:gap-2">
          <Button
            onClick={() => {
              void startDownload()
            }}
            variant="primary"
          >
            Download pages
          </Button>
          <Button
            onClick={() => {
              onLater()
            }}
            variant="secondary"
          >
            Not now
          </Button>
        </div>
      )}
    </>
  )

  if (isDesktopViewport()) {
    return (
      <Dialog
        onOpenChange={(open) => {
          if (!open) onLater()
        }}
        open
        title="Download for offline reading"
      >
        {body}
      </Dialog>
    )
  }
  return (
    <Sheet
      closeLabel="Not now"
      onOpenChange={(open) => {
        if (!open) onLater()
      }}
      open
      title="Download for offline reading"
    >
      {body}
    </Sheet>
  )
}
