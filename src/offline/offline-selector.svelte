<script lang="ts">
  /**
   * Per-feature offline opt-in selector (N21).
   *
   * Mounts in Settings → Storage. Categories rendered as accordion rows
   * (native <details>) with byte estimates from the verified manifest.
   * Apply button gates on a pre-flight quota check (audit Q4 — refuse
   * before starting a download that won't fit).
   */

  import { onMount } from 'svelte'
  import { settings } from '../state/settings.svelte.ts'
  import {
    DEFAULT_OFFLINE_CATEGORIES,
    type OfflineCategoriesState,
  } from '../state/settings.svelte.ts'
  import { setOfflineCategories } from '../settings/offline-categories.ts'
  import {
    getCategoryManifest,
    getStorageBudget,
    isCategoryAvailable,
    startCategoryDownload,
  } from '../data/offline.ts'
  import type { Category } from '../core/sw/route-defs'

  type Row = {
    cat: Category
    label: string
    sub: string
    gatedAt: string | null   // version label or null when un-gated
  }

  const ROWS: Row[] = [
    { cat: 'text',   label: 'Text · Qurʾān corpus',  sub: 'All riwayat + Saheeh translation',                gatedAt: null },
    { cat: 'audio',  label: 'Audio · per reciter',             sub: 'Recitation MP3s + word-timing JSON',              gatedAt: 'v2.0' },
    { cat: 'pages',  label: 'Pages · per riwāyah',             sub: 'KFGQPC Mushaf page-image cuts',                   gatedAt: 'v2.1' },
    { cat: 'search', label: 'Search index',                    sub: 'Full-text Arabic + translation search',           gatedAt: 'v1.1' },
  ]

  let bytesByCat = $state<Record<Category, number>>({ text: 0, audio: 0, pages: 0, search: 0 })
  let availableByCat = $state<Record<Category, boolean>>({ text: false, audio: false, pages: false, search: false })
  let pending = $state<OfflineCategoriesState>(structuredClone($state.snapshot(settings.offlineCategories ?? DEFAULT_OFFLINE_CATEGORIES)))
  let storageBudget = $state<{ usage: number; quota: number; available: number } | null>(null)
  let busy = $state(false)
  let errorMsg = $state<string | null>(null)

  const fmt = (bytes: number): string => {
    if (bytes <= 0) return '—'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`
    return `${mb.toFixed(1)} MB`
  }

  function isCategoryChecked(cat: Category): boolean {
    if (cat === 'text') {
      const t = pending.text
      return t.hafs && t.warsh && t.qaloon
    }
    if (cat === 'search') return pending.search
    // audio + pages: any item checked. v1 selector only writes the `_all`
    // sentinel until consumer features ship and add per-item rows.
    const map = cat === 'audio' ? pending.audio : pending.pages
    return Object.values(map).some(Boolean)
  }

  function setCategoryChecked(cat: Category, checked: boolean): void {
    const next = structuredClone($state.snapshot(pending))
    if (cat === 'text') {
      next.text = { hafs: checked, warsh: checked, qaloon: checked }
    } else if (cat === 'search') {
      next.search = checked
    } else if (cat === 'audio') {
      next.audio = checked ? { _all: true } : {}
    } else if (cat === 'pages') {
      next.pages = checked ? { _all: true } : {}
    }
    pending = next
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

  function isCategoryCheckedIn(state: OfflineCategoriesState | undefined, cat: Category): boolean {
    if (!state) return false
    if (cat === 'text') return state.text.hafs && state.text.warsh && state.text.qaloon
    if (cat === 'search') return state.search
    const map = cat === 'audio' ? state.audio : state.pages
    return Object.values(map).some(Boolean)
  }

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
    busy = true
    try {
      await setOfflineCategories(pending)
      const newlyChecked = ROWS.filter(r =>
        !isCategoryCheckedIn(settings.offlineCategories, r.cat) === false
        && isCategoryChecked(r.cat)
        && availableByCat[r.cat]
      )
      // Re-derive: new categories that flipped to true since last apply.
      // settings.offlineCategories is now the new state (just persisted),
      // so compute against the original pre-apply snapshot via diff helper.
      // Simplification: download every category that pending says is on
      // and that has manifest entries — handleCacheDataset is idempotent
      // (SHA-256 verify on cached entry skips re-downloads).
      const toDownload: Category[] = []
      for (const r of ROWS) {
        if (isCategoryChecked(r.cat) && availableByCat[r.cat]) toDownload.push(r.cat)
      }
      void newlyChecked   // silence lint
      for (const cat of toDownload) {
        await startCategoryDownload(cat)
      }
      await refreshBudget()
    } catch (error) {
      errorMsg = (error as Error).message ?? 'Failed to update offline categories'
    } finally {
      busy = false
    }
  }
</script>

<section
  class="qa-storage"
  data-testid="storage-section"
  aria-labelledby="qa-storage-hdr"
>
  <div class="qa-settings-sect-hdr">
    <span id="qa-storage-hdr" class="qa-settings-sect-name">Storage</span>
  </div>

  <div class="qa-storage-rows">
    {#each ROWS as row (row.cat)}
      {@const gated = !availableByCat[row.cat]}
      <details
        class="qa-storage-row"
        class:qa-storage-row--gated={gated}
        data-testid="storage-row-{row.cat}"
      >
        <summary class="qa-storage-row-hdr">
          <span class="qa-storage-row-label">{row.label}</span>
          <span class="qa-storage-row-size">
            {#if gated}{row.gatedAt ?? '—'} · gated{:else}{fmt(bytesByCat[row.cat])}{/if}
          </span>
        </summary>
        <div class="qa-storage-row-body">
          <p class="qa-storage-row-sub">{row.sub}</p>
          {#if !gated}
            <label class="qa-storage-checkrow">
              <input
                type="checkbox"
                checked={isCategoryChecked(row.cat)}
                onchange={(e) => setCategoryChecked(row.cat, (e.currentTarget as HTMLInputElement).checked)}
                data-testid="storage-check-{row.cat}"
              />
              <span class="qa-storage-checkrow-label">Cache for offline use ({fmt(bytesByCat[row.cat])})</span>
            </label>
          {:else}
            <p class="qa-storage-row-gated">Ships in {row.gatedAt}.</p>
          {/if}
        </div>
      </details>
    {/each}
  </div>

  <div class="qa-storage-footer">
    <div class="qa-storage-budget" data-testid="storage-budget">
      {#if storageBudget}
        Used {fmt(storageBudget.usage)} / {fmt(storageBudget.quota)} quota
      {:else}
        &nbsp;
      {/if}
    </div>
    {#if quotaShortfall > 0}
      <p class="qa-storage-quota-err" data-testid="storage-quota-err">
        Need {fmt(quotaShortfall)} more free space.
      </p>
    {/if}
    {#if errorMsg}
      <p class="qa-storage-err" data-testid="storage-err">{errorMsg}</p>
    {/if}
    <button
      type="button"
      class="qa-storage-apply"
      disabled={!hasDiff || quotaShortfall > 0 || busy}
      onclick={handleApply}
      data-testid="storage-apply"
    >{busy ? 'Caching…' : 'Apply'}</button>
  </div>
</section>

<style>
  .qa-storage {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .qa-storage-rows {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--qa-border, rgba(0,0,0,0.08));
    border-radius: 6px;
    overflow: hidden;
  }
  .qa-storage-row {
    border-bottom: 1px solid var(--qa-border, rgba(0,0,0,0.06));
  }
  .qa-storage-row:last-child { border-bottom: none; }
  .qa-storage-row-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  .qa-storage-row-hdr::-webkit-details-marker { display: none; }
  .qa-storage-row-label {
    font-weight: 500;
  }
  .qa-storage-row-size {
    color: var(--qa-text-soft, rgba(0,0,0,0.6));
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
  .qa-storage-row-body {
    padding: 0.4rem 0.8rem 0.8rem;
    font-size: 0.85rem;
  }
  .qa-storage-row-sub {
    margin: 0 0 0.4rem;
    color: var(--qa-text-soft, rgba(0,0,0,0.6));
  }
  .qa-storage-row-gated {
    margin: 0;
    color: var(--qa-text-soft, rgba(0,0,0,0.6));
    font-style: italic;
  }
  .qa-storage-row--gated {
    opacity: 0.6;
  }
  .qa-storage-row--gated .qa-storage-row-hdr {
    cursor: default;
  }
  .qa-storage-checkrow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  .qa-storage-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.4rem;
  }
  .qa-storage-budget {
    flex: 1;
    color: var(--qa-text-soft, rgba(0,0,0,0.6));
    font-size: 0.85rem;
  }
  .qa-storage-quota-err,
  .qa-storage-err {
    flex-basis: 100%;
    margin: 0;
    color: var(--qa-color-danger, #c0392b);
    font-size: 0.85rem;
  }
  .qa-storage-apply {
    border: 1px solid var(--qa-border, rgba(0,0,0,0.12));
    border-radius: 999px;
    padding: 0.4rem 1rem;
    background: var(--qa-surface-elevated, transparent);
    cursor: pointer;
    font: inherit;
  }
  .qa-storage-apply:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
