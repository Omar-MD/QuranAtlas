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
  import { tagSession } from '../tag/state.svelte'
  import { tagSheetBridge } from './sheet-bridge'
  import { LAYER_GROUPS, LAYER_LABELS, LAYER_TO_GROUP } from '../data/tag-layers'
  import { on } from '../core/events'
  import { Events } from '../core/constants'

  // Self-tracked open state — registered with tagSheetBridge on mount.
  // Pre-2026-05-01 these were prop-driven from App.svelte threading
  // tagSession.sheetOpen + tagSession.verseKey. Audit N22.
  let isOpen = $state(false)
  let verseKey = $state('')

  function onclose(): void {
    isOpen = false
    tagSession.end()
  }

  let surahName = $state('')
  let arText = $state('…')
  let enText = $state('…')
  let previousMark = $state<Mark | undefined>(undefined)
  let searchQuery = $state('')
  let previewCollapsed = $state(false)
  let confirmingDelete = $state(false)

  const draftCount = $derived.by(() => tagSession.totalSelected())
  const canSave = $derived(draftCount > 0)

  $effect(() => {
    if (!isOpen) { confirmingDelete = false }
  })

  $effect(() => {
    if (!isOpen || !verseKey) { return }
    const [surahStr, ayahStr] = verseKey.split(':')
    const surah = parseInt(surahStr ?? '1', 10)
    const ayah = parseInt(ayahStr ?? '1', 10)
    getSurahs().then((list) => { surahName = list.find((m) => m.n === surah)?.name ?? '' })
    getSurah(surah).then((s) => {
      arText = s?.ayat?.[ayah - 1]?.aya_text ?? '…'
      enText = ''
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
      note: tagSession.note,
    }
  }

  async function handleSave(): Promise<void> {
    if (!canSave) { return }
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
          note: m.note,
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
    tagSheetBridge.register({
      open: (vk: string) => { verseKey = vk; isOpen = true },
      close: onclose,
      isOpen: () => isOpen,
    })

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
      tagSheetBridge.unregister()
    }
  })
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <aside class="qa-ts" role="dialog" aria-modal="false" aria-label="Tag verse">
    <header class="qa-ts-hdr">
      <div class="qa-ts-hdr-text">
        <div class="qa-ts-title">Mark verse</div>
      </div>
      {#if draftCount > 0}
        <span class="qa-ts-count">{draftCount}<span class="qa-ts-count-lbl">&nbsp;TAGS</span></span>
      {/if}
      <button type="button" class="qa-ts-close" onclick={onclose} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
      </button>
    </header>

    <div class="qa-ts-body">
      <button
        type="button"
        class="qa-ts-preview"
        class:qa-ts-preview--collapsed={previewCollapsed}
        aria-expanded={!previewCollapsed}
        aria-label={previewCollapsed ? 'Expand verse' : 'Collapse verse'}
        onclick={() => previewCollapsed = !previewCollapsed}
      >
        <div class="qa-ts-preview-head">
          <span class="qa-ts-pref">{verseKey} · {surahName.toUpperCase()}</span>
          <svg class="qa-ts-preview-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 6 8 10 12 6"/>
          </svg>
        </div>
        {#if !previewCollapsed}
          <div class="qa-ts-par" dir="rtl">{arText}</div>
          <div class="qa-ts-pen">{enText}</div>
        {:else}
          <div class="qa-ts-pen qa-ts-pen--one-line">{enText}</div>
        {/if}
      </button>

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
                <span class="qa-ts-search-dot" data-group={LAYER_TO_GROUP[h.layer]}></span>
                <span class="qa-ts-search-val">{h.value}</span>
                <span class="qa-ts-search-lbl">{h.label}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      {#each LAYER_GROUPS as g (g.id)}
        {@const groupCount = g.layers.reduce((n, l) => n + tagSession.draft[l].length, 0)}
        <section class="qa-ts-grp" data-group={g.id}>
          <header class="qa-ts-grp-hdr">
            <span class="qa-ts-grp-name">{g.name}</span>
            {#if groupCount > 0}<span class="qa-ts-grp-count">{groupCount}</span>{/if}
          </header>
          <div class="qa-ts-layers">
            {#each g.layers as layer (layer)}
              <div class="qa-ts-layer" data-group={LAYER_TO_GROUP[layer]}>
                <div class="qa-ts-lbl">{LAYER_LABELS[layer]}</div>
                <div class="qa-ts-layer-body">
                  {#each tagSession.draft[layer] as v (v)}
                    <button
                      type="button"
                      class="qa-ts-hchip qa-ts-hchip--on"
                      aria-pressed="true"
                      onclick={() => toggle(layer, v)}
                    >
                      <span class="qa-ts-hchip-hash" aria-hidden="true">#</span>
                      <span class="qa-ts-hchip-val">{v}</span>
                      <span class="qa-ts-hchip-x" aria-hidden="true">×</span>
                    </button>
                  {/each}
                  <div class="qa-ts-combo">
                    <input
                      class="qa-ts-combo-input"
                      type="text"
                      placeholder={tagSession.draft[layer].length ? '+ add' : `+ ${LAYER_LABELS[layer]}`}
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
                            <span class="qa-ts-combo-hash" aria-hidden="true">#</span>{s}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </section>
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

    </div>

    <footer class="qa-ts-footer">
      {#if confirmingDelete}
        <span class="qa-ts-confirm-text">Delete this mark?</span>
        <button type="button" class="qa-ts-btn qa-ts-btn--ghost" onclick={() => confirmingDelete = false}>Keep</button>
        <button type="button" class="qa-ts-btn qa-ts-btn--danger-primary" onclick={handleDelete}>Delete</button>
      {:else}
        {#if previousMark}
          <button type="button" class="qa-ts-btn qa-ts-btn--danger" onclick={() => confirmingDelete = true} aria-label="Delete mark">Delete</button>
        {/if}
        <div class="qa-ts-meta"><span class="qa-ts-meta-kbd">⌘↵</span> COMMIT</div>
        <button type="button" class="qa-ts-btn qa-ts-btn--ghost qa-ts-cancel" onclick={onclose}>Cancel</button>
        <button type="button" class="qa-ts-btn qa-ts-btn--primary" disabled={!canSave} onclick={handleSave}>Save</button>
      {/if}
    </footer>
  </aside>
{/if}

