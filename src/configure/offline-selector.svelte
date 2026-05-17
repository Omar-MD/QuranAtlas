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
  import { settings } from './state.svelte.ts'
  import {
    DEFAULT_OFFLINE_CATEGORIES,
    type OfflineCategoriesState,
  } from './state.svelte.ts'
  import { setOfflineCategories } from './offline-categories.ts'
  import {
    getCategoryManifest,
    getPageAssetManifest,
    getSourceAssetManifest,
    getStorageBudget,
    planRiwayahPackageInstall,
    refreshRiwayahPackageStatus,
    removeCategoryDownload,
    removePageAssetDownload,
    removeRiwayahPackage,
    removeSourceAssetDownload,
    startCategoryDownload,
    startPageAssetDownload,
    startRiwayahPackageInstall,
    startSourceAssetDownload,
  } from '../data/offline-client.ts'
  import { getTafsirs, getTranslations } from '../data/dataset.ts'
  import type { Category } from '../infra/sw/route-defs'
  import type { Riwayah } from './state.svelte.ts'

  type SourceKind = 'translation' | 'tafsir'
  type SourceOption = {
    id: string
    name: string
    kind: SourceKind
    availableInManifest: boolean
    bytes: number
  }
  type PagePackOption = {
    id: Riwayah
    label: string
    bytes: number
    available: boolean
  }
  type PackageOption = {
    id: Riwayah
    label: string
    bytes: number
    status: string
    unavailable: boolean
    removable: boolean
    installable: boolean
  }

  type Row = {
    cat: Category
    label: string
    short: string
    sub: string
    gatedAt: string | null
  }

  const ROWS: Row[] = [
    { cat: 'text',   label: 'Text · baseline corpus', short: 'Text',   sub: 'Qalun + Bridges + Muyassar + Knowledge context', gatedAt: null   },
    { cat: 'pages',  label: 'Pages · per riwāyah',  short: 'Pages',  sub: 'KFGQPC Mushaf page-image cuts',         gatedAt: 'v2.1' },
    { cat: 'search', label: 'Search index',         short: 'Search', sub: 'Full-text Arabic + translation search', gatedAt: 'v1.1' },
  ]
  const GENERIC_ROWS = ROWS.filter((row) => row.cat !== 'pages')
  const PAGE_PACKS: Array<{ id: Riwayah; label: string }> = [
    { id: 'qaloon', label: 'Qalun pages' },
    { id: 'hafs', label: 'Ḥafṣ pages' },
    { id: 'warsh', label: 'Warsh pages' },
  ]
  const RIWAYAH_PACKAGES: Array<{ id: Riwayah; label: string }> = [
    { id: 'qaloon', label: 'Qalun package' },
    { id: 'hafs', label: 'Ḥafṣ package' },
    { id: 'warsh', label: 'Warsh package' },
  ]

  let open = $state(false)
  const bytesByCat = $state<Record<Category, number>>({ text: 0, pages: 0, search: 0 })
  const availableByCat = $state<Record<Category, boolean>>({ text: false, pages: false, search: false })
  let textSources = $state<SourceOption[]>([])
  let pagePacks = $state<PagePackOption[]>([])
  let riwayahPackages = $state<PackageOption[]>([])
  let pending = $state<OfflineCategoriesState>(
    structuredClone($state.snapshot(settings.offlineCategories ?? DEFAULT_OFFLINE_CATEGORIES))
  )
  let storageBudget = $state<{ usage: number; quota: number; available: number } | null>(null)
  let busy  = $state(false)
  let packageBusy = $state<Riwayah | null>(null)
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
      return t.riwayat.qaloon === true && t.translations.bridges === true && t.tafsir.muyassar === true
    }
    if (cat === 'search') return pending.search
    return Object.values(pending.pages).some(Boolean)
  }

  function isSourceChecked(kind: SourceKind, id: string): boolean {
    const map = kind === 'translation' ? pending.text.translations : pending.text.tafsir
    return map[id] === true
  }

  function isSourceCheckedIn(state: OfflineCategoriesState | undefined, kind: SourceKind, id: string): boolean {
    if (!state) return false
    const map = kind === 'translation' ? state.text.translations : state.text.tafsir
    return map[id] === true
  }

  function isPageChecked(riwayah: Riwayah): boolean {
    return pending.pages[riwayah] === true
  }

  function isPageCheckedIn(state: OfflineCategoriesState | undefined, riwayah: Riwayah): boolean {
    return state?.pages[riwayah] === true
  }

  function setSourceChecked(kind: SourceKind, id: string, checked: boolean): void {
    const next = structuredClone($state.snapshot(pending))
    const map = kind === 'translation' ? next.text.translations : next.text.tafsir
    if (checked) {
      map[id] = true
    } else {
      delete map[id]
    }
    pending = next
    saved = false
  }

  function setPageChecked(riwayah: Riwayah, checked: boolean): void {
    const next = structuredClone($state.snapshot(pending))
    if (checked) {
      next.pages[riwayah] = true
    } else {
      delete next.pages[riwayah]
    }
    pending = next
    saved = false
  }

  function setCategoryChecked(cat: Category, checked: boolean): void {
    const next = structuredClone($state.snapshot(pending))
    if (cat === 'text') {
      next.text = checked
        ? { riwayat: { qaloon: true }, translations: { bridges: true }, tafsir: { muyassar: true } }
        : { riwayat: {}, translations: {}, tafsir: {} }
    } else if (cat === 'search') {
      next.search = checked
    } else if (cat === 'pages') {
      next.pages = {}
    }
    pending = next
    saved = false
  }

  function isCategoryCheckedIn(state: OfflineCategoriesState | undefined, cat: Category): boolean {
    if (!state) return false
    if (cat === 'text') {
      return state.text.riwayat.qaloon === true
        && state.text.translations.bridges === true
        && state.text.tafsir.muyassar === true
    }
    if (cat === 'search') return state.search
    return Object.values(state.pages).some(Boolean)
  }

  const totalNewBytes = $derived(
    GENERIC_ROWS.reduce((sum, r) => {
      const wasChecked = isCategoryCheckedIn(settings.offlineCategories, r.cat)
      const nowChecked = isCategoryChecked(r.cat)
      return nowChecked && !wasChecked ? sum + bytesByCat[r.cat] : sum
    }, 0)
    + textSources.reduce((sum, source) => {
      const wasChecked = isSourceCheckedIn(settings.offlineCategories, source.kind, source.id)
      const nowChecked = isSourceChecked(source.kind, source.id)
      return nowChecked && !wasChecked ? sum + source.bytes : sum
    }, 0)
    + pagePacks.reduce((sum, pack) => {
      const wasChecked = isPageCheckedIn(settings.offlineCategories, pack.id)
      const nowChecked = isPageChecked(pack.id)
      return nowChecked && !wasChecked ? sum + pack.bytes : sum
    }, 0)
  )

  const hasDiff = $derived(
    GENERIC_ROWS.some(r => isCategoryCheckedIn(settings.offlineCategories, r.cat) !== isCategoryChecked(r.cat))
    || textSources.some(source =>
      isSourceCheckedIn(settings.offlineCategories, source.kind, source.id) !== isSourceChecked(source.kind, source.id)
    )
    || pagePacks.some(pack =>
      isPageCheckedIn(settings.offlineCategories, pack.id) !== isPageChecked(pack.id)
    )
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
    for (const cat of ['text', 'search'] as const) {
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

  async function refreshPagePacks(): Promise<void> {
    const currentPages = $state.snapshot(settings.offlineCategories)?.pages ?? {}
    const next: PagePackOption[] = []
    for (const pack of PAGE_PACKS) {
      const manifest = await getPageAssetManifest(pack.id).catch(() => ({ urls: [], totalBytes: 0 }))
      const available = manifest.urls.length > 0
      if (available || currentPages[pack.id] === true) {
        next.push({ ...pack, available, bytes: manifest.totalBytes })
      }
    }
    pagePacks = next
    bytesByCat.pages = next.reduce((sum, pack) => sum + pack.bytes, 0)
    availableByCat.pages = next.some((pack) => pack.available)
  }

  async function refreshRiwayahPackages(): Promise<void> {
    const next: PackageOption[] = []
    for (const pack of RIWAYAH_PACKAGES) {
      const [status, plan] = await Promise.all([
        refreshRiwayahPackageStatus(pack.id).catch(() => ({ kind: 'unavailable' as const, riwayah: pack.id })),
        planRiwayahPackageInstall(pack.id).catch(() => ({ urls: [], totalBytes: 0 })),
      ])
      next.push({
        ...pack,
        bytes: plan.totalBytes,
        status: status.kind,
        unavailable: status.kind === 'unavailable',
        removable: pack.id !== 'qaloon' && status.kind === 'installed',
        installable: status.kind === 'installable' || status.kind === 'error',
      })
    }
    riwayahPackages = next
  }

  async function refreshTextSources(): Promise<void> {
    const [translations, tafsirs] = await Promise.all([
      getTranslations().catch(() => []),
      getTafsirs().catch(() => []),
    ])
    const next: SourceOption[] = []
    for (const entry of translations) {
      const asset = await getSourceAssetManifest('translation', entry.id).catch(() => ({ totalBytes: 0 }))
      next.push({
        id: entry.id,
        name: entry.name,
        kind: 'translation',
        availableInManifest: entry.availableInManifest,
        bytes: asset.totalBytes,
      })
    }
    for (const entry of tafsirs) {
      const asset = await getSourceAssetManifest('tafsir', entry.id).catch(() => ({ totalBytes: 0 }))
      next.push({
        id: entry.id,
        name: entry.name,
        kind: 'tafsir',
        availableInManifest: entry.availableInManifest,
        bytes: asset.totalBytes,
      })
    }
    textSources = next
  }

  async function refreshBudget(): Promise<void> {
    storageBudget = await getStorageBudget()
  }

  onMount(() => {
    refreshBytes()
    refreshPagePacks()
    refreshRiwayahPackages()
    refreshTextSources()
    refreshBudget()
  })

  async function handlePackageInstall(riwayah: Riwayah): Promise<void> {
    if (packageBusy) return
    errorMsg = null
    packageBusy = riwayah
    try {
      const ok = await startRiwayahPackageInstall(riwayah)
      if (!ok) errorMsg = `Could not install ${riwayah} package.`
      await refreshRiwayahPackages()
      await refreshBudget()
    } catch (error) {
      errorMsg = (error as Error).message ?? 'Failed to install package'
    } finally {
      packageBusy = null
    }
  }

  async function handlePackageRemove(riwayah: Riwayah): Promise<void> {
    if (packageBusy) return
    errorMsg = null
    packageBusy = riwayah
    try {
      await removeRiwayahPackage(riwayah)
      await refreshRiwayahPackages()
      await refreshBudget()
    } catch (error) {
      errorMsg = (error as Error).message ?? 'Failed to remove package'
    } finally {
      packageBusy = null
    }
  }

  async function handleApply(): Promise<void> {
    if (!hasDiff || busy) return
    if (quotaShortfall > 0) return
    errorMsg = null
    saved = false
    busy = true
    try {
      const current = $state.snapshot(settings.offlineCategories)
      const toDownload: Category[] = []
      const toRemove: Category[] = []
      for (const r of GENERIC_ROWS) {
        if (isCategoryChecked(r.cat) && availableByCat[r.cat]) toDownload.push(r.cat)
        if (!isCategoryChecked(r.cat) && isCategoryCheckedIn(current, r.cat)) toRemove.push(r.cat)
      }
      const pagesToDownload = pagePacks.filter(
        pack => isPageChecked(pack.id)
          && !isPageCheckedIn(current, pack.id)
          && pack.available
      )
      const pagesToRemove = pagePacks.filter(
        pack => !isPageChecked(pack.id)
          && isPageCheckedIn(current, pack.id)
      )
      const sourcesToDownload = textSources.filter(
        source => isSourceChecked(source.kind, source.id)
          && !isSourceCheckedIn(current, source.kind, source.id)
          && source.bytes > 0
      )
      const sourcesToRemove = textSources.filter(
        source => !isSourceChecked(source.kind, source.id)
          && isSourceCheckedIn(current, source.kind, source.id)
      )
      for (const pack of pagesToDownload) {
        await startPageAssetDownload(pack.id)
      }
      for (const cat of toDownload) {
        await startCategoryDownload(cat)
      }
      for (const source of sourcesToDownload) {
        await startSourceAssetDownload(source.kind, source.id)
      }
      for (const source of sourcesToRemove) {
        await removeSourceAssetDownload(source.kind, source.id)
      }
      for (const cat of toRemove) {
        await removeCategoryDownload(cat)
      }
      for (const pack of pagesToRemove) {
        await removePageAssetDownload(pack.id)
      }
      await setOfflineCategories(pending)
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
          {@const gated = row.cat === 'pages' || !availableByCat[row.cat]}
          <li class="qa-storage-row" class:qa-storage-row--gated={gated} data-testid="storage-row-{row.cat}">
            <div class="qa-storage-row-main">
              <span class="qa-storage-row-label">{row.label}</span>
              <span class="qa-storage-row-sub">{row.sub}</span>
            </div>
            {#if gated}
              <span class="qa-storage-row-gated" data-testid="storage-row-gated-{row.cat}">
                {row.cat === 'pages' && pagePacks.length > 0 ? `${pagePacks.length} pack${pagePacks.length === 1 ? '' : 's'}` : row.gatedAt}
              </span>
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

      {#if riwayahPackages.length > 0}
        <div class="qa-storage-source-list" data-testid="storage-package-list">
          {#each riwayahPackages as pack (pack.id)}
            <div class="qa-storage-source-row" data-testid="storage-package-{pack.id}">
              <span class="qa-storage-source-main">
                <span class="qa-storage-source-kind">Riwayah</span>
                <span class="qa-storage-source-name">{pack.label}</span>
              </span>
              <span class="qa-storage-row-size">
                {pack.unavailable ? 'Unavailable' : fmt(pack.bytes)}
              </span>
              {#if pack.installable}
                <button
                  type="button"
                  class="qa-storage-apply qa-storage-apply--inline"
                  disabled={packageBusy !== null}
                  onclick={() => handlePackageInstall(pack.id)}
                  data-testid="storage-package-install-{pack.id}"
                >{packageBusy === pack.id ? 'Installing…' : 'Install'}</button>
              {:else if pack.removable}
                <button
                  type="button"
                  class="qa-storage-apply qa-storage-apply--inline"
                  disabled={packageBusy !== null}
                  onclick={() => handlePackageRemove(pack.id)}
                  data-testid="storage-package-remove-{pack.id}"
                >{packageBusy === pack.id ? 'Removing…' : 'Remove'}</button>
              {:else}
                <span class="qa-storage-row-gated">{pack.status === 'installed' ? 'Installed' : 'Unavailable'}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      {#if pagePacks.length > 0}
        <div class="qa-storage-source-list" data-testid="storage-page-list">
          {#each pagePacks as pack (pack.id)}
            <label class="qa-storage-source-row" data-testid="storage-page-{pack.id}">
              <span class="qa-storage-source-main">
                <span class="qa-storage-source-kind">Pages</span>
                <span class="qa-storage-source-name">{pack.label}</span>
              </span>
              <span class="qa-storage-row-size">{pack.available ? fmt(pack.bytes) : 'Not in manifest'}</span>
              <input
                class="qa-storage-check"
                type="checkbox"
                checked={isPageChecked(pack.id)}
                onchange={(e) => setPageChecked(pack.id, (e.currentTarget as HTMLInputElement).checked)}
                data-testid="storage-page-check-{pack.id}"
              />
            </label>
          {/each}
        </div>
      {/if}

      {#if textSources.length > 0}
        <div class="qa-storage-source-list" data-testid="storage-source-list">
          {#each textSources as source (`${source.kind}:${source.id}`)}
            <label class="qa-storage-source-row" data-testid="storage-source-{source.kind}-{source.id}">
              <span class="qa-storage-source-main">
                <span class="qa-storage-source-kind">{source.kind === 'translation' ? 'Translation' : 'Tafsir'}</span>
                <span class="qa-storage-source-name">{source.name}</span>
              </span>
              <span class="qa-storage-row-size">{fmt(source.bytes)}</span>
              <input
                class="qa-storage-check"
                type="checkbox"
                checked={isSourceChecked(source.kind, source.id)}
                onchange={(e) => setSourceChecked(source.kind, source.id, (e.currentTarget as HTMLInputElement).checked)}
                data-testid="storage-source-check-{source.kind}-{source.id}"
              />
            </label>
          {/each}
        </div>
      {/if}

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
