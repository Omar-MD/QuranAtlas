<script lang="ts">
  import type { SurahMeta } from '../data/dataset'
  import { formatSurahMeta, formatArabicSurahName, shouldRenderBasmala } from './render-helpers'
  import { reader } from '../state/reader.svelte'
  import { settings } from '../state/settings.svelte'
  import SurahProgress from '../nav/SurahProgress.svelte'

  interface Props {
    surahNum: number
    meta: SurahMeta
  }

  const { surahNum, meta }: Props = $props()

  const arabicName = $derived(formatArabicSurahName(meta))
  const metaLine = $derived(formatSurahMeta(meta))
  const showBasmala = $derived(shouldRenderBasmala(surahNum, settings.riwayah))
</script>

{#if !reader.surahHeaderHidden}
  <div class="qa-surah-header" data-surah-header="">
    <div class="qa-surah-meta-col">
      <div class="qa-surah-meta">{metaLine}</div>
      <SurahProgress />
    </div>
    <div class="qa-surah-name" dir="rtl" lang="ar">{arabicName}</div>
  </div>
{/if}

{#if showBasmala}
  <div class="qa-basmala">
    <span
      class="qa-basmala-text"
      dir="rtl"
      lang="ar"
      aria-label="بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"
      role="img"
    >﷽</span>
    <span class="qa-basmala-translation">In the Name of Allah — the Most Compassionate, Most Merciful</span>
  </div>
{/if}
