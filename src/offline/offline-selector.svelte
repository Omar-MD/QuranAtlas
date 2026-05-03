<script lang="ts">
  /**
   * Per-feature offline opt-in selector.
   *
   * Rendered as a single collapsible inside Settings → Storage. Default
   * collapsed: shows a one-line summary of cached / quota usage. Tap the
   * header to expand the inline category list + Apply control. Expansion
   * animates via CSS grid-template-rows so the panel doesn't measure height
   * in JS — outer panel chrome (preview, theme footer) stays put.
   */

  import { onMount } from 'svelte'
  import { settings } from '../settings/state.svelte.ts'
  import {
    DEFAULT_OFFLINE_CATEGORIES,
    type OfflineCategoriesState,
  } from '../settings/state.svelte.ts'
  import { setOfflineCategories } from '../settings/offline-categories.ts'
  import {
    getCategoryManifest,
    getStorageBudget,
    startCategoryDownload,
  } from '../data/offline.ts'
  import type { Category } from '../core/sw/route-defs'

  type Row = {
    cat: Category
    label: string
    short: string
    sub: string
    gatedAt: string | null
  }

  const ROWS: Row[] = [
    { cat: 'text',   label: 'Text · baseline corpus', short: 'Text',   sub: 'Qālūn + Saheeh + Muyassar + Knowledge context', gatedAt: null   },
    { cat: 'audio',  label: 'Audio · per reciter',  short: 'Audio',  sub: 'Recitation MP3s + word-timing JSON',    gatedAt: 'v2.0' },
    { cat: 'pages',  label: 'Pages · per riwāyah',  short: 'Pages',  sub: 'KFGQPC Mushaf page-image cuts',         gatedAt: 'v2.1' },
    { cat: 'search', label: 'Search index',         short: 'Search', sub: 'Full-text Arabic + translation search', gatedAt: 'v1.1' },
  ]

  let open = $state(false)
  let bytesByCat = $state<Record<Category, number>>({ text: 0, audio: 0, pages: 0, search: 0 })
  let availableByCat = $state<Record<Category, boolean>>({ text: false, audio: false, pages: false, search: false })
  let pending = $state<OfflineCategoriesState>(
    structuredClone($state.snapshot(settings.offlineCategories ?? DEFAULT_OFFLINE_CATEGORIES))
  )
  let storageBudget = $state<{ usage: number; quota: number; available: number } | null>(null)
  let busy  = $state(false)
  let saved = $state(false)
  let errorMsg = $state<string | null>(null)

  const fmt = (bytes: number): string => {
    if (bytes <= 0) return '—'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    return `${(mb / 1024).toFixed(1)} GB`
  }

  function isCategoryChecked(cat: Category): boolean {
    if (cat === 'text') {
      const t = pending.text
      return t.riwayat.qaloon === true && t.translations.saheeh === true && t.tafsir.muyassar === true
    }
    if (cat === 'search') return pending.search
    const map = cat === 'audio' ? pending.audio : pending.pages
    return Object.values(map).some(Boolean)
  }

  function setCategoryChecked(cat: Category, checked: boolean): void {
    const next = structuredClone($state.snapshot(pending))
    if (cat === 'text') {
      next.text = checked
        ? { riwayat: { qaloon: true }, translations: { saheeh: true }, tafsir: { muyassar: true } }
        : { riwayat: {}, translations: {}, tafsir: {} }
    } else if (cat === 'search') {
      next.search = checked
    } else if (cat === 'audio') {
      next.audio = checked ? { _all: true } : {}
    } else if (cat === 'pages') {
      next.pages = checked ? { _all: true } : {}
    }
    pending = next
    saved = false
  }

  function isCategoryCheckedIn(state: OfflineCategoriesState | undefined, cat: Category): boolean {
    if (!state) return false
    if (cat === 'text') {
      return state.text.riwayat.qaloon === true
        && state.text.translations.saheeh === true
        && state.text.tafsir.muyassar === true
    }
    if (cat === 'search') return state.search
    const map = cat === 'audio' ? state.audio : state.pages
    return Object.values(map).some(Boolean)
  }

  const totalNewBytes = $derived(
    ROWS.reduce((sum, r) => {
      const wasChecked = isCategoryCheckedIn(settings.offlineCategories, r.cat)
      const nowChecked = isCategoryChecked(r.cat)
      return nowChecked && !wasChecked ? sum + bytesByCat[r.cat] : sum
    }, 0)
  )

  const hasDiff = $derived(
    ROWS.some(r => isCategoryCheckedIn(settings.offlineCategories, r.cat) !== isCategoryChecked(r.cat))
  )

  const quotaShortfall = $derived(
    storageBudget && totalNewBytes > storageBudget.available
      ? totalNewBytes - storageBudget.available
      : 0
  )

  const cachedNames = $derived(
    ROWS
      .filter(r => isCategoryCheckedIn(settings.offlineCategories, r.cat))
      .map(r => r.short)
  )

  async function refreshBytes(): Promise<void> {
    for (const cat of ['text', 'audio', 'pages', 'search'] as Category[]) {
      try {
        const { totalBytes } = await getCategoryManifest(cat)
        bytesByCat[cat] = totalBytes
        availableByCat[cat] = totalBytes > 0
      } catch {
        bytesByCat[cat] = 0
        availableByCat[cat] = false
      }
    }
  }

  async function refreshBudget(): Promise<void> {
    storageBudget = await getStorageBudget()
  }

  onMount(() => {
    refreshBytes()
    refreshBudget()
  })

  async function handleApply(): Promise<void> {
    if (!hasDiff || busy) return
    if (quotaShortfall > 0) return
    errorMsg = null
    saved = false
    busy = true
    try {
      await setOfflineCategories(pending)
      const toDownload: Category[] = []
      for (const r of ROWS) {
        if (isCategoryChecked(r.cat) && availableByCat[r.cat]) toDownload.push(r.cat)
      }
      for (const cat of toDownload) {
        await startCategoryDownload(cat)
      }
      await refreshBudget()
      saved = true
      setTimeout(() => { saved = false }, 1500)
    } catch (error) {
      errorMsg = (error as Error).message ?? 'Failed to update offline categories'
    } finally {
      busy = false
    }
  }

  function toggleOpen() { open = !open }
</script>

<section
  class="qa-settings-sect qa-storage"
  class:qa-storage--open={open}
  data-testid="storage-section"
  aria-labelledby="qa-storage-hdr"
>
  <button
    type="button"
    class="qa-storage-summary"
    onclick={toggleOpen}
    aria-expanded={open}
    aria-controls="qa-storage-body"
    data-testid="storage-toggle"
  >
    <span id="qa-storage-hdr" class="qa-settings-sect-name">Storage</span>
    <span class="qa-storage-summary-meta">
      {#if cachedNames.length === 0}
        <span class="qa-storage-summary-hint">Cache content for offline use</span>
      {:else}
        <span class="qa-storage-summary-count">{cachedNames.join(' · ')} cached</span>
      {/if}
    </span>
    <span class="qa-storage-summary-chev" aria-hidden="true">›</span>
  </button>

  <div class="qa-storage-collapsible" data-open={open}>
    <div
      id="qa-storage-body"
      class="qa-storage-body"
      role="region"
      aria-label="Offline content selector"
    >
      <ul class="qa-storage-rows" role="list">
        {#each ROWS as row (row.cat)}
          {@const gated = !availableByCat[row.cat]}
          <li class="qa-storage-row" class:qa-storage-row--gated={gated} data-testid="storage-row-{row.cat}">
            <div class="qa-storage-row-main">
              <span class="qa-storage-row-label">{row.label}</span>
              <span class="qa-storage-row-sub">{row.sub}</span>
            </div>
            {#if gated}
              <span class="qa-storage-row-gated" data-testid="storage-row-gated-{row.cat}">{row.gatedAt}</span>
            {:else}
              <label class="qa-storage-checkrow" data-testid="storage-checkrow-{row.cat}">
                <span class="qa-storage-row-size">{fmt(bytesByCat[row.cat])}</span>
                <input
                  class="qa-storage-check"
                  type="checkbox"
                  checked={isCategoryChecked(row.cat)}
                  onchange={(e) => setCategoryChecked(row.cat, (e.currentTarget as HTMLInputElement).checked)}
                  data-testid="storage-check-{row.cat}"
                />
              </label>
            {/if}
          </li>
        {/each}
      </ul>

      <div class="qa-storage-footer">
        <button
          type="button"
          class="qa-storage-apply"
          class:qa-storage-apply--saved={saved}
          disabled={!hasDiff || quotaShortfall > 0 || busy}
          onclick={handleApply}
          data-testid="storage-apply"
        >{busy ? 'Saving…' : saved ? 'Saved ✓' : 'Apply'}</button>
        {#if quotaShortfall > 0}
          <p class="qa-storage-err" data-testid="storage-quota-err">
            Need {fmt(quotaShortfall)} more free space.
          </p>
        {/if}
        {#if errorMsg}
          <p class="qa-storage-err" data-testid="storage-err">{errorMsg}</p>
        {/if}
      </div>
    </div>
  </div>
</section>
