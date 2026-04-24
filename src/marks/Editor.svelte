<script lang="ts">
  /**
   * Mark editor bottom sheet.
   *
   * Opened imperatively via editor-bridge.ts::openEditor(verseKey).
   * Long-press is the ONLY entry point per CLAUDE.md Rule 4.
   *
   * Layout:
   * - Verse-preview header (shared verse-block grammar)
   * - Note textarea
   * - 12 TagLayerRegion sections (collapsible, search, chip pool per layer)
   * - Pinned footer: Delete · Cancel · Save
   * - Delete → inline confirm → undo toast
   */

  import { onMount } from 'svelte'
  import { save, del, getByVerseKey, getAllCanonicalValues } from './store'
  import { getSurah, getSurahs } from '../data/dataset'
  import { on } from '../core/events'
  import { Events } from '../core/constants'
  import { showUndoToast, clearUndoToast } from '../core/ui-bridge'
  import { markEditor } from '../state/mark-editor.svelte'
  import { registerEditor } from './editor-bridge'
  import { LAYER_NAMES } from '../core/db'
  import type { LayerName } from '../core/db'
  import { getSeedsForLayer } from '../core/seeds'
  import TagLayerRegion from './TagLayerRegion.svelte'
  import type { Mark } from './store'

  type LayerMap = Record<LayerName, string[]>

  function emptyLayerMap(): LayerMap {
    return {
      threads: [], subjects: [], audience: [], speaker: [], quotedSpeaker: [],
      mode: [], form: [], tone: [],
      people: [], places: [], events: [], divineNames: [],
    }
  }

  // — Sheet open state ———————————————————————————————————————————————————
  let isOpen = $state(false)
  let verseKey = $state('')

  // — Verse preview data ——————————————————————————————————————————————————
  let surahNum = $state(0)
  let verseNum = $state(0)
  let surahName = $state('')
  let arText = $state('…')
  let enText = $state('…')

  // — Editor data ——————————————————————————————————————————————————————————
  let isExisting = $state(false)
  let noteValue = $state('')
  let existingMark = $state<Mark | null>(null)

  // Per-layer state
  let selectedByLayer = $state<LayerMap>(emptyLayerMap())
  let allByLayer = $state<LayerMap>(emptyLayerMap())
  const collapsedByLayer = $state<Record<LayerName, boolean>>({
    threads: false, audience: false, mode: false,
    subjects: true, speaker: true, quotedSpeaker: true,
    form: true, tone: true,
    people: true, places: true, events: true, divineNames: true,
  })

  // — Delete confirm state ——————————————————————————————————————————————————
  let confirmingDelete = $state(false)

  // — Derived values ——————————————————————————————————————————————————————
  const totalSelected = $derived(
    LAYER_NAMES.reduce((sum, l) => sum + selectedByLayer[l].length, 0)
  )
  const canSave = $derived(totalSelected > 0)

  // — History / keyboard management ————————————————————————————————————————
  let _historyPushed = false
  let _escHandler: ((e: KeyboardEvent) => void) | null = null
  let _popstateHandler: (() => void) | null = null

  // — Open / close ————————————————————————————————————————————————————————
  async function openEditor(vk: string): Promise<void> {
    clearUndoToast()
    closeEditor()

    verseKey = vk
    const parts = vk.split(':')
    surahNum = parseInt(parts[0] ?? '0', 10)
    verseNum = parseInt(parts[1] ?? '0', 10)
    arText = '…'
    enText = '…'
    surahName = ''
    confirmingDelete = false

    const [existing, surahs] = await Promise.all([
      getByVerseKey(vk),
      getSurahs().catch(() => [] as { n: number; name?: string; arabic?: string; type?: string; count?: number }[]),
    ])

    isExisting = !!existing
    existingMark = existing ?? null
    noteValue = existing?.note ?? ''

    // Build per-layer selected + all (seeds ∪ canonicals ∪ existing)
    const newSelected = emptyLayerMap()
    const newAll = emptyLayerMap()

    for (const layer of LAYER_NAMES) {
      newSelected[layer] = existing ? [...existing[layer]] : []
      const seeds = getSeedsForLayer(layer)
      const canonicals = await getAllCanonicalValues(layer)
      const union = new Set<string>([...seeds, ...canonicals, ...newSelected[layer]])
      newAll[layer] = [...union].sort()
    }

    selectedByLayer = newSelected
    allByLayer = newAll

    const meta = surahs.find(x => x.n === surahNum)
    surahName = meta?.name ?? ''

    // Sync global mark-editor state (flatten all selected tags for consumers)
    const allSelected = LAYER_NAMES.flatMap(l => newSelected[l])
    markEditor.isOpen = true
    markEditor.currentVerseKey = vk
    markEditor.selectedTags = allSelected
    markEditor.draftNote = noteValue

    isOpen = true

    // Load verse text asynchronously
    getSurah(surahNum).then(data => {
      if (Array.isArray(data?.ar)) {
        arText = data.ar[verseNum - 1] ?? '…'
      }
      if (Array.isArray(data?.en)) {
        enText = data.en[verseNum - 1] ?? '…'
      }
    }).catch(() => { /* keep ellipses */ })

    // History entry for browser-back
    _popstateHandler = () => { if (isOpen) { closeEditor() } }
    window.addEventListener('popstate', _popstateHandler)
    history.pushState({ modal: 'mark-editor' }, '')
    _historyPushed = true

    _escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') { closeEditor() } }
    document.addEventListener('keydown', _escHandler)
  }

  function closeEditor() {
    if (!isOpen) { return }
    isOpen = false

    markEditor.isOpen = false
    markEditor.currentVerseKey = null
    markEditor.selectedTags = []
    markEditor.draftNote = ''

    existingMark = null
    confirmingDelete = false

    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler)
      _escHandler = null
    }
    if (_popstateHandler) {
      window.removeEventListener('popstate', _popstateHandler)
      _popstateHandler = null
    }
    if (_historyPushed) {
      _historyPushed = false
      history.back()
    }
  }

  function onNoteInput(e: Event) {
    noteValue = (e.target as HTMLTextAreaElement).value
    markEditor.draftNote = noteValue
  }

  // — Save / delete ————————————————————————————————————————————————————
  async function handleSave() {
    if (!canSave) { return }
    // Spread each layer into a plain array — $state-proxied arrays can't be
    // cloned by IDB (DataCloneError), so we must deproxy before passing to save().
    await save({
      verseKey,
      threads: [...selectedByLayer.threads],
      subjects: [...selectedByLayer.subjects],
      audience: [...selectedByLayer.audience],
      speaker: [...selectedByLayer.speaker],
      quotedSpeaker: [...selectedByLayer.quotedSpeaker],
      mode: [...selectedByLayer.mode],
      form: [...selectedByLayer.form],
      tone: [...selectedByLayer.tone],
      people: [...selectedByLayer.people],
      places: [...selectedByLayer.places],
      events: [...selectedByLayer.events],
      divineNames: [...selectedByLayer.divineNames],
      note: noteValue.trim(),
    })
    closeEditor()
  }

  async function handleConfirmDelete() {
    // Snapshot the $state-wrapped mark into a plain structured-cloneable
    // object. Without the snapshot, the proxied arrays can't be passed
    // to IDB.put() in onUndo below — IDB rejects proxies with DataCloneError.
    const rec: Mark | null = existingMark
      ? {
          verseKey: existingMark.verseKey,
          threads: [...existingMark.threads],
          subjects: [...existingMark.subjects],
          audience: [...existingMark.audience],
          speaker: [...existingMark.speaker],
          quotedSpeaker: [...existingMark.quotedSpeaker],
          mode: [...existingMark.mode],
          form: [...existingMark.form],
          tone: [...existingMark.tone],
          people: [...existingMark.people],
          places: [...existingMark.places],
          events: [...existingMark.events],
          divineNames: [...existingMark.divineNames],
          _canon: { ...existingMark._canon },
          note: existingMark.note ?? '',
          createdAt: existingMark.createdAt,
          updatedAt: existingMark.updatedAt,
        }
      : null
    await del(verseKey)
    closeEditor()
    if (rec) {
      showUndoToast({
        verseKey,
        record: rec,
        onUndo: async (r) => {
          const m = r as Mark
          await save({
            verseKey: m.verseKey,
            threads: m.threads, subjects: m.subjects, audience: m.audience,
            speaker: m.speaker, quotedSpeaker: m.quotedSpeaker,
            mode: m.mode, form: m.form, tone: m.tone,
            people: m.people, places: m.places, events: m.events, divineNames: m.divineNames,
            note: m.note ?? '',
          })
        },
        onComplete: () => { /* no-op */ },
      })
    }
  }

  // — Event subscriptions ——————————————————————————————————————————————
  onMount(() => {
    registerEditor(openEditor)

    const unsub = on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => {
      if (markEditor.currentVerseKey && verseKeys.includes(markEditor.currentVerseKey)) {
        closeEditor()
      }
    })

    return () => {
      unsub()
      if (_escHandler) { document.removeEventListener('keydown', _escHandler) }
      if (_popstateHandler) { window.removeEventListener('popstate', _popstateHandler) }
    }
  })
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="qa-sheet-backdrop" onclick={closeEditor}></div>
  <div
    class="qa-sheet qa-sheet--bottom qa-sheet--mark"
    role="dialog"
    aria-modal="true"
    aria-label="Mark verse {verseKey}"
  >
    <div class="qa-sheet-grip" aria-hidden="true"></div>

    <div class="qa-sheet-hdr qa-mark-hdr">
      <div class="qa-sheet-title">{isExisting ? 'Edit mark' : 'New mark'}</div>
      <div class="qa-mark-ref">{surahNum}&nbsp;:&nbsp;{verseNum}</div>
    </div>

    <div class="qa-sheet-body qa-mark-body">
      <!-- Verse preview -->
      <div class="qa-mark-quote">
        <div class="qa-mark-quote-ref">{verseKey} · {surahName}</div>
        <div class="qa-mark-quote-ar" dir="rtl">{arText}</div>
        <div class="qa-mark-quote-en">{enText}</div>
      </div>

      <!-- Note -->
      <label class="qa-mark-label" for="qa-mark-note-input">Note (optional)</label>
      <textarea
        id="qa-mark-note-input"
        class="qa-mark-note"
        rows={2}
        maxlength={500}
        placeholder="A thought to revisit…"
        value={noteValue}
        oninput={onNoteInput}
      ></textarea>

      <!-- 12 layer regions -->
      <div class="qa-mark-layers">
        {#each LAYER_NAMES as layer (layer)}
          <TagLayerRegion
            label={layer}
            bind:selected={selectedByLayer[layer]}
            bind:all={allByLayer[layer]}
            bind:collapsed={collapsedByLayer[layer]}
          />
        {/each}
      </div>
    </div>

    <!-- Footer -->
    <div>
      {#if confirmingDelete}
        <div class="qa-mark-confirm-text">Delete this mark?</div>
        <button type="button" class="qa-mark-btn qa-mark-btn--ghost" onclick={() => { confirmingDelete = false }}>Keep</button>
        <button type="button" class="qa-mark-btn qa-mark-btn--danger-primary" onclick={handleConfirmDelete}>Delete</button>
      {:else}
        <button
          type="button"
          class="qa-mark-btn qa-mark-btn--danger"
          class:qa-mark-btn--hidden={!isExisting}
          data-action="delete"
          onclick={() => { confirmingDelete = true }}
        >⌫ Delete</button>
        <div class="qa-mark-footer-spacer"></div>
        <button type="button" class="qa-mark-btn qa-mark-btn--ghost" onclick={closeEditor}>Cancel</button>
        <button
          type="button"
          class="qa-mark-btn qa-mark-btn--primary"
          disabled={!canSave}
          onclick={handleSave}
        >Save</button>
      {/if}
    </div>
  </div>
{/if}

