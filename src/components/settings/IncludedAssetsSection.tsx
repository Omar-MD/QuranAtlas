import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react'

import { Button } from '../ui'
import { SettingsGroup } from './SettingsGroup'
import {
  DEFAULT_READER_ASSET_PROFILE,
  readerAssetProfileRows,
  readerAssetRowFallbackLabel,
  resolveReaderAssetProfileRows,
  type ReaderAssetInventoryDisplayRow,
  type ReaderAssetInventoryGroup,
  type ReaderAssetProfile,
} from '../../../shared/reader-assets/default-profile'
import { readNativeSettings } from '../../storage/native-reader-store'
import { subscribeReactReaderPreferencesChanged } from '../../storage/reader-preferences'
import { DEFAULT_TRANSLATION_ID, readActiveReaderProfile } from '../../storage/reader-settings'

const pendingRows = readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE).map((row) => ({
  ...row,
  label: 'Loading asset name',
}))

export function IncludedAssetsSection({
  onVisibleChange,
  visible,
}: {
  onVisibleChange: (visible: boolean) => void
  visible: boolean
}) {
  const [rows, setRows] = useState<ReaderAssetInventoryDisplayRow[]>(pendingRows)
  const listId = 'qar-react-settings-included-assets-list'
  // §3 safety rules: the section tracks the edition id it last resolved and
  // re-resolves only when the native edition id actually changed.
  const resolvedEditionIdRef = useRef<string | null>(null)
  const resolvedOnceRef = useRef(false)
  const [reloadKey, setReloadKey] = useState(0)

  // §3 step 5: rows resolve for the CURRENT native profile — the shipped
  // defaults cover only the fields nothing persists (readActiveReaderProfile's
  // per-field fallback idiom), never wholesale.
  async function resolveActiveAssetProfile(): Promise<ReaderAssetProfile> {
    const profile = await readActiveReaderProfile()
    // The asset-contract view pins translationId to the contract default: the
    // inventory shows the shipped contract, not the stored translation setting.
    return { ...DEFAULT_READER_ASSET_PROFILE, ...profile, translationId: DEFAULT_TRANSLATION_ID }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey intentionally retriggers inventory resolution.
  useEffect(() => {
    const controller = new AbortController()
    void resolveActiveAssetProfile()
      .then((profile) =>
        resolveReaderAssetProfileRows(profile, { signal: controller.signal }).then((loadedRows) => ({
          loadedRows,
          profile,
        })),
      )
      .then(({ loadedRows, profile }) => {
        if (controller.signal.aborted) return
        resolvedEditionIdRef.current = profile.mushafEditionId
        resolvedOnceRef.current = true
        setRows(loadedRows)
      })
      .catch(() => {
        // Preserve-on-failure: a refresh keeps the shown rows; only the
        // initial (never-resolved) load falls back to labelled default rows.
        if (controller.signal.aborted || resolvedOnceRef.current) return
        setRows(
          readerAssetProfileRows(DEFAULT_READER_ASSET_PROFILE).map((row) => ({
            ...row,
            label: readerAssetRowFallbackLabel(row),
          })),
        )
      })
    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    const unsubscribe = subscribeReactReaderPreferencesChanged(() => {
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
    return unsubscribe
  }, [])

  return (
    <SettingsGroup description="Read-only inventory for the active reading profile." title="Included reading assets">
      <div className="qar-react-settings-assets" aria-busy={rows === pendingRows ? 'true' : undefined}>
        <div className="qar-react-settings-section-heading">
          <Button
            aria-controls={listId}
            aria-expanded={visible}
            className="qar-react-settings-assets-toggle"
            onClick={() => onVisibleChange(!visible)}
            size="sm"
            variant="ghost"
          >
            {visible ? (
              <>
                <ChevronUp aria-hidden="true" size={15} strokeWidth={1.8} />
                Hide included reading assets
              </>
            ) : (
              <>
                <ChevronDown aria-hidden="true" size={15} strokeWidth={1.8} />
                Show included reading assets
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
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SettingsGroup>
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
