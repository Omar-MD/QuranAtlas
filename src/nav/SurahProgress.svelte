<script lang="ts">
  /**
   * Tiny progress chip under surah title. Tracks the current juz the reader
   * is in (updates mid-surah when a juz boundary is crossed) and the percent
   * through that juz — computed from global verse index, not surah index.
   */
  import { reader } from '../state/reader.svelte'
  import { getSurahs, type SurahMeta } from '../data/dataset'
  import { juzProgress, type SurahCount } from '../data/juz'
  import { onMount } from 'svelte'

  let surahs = $state<SurahCount[]>([])

  onMount(() => {
    getSurahs().then((list: SurahMeta[]) => {
      surahs = list.map((s) => ({ n: s.n, count: s.count }))
    }).catch(() => { /* ignore */ })
  })

  const verseNum = $derived.by(() => {
    const vk = reader.currentVerseKey
    if (!vk) { return 1 }
    return parseInt(vk.split(':')[1] ?? '1', 10)
  })

  const progress = $derived.by(() => {
    const s = reader.currentSurahNum
    if (!s || !surahs.length) { return { juz: 1, pct: 0 } }
    return juzProgress(s, verseNum, surahs)
  })

  const juz = $derived(progress.juz)
  const pct = $derived(progress.pct)
</script>

<div class="qa-surah-progress" aria-label="Reading position">
  <span class="qa-sp-label">Juz {juz}</span>
  <span class="qa-sp-bar" aria-hidden="true"><i style:width="{pct}%"></i></span>
  <span class="qa-sp-pct">{pct}%</span>
</div>

<style>
  .qa-surah-progress {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 5px 12px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--qa-ambient-surface) 70%, transparent);
    border: 1px solid var(--qa-border-subtle);
    font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 0.625rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--qa-ambient-dim);
  }
  .qa-sp-label { color: var(--qa-ambient-parchment); font-weight: 600; }
  .qa-sp-bar {
    width: 64px;
    height: 3px;
    background: var(--qa-border);
    border-radius: 2px;
    overflow: hidden;
    display: inline-block;
  }
  .qa-sp-bar i {
    display: block;
    height: 100%;
    background: var(--qa-ambient-accent);
    border-radius: 2px;
  }
  .qa-sp-pct { color: var(--qa-ambient-accent); font-weight: 600; }
  @media (min-width: 1180px) {
    .qa-surah-progress { font-size: 0.6875rem; padding: 6px 14px; }
    .qa-sp-bar { width: 96px; }
  }
</style>
