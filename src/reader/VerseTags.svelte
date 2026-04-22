<script lang="ts">
  /**
   * Inline summary of the saved tags for a verse. Renders ≤3 `LABEL value`
   * chip pairs under the verse translation. Listens for mark updates so the
   * chips refresh after the user saves/deletes via the quickbar or sheet.
   */
  import { onMount } from 'svelte'
  import { getByVerseKey } from '../marks/store'
  import { on } from '../core/events'
  import { Events } from '../core/constants'
  import { LAYER_NAMES } from '../core/db'
  import type { LayerName } from '../core/db'
  import { hueForLayer } from '../data/tag-layers'

  interface Props { verseKey: string }
  const { verseKey }: Props = $props()

  type Pair = { layer: LayerName; label: string; value: string }
  let pairs = $state<Pair[]>([])

  const LAYER_DISPLAY: Record<LayerName, string> = {
    threads: 'THEMES', subjects: 'SUBJECTS', audience: 'AUDIENCE',
    speaker: 'SPEAKER', quotedSpeaker: 'QUOTED', mode: 'MODE',
    form: 'FORM', tone: 'TONE',
    people: 'PEOPLE', places: 'PLACES', events: 'EVENTS', divineNames: 'DIVINE',
  }

  async function refresh(): Promise<void> {
    try {
      const mark = await getByVerseKey(verseKey)
      if (!mark) { pairs = []; return }
      const out: Pair[] = []
      for (const layer of LAYER_NAMES) {
        const vals = (mark as unknown as Record<string, unknown>)[layer]
        if (!Array.isArray(vals) || !vals.length) { continue }
        const v = vals[0] as string
        out.push({ layer, label: LAYER_DISPLAY[layer], value: v })
        if (out.length >= 3) { break }
      }
      pairs = out
    } catch { pairs = [] }
  }

  onMount(() => {
    void refresh()
    const unsubSave = on(Events.MARKS_SAVED, (p) => {
      if (p?.verseKey === verseKey) { void refresh() }
    })
    const unsubDel = on(Events.MARKS_DELETED, (p) => {
      if (p?.verseKey === verseKey) { void refresh() }
    })
    return () => { unsubSave(); unsubDel() }
  })
</script>

{#if pairs.length}
  <div class="qa-vtags" aria-label="Verse tags">
    {#each pairs as p (p.layer + ':' + p.value)}
      <span class="qa-vtag">
        <span class="qa-vtag-dot" style:background-color={hueForLayer(p.layer)} aria-hidden="true"></span>
        <span class="qa-vtag-lbl">{p.label}</span>
        <span class="qa-vtag-val">{p.value}</span>
      </span>
    {/each}
  </div>
{/if}

<style>
  .qa-vtags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
    padding-top: 8px;
  }
  .qa-vtag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px 3px 8px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--qa-ambient-surface) 70%, transparent);
    border: 1px solid var(--qa-border-subtle);
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.625rem;
    letter-spacing: 0.06em;
    color: var(--qa-ambient-dim);
  }
  .qa-vtag-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    opacity: 0.75;
  }
  .qa-vtag-lbl {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--qa-ambient-dim);
    font-weight: 600;
  }
  .qa-vtag-val {
    text-transform: none;
    letter-spacing: 0.02em;
    color: var(--qa-ambient-parchment);
    font-weight: 500;
  }
</style>
