<script lang="ts">
  /**
   * Mark editor bottom sheet.
   *
   * Opened imperatively via editor-bridge.ts::openEditor(verseKey).
   * Long-press is the ONLY entry point per CLAUDE.md Rule 4.
   *
   * Layout:
   * - Verse-preview header (shared verse-block grammar)
   * - Left col: Note textarea + Selected strip (count badge, Clear all, × chips)
   * - Right col: Tag search + All-tags region
   * - Pinned footer: Delete · Cancel · Save
   * - Delete → inline confirm → undo toast
   */

  import { onMount } from 'svelte'
  import { save, del, getByVerseKey, getAll } from './store'
  import { getSeedTags, getAllUsedTags } from './tags'
  import { getSurah, getSurahs } from '../data/dataset'
  import { validateTagLabel } from '../safety/input-validator'
  import { on } from '../core/events'
  import { Events } from '../core/constants'
  import { showUndoToast, clearUndoToast } from '../core/ui-bridge'
  import { markEditor } from '../state/mark-editor.svelte'
  import { registerEditor } from './editor-bridge'
  import TagChip from './TagChip.svelte'
  import type { Mark } from './store'

  const DIM_THRESHOLD = 7

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
  let selectedTags = $state<string[]>([])
  let allTags = $state<string[]>([])
  let searchQuery = $state('')
  let noteValue = $state('')
  let existingMark = $state<Mark | null>(null)

  // — Delete confirm state ——————————————————————————————————————————————————
  let confirmingDelete = $state(false)

  // — Derived values ——————————————————————————————————————————————————————
  const selectedSet = $derived(new Set(selectedTags))
  const unselected = $derived(allTags.filter(t => !selectedSet.has(t)))
  const q = $derived(searchQuery.trim().toLowerCase())
  const filteredUnselected = $derived(q ? unselected.filter(t => t.toLowerCase().includes(q)) : unselected)
  const dim = $derived(selectedTags.length >= DIM_THRESHOLD)
  const canSave = $derived(selectedTags.length > 0 || noteValue.trim().length > 0)

  // Validate "create" chip: only show when query has no exact match and is valid
  const createLabel = $derived((): string | null => {
    if (!q) { return null }
    if (allTags.some(t => t.toLowerCase() === q)) { return null }
    const validation = validateTagLabel(q)
    return validation.valid ? validation.label : null
  })

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
    searchQuery = ''

    const [existing, allMarksArr, surahs] = await Promise.all([
      getByVerseKey(vk),
      getAll().catch(() => [] as Mark[]),
      getSurahs().catch(() => [] as { n: number; name?: string; arabic?: string; type?: string; count?: number }[]),
    ])

    isExisting = !!existing
    existingMark = existing ?? null
    selectedTags = existing?.tags ?? []
    noteValue = existing?.note ?? ''

    // Build tag universe
    let tags: string[]
    if (allMarksArr.length > 0) {
      tags = await getAllUsedTags()
    } else {
      tags = getSeedTags().map(st => st.label)
    }
    // Ensure seed tags always appear
    const seedLabels = getSeedTags().map(st => st.label)
    for (const sl of seedLabels) {
      if (!tags.includes(sl)) { tags.push(sl) }
    }
    allTags = tags

    const meta = surahs.find(x => x.n === surahNum)
    surahName = meta?.name ?? ''

    markEditor.isOpen = true
    markEditor.currentVerseKey = vk
    markEditor.selectedTags = [...selectedTags]
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

    // Desktop focus
    const isDesktop = typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 640px)').matches
      : false
    if (isDesktop) {
      // focus search after a tick so the element is rendered
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('.qa-mark-search-input')
        input?.focus()
      }, 0)
    }
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
    searchQuery = ''

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

  // — Tag actions ———————————————————————————————————————————————————————
  function selectTag(tag: string) {
    if (!selectedSet.has(tag)) {
      selectedTags = [...selectedTags, tag]
      markEditor.selectedTags = [...selectedTags]
    }
  }

  function unselectTag(tag: string) {
    selectedTags = selectedTags.filter(t => t !== tag)
    markEditor.selectedTags = [...selectedTags]
  }

  function clearAll() {
    selectedTags = []
    markEditor.selectedTags = []
  }

  function createTag(label: string) {
    if (!allTags.includes(label)) { allTags = [...allTags, label] }
    selectedTags = [...selectedTags, label]
    markEditor.selectedTags = [...selectedTags]
    searchQuery = ''
  }

  function onNoteInput(e: Event) {
    noteValue = (e.target as HTMLTextAreaElement).value
    markEditor.draftNote = noteValue
  }

  // — Save / delete ————————————————————————————————————————————————————
  async function handleSave() {
    if (!canSave) { return }
    await save(verseKey, [...selectedTags], noteValue.trim())
    closeEditor()
  }

  async function handleConfirmDelete() {
    // Snapshot the $state-wrapped mark into a plain structured-cloneable
    // object. Without the snapshot, the proxied `tags` array can't be passed
    // to IDB.put() in onUndo below — IDB rejects proxies with DataCloneError.
    const rec: Mark | null = existingMark
      ? {
          verseKey: existingMark.verseKey,
          tags: [...existingMark.tags],
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
          await save(m.verseKey, m.tags, m.note ?? '')
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

      <!-- Left column: note + selected strip -->
      <div class="qa-mark-body-left">
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

        <div class="qa-mark-selected">
          <div class="qa-mark-selected-head">
            <span>Selected</span>
            <span class="qa-mark-selected-count">{selectedTags.length}</span>
            {#if selectedTags.length > 0}
              <button type="button" class="qa-mark-clear-all" onclick={clearAll}>Clear all</button>
            {/if}
          </div>
          <div class="qa-mark-chips qa-mark-chips--selected">
            {#if selectedTags.length === 0}
              <div class="qa-mark-selected-empty">No tags yet — pick one below or search.</div>
            {:else}
              {#each selectedTags as tag (tag)}
                <TagChip {tag} selected ontoggle={() => unselectTag(tag)} />
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <!-- Right column: search + all tags -->
      <div class="qa-mark-body-right">
        <div class="qa-mark-search">
          <span class="qa-mark-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            class="qa-mark-search-input"
            placeholder="Search or create a tag"
            aria-label="Search or create a tag"
            autocomplete="off"
            maxlength={40}
            bind:value={searchQuery}
          />
          <span class="qa-mark-search-count">
            {q ? (filteredUnselected.length === 1 ? '1 match' : `${filteredUnselected.length} matches`) : `${allTags.length} tags`}
          </span>
        </div>

        <div class="qa-mark-all-head">
          <span class="qa-mark-all-label">All tags</span>
          <span class="qa-mark-all-count">
            {filteredUnselected.length === 1 ? '1 unselected' : `${filteredUnselected.length} unselected`}
          </span>
        </div>

        <div class="qa-mark-chips qa-mark-chips--all">
          {#each filteredUnselected as tag (tag)}
            <TagChip {tag} {dim} ontoggle={() => selectTag(tag)} />
          {/each}
          {#if createLabel()}
            <TagChip tag={`+ create "${createLabel()}"`} create ontoggle={() => createTag(createLabel()!)} />
          {/if}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="qa-sheet-footer qa-mark-footer">
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

<style>
  .qa-mark-hdr {
    text-align: left;
    padding-bottom: 10px;
  }
  .qa-mark-ref {
    margin-left: auto;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-parchment);
  }
  .qa-mark-body { padding: 10px 14px 14px; }
  .qa-mark-quote {
    padding: 10px 12px;
    border-radius: 8px;
    border-left: 2px solid var(--qa-ambient-accent);
    background-color: color-mix(in srgb, var(--qa-ambient-accent) 6%, transparent);
    margin-bottom: 12px;
  }
  .qa-mark-quote-ref {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--qa-ambient-accent);
    margin-bottom: 6px;
  }
  .qa-mark-quote-ar {
    font-family: var(--qa-font-arabic);
    font-size: 1rem;
    line-height: 1.85;
    color: var(--qa-ambient-parchment);
    margin-bottom: 4px;
  }
  .qa-mark-quote-en {
    font-size: 0.8125rem;
    line-height: 1.55;
    color: var(--qa-ambient-muted);
  }
  .qa-mark-label {
    display: block;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--qa-ambient-accent);
    margin: 12px 0 6px;
  }
  .qa-mark-note {
    width: 100%;
    padding: 9px 11px;
    border: 1px solid var(--qa-ambient-border);
    border-radius: 8px;
    background-color: var(--qa-bg-primary);
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    resize: vertical;
    min-height: 44px;
  }
  .qa-mark-note:focus {
    outline: none;
    border-color: var(--qa-ambient-accent);
  }
  .qa-mark-selected {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--qa-ambient-border);
    background-color: color-mix(in srgb, var(--qa-ambient-accent) 4%, transparent);
    margin-top: 12px;
    margin-bottom: 10px;
  }
  .qa-mark-selected-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.625rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-accent);
    margin-bottom: 6px;
  }
  .qa-mark-selected-count {
    padding: 1px 6px;
    border-radius: 999px;
    background-color: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
    font-size: 0.625rem;
    font-weight: 700;
  }
  .qa-mark-clear-all {
    margin-left: auto;
    border: none;
    background: transparent;
    color: var(--qa-danger-fg);
    font-size: 0.6875rem;
    cursor: pointer;
    padding: 0;
  }
  .qa-mark-selected-empty {
    font-size: 0.75rem;
    font-style: italic;
    color: var(--qa-ambient-muted);
    padding: 4px 2px;
  }
  .qa-mark-search {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border: 1px solid var(--qa-ambient-border);
    border-radius: 8px;
    margin: 10px 0 8px;
  }
  .qa-mark-search-icon { color: var(--qa-ambient-accent); font-size: 0.875rem; }
  .qa-mark-search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
  }
  .qa-mark-search-count {
    font-size: 0.6875rem;
    color: var(--qa-ambient-muted);
  }
  .qa-mark-all-head {
    display: flex;
    align-items: center;
    margin: 6px 0;
  }
  .qa-mark-all-label {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--qa-ambient-accent);
  }
  .qa-mark-all-count {
    margin-left: auto;
    font-size: 0.6875rem;
    color: var(--qa-ambient-muted);
  }
  .qa-mark-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 2px;
  }
  .qa-mark-footer-spacer { flex: 1; }
  .qa-mark-btn {
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }
  .qa-mark-btn--ghost {
    border-color: var(--qa-ambient-border);
    color: var(--qa-ambient-parchment);
  }
  .qa-mark-btn--primary {
    background-color: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
    border-color: var(--qa-ambient-accent);
  }
  .qa-mark-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .qa-mark-btn--danger {
    color: var(--qa-danger-fg);
  }
  .qa-mark-btn--danger-primary {
    background-color: var(--qa-danger-bg);
    color: #fff;
    border-color: var(--qa-danger-border);
  }
  .qa-mark-btn--hidden { display: none; }
  .qa-mark-confirm-text {
    font-size: 0.8125rem;
    color: var(--qa-ambient-parchment);
    flex: 1;
  }

  /* Desktop 2-column layout */
  @media (min-width: 640px) {
    :global(.qa-sheet--mark) .qa-sheet-grip { display: none; }

    :global(.qa-sheet--mark) .qa-mark-quote {
      grid-column: 1 / -1;
      margin: 0 -14px 14px;
      padding: 18px 22px;
      background: linear-gradient(180deg,
        color-mix(in srgb, var(--qa-ambient-accent) 6%, transparent),
        transparent);
      border-left: none;
      border-bottom: 1px solid var(--qa-ambient-border);
      border-radius: 0;
      text-align: center;
    }
    :global(.qa-sheet--mark) .qa-mark-quote-ref { letter-spacing: 0.15em; }
    :global(.qa-sheet--mark) .qa-mark-quote-ar  { font-size: 1.375rem; line-height: 2; }
    :global(.qa-sheet--mark) .qa-mark-quote-en  {
      font-size: 0.9375rem;
      max-width: 520px;
      margin: 0 auto;
      font-style: italic;
    }

    :global(.qa-sheet--mark) .qa-mark-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      column-gap: 1.5rem;
      align-items: stretch;
    }
    :global(.qa-sheet--mark) .qa-mark-body > .qa-mark-quote { grid-column: 1 / -1; }
    :global(.qa-sheet--mark) .qa-mark-body-left,
    :global(.qa-sheet--mark) .qa-mark-body-right {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      gap: 0.5rem;
    }
    :global(.qa-sheet--mark) .qa-mark-body-left > .qa-mark-note {
      flex: 1 1 0;
      min-height: 96px;
      resize: none;
    }
    :global(.qa-sheet--mark) .qa-mark-body-left > .qa-mark-label,
    :global(.qa-sheet--mark) .qa-mark-body-left > .qa-mark-selected,
    :global(.qa-sheet--mark) .qa-mark-body-right > .qa-mark-search,
    :global(.qa-sheet--mark) .qa-mark-body-right > .qa-mark-all-head {
      flex: 0 0 auto;
    }
    :global(.qa-sheet--mark) .qa-mark-body-right > .qa-mark-chips--all {
      flex: 1 1 auto;
      align-content: flex-start;
    }
  }
</style>
