<script lang="ts">
  /**
   * Tiny progress chip under surah title. Tracks the current juz the reader
   * is in (updates mid-surah when a juz boundary is crossed) and the percent
   * through that juz — computed from global verse index, not surah index.
   */
  import { reader } from './state.svelte'
  import { getSurahs, type SurahMeta } from '../data/dataset'
  import { juzProgress, type SurahCount } from '../data/juz'
  import { settings } from '../configure/state.svelte'
  import { onMount } from 'svelte'

  let surahs = $state<SurahCount[]>([])

  onMount(() => {
    getSurahs().then((list: SurahMeta[]) => {
      surahs = list.map((s) => ({ n: s.n, count: s.counts[settings.riwayah] }))
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

