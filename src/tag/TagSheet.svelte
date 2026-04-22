<script lang="ts">
  /**
   * Deep tagging sheet.
   *   Desktop ≥1180: fixed right-side vertical panel (~44vw), no backdrop.
   *   Mobile: bottom sheet, ~90vh, no backdrop.
   *
   * Sections: header · verse preview · search-all-layers · tabs · tab panel
   * (chips + combobox per layer) · note · flag buttons · footer.
   */

  import { onMount } from 'svelte'
  import { LAYER_NAMES } from '../core/db'
  import type { LayerName } from '../core/db'
  import { getSeedsForLayer } from '../core/seeds'
  import { save, del, getByVerseKey } from '../marks/store'
  import type { Mark } from '../marks/store'
  import { getSurah, getSurahs } from '../data/dataset'
  import { showUndoToast } from '../core/ui-bridge'
  import { tagSession } from '../state/tag-session.svelte'
  import { LAYER_GROUPS, LAYER_LABELS, hueForLayer } from '../data/tag-layers'
  import type { LayerGroup } from '../data/tag-layers'
  import { on } from '../core/events'
  import { Events } from '../core/constants'

  interface Props { isOpen: boolean; verseKey: string; onclose: () => void }
  const { isOpen, verseKey, onclose }: Props = $props()

  const GROUP_LABEL: Record<LayerGroup['id'], string> = {
    speech: 'Speech',
    narrative: 'Narrative',
    themes: 'Themes',
    entities: 'Entities',
  }

  let activeTab = $state<LayerGroup['id']>('speech')
  let surahName = $state('')
  let arText = $state('…')
  let enText = $state('…')
  let previousMark = $state<Mark | undefined>(undefined)
  let searchQuery = $state('')

  const draftCount = $derived.by(() => tagSession.totalSelected())

  $effect(() => {
    if (!isOpen || !verseKey) { return }
    const [surahStr, ayahStr] = verseKey.split(':')
    const surah = parseInt(surahStr ?? '1', 10)
    const ayah = parseInt(ayahStr ?? '1', 10)
    getSurahs().then((list) => { surahName = list.find((m) => m.n === surah)?.name ?? '' })
    getSurah(surah).then((s) => {
      arText = s?.ar?.[ayah - 1] ?? '…'
      enText = s?.en?.[ayah - 1] ?? '…'
    }).catch(() => { /* ignore */ })
    getByVerseKey(verseKey).then((m) => { previousMark = m }).catch(() => { /* ignore */ })
  })

  function toggle(layer: LayerName, value: string): void { tagSession.toggle(layer, value) }

  function buildInput(): Parameters<typeof save>[0] {
    return {
      verseKey,
      threads: [...tagSession.draft.threads],
      subjects: [...tagSession.draft.subjects],
      audience: [...tagSession.draft.audience],
      speaker: [...tagSession.draft.speaker],
      quotedSpeaker: [...tagSession.draft.quotedSpeaker],
      mode: [...tagSession.draft.mode],
      form: [...tagSession.draft.form],
      tone: [...tagSession.draft.tone],
      people: [...tagSession.draft.people],
      places: [...tagSession.draft.places],
      events: [...tagSession.draft.events],
      divineNames: [...tagSession.draft.divineNames],
      flags: { hasQuestion: tagSession.flagHasQuestion, hasApplication: tagSession.flagHasApplication },
      note: tagSession.note,
    }
  }

  async function handleSave(): Promise<void> {
    await save(buildInput())
    onclose()
  }

  async function handleDelete(): Promise<void> {
    // $state.snapshot unwraps the reactive proxy on previousMark so the
    // plain Mark can be passed through structured-clone (IDB put) during undo.
    const snapshot = previousMark ? $state.snapshot(previousMark) as Mark : undefined
    await del(verseKey)
    showUndoToast({
      verseKey,
      record: snapshot,
      onUndo: async (rec) => {
        const m = rec as Mark | undefined
        if (!m) { return }
        await save({
          verseKey: m.verseKey,
          threads: m.threads, subjects: m.subjects, audience: m.audience,
          speaker: m.speaker, quotedSpeaker: m.quotedSpeaker,
          mode: m.mode, form: m.form, tone: m.tone,
          people: m.people, places: m.places, events: m.events, divineNames: m.divineNames,
          flags: m.flags, note: m.note,
        })
      },
    })
    onclose()
  }

  const inputs = $state<Record<LayerName, string>>(
    LAYER_NAMES.reduce((a, l) => (a[l] = '', a), {} as Record<LayerName, string>)
  )
  let openFor = $state<LayerName | null>(null)

  function suggestions(layer: LayerName): string[] {
    const q = inputs[layer].trim().toLowerCase()
    const seeds = getSeedsForLayer(layer)
    const selected = new Set(tagSession.draft[layer])
    return seeds
      .filter((s) => !selected.has(s) && (!q || s.toLowerCase().includes(q)))
      .slice(0, 8)
  }

  function commit(layer: LayerName, value: string): void {
    const v = value.trim()
    if (!v) { return }
    if (!tagSession.draft[layer].includes(v)) { tagSession.draft[layer].push(v) }
    inputs[layer] = ''
  }

  type SearchHit = { layer: LayerName; label: string; value: string }
  const globalHits = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) { return [] as SearchHit[] }
    const out: SearchHit[] = []
    for (const layer of LAYER_NAMES) {
      const selected = new Set(tagSession.draft[layer])
      for (const seed of getSeedsForLayer(layer)) {
        if (selected.has(seed)) { continue }
        if (!seed.toLowerCase().includes(q)) { continue }
        out.push({ layer, label: LAYER_LABELS[layer], value: seed })
        if (out.length >= 12) { return out }
      }
    }
    return out
  })

  function addFromGlobal(hit: SearchHit): void {
    if (!tagSession.draft[hit.layer].includes(hit.value)) {
      tagSession.draft[hit.layer].push(hit.value)
    }
    searchQuery = ''
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) { return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void handleSave() }
      else if (e.key === 'Escape') { e.preventDefault(); onclose() }
    }
    window.addEventListener('keydown', onKey)
    // If another tab deletes/edits the verse we're currently editing, close
    // silently — mirrors the cross-tab invariant in user-journeys §I2.
    const unsubSync = on(Events.SYNC_UPDATE_RECEIVED, ({ verseKeys }) => {
      if (!isOpen || !verseKey) { return }
      if (Array.isArray(verseKeys) && verseKeys.includes(verseKey)) { onclose() }
    })
    return () => {
      window.removeEventListener('keydown', onKey)
      unsubSync()
    }
  })
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <aside class="qa-ts" role="dialog" aria-modal="false" aria-label="Tag verse">
    <header class="qa-ts-hdr">
      <div class="qa-ts-hdr-text">
        <div class="qa-ts-title">Mark verse</div>
        <div class="qa-ts-sub">{verseKey} · {surahName.toUpperCase()}</div>
      </div>
      {#if draftCount > 0}
        <span class="qa-ts-count">{draftCount}<span class="qa-ts-count-lbl">&nbsp;TAGS</span></span>
      {/if}
      <button type="button" class="qa-ts-close" onclick={onclose} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
      </button>
    </header>

    <div class="qa-ts-body">
      <div class="qa-ts-preview">
        <div class="qa-ts-pref">{verseKey} · {surahName.toUpperCase()}</div>
        <div class="qa-ts-par" dir="rtl">{arText}</div>
        <div class="qa-ts-pen">{enText}</div>
      </div>

      <div class="qa-ts-search">
        <svg class="qa-ts-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6"/><line x1="15" y1="15" x2="20" y2="20"/>
        </svg>
        <input
          class="qa-ts-search-input"
          type="text"
          placeholder="Search all layers…"
          bind:value={searchQuery}
        />
        <span class="qa-ts-kbd" aria-hidden="true">⌘</span>
        {#if globalHits.length}
          <div class="qa-ts-search-pop" role="listbox">
            {#each globalHits as h (h.layer + ':' + h.value)}
              <button
                type="button"
                class="qa-ts-search-row"
                onmousedown={(e) => { e.preventDefault(); addFromGlobal(h) }}
              >
                <span class="qa-ts-search-dot" style:background-color={hueForLayer(h.layer)}></span>
                <span class="qa-ts-search-val">{h.value}</span>
                <span class="qa-ts-search-lbl">{h.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="qa-ts-tabs" role="tablist">
        {#each LAYER_GROUPS as g (g.id)}
          {@const count = g.layers.reduce((n, l) => n + tagSession.draft[l].length, 0)}
          <button
            type="button"
            role="tab"
            class="qa-ts-tab"
            class:qa-ts-tab--on={activeTab === g.id}
            aria-selected={activeTab === g.id}
            onclick={() => activeTab = g.id}
          >
            <span class="qa-ts-tab-text">{GROUP_LABEL[g.id]}</span>
            {#if count > 0}<span class="qa-ts-tab-count">{count}</span>{/if}
          </button>
        {/each}
      </div>

      {#each LAYER_GROUPS as g (g.id)}
        {#if activeTab === g.id}
          <div class="qa-ts-layers" role="tabpanel">
            {#each g.layers as layer (layer)}
              <div class="qa-ts-layer">
                <div class="qa-ts-lbl">{LAYER_LABELS[layer]}</div>
                <div class="qa-ts-layer-body">
                  {#each tagSession.draft[layer] as v (v)}
                    <button
                      type="button"
                      class="qa-ts-chip qa-ts-chip--on"
                      onclick={() => toggle(layer, v)}
                    >
                      <span class="qa-ts-chip-dot" style:background-color={hueForLayer(layer)}></span>
                      {v}<span class="qa-ts-chip-x" aria-hidden="true">×</span>
                    </button>
                  {/each}
                  <div class="qa-ts-combo">
                    <input
                      class="qa-ts-combo-input"
                      type="text"
                      placeholder={tagSession.draft[layer].length ? '+ add' : `add ${LAYER_LABELS[layer]}…`}
                      bind:value={inputs[layer]}
                      onfocus={() => { openFor = layer }}
                      onblur={() => setTimeout(() => { if (openFor === layer) { openFor = null } }, 140)}
                      onkeydown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commit(layer, inputs[layer]) }
                        else if (e.key === 'Backspace' && inputs[layer] === '') {
                          const arr = tagSession.draft[layer]
                          if (arr.length) { arr.pop() }
                        }
                      }}
                    />
                    {#if openFor === layer && suggestions(layer).length}
                      <div class="qa-ts-combo-pop">
                        {#each suggestions(layer) as s (s)}
                          <button
                            type="button"
                            class="qa-ts-combo-row"
                            onmousedown={(e) => { e.preventDefault(); commit(layer, s) }}
                          >
                            <span class="qa-ts-chip-dot" style:background-color={hueForLayer(layer)}></span>{s}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/each}

      <div class="qa-ts-note">
        <div class="qa-ts-note-hdr">
          <span class="qa-ts-note-lbl">NOTE</span>
          <span class="qa-ts-note-count">{tagSession.note.length}/500</span>
        </div>
        <textarea
          class="qa-ts-note-area"
          maxlength="500"
          placeholder="A thought to revisit…"
          bind:value={tagSession.note}
        ></textarea>
      </div>

      <div class="qa-ts-flags" role="group" aria-label="Flags">
        <button
          type="button"
          class="qa-ts-flag"
          class:qa-ts-flag--on={tagSession.flagHasQuestion}
          onclick={() => tagSession.flagHasQuestion = !tagSession.flagHasQuestion}
          aria-pressed={tagSession.flagHasQuestion}
        >
          <span class="qa-ts-flag-icon">?</span>Open question
        </button>
        <button
          type="button"
          class="qa-ts-flag"
          class:qa-ts-flag--on={tagSession.flagHasApplication}
          onclick={() => tagSession.flagHasApplication = !tagSession.flagHasApplication}
          aria-pressed={tagSession.flagHasApplication}
        >
          <span class="qa-ts-flag-icon">✓</span>To apply
        </button>
      </div>
    </div>

    <footer class="qa-ts-footer">
      <button type="button" class="qa-ts-btn qa-ts-btn--danger" onclick={handleDelete}>Delete</button>
      <div class="qa-ts-meta"><span class="qa-ts-meta-kbd">⌘↵</span> COMMIT</div>
      <button type="button" class="qa-ts-btn qa-ts-btn--ghost qa-ts-cancel" onclick={onclose}>Cancel</button>
      <button type="button" class="qa-ts-btn qa-ts-btn--primary" onclick={handleSave}>Save</button>
    </footer>
  </aside>
{/if}

<style>
  /* Mobile: bottom sheet, hug content height, internal scroll when overflowing */
  .qa-ts {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    max-height: calc(100vh - 32px);
    background: var(--qa-bg-primary);
    z-index: 200;
    display: flex;
    flex-direction: column;
    border-top-left-radius: var(--qa-ambient-sheet-radius, 16px);
    border-top-right-radius: var(--qa-ambient-sheet-radius, 16px);
    border-top: 1px solid var(--qa-ambient-border);
    box-shadow: 0 -14px 40px rgba(0, 0, 0, 0.18);
    --ts-pad: 22px;
  }

  /* Desktop: right-side panel, full height, no backdrop */
  @media (min-width: 1180px) {
    .qa-ts {
      left: auto;
      right: 0;
      top: 0;
      bottom: 0;
      max-height: none;
      width: min(560px, 44vw);
      border-top-left-radius: 0;
      border-top-right-radius: 0;
      border-top: none;
      border-left: 1px solid var(--qa-ambient-border);
      box-shadow: -14px 0 40px rgba(0, 0, 0, 0.10);
      --ts-pad: 22px;
    }
  }

  .qa-ts-hdr {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px var(--ts-pad) 12px;
    border-bottom: 1px solid var(--qa-ambient-border);
  }
  .qa-ts-hdr-text { flex: 1; }
  .qa-ts-title {
    font-family: 'Lora', Georgia, serif;
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--qa-ambient-parchment);
  }
  .qa-ts-sub {
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-dim);
    margin-top: 2px;
  }
  .qa-ts-count {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--qa-ambient-accent-soft);
    color: var(--qa-ambient-accent);
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
  }
  .qa-ts-count-lbl { font-weight: 600; }
  @media (max-width: 1179px) {
    .qa-ts-count { padding: 3px 9px; }
    .qa-ts-count-lbl { display: none; }
  }
  .qa-ts-close {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--qa-ambient-dim);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .qa-ts-close svg { width: 16px; height: 16px; }
  .qa-ts-close:hover { color: var(--qa-ambient-parchment); background: var(--qa-ambient-accent-soft); }

  .qa-ts-body {
    padding: 14px var(--ts-pad) 16px;
    overflow-y: auto;
    flex: 1;
  }

  .qa-ts-preview {
    padding: 14px 16px;
    margin-bottom: 16px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--qa-ambient-surface) 95%, transparent);
  }
  .qa-ts-pref {
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.625rem;
    letter-spacing: 0.12em;
    color: var(--qa-ambient-dim);
    margin-bottom: 6px;
  }
  .qa-ts-par {
    font-family: var(--qa-font-arabic);
    font-size: 1.0625rem;
    line-height: 1.9;
    color: var(--qa-text-arabic);
    margin-bottom: 6px;
  }
  .qa-ts-pen {
    font-family: var(--qa-font-translation);
    font-size: 0.8125rem;
    line-height: 1.55;
    color: var(--qa-text-secondary);
  }

  .qa-ts-search {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 1px solid var(--qa-ambient-border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--qa-ambient-surface) 40%, transparent);
    margin-bottom: 14px;
  }
  .qa-ts-search-icon { width: 16px; height: 16px; color: var(--qa-ambient-dim); flex-shrink: 0; }
  .qa-ts-search-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.875rem;
    outline: none;
  }
  .qa-ts-search-input::placeholder { color: var(--qa-ambient-dim); }
  .qa-ts-kbd {
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--qa-border-subtle);
    background: var(--qa-bg-secondary);
    color: var(--qa-ambient-dim);
    font-size: 0.625rem;
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  }
  .qa-ts-search-pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    padding: 4px;
    border-radius: 10px;
    background: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 1px;
    max-height: 240px;
    overflow-y: auto;
  }
  .qa-ts-search-row {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 9px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    text-align: left;
  }
  .qa-ts-search-row:hover { background: var(--qa-ambient-accent-soft); }
  .qa-ts-search-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .qa-ts-search-val { flex: 1; font-weight: 500; }
  .qa-ts-search-lbl {
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.625rem;
    letter-spacing: 0.1em;
    color: var(--qa-ambient-dim);
    text-transform: uppercase;
  }

  .qa-ts-tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid var(--qa-border-subtle);
    margin-bottom: 16px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .qa-ts-tabs::-webkit-scrollbar { display: none; }
  .qa-ts-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border: none;
    background: transparent;
    color: var(--qa-ambient-dim);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .qa-ts-tab:hover { color: var(--qa-ambient-parchment); background: color-mix(in srgb, var(--qa-ambient-accent-soft) 60%, transparent); }
  .qa-ts-tab--on {
    color: var(--qa-ambient-parchment);
    font-weight: 600;
    background: color-mix(in srgb, var(--qa-ambient-accent-soft) 40%, transparent);
  }
  @media (min-width: 1180px) {
    .qa-ts-tab--on { background: transparent; }
    .qa-ts-tab:hover { background: transparent; }
  }
  .qa-ts-tab--on::after {
    content: '';
    position: absolute;
    left: 8px; right: 8px; bottom: -1px;
    height: 2px;
    background: var(--qa-ambient-accent);
    border-radius: 1px;
  }
  .qa-ts-tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.625rem;
    font-weight: 700;
  }

  .qa-ts-layers { display: flex; flex-direction: column; gap: 8px; }
  .qa-ts-layer {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 12px;
    align-items: start;
    padding: 8px 0;
  }
  .qa-ts-lbl {
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.12em;
    color: var(--qa-ambient-dim);
    text-transform: uppercase;
    font-weight: 600;
    padding-top: 6px;
  }
  .qa-ts-layer-body {
    display: flex;
    flex-wrap: nowrap;
    gap: 5px;
    align-items: center;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
  }
  .qa-ts-layer-body::-webkit-scrollbar { display: none; }
  .qa-ts-layer-body > * { flex-shrink: 0; }

  .qa-ts-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 9px 4px 8px;
    border-radius: 999px;
    border: 1px solid var(--qa-ambient-border);
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }
  .qa-ts-chip--on {
    background: color-mix(in srgb, var(--qa-ambient-accent) 14%, transparent);
    border-color: color-mix(in srgb, var(--qa-ambient-accent) 45%, transparent);
    font-weight: 500;
  }
  .qa-ts-chip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .qa-ts-chip-x { opacity: 0.6; margin-left: 2px; color: var(--qa-ambient-dim); }

  .qa-ts-combo { position: relative; display: inline-flex; }
  .qa-ts-combo-input {
    min-width: 100px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px dashed var(--qa-ambient-border);
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    outline: none;
  }
  .qa-ts-combo-input::placeholder { color: var(--qa-ambient-dim); }
  .qa-ts-combo-input:focus { border-color: var(--qa-ambient-accent); border-style: solid; }
  .qa-ts-combo-pop {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 200px;
    padding: 4px;
    border-radius: 10px;
    background: var(--qa-ambient-surface);
    border: 1px solid var(--qa-ambient-border);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .qa-ts-combo-row {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 9px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    text-align: left;
  }
  .qa-ts-combo-row:hover { background: var(--qa-ambient-accent-soft); }

  .qa-ts-note { margin-top: 16px; }
  .qa-ts-note-hdr {
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.12em;
    color: var(--qa-ambient-dim);
    margin-bottom: 6px;
  }
  .qa-ts-note-lbl { font-weight: 600; text-transform: uppercase; }
  .qa-ts-note-count { font-weight: 500; }
  .qa-ts-note-area {
    width: 100%;
    min-height: 72px;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid var(--qa-ambient-border);
    background: var(--qa-bg-primary);
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-family: var(--qa-font-translation);
    font-size: 0.9375rem;
    line-height: 1.5;
    resize: vertical;
    box-sizing: border-box;
  }
  .qa-ts-note-area:focus { outline: none; border-color: var(--qa-ambient-accent); }

  .qa-ts-flags {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .qa-ts-flag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--qa-ambient-border);
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }
  .qa-ts-flag:hover { background: var(--qa-ambient-accent-soft); }
  .qa-ts-flag--on {
    background: var(--qa-ambient-accent);
    color: var(--qa-on-accent);
    border-color: transparent;
    font-weight: 600;
  }
  .qa-ts-flag-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--qa-ambient-accent) 14%, transparent);
    color: var(--qa-ambient-accent);
    font-weight: 700;
    font-size: 0.6875rem;
  }
  .qa-ts-flag--on .qa-ts-flag-icon {
    background: color-mix(in srgb, var(--qa-on-accent) 20%, transparent);
    color: var(--qa-on-accent);
  }

  .qa-ts-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px var(--ts-pad);
    border-top: 1px solid var(--qa-ambient-border);
    background: color-mix(in srgb, var(--qa-ambient-surface) 75%, transparent);
  }
  .qa-ts-meta {
    flex: 1;
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.625rem;
    letter-spacing: 0.14em;
    color: var(--qa-ambient-dim);
    text-align: center;
  }
  .qa-ts-meta-kbd {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid var(--qa-border-subtle);
    background: var(--qa-bg-secondary);
    color: var(--qa-ambient-dim);
    margin-right: 4px;
    font-size: 0.6875rem;
  }
  .qa-ts-btn {
    padding: 8px 16px;
    border-radius: 999px;
    border: 1px solid transparent;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }
  .qa-ts-btn--primary { background: var(--qa-ambient-accent); color: var(--qa-on-accent); }
  .qa-ts-btn--primary:hover { filter: brightness(1.06); }
  .qa-ts-btn--ghost   { background: transparent; color: var(--qa-ambient-parchment); border-color: var(--qa-ambient-border); }
  .qa-ts-btn--danger  { background: transparent; color: var(--qa-color-error, #b91c1c); border-color: transparent; padding: 8px 0; }
  .qa-ts-btn--danger:hover { text-decoration: underline; }

  @media (max-width: 1179px) {
    .qa-ts-cancel { display: none; }
    .qa-ts-meta { font-size: 0.625rem; }
  }
</style>
