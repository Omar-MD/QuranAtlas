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
import { Button, SegmentedControl } from '../ui'
import { SettingsGroup } from './SettingsGroup'

// ME-P1: the settings counterpart of onboarding's edition control. It writes
// the same native setting through the same write path, owns its scoped
// recovery, and never touches useSettingsForm's queue or write-error banner
// (ME-P3) — the global banner stays scoped to the settings-form queue.
export function MushafEditionSection() {
  const [options, setOptions] = useState<MushafEditionOption[] | null>(null)
  // Controlled value (ME-P2): the persisted edition while idle, the newly
  // selected id immediately after an optimistic pick, reverted to the last
  // confirmed persist on a failed save.
  const [value, setValue] = useState(DEFAULT_READER_ASSET_PROFILE.mushafEditionId)
  const [saveFailed, setSaveFailed] = useState(false)
  const latestOperationRef = useRef(0)
  const optionsEpochRef = useRef(0)
  const persistedEditionIdRef = useRef(DEFAULT_READER_ASSET_PROFILE.mushafEditionId)
  const retryEditionIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())

  // ME-P4/ME-P7: options resolve once per mount and re-resolve on the window
  // `online` event (overlay reopen remounts the section). A failed
  // re-resolution preserves whatever is already shown — never worse data.
  const resolveOptions = useCallback(() => {
    const epoch = optionsEpochRef.current + 1
    optionsEpochRef.current = epoch
    void loadMushafEditionOptions()
      .then((loaded) => {
        if (optionsEpochRef.current !== epoch || !mountedRef.current) return
        setOptions(loaded)
      })
      .catch(() => {
        // ME-P7: an initial failure lands in the degraded state (one treatment
        // for every metadata-unavailable shape); a failed re-resolution
        // preserves whatever is already shown — never worse data (delta 7).
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

  // ME-P2 (advisor delta 6): when no persisted id is confirmable the shipped
  // baseline stays as the control value; a failed read never blanks a good
  // value and never leaks an unhandled rejection.
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
  // ME-P6: writes serialize through an in-component queue (the useSettingsForm
  // writeQueueRef idiom) because every native write opens its own connection
  // and transaction. Only the latest operation owns the optimistic value, the
  // failure state, the retry target, and the post-commit wake-up emit;
  // superseded operations commit (FIFO order puts the newest selection last)
  // but resolve silently. The emit always fires after a commit — the detail
  // read is best-effort and never classifies the write (ME-P6 separation),
  // and the emit is never gated on this component's mount lifetime.
  const selectEdition = useCallback((editionId: string) => {
    const operationId = latestOperationRef.current + 1
    latestOperationRef.current = operationId
    retryEditionIdRef.current = null
    setSaveFailed(false)
    setValue(editionId)
    const write = writeQueueRef.current.then(async () => {
      await writeMushafEditionSelection(editionId)
      persistedEditionIdRef.current = editionId
      if (latestOperationRef.current !== operationId) return
      const detail = await readNativeReactReaderPreferences().catch(() => ({}))
      if (latestOperationRef.current !== operationId) return
      emitReactReaderPreferencesChanged(detail)
    })
    writeQueueRef.current = write.catch(() => undefined)
    void write.catch(() => {
      // ME-P8: a stale failure never reverts a newer successful choice.
      if (latestOperationRef.current !== operationId || !mountedRef.current) return
      setValue(persistedEditionIdRef.current)
      setSaveFailed(true)
      retryEditionIdRef.current = editionId
    })
  }, [])

  // ME-P8: retry re-attempts the FAILED edition id, not the reverted value.
  const retryFailedSave = useCallback(() => {
    const failedEditionId = retryEditionIdRef.current
    if (failedEditionId !== null) selectEdition(failedEditionId)
  }, [selectEdition])

  // ME-P7: metadata unavailable (throw, SPA-fallback HTML, empty index).
  // ME-P10: options resolved but none matches the shown edition — the
  // primitive would silently mark the first pill selected, so render no
  // control and hand recovery to the existing boot missing-gate path.
  const unavailable = options !== null && options.length === 0
  const absent = options !== null && options.length > 0 && !options.some((edition) => edition.id === value)

  return (
    <SettingsGroup
      description="The Mushaf pages your reader displays. Offline downloads follow this choice."
      title="Mushaf edition"
    >
      <div aria-busy={options === null ? 'true' : undefined} className="qar:grid qar:gap-2 qar:px-4 qar:py-3">
        {options === null || unavailable || absent ? (
          <>
            <span className="qar-react-settings-row-label">Mushaf edition</span>
            {unavailable ? (
              <p className="qar:m-0 qar:text-sm qar:text-muted">Edition options unavailable right now</p>
            ) : null}
            {absent ? (
              <p className="qar:m-0 qar:text-sm qar:text-muted">Your selected Mushaf edition is no longer available</p>
            ) : null}
          </>
        ) : (
          <>
            <SegmentedControl
              label="Mushaf edition"
              onValueChange={selectEdition}
              options={options.map((edition) => ({
                label: edition.label,
                shortLabel: edition.shortLabel,
                value: edition.id,
              }))}
              value={value}
            />
            {saveFailed ? (
              <div className="qar:grid qar:gap-2">
                <p aria-live="polite" className="qar:m-0 qar:text-sm qar:leading-6 qar:text-danger" role="status">
                  Could not save Mushaf edition
                </p>
                <Button onClick={retryFailedSave} size="sm" type="button" variant="secondary">
                  Retry saving Mushaf edition
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </SettingsGroup>
  )
}
