<script lang="ts">
  /**
   * Fast-path tagging chrome. Floats bottom-center when `tagSession.quickbarOpen`
   * is true. Suggests tags for the active verse; tap to accept into the draft.
   *
   * Layout:
   *   ↑ Suggested for <verseKey>   [1] [2]   accept   ⌘
   *   ✓ tawhid   + al-hayy   + majesty   More...
   */

  import { onMount } from 'svelte'
  import { tagSession } from '../state/tag-session.svelte'
  import { QUICK_PICKS, hueForLayer } from '../data/tag-layers'
  import { save } from '../marks/store'
  import type { LayerName } from '../core/db'

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function isOn(layer: LayerName, value: string): boolean {
    return tagSession.draft[layer].includes(value)
  }

  function toggle(layer: LayerName, value: string): void {
    tagSession.toggle(layer, value)
    scheduleSave()
  }

  function scheduleSave(): void {
    if (saveTimer) { clearTimeout(saveTimer) }
    const key = tagSession.verseKey
    if (!key) { return }
    saveTimer = setTimeout(() => {
      const input = {
        verseKey: key,
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
      void save(input).catch(() => { /* store emits failure */ })
    }, 350)
  }

  function acceptAll(): void {
    for (const p of QUICK_PICKS) {
      if (!isOn(p.layer, p.value)) { tagSession.toggle(p.layer, p.value) }
    }
    scheduleSave()
  }

  function openMore(): void {
    tagSession.quickbarOpen = false
    tagSession.sheetOpen = true
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!tagSession.quickbarOpen) { return }
      if (e.key === 'Escape') { tagSession.end() }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        openMore()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

{#if tagSession.quickbarOpen && tagSession.verseKey}
  <div class="qa-qb" role="toolbar" aria-label="Suggested tags">
    <div class="qa-qb-head">
      <span class="qa-qb-caret" aria-hidden="true">↑</span>
      <span class="qa-qb-label">Suggested for</span>
      <span class="qa-qb-vk">{tagSession.verseKey}</span>
      <span class="qa-qb-spacer"></span>
      <button type="button" class="qa-qb-accept qa-qb-desktop-only" onclick={acceptAll}>accept</button>
      <span class="qa-qb-kbd qa-qb-mobile-only" aria-hidden="true">⌘</span>
    </div>

    <div class="qa-qb-chips">
      {#each QUICK_PICKS as p (p.layer + ':' + p.value)}
        {@const on = isOn(p.layer, p.value)}
        <button
          type="button"
          class="qa-qb-chip"
          class:qa-qb-chip--on={on}
          style:--qa-chip-hue={hueForLayer(p.layer)}
          onclick={() => toggle(p.layer, p.value)}
          aria-pressed={on}
        >
          <span class="qa-qb-chip-mark">{on ? '✓' : '+'}</span>
          <span>{p.value}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

