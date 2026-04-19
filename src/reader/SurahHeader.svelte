<script lang="ts">
  import type { SurahMeta } from '../data/dataset'
  import { formatSurahMeta, formatArabicSurahName, shouldRenderBasmala } from './render-helpers'

  interface Props {
    surahNum: number
    meta: SurahMeta
  }

  const { surahNum, meta }: Props = $props()

  const arabicName = $derived(formatArabicSurahName(meta))
  const metaLine = $derived(formatSurahMeta(meta))
  const showBasmala = $derived(shouldRenderBasmala(surahNum))
</script>

<div class="qa-surah-header-card" data-surah-header="">
  <div class="qa-surah-name" dir="rtl">{arabicName}</div>
  <div class="qa-surah-meta">{metaLine}</div>
</div>

{#if showBasmala}
  <div class="qa-basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
{/if}
