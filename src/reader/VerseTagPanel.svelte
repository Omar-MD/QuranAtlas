<script lang="ts">
  /**
   * Inline fast-path tag panel. Rendered inside the active verse under the
   * translation while `tagSession.quickbarOpen` is true for that verse.
   * Replaces the retired floating `tag/AmbientDock`.
   *
   * Structure: one row per LayerGroup that has at least one matching
   * QUICK_PICKS entry. Left: group label. Right: baseline-flowed chips
   * (`#value`) plus `+ add` inline type-to-create.
   */

  import { onMount } from 'svelte'
  import { tagSession } from '../state/tag-session.svelte'
  import { LAYER_GROUPS, LAYER_PREFIXES, QUICK_PICKS, hueForLayer, parseLayeredValue, autofillPrefix } from '../data/tag-layers'
  import type { LayerGroup } from '../data/tag-layers'
  import { save } from '../marks/store'
  import type { LayerName } from '../core/db'

  interface Props { verseKey: string }
  const { verseKey }: Props = $props()

  // All 4 layer groups always render, so every layer is reachable via `+ add`.
  // Each group's chip row surfaces: (1) seed QUICK_PICKS for layers in the
  // group, then (2) any additional values already on the draft (user-added
  // or pre-existing) so selections stay visible even without a seed.
  const groupedPicks = $derived.by(() => {
    return LAYER_GROUPS.map(g => {
      const picks: { layer: LayerName; value: string }[] = []
      const seen: Record<string, true> = {}
      for (const p of QUICK_PICKS) {
        if (!(g.layers as readonly LayerName[]).includes(p.layer)) { continue }
        const key = p.layer + ':' + p.value
        if (!seen[key]) { seen[key] = true; picks.push(p) }
      }
      for (const layer of g.layers) {
        for (const v of tagSession.draft[layer]) {
          const key = layer + ':' + v
          if (!seen[key]) { seen[key] = true; picks.push({ layer, value: v }) }
        }
      }
      return { ...g, picks }
    })
  })

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let editingGroup = $state<string | null>(null)
  let addValue = $state('')
  let addInputEl = $state<HTMLInputElement | null>(null)

  $effect(() => {
    if (editingGroup && addInputEl) {
      addInputEl.focus()
      addInputEl.select()
    }
  })

  function isOn(layer: LayerName, value: string): boolean {
    return tagSession.draft[layer].includes(value)
  }

  function scheduleSave(): void {
    if (saveTimer) { clearTimeout(saveTimer) }
    // Skip debounced save when draft is empty — store rejects empty marks.
    // Existing marks that go empty via toggle-off are left untouched here;
    // proper deletion flows through the deep sheet's Delete action.
    if (tagSession.totalSelected() === 0) { return }
    saveTimer = setTimeout(() => {
      const input = {
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
      void save(input).catch(() => { /* store emits failure */ })
    }, 350)
  }

  function toggle(layer: LayerName, value: string): void {
    tagSession.toggle(layer, value)
    scheduleSave()
  }

  let addError = $state(false)

  function commitAdd(group: LayerGroup): void {
    const raw = addValue.trim()
    if (!raw) { editingGroup = null; addValue = ''; addError = false; return }
    const parsed = parseLayeredValue(group, raw)
    if (!parsed) {
      // Prefix typed but didn't match a layer in this group — refuse commit
      // so a typo doesn't silently write into the default layer.
      addError = true
      return
    }
    if (!isOn(parsed.layer, parsed.value)) {
      tagSession.toggle(parsed.layer, parsed.value)
      scheduleSave()
    }
    editingGroup = null
    addValue = ''
    addError = false
  }

  function placeholderFor(group: LayerGroup): string {
    const first = group.layers[0] as LayerName
    const prefix = LAYER_PREFIXES[first][0] ?? first
    return `${prefix}:value`
  }

  /**
   * Autofill the layer prefix as the user types, selecting the completion
   * so the next keystroke either accepts it (`:` / letter after colon) or
   * replaces it. Only runs for insertText so backspace + delete don't
   * repaint the prefix the user is trying to shorten.
   */
  function handleAddInput(group: LayerGroup, e: Event): void {
    if (addError) { addError = false }
    const input = e.currentTarget as HTMLInputElement
    const native = e as InputEvent
    if (native.inputType && native.inputType !== 'insertText' && native.inputType !== 'insertFromPaste') {
      return
    }
    const caret = input.selectionStart ?? input.value.length
    const head = input.value.slice(0, caret)
    if (head.includes(':')) { return }
    const completion = autofillPrefix(group, head)
    if (!completion) { return }
    input.value = completion
    addValue = completion
    input.setSelectionRange(head.length, completion.length)
  }

  function openDeep(): void {
    tagSession.quickbarOpen = false
    tagSession.sheetOpen = true
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!tagSession.quickbarOpen) { return }
      if (e.key === 'Escape') { tagSession.end() }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        openDeep()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

<div class="qa-vtp" aria-label="Suggested tags">
  <button
    type="button"
    class="qa-vtp-close"
    aria-label="Exit fast-tag mode"
    title="Exit fast-tag"
    onclick={() => tagSession.end()}
    data-testid="vtp-close"
  >
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  </button>
  <button
    type="button"
    class="qa-vtp-escalate"
    aria-label="Open full tag editor"
    title="Full editor"
    onclick={openDeep}
  >
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <div class="qa-vtp-grid">
    {#each groupedPicks as g (g.id)}
      <div class="qa-vtp-label">{g.name}</div>
      <div class="qa-vtp-row">
        {#each g.picks as p (p.layer + ':' + p.value)}
          {@const on = isOn(p.layer, p.value)}
          <button
            type="button"
            class="qa-vtp-chip"
            class:qa-vtp-chip--on={on}
            style:--qa-chip-hue={hueForLayer(p.layer)}
            aria-pressed={on}
            onclick={() => toggle(p.layer, p.value)}
          >
            <span class="qa-vtp-hash" aria-hidden="true">#</span>
            <span class="qa-vtp-val">{p.value}</span>
          </button>
        {/each}

        {#if editingGroup === g.id}
          <span
            class="qa-vtp-chip qa-vtp-chip--editing"
            class:qa-vtp-chip--error={addError}
            style:--qa-chip-hue={hueForLayer((g.layers[0] as LayerName))}
            title={`Type ${g.layers.map(l => (LAYER_PREFIXES[l][0] ?? l) + ':…').join(' · ')}`}
          >
            <span class="qa-vtp-hash" aria-hidden="true">#</span>
            <input
              bind:this={addInputEl}
              class="qa-vtp-add-input"
              type="text"
              bind:value={addValue}
              oninput={(e) => handleAddInput(g, e)}
              onblur={() => commitAdd(g)}
              onkeydown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitAdd(g) }
                if (e.key === 'Escape') { e.preventDefault(); editingGroup = null; addValue = ''; addError = false }
              }}
              placeholder={placeholderFor(g)}
            />
          </span>
        {:else}
          <button
            type="button"
            class="qa-vtp-add"
            style:--qa-chip-hue={hueForLayer((g.layers[0] as LayerName))}
            onclick={() => { editingGroup = g.id; addValue = '' }}
          >
            <span class="qa-vtp-hash" aria-hidden="true">+</span>
            <span class="qa-vtp-val">add</span>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>
