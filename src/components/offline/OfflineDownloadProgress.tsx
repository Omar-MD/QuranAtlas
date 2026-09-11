import { AlertTriangle } from 'lucide-react'

import type { OfflineDownloadSnapshotItem } from '../../offline/download/offline-pack-downloader'
import { Button, Progress, Status } from '../ui'

type OfflineDownloadProgressProps = {
  /** Classes for the "N of M files" line; defaults to the settings-row text style. */
  fileCountClassName?: string
  /** Hide the files-count line (e.g. while tracked packs are incomplete). */
  fileCountHidden?: boolean
  /** Tracked packs; null/undefined entries (untracked pack ids) contribute no progress. */
  items: ReadonlyArray<OfflineDownloadSnapshotItem | null | undefined>
  label: string
}

/**
 * Known-bytes progress bar for tracked offline packs (SD-6): sums cover only
 * packs whose totalBytes is known; the count line carries progress for
 * unknown-size packs. Aggregating a single item matches the per-row bar.
 */
export function OfflineDownloadProgress({
  fileCountClassName = 'qar:text-sm qar:text-muted',
  fileCountHidden = false,
  items,
  label,
}: OfflineDownloadProgressProps) {
  const knownItems = items.filter(
    (item): item is OfflineDownloadSnapshotItem => item != null && item.totalBytes != null,
  )
  const sumKnownBytes = knownItems.reduce((total, item) => total + (item.totalBytes ?? 0), 0)
  const sumDoneBytes = knownItems.reduce((total, item) => total + item.bytesDone, 0)
  const value = sumKnownBytes > 0 ? Math.min(100, Math.round((100 * sumDoneBytes) / sumKnownBytes)) : 0
  const filesDone = items.reduce((total, item) => total + (item?.filesDone ?? 0), 0)
  const fileCount = items.reduce((total, item) => total + (item?.fileCount ?? 0), 0)
  return (
    <>
      <Progress label={label} value={value} />
      {fileCountHidden ? null : (
        <span className={fileCountClassName}>
          {filesDone} of {fileCount} files
        </span>
      )}
    </>
  )
}

type OfflineDownloadFailedStatusProps = {
  description?: string
  onRetry: () => void
  retryLabel: string
  retrySize?: 'sm' | 'md'
  title: string
}

/** Failed-pack recovery surface: error status with the retry re-enqueue action. */
export function OfflineDownloadFailedStatus({
  description,
  onRetry,
  retryLabel,
  retrySize,
  title,
}: OfflineDownloadFailedStatusProps) {
  return (
    <Status
      action={
        <Button onClick={onRetry} size={retrySize} variant="secondary">
          {retryLabel}
        </Button>
      }
      description={description}
      icon={<AlertTriangle aria-hidden="true" size={18} />}
      title={title}
      tone="error"
    />
  )
}
