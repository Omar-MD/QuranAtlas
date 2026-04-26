<script lang="ts">
  import type { SurahMeta } from '../data/dataset'
  import { getMeaning } from '../data/surah-meanings'
  import { settings } from '../state/settings.svelte'

  interface Props {
    surah: SurahMeta
    bookmarked: boolean
  }

  const { surah, bookmarked }: Props = $props()

  const arabic = $derived(surah.name_ar ?? '')
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
      <span class="qa-sl-row-vcount">{surah.counts[settings.riwayah] ?? ''}</span>
      <span class="qa-sl-row-type">{type}</span>
    </span>
  </a>
</li>

