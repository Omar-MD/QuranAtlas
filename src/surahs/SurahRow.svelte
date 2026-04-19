<script lang="ts">
  import type { SurahMeta } from '../data/dataset'
  import { getMeaning } from '../data/surah-meanings'

  interface Props {
    surah: SurahMeta
    bookmarked: boolean
  }

  const { surah, bookmarked }: Props = $props()

  const arabic = $derived((surah as Record<string, unknown>)['arabic'] as string | undefined ?? '')
  const type = $derived(((surah as Record<string, unknown>)['type'] as string | undefined ?? '').toLowerCase())
</script>

<li class="qa-sl-row" class:qa-sl-row--bm={bookmarked}>
  <a class="qa-sl-row-anchor" href={`#/s/${surah.n}`}>
    <span class="qa-sl-row-num">{surah.n}</span>
    <span class="qa-sl-row-mid">
      <span class="qa-sl-row-en">{surah.name ?? ''}</span>
      <span class="qa-sl-row-meaning">{getMeaning(surah.n) ?? ''}</span>
    </span>
    <span class="qa-sl-row-ar" dir="rtl">{arabic}</span>
    <span class="qa-sl-row-meta">
      <span class="qa-sl-row-vcount">{surah.count ?? ''}</span>
      <span class="qa-sl-row-type">{type}</span>
    </span>
  </a>
</li>

<style>
  .qa-sl-row {
    border-bottom: 1px dotted var(--qa-ambient-border);
    position: relative;
  }
  .qa-sl-row-anchor {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 6px;
    cursor: pointer;
    outline: none;
    text-decoration: none;
    color: inherit;
  }
  .qa-sl-row-anchor:focus-visible {
    background-color: var(--qa-ambient-accent-soft);
  }
  .qa-sl-row--bm::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 10px;
    bottom: 10px;
    width: 2px;
    border-radius: 2px;
    background-color: var(--qa-ambient-accent);
  }
  .qa-sl-row-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--qa-ambient-border);
    background-color: var(--qa-ambient-surface);
    color: var(--qa-ambient-accent);
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .qa-sl-row-mid { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .qa-sl-row-en { font-size: 0.875rem; font-weight: 600; color: var(--qa-ambient-parchment); line-height: 1.2; }
  .qa-sl-row-meaning { font-size: 0.75rem; font-style: italic; color: var(--qa-ambient-muted); }
  .qa-sl-row-ar {
    font-family: var(--qa-font-arabic);
    font-size: 1rem;
    color: var(--qa-ambient-accent);
    flex-shrink: 0;
  }
  .qa-sl-row-meta {
    text-align: right;
    min-width: 52px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex-shrink: 0;
  }
  .qa-sl-row-vcount { font-size: 0.75rem; color: var(--qa-ambient-muted); font-variant-numeric: tabular-nums; }
  .qa-sl-row-type { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--qa-ambient-dim); }
</style>
