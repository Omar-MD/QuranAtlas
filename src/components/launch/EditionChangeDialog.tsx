import { useCallback, useEffect, useRef, useState } from 'react'

import {
  loadMushafEditionOptions,
  writeMushafEditionSelection,
  type MushafEditionOption,
} from '../../launch/mushaf-edition-setup'
import { readNativeSettings } from '../../storage/native-reader-store'
import { emitReactReaderPreferencesChanged } from '../../storage/reader-preferences'
import { readNativeReactReaderPreferences } from '../../storage/settings-writer'
import { DEFAULT_READER_ASSET_PROFILE } from '../../../shared/reader-assets/default-profile'
import { Button, ChoiceButton, Dialog, Spinner } from '../ui'
import { useQueuedSettingWrite } from '../settings/useQueuedSettingWrite'

// Edition switching opens from two places — the S1 edition banner's "Change
// edition" button in the reader and the Settings Edition row — so both share
// this one dialog. One quiet row per edition — name, one-line description,
// page-image size when known; the current edition carries the accent label
// treatment. Switching re-shows the edition banner once on return (the
// dismissed id no longer matches).
export function EditionChangeDialog({ onOpenChange, open }: { onOpenChange: (open: boolean) => void; open: boolean }) {
  const [options, setOptions] = useState<Array<MushafEditionOption & { sizeText?: string }> | null>(null)
  const [value, setValue] = useState(DEFAULT_READER_ASSET_PROFILE.mushafEditionId)
  const [saveFailed, setSaveFailed] = useState(false)
  const latestOperationRef = useRef(0)
  const optionsEpochRef = useRef(0)
  const persistedEditionIdRef = useRef(DEFAULT_READER_ASSET_PROFILE.mushafEditionId)
  const retryEditionIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const enqueueSettingWrite = useQueuedSettingWrite()

  const resolveOptions = useCallback(() => {
    const epoch = optionsEpochRef.current + 1
    optionsEpochRef.current = epoch
    void Promise.all([loadMushafEditionOptions(), loadEditionSizes()])
      .then(([loaded, sizes]) => {
        if (optionsEpochRef.current !== epoch || !mountedRef.current) return
        setOptions(loaded.map((option) => ({ ...option, sizeText: sizes.get(option.id) })))
      })
      .catch(() => {
        if (!mountedRef.current) return
        setOptions((current) => (current === null ? [] : current))
      })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    resolveOptions()
    window.addEventListener('online', resolveOptions)
    return () => window.removeEventListener('online', resolveOptions)
  }, [resolveOptions])

  useEffect(() => {
    let active = true
    void readNativeSettings(['mushafEditionId'])
      .then(([mushafEditionId]) => {
        if (!active || typeof mushafEditionId?.value !== 'string') return
        persistedEditionIdRef.current = mushafEditionId.value
        setValue(mushafEditionId.value)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const selectEdition = useCallback(
    (editionId: string) => {
      const operationId = latestOperationRef.current + 1
      latestOperationRef.current = operationId
      retryEditionIdRef.current = null
      setSaveFailed(false)
      setValue(editionId)
      const write = enqueueSettingWrite(async () => {
        await writeMushafEditionSelection(editionId)
        persistedEditionIdRef.current = editionId
        if (latestOperationRef.current !== operationId) return
        const detail = await readNativeReactReaderPreferences().catch(() => ({}))
        if (latestOperationRef.current !== operationId) return
        emitReactReaderPreferencesChanged(detail)
      })
      void write.catch(() => {
        if (latestOperationRef.current !== operationId || !mountedRef.current) return
        setValue(persistedEditionIdRef.current)
        setSaveFailed(true)
        retryEditionIdRef.current = editionId
      })
    },
    [enqueueSettingWrite],
  )

  const retryFailedSave = useCallback(() => {
    const failedEditionId = retryEditionIdRef.current
    if (failedEditionId !== null) selectEdition(failedEditionId)
  }, [selectEdition])

  const unavailable = options !== null && options.length === 0
  const absent = options !== null && options.length > 0 && !options.some((edition) => edition.id === value)

  return (
    <Dialog onOpenChange={onOpenChange} open={open} title="Mushaf edition">
      <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
        The Mushaf pages your reader displays. Offline downloads follow this choice.
      </p>
      <div aria-busy={options === null ? 'true' : undefined} className="qar:grid">
        {options === null ? <Spinner label="Loading Mushaf editions" /> : null}
        {unavailable ? (
          <p className="qar:m-0 qar:text-sm qar:text-muted">Edition options unavailable right now</p>
        ) : null}
        {absent ? (
          <p className="qar:m-0 qar:text-sm qar:text-muted">Your selected Mushaf edition is no longer available</p>
        ) : null}
        <div aria-label="Mushaf edition" className="qar:grid" role="radiogroup">
          {options !== null && !unavailable && !absent
            ? options.map((edition) => {
                const selected = edition.id === value
                return (
                  <ChoiceButton
                    aria-checked={selected}
                    className="qar-edition-row"
                    data-selected={selected || undefined}
                    data-testid="mushaf-edition-option"
                    key={edition.id}
                    onClick={() => selectEdition(edition.id)}
                    role="radio"
                    tabIndex={selected ? 0 : -1}
                  >
                    <span className="qar:grid qar:gap-1">
                      <span className="qar-react-settings-row-label">
                        {edition.label}
                        {selected ? <span className="qar:sr-only"> (current edition)</span> : null}
                      </span>
                      <span className="qar-react-settings-row-control">{edition.description}</span>
                      {edition.sizeText ? (
                        <span className="qar-react-settings-row-control">Page images · {edition.sizeText}</span>
                      ) : null}
                    </span>
                  </ChoiceButton>
                )
              })
            : null}
        </div>
        {saveFailed ? (
          <div className="qar:grid qar:gap-2 qar:pt-2">
            <p aria-live="polite" className="qar:m-0 qar:text-sm qar:leading-6 qar:text-danger" role="status">
              Could not save Mushaf edition
            </p>
            <Button onClick={retryFailedSave} size="sm" type="button" variant="secondary">
              Retry saving Mushaf edition
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

// Page-image size per edition, from the availability index totalBytes.
async function loadEditionSizes(): Promise<Map<string, string>> {
  const sizes = new Map<string, string>()
  try {
    const { loadMushafEditionEntries } = await import('../../launch/mushaf-edition-setup')
    const { formatOfflineBytes } = await import('../../offline/download/offline-pack-plan')
    const entries = await loadMushafEditionEntries()
    for (const entry of entries) {
      if (entry.totalBytes != null) sizes.set(entry.mushafEditionId, formatOfflineBytes(entry.totalBytes))
    }
  } catch {
    // Sizes stay unknown offline; the row renders without the size line.
  }
  return sizes
}
