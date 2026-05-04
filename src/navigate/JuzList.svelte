<script lang="ts">
  import { findJuzForRef, getJuzRows, type JuzRow, type SurahCount } from '../data/juz'
  import type { QuranRef } from '../read/wird/types'

  type SurahName = { n: number; name: string; name_ar: string }
  type Props = {
    counts: SurahCount[]
    names: SurahName[]
    currentRef: QuranRef | null
    wirdRef: QuranRef | null
    onNavigate: (ref: QuranRef) => void
  }

  const { counts, names, currentRef, wirdRef, onNavigate }: Props = $props()
  const rows = $derived<JuzRow[]>(getJuzRows(counts))
  const currentJuz = $derived(currentRef ? findJuzForRef(currentRef, counts) : null)
  const wirdJuz = $derived(wirdRef ? findJuzForRef(wirdRef, counts) : null)

  function surahName(n: number): SurahName | undefined {
    return names.find((surah) => surah.n === n)
  }
</script>

<ul class="qa-juz-list" aria-label="Juz list">
  {#each rows as row (row.n)}
    {@const meta = surahName(row.start.surah)}
    <li
      class="qa-juz-row"
      data-juz={row.n}
      class:qa-juz-row--current={row.n === currentJuz}
      class:qa-juz-row--wird={row.n === wirdJuz}
    >
      <button type="button" class="qa-juz-row-btn" onclick={() => onNavigate(row.start)}>
        <span class="qa-juz-num">Juz {row.n}</span>
        <span class="qa-juz-ref">{row.start.surah}:{row.start.verse}</span>
        <span class="qa-juz-name">{meta?.name ?? `Surah ${row.start.surah}`}</span>
        {#if meta?.name_ar}
          <span class="qa-juz-ar" lang="ar" dir="rtl">{meta.name_ar}</span>
        {/if}
        {#if row.n === currentJuz}
          <span class="qa-juz-marker">Current</span>
        {/if}
        {#if row.n === wirdJuz}
          <span class="qa-juz-marker qa-juz-marker--wird">Wird</span>
        {/if}
      </button>
    </li>
  {/each}
</ul>
