import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, FileText } from 'lucide-react'

import { Button } from '../ui'
import {
  DEFAULT_READER_ASSET_PROFILE,
  readerAssetProfileRows,
  readerAssetRowFallbackLabel,
  resolveReaderAssetProfileRows,
  type ReaderAssetInventoryDisplayRow,
  type ReaderAssetInventoryGroup,
} from '../../../shared/reader-assets/default-profile'

const pendingRows = readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE).map((row) => ({
  ...row,
  label: 'Loading asset name',
}))

export function IncludedAssetsSection({
  onVisibleChange,
  visible = true,
}: {
  onVisibleChange?: (visible: boolean) => void
  visible?: boolean
}) {
  const [rows, setRows] = useState<ReaderAssetInventoryDisplayRow[]>(pendingRows)
  const listId = 'qar-react-settings-included-assets-list'

  useEffect(() => {
    const controller = new AbortController()
    void resolveReaderAssetProfileRows(DEFAULT_READER_ASSET_PROFILE, { signal: controller.signal })
      .then((loadedRows) => {
        if (!controller.signal.aborted) setRows(loadedRows)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRows(readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE).map((row) => ({
            ...row,
            label: readerAssetRowFallbackLabel(row),
          })))
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <section
      className="qar-react-settings-assets"
      aria-busy={rows === pendingRows ? 'true' : undefined}
      aria-labelledby="qar-react-settings-included-assets"
      data-assets-visible={visible ? 'true' : 'false'}
    >
      <div className="qar-react-settings-section-heading">
        <span>
          <h3 className="qar-react-settings-section-title" id="qar-react-settings-included-assets">Included assets</h3>
          <p className="qar-react-settings-section-note">Read-only inventory for the active MVP profile.</p>
        </span>
        <Button
          aria-controls={listId}
          aria-expanded={visible}
          className="qar-react-settings-assets-toggle"
          onClick={() => onVisibleChange?.(!visible)}
          size="sm"
          variant="ghost"
        >
          {visible ? (
            <>
              <ChevronUp aria-hidden="true" size={15} strokeWidth={1.8} />
              Hide
            </>
          ) : (
            <>
              <ChevronDown aria-hidden="true" size={15} strokeWidth={1.8} />
              Show
            </>
          )}
        </Button>
      </div>
      {visible ? (
        <div className="qar-react-settings-asset-list" id={listId}>
          {rows.map((row) => (
            <div className="qar-react-settings-asset-row" key={row.id}>
              <span
                aria-hidden="true"
                className="qar-react-settings-asset-icon"
                data-asset-icon={assetIconName(row.group)}
                data-testid="settings-asset-icon"
              >
                <AssetIcon group={row.group} />
              </span>
              <span className="qar-react-settings-asset-main">
                <span className="qar-react-settings-asset-label">
                  <span className="qar-react-settings-asset-prefix">{assetPrefix(row.group)}: </span>
                  <span className="qar-react-settings-row-label">{row.label}</span>
                </span>
              </span>
              <span className="qar-react-settings-asset-status">Included</span>
              <ChevronRight aria-hidden="true" className="qar-react-settings-asset-chevron" size={16} strokeWidth={1.65} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AssetIcon({ group }: { group: ReaderAssetInventoryGroup }) {
  if (group === 'mushaf') return <BookOpen size={17} strokeWidth={1.65} />
  if (group === 'translation') return <FileText size={17} strokeWidth={1.65} />
  return <TextFontIcon />
}

function assetIconName(group: ReaderAssetInventoryGroup): string {
  if (group === 'mushaf') return 'mushaf-book'
  if (group === 'translation') return 'translation-document'
  return 'text-font'
}

function assetPrefix(group: ReaderAssetInventoryGroup): string {
  if (group === 'mushaf') return 'Mushaf'
  if (group === 'translation') return 'Translation'
  return 'Text'
}

function TextFontIcon() {
  return (
    <svg
      aria-hidden="true"
      className="qar-react-settings-text-font-icon"
      fill="none"
      height="19"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
      viewBox="0 0 24 24"
      width="19"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.75 5.25h10.5" />
      <path d="M10 5.25v13.5" />
      <path d="M6.75 18.75h6.5" />
      <path d="M15.5 10.25h4.25" />
      <path d="M17.65 10.25v8.5" />
      <path d="M15.85 18.75h3.6" />
      <path d="M4.75 21h14.5" />
    </svg>
  )
}
