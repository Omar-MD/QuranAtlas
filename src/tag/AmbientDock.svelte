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

<style>
  .qa-qb {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px 14px;
    border-radius: var(--qa-radius-4xl);
    background-color: color-mix(in srgb, var(--qa-ambient-surface) 96%, transparent);
    border: 1px solid var(--qa-ambient-border);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.12);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    z-index: 110;
    width: min(560px, calc(100vw - 24px));
    box-sizing: border-box;
    animation: qa-qb-in var(--qa-transition-base) forwards;
  }
  @media (max-width: 1179px) {
    .qa-qb-desktop-only { display: none !important; }
  }
  @media (min-width: 1180px) {
    .qa-qb-mobile-only  { display: none !important; }
  }
  :global(html[data-theme="dark"]) .qa-qb {
    background-color: rgba(20, 18, 12, 0.94);
  }

  .qa-qb-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--qa-font-mono);
    font-size: 0.75rem;
    color: var(--qa-ambient-dim);
  }
  .qa-qb-caret { color: var(--qa-ambient-accent); font-size: 0.85rem; }
  .qa-qb-label { color: var(--qa-ambient-dim); }
  .qa-qb-vk {
    color: var(--qa-ambient-parchment);
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .qa-qb-spacer { flex: 1; }
  .qa-qb-accept {
    padding: 4px 10px;
    border-radius: var(--qa-radius-sm);
    border: none;
    background: transparent;
    color: var(--qa-ambient-accent);
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  .qa-qb-accept:hover { background: var(--qa-ambient-accent-soft); }
  .qa-qb-kbd {
    padding: 2px 6px;
    border-radius: var(--qa-radius-xs);
    background: var(--qa-bg-secondary);
    border: 1px solid var(--qa-ambient-border);
    font-size: 0.625rem;
    color: var(--qa-ambient-dim);
  }

  .qa-qb-chips {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    margin: 0 -4px;
    padding: 0 4px;
  }
  .qa-qb-chips::-webkit-scrollbar { display: none; }
  .qa-qb-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px 5px 8px;
    border-radius: var(--qa-radius-pill);
    border: 1px dashed color-mix(in srgb, var(--qa-chip-hue, var(--qa-ambient-border)) 60%, transparent);
    background: transparent;
    color: var(--qa-ambient-parchment);
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    flex-shrink: 0;
  }
  .qa-qb-chip:hover {
    background: color-mix(in srgb, var(--qa-chip-hue, var(--qa-ambient-accent)) 10%, transparent);
  }
  .qa-qb-chip--on {
    background: color-mix(in srgb, var(--qa-chip-hue, var(--qa-ambient-accent)) 18%, transparent);
    border-color: color-mix(in srgb, var(--qa-chip-hue, var(--qa-ambient-accent)) 60%, transparent);
    border-style: solid;
    color: var(--qa-ambient-parchment);
    font-weight: 500;
  }
  .qa-qb-chip-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: var(--qa-radius-circle);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--qa-chip-hue, var(--qa-ambient-accent));
  }
  .qa-qb-chip--on .qa-qb-chip-mark {
    color: var(--qa-chip-hue, var(--qa-ambient-accent));
  }
</style>
