# Mobile Nav Drawer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved mobile nav drawer redesign from `docs/superpowers/specs/2026-05-07-mobile-nav-drawer-redesign-design.md`, including theme-token audit, responsive row systems, and Playwright screenshot inspection.

**Architecture:** Keep the unit of work in the `navigate` surface, with adjacent `read/wird` styling for the drawer Daily Wird card. Add semantic nav theme roles first, then refactor the Read drawer source state from nested `Browse | Bookmarks` + `Surah | Juz` into peer `Surah | Juz | Bookmarks` sources. Finish with tokenized CSS, focused unit coverage, owning dossier updates, and browser-only Playwright visual evidence at `320px` and `390px` across light, sepia, and dark.

**Tech Stack:** Svelte 5 runes, TypeScript, CSS cascade layers and semantic tokens, Vitest with Testing Library, Playwright, QuranAtlas docs derive scripts.

---

## File Structure

- Modify `src/styles/tokens/semantic.css`: add nav-specific semantic theme roles for header, rows, controls, markers, badges, skeletons, delete reveal, and shadows.
- Create future unit test file tests/unit/styles/nav-theme-tokens.test.js: guard the nav token contract across `:root`, sepia, and dark overrides.
- Modify `src/navigate/NavDrawer.svelte`: replace nested Read destination state with peer `Surah | Juz | Bookmarks` source state; remove decorative Browse heading and control icon; add Surah no-results and loading states.
- Modify `src/read/wird/DailyWirdCard.svelte`: remove decorative book icon and tighten the card to the locked ledger design while preserving current summary behavior.
- Modify `src/navigate/JuzList.svelte`: keep the current row data structure, add a row chevron, and keep `Current` / `Wird` text markers stable.
- Modify `src/navigate/bookmarks/BookmarksList.svelte`: add row chevrons, text-only loading skeleton, stable group headers with count badges only, and no extra decorative controls.
- Modify `src/styles/surfaces/nav.css`: consume the new nav semantic tokens and implement the approved Variant A visual direction.
- Modify `tests/unit/navigate/drawer.test.ts`: update source-control and row-state unit coverage for peer sources, Surah-only controls, no-results, and non-decorative Bookmarks rows.
- Modify `tests/unit/read/wird/DailyWirdCard.test.ts`: cover the icon-free ledger card and stable progress semantics.
- Modify `tests/e2e/fixtures/idb.js`: add a `seedBookmarks` helper for real browser bookmark visual tests.
- Modify `tests/e2e/navigate/drawer.spec.js`: add layout assertions and Playwright screenshot capture for visual inspection across themes and widths.
- Modify `docs/context/surfaces/navigate.md` and `docs/context/surfaces/read.md`: update current-state behavior after implementation.

## Task 1: Add Nav Theme Token Contract

**Files:**
- Create: tests/unit/styles/nav-theme-tokens.test.js
- Modify: `src/styles/tokens/semantic.css`

- [ ] **Step 1: Write the failing nav theme-token test**

Create the future unit test file tests/unit/styles/nav-theme-tokens.test.js:

```js
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const semanticCss = readFileSync(resolve(process.cwd(), 'src/styles/tokens/semantic.css'), 'utf8')

const REQUIRED_NAV_TOKENS = [
  '--qa-nav-header-surface',
  '--qa-nav-row-surface',
  '--qa-nav-row-surface-hover',
  '--qa-nav-row-border',
  '--qa-nav-row-separator',
  '--qa-nav-current-bg',
  '--qa-nav-current-spine',
  '--qa-nav-control-surface',
  '--qa-nav-control-selected-surface',
  '--qa-nav-control-selected-text',
  '--qa-nav-control-border',
  '--qa-nav-badge-surface',
  '--qa-nav-badge-text',
  '--qa-nav-skeleton-surface',
  '--qa-nav-delete-surface',
  '--qa-nav-delete-text',
  '--qa-nav-shadow-row',
  '--qa-nav-shadow-control',
]

const THEME_AUDITED_TOKENS = [
  '--qa-nav-header-surface',
  '--qa-nav-row-surface',
  '--qa-nav-row-border',
  '--qa-nav-row-separator',
  '--qa-nav-current-bg',
  '--qa-nav-control-surface',
  '--qa-nav-control-selected-surface',
  '--qa-nav-badge-surface',
  '--qa-nav-skeleton-surface',
  '--qa-nav-delete-surface',
  '--qa-nav-delete-text',
  '--qa-nav-shadow-row',
  '--qa-nav-shadow-control',
]

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = semanticCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))
  return match?.[1] ?? ''
}

describe('nav drawer theme tokens', () => {
  it('defines every nav visual role in :root', () => {
    const root = cssBlock(':root')
    for (const token of REQUIRED_NAV_TOKENS) {
      expect(root, `${token} is defined in :root`).toContain(`${token}:`)
    }
  })

  it('audits nav visual roles for sepia and dark themes', () => {
    const sepia = cssBlock('html[data-theme="sepia"]')
    const dark = cssBlock('html[data-theme="dark"]')
    for (const token of THEME_AUDITED_TOKENS) {
      expect(sepia, `${token} has a sepia audit value`).toContain(`${token}:`)
      expect(dark, `${token} has a dark audit value`).toContain(`${token}:`)
    }
  })
})
```

- [ ] **Step 2: Run the new token test to verify it fails**

Run:

```bash
pnpm vitest run tests/unit/styles/nav-theme-tokens.test.js
```

Expected: fail because `--qa-nav-*` tokens are not defined.

- [ ] **Step 3: Add nav semantic tokens to the light root**

In `src/styles/tokens/semantic.css`, inside the main `:root` token block after the selection/focus tokens, add:

```css
    /* --- Nav drawer ------------------------------------------------------- */
    --qa-nav-header-surface: color-mix(in srgb, var(--qa-surface-raised) 62%, var(--qa-surface-app));
    --qa-nav-row-surface: color-mix(in srgb, var(--qa-surface-raised) 88%, var(--qa-surface-app));
    --qa-nav-row-surface-hover: color-mix(in srgb, var(--qa-accent) 5%, var(--qa-nav-row-surface));
    --qa-nav-row-border: color-mix(in srgb, var(--qa-border-subtle) 82%, var(--qa-accent));
    --qa-nav-row-separator: color-mix(in srgb, var(--qa-border-subtle) 70%, transparent);
    --qa-nav-current-bg: color-mix(in srgb, var(--qa-accent) 10%, var(--qa-surface-raised));
    --qa-nav-current-spine: var(--qa-accent);
    --qa-nav-control-surface: color-mix(in srgb, var(--qa-surface-raised) 84%, var(--qa-surface-app));
    --qa-nav-control-selected-surface: color-mix(in srgb, var(--qa-accent) 13%, var(--qa-surface-raised));
    --qa-nav-control-selected-text: var(--qa-accent);
    --qa-nav-control-border: color-mix(in srgb, var(--qa-border-subtle) 84%, var(--qa-accent));
    --qa-nav-badge-surface: color-mix(in srgb, var(--qa-accent) 14%, var(--qa-surface-raised));
    --qa-nav-badge-text: var(--qa-text-primary);
    --qa-nav-skeleton-surface: color-mix(in srgb, var(--qa-surface-skeleton) 72%, var(--qa-surface-raised));
    --qa-nav-delete-surface: color-mix(in srgb, var(--qa-surface-danger) 86%, var(--qa-surface-raised));
    --qa-nav-delete-text: var(--qa-text-on-accent);
    --qa-nav-shadow-row: 0 4px 14px rgb(0 0 0 / 6%);
    --qa-nav-shadow-control: 0 8px 18px rgb(0 0 0 / 4%);
```

- [ ] **Step 4: Add sepia nav token overrides**

Inside `html[data-theme="sepia"]` in `src/styles/tokens/semantic.css`, add:

```css
    --qa-nav-header-surface: color-mix(in srgb, var(--qa-surface-raised) 70%, var(--qa-surface-app));
    --qa-nav-row-surface: color-mix(in srgb, var(--qa-surface-raised) 90%, var(--qa-surface-app));
    --qa-nav-row-surface-hover: color-mix(in srgb, var(--qa-accent) 6%, var(--qa-nav-row-surface));
    --qa-nav-row-border: color-mix(in srgb, var(--qa-border-default) 76%, var(--qa-accent));
    --qa-nav-row-separator: color-mix(in srgb, var(--qa-border-default) 62%, transparent);
    --qa-nav-current-bg: color-mix(in srgb, var(--qa-accent) 11%, var(--qa-surface-raised));
    --qa-nav-current-spine: var(--qa-accent);
    --qa-nav-control-surface: color-mix(in srgb, var(--qa-surface-raised) 86%, var(--qa-surface-app));
    --qa-nav-control-selected-surface: color-mix(in srgb, var(--qa-accent) 14%, var(--qa-surface-raised));
    --qa-nav-control-selected-text: var(--qa-accent);
    --qa-nav-control-border: color-mix(in srgb, var(--qa-border-default) 76%, var(--qa-accent));
    --qa-nav-badge-surface: color-mix(in srgb, var(--qa-accent) 15%, var(--qa-surface-raised));
    --qa-nav-badge-text: var(--qa-text-primary);
    --qa-nav-skeleton-surface: color-mix(in srgb, var(--qa-surface-skeleton) 68%, var(--qa-surface-raised));
    --qa-nav-delete-surface: color-mix(in srgb, var(--qa-surface-danger) 82%, var(--qa-surface-raised));
    --qa-nav-delete-text: var(--qa-text-on-accent);
    --qa-nav-shadow-row: 0 4px 14px rgb(64 43 18 / 7%);
    --qa-nav-shadow-control: 0 8px 18px rgb(64 43 18 / 5%);
```

- [ ] **Step 5: Add dark nav token overrides**

Inside `html[data-theme="dark"]` in `src/styles/tokens/semantic.css`, add:

```css
    --qa-nav-header-surface: color-mix(in srgb, var(--qa-surface-raised) 72%, var(--qa-surface-sheet));
    --qa-nav-row-surface: color-mix(in srgb, var(--qa-surface-raised) 78%, var(--qa-surface-app));
    --qa-nav-row-surface-hover: color-mix(in srgb, var(--qa-accent) 9%, var(--qa-nav-row-surface));
    --qa-nav-row-border: color-mix(in srgb, var(--qa-border-subtle) 72%, var(--qa-accent));
    --qa-nav-row-separator: color-mix(in srgb, var(--qa-border-subtle) 80%, transparent);
    --qa-nav-current-bg: color-mix(in srgb, var(--qa-accent) 16%, var(--qa-surface-raised));
    --qa-nav-current-spine: var(--qa-accent);
    --qa-nav-control-surface: color-mix(in srgb, var(--qa-surface-raised) 82%, var(--qa-surface-app));
    --qa-nav-control-selected-surface: color-mix(in srgb, var(--qa-accent) 20%, var(--qa-surface-raised));
    --qa-nav-control-selected-text: var(--qa-accent);
    --qa-nav-control-border: color-mix(in srgb, var(--qa-border-subtle) 72%, var(--qa-accent));
    --qa-nav-badge-surface: color-mix(in srgb, var(--qa-accent) 22%, var(--qa-surface-raised));
    --qa-nav-badge-text: var(--qa-text-primary);
    --qa-nav-skeleton-surface: color-mix(in srgb, var(--qa-surface-skeleton) 76%, var(--qa-surface-raised));
    --qa-nav-delete-surface: color-mix(in srgb, var(--qa-surface-danger) 68%, var(--qa-surface-raised));
    --qa-nav-delete-text: var(--qa-text-primary);
    --qa-nav-shadow-row: 0 4px 14px rgb(0 0 0 / 28%);
    --qa-nav-shadow-control: 0 8px 18px rgb(0 0 0 / 24%);
```

- [ ] **Step 6: Run token tests**

Run:

```bash
pnpm vitest run tests/unit/styles/nav-theme-tokens.test.js tests/unit/styles/theme-parity.test.js tests/unit/styles/token-usage.test.js
```

Expected: all tests pass.

- [ ] **Step 7: Commit token audit**

Run:

```bash
git add src/styles/tokens/semantic.css tests/unit/styles/nav-theme-tokens.test.js
git commit -m "style: add nav drawer theme roles"
```

## Task 2: Refactor Read Sources To Peer Surah, Juz, Bookmarks

**Files:**
- Modify: `src/navigate/NavDrawer.svelte`
- Modify: `tests/unit/navigate/drawer.test.ts`

- [ ] **Step 1: Write failing unit tests for peer sources**

In `tests/unit/navigate/drawer.test.ts`, replace the current tests named `renders Browse search, Surah/Juz, and All/Recent in one compact rail`, `switches Browse between Surah and Juz without closing the drawer`, and `puts the Daily Wird card before Browse and Bookmarks in Read mode` with these tests:

```ts
  it('renders Surah, Juz, and Bookmarks as peer Read sources', async () => {
    await mountAndOpen('read', 'surahs')

    const source = document.querySelector('.qa-nav-drawer-source-tabs') as HTMLElement | null
    expect(source).not.toBeNull()
    expect(source!.textContent).toContain('Surah')
    expect(source!.textContent).toContain('Juz')
    expect(source!.textContent).toContain('Bookmarks')
    expect(source!.querySelector('[data-testid="read-source-surah"]')).toHaveAttribute('aria-selected', 'true')
    expect(source!.querySelector('[data-testid="read-source-juz"]')).toHaveAttribute('aria-selected', 'false')
    expect(source!.querySelector('[data-testid="read-source-bookmarks"]')).toHaveAttribute('aria-selected', 'false')

    expect(document.querySelector('.qa-nav-drawer-dest-switch')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-surah-rail')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-surah-rail-tool')).toBeNull()
  })

  it('keeps search and All/Recent controls Surah-only', async () => {
    await mountAndOpen('read', 'surahs')

    expect(document.querySelector('.qa-nav-drawer-search-input')).not.toBeNull()
    expect(document.querySelector('.qa-nav-drawer-source-filter')?.textContent).toContain('All')
    expect(document.querySelector('.qa-nav-drawer-source-filter')?.textContent).toContain('Recent')

    await fireEvent.click(document.querySelector('[data-testid="read-source-juz"]')!)
    await flush()
    expect(document.querySelector('.qa-nav-drawer')).not.toBeNull()
    expect(document.querySelector('.qa-nav-drawer-search-input')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-source-filter')).toBeNull()
    expect(document.querySelectorAll('.qa-juz-row').length).toBe(30)

    await fireEvent.click(document.querySelector('[data-testid="read-source-bookmarks"]')!)
    await deepFlush()
    expect(document.querySelector('.qa-nav-drawer-search-input')).toBeNull()
    expect(document.querySelector('.qa-nav-drawer-source-filter')).toBeNull()
    expect(document.querySelector('[data-bookmarks-list]')).not.toBeNull()
  })

  it('places the Daily Wird card before the peer source controls in Read mode', async () => {
    await mountAndOpen('read', 'surahs')
    const card = document.querySelector('[data-testid="wird-card"]') as HTMLElement
    const source = document.querySelector('.qa-nav-drawer-source-tabs') as HTMLElement
    expect(card).not.toBeNull()
    expect(source).not.toBeNull()
    expect(card.compareDocumentPosition(source)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
```

- [ ] **Step 2: Update the Juz navigation unit test selectors**

In `tests/unit/navigate/drawer.test.ts`, change the Juz source click in `emits navigation when a Juz row is tapped` from:

```ts
    await fireEvent.click(document.querySelector('[data-testid="browse-mode-juz"]')!)
```

to:

```ts
    await fireEvent.click(document.querySelector('[data-testid="read-source-juz"]')!)
```

- [ ] **Step 3: Run the drawer unit test to verify failure**

Run:

```bash
pnpm vitest run tests/unit/navigate/drawer.test.ts
```

Expected: fail because the component still renders nested `Browse | Bookmarks` and `Surah | Juz`.

- [ ] **Step 4: Refactor the NavDrawer read source state**

In `src/navigate/NavDrawer.svelte`, replace:

```ts
  type ReadDestination = 'browse' | 'bookmarks'
  type BrowseMode = 'surah' | 'juz'
  let readDestination = $state<ReadDestination>('browse')
  let browseMode = $state<BrowseMode>('surah')
```

with:

```ts
  type ReadSource = 'surah' | 'juz' | 'bookmarks'
  let readSource = $state<ReadSource>('surah')
```

Then replace every `readDestination === 'browse' && browseMode === 'surah'` check with `readSource === 'surah'`, every `browseMode !== 'surah'` guard with `readSource !== 'surah'`, and every `browseMode === 'surah'` branch with `readSource === 'surah'`.

- [ ] **Step 5: Update drawer open and source setters**

In `src/navigate/NavDrawer.svelte`, update the start of `open` to:

```ts
  async function open(tab?: DrawerTab, subTab?: ReadSubTab): Promise<void> {
    activeTab = tab ?? 'read'
    readSource = subTab === 'bookmarks' ? 'bookmarks' : 'surah'
    showingWirdDetail = false
    isOpen = true
    surahsState.filter = 'all'
    surahsState.searchQuery = ''
```

Replace `setBrowseMode` with:

```ts
  function setReadSource(source: ReadSource): void {
    readSource = source
    if (source === 'surah') { void tick().then(scrollToCurrentSurah) }
  }
```

Update `setTab` so its Read branch checks `readSource === 'surah'`:

```ts
  function setTab(t: DrawerTab): void {
    activeTab = t
    if (t === 'read' && readSource === 'surah') {
      void tick().then(scrollToCurrentSurah)
    }
  }
```

- [ ] **Step 6: Replace Read-mode source markup**

In `src/navigate/NavDrawer.svelte`, replace the Read-mode block from `<DailyWirdCard summary={wirdSummary} onOpen={openWirdDetail} />` through the closing branch for Bookmarks with:

```svelte
          <DailyWirdCard summary={wirdSummary} onOpen={openWirdDetail} />

          <div class="qa-nav-drawer-source-panel">
            <div class="qa-nav-drawer-source-tabs" role="tablist" aria-label="Read source">
              <button
                type="button"
                role="tab"
                data-testid="read-source-surah"
                aria-selected={readSource === 'surah'}
                class="qa-nav-drawer-source-tab"
                class:qa-nav-drawer-source-tab--on={readSource === 'surah'}
                onclick={() => setReadSource('surah')}
              >Surah</button>
              <button
                type="button"
                role="tab"
                data-testid="read-source-juz"
                aria-selected={readSource === 'juz'}
                class="qa-nav-drawer-source-tab"
                class:qa-nav-drawer-source-tab--on={readSource === 'juz'}
                onclick={() => setReadSource('juz')}
              >Juz</button>
              <button
                type="button"
                role="tab"
                data-testid="read-source-bookmarks"
                aria-selected={readSource === 'bookmarks'}
                class="qa-nav-drawer-source-tab"
                class:qa-nav-drawer-source-tab--on={readSource === 'bookmarks'}
                onclick={() => setReadSource('bookmarks')}
              >Bookmarks</button>
            </div>

            {#if readSource === 'surah'}
              <div class="qa-nav-drawer-source-tools" aria-label="Surah controls">
                <label class="qa-nav-drawer-source-search qa-nav-drawer-search">
                  <span class="qa-nav-drawer-search-icon" aria-hidden="true">&#x2315;</span>
                  <input
                    type="search"
                    class="qa-nav-drawer-search-input"
                    placeholder="Search surah"
                    aria-label="Search surah by name, number, or verse reference"
                    autocomplete="off"
                    maxlength={20}
                    value={surahsState.searchQuery}
                    oninput={handleSearchInput}
                    onkeydown={handleSearchKeydown}
                  />
                </label>

                <div class="qa-nav-drawer-source-filter" role="tablist" aria-label="Surah filter">
                  {#each FILTERS as f (f.key)}
                    <button
                      type="button"
                      role="tab"
                      class="qa-nav-drawer-filter-option"
                      class:qa-nav-drawer-filter-option--on={surahsState.filter === f.key}
                      aria-selected={surahsState.filter === f.key}
                      onclick={() => setFilter(f.key)}
                    >{f.label}</button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          {#if searchHint && readSource === 'surah'}
            <div class="qa-nav-drawer-search-hint" role="status">{searchHint}</div>
          {/if}

          <div class="qa-nav-drawer-tab-body">
            {#if readSource === 'surah'}
              <div class="qa-nav-drawer-surah-legacy">
                {#if !loaded}
                  <div class="qa-nav-drawer-list-state" aria-live="polite">Loading...</div>
                {:else if visibleItems.length === 0}
                  <div class="qa-nav-drawer-list-state" role="status">No surahs match your search.</div>
                {:else}
                  <ul class="qa-nav-drawer-surah-list" bind:this={listEl}>
                    {#each visibleItems as s (s.n)}
                      <li
                        class="qa-nav-drawer-surah-row"
                        class:qa-nav-drawer-surah-row--current={s.n === currentSurahN}
                        data-surah={s.n}
                      >
                        <button
                          type="button"
                          class="qa-nav-drawer-surah-btn"
                          onclick={() => { if (!commitRefJump()) { goSurah(s.n) } }}
                          aria-label={parsedQuery.kind === 'ref' && parsedQuery.surah === s.n
                            ? `Open ${s.name} verse ${parsedQuery.verse}`
                            : `Open ${s.name}`}
                        >
                          <span class="qa-nav-drawer-surah-num">{s.n}</span>
                          <span class="qa-nav-drawer-surah-copy">
                            <span class="qa-nav-drawer-surah-name">{s.name}</span>
                            <span class="qa-nav-drawer-surah-meta">{s.counts[settings.riwayah]} verses</span>
                          </span>
                          <span class="qa-nav-drawer-surah-ar" dir="rtl" lang="ar">{s.name_ar}</span>
                          <span class="qa-nav-drawer-surah-chev" aria-hidden="true">&#x203A;</span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {:else if readSource === 'juz'}
              <JuzList
                counts={surahCounts}
                names={allSurahs}
                currentRef={currentRef}
                wirdRef={wirdSummary.nextRef}
                onNavigate={(ref) => { emit(Events.NAVIGATION_NAVIGATE, { surah: ref.surah, verse: ref.verse }); close() }}
              />
            {:else}
              <div class="qa-nav-drawer-bookmarks-body">
                <BookmarksList onNavigate={() => close()} />
              </div>
            {/if}
          </div>
```

- [ ] **Step 7: Remove obsolete decorative control classes from markup**

In `src/navigate/NavDrawer.svelte`, ensure these class names no longer appear:

```bash
qa-nav-drawer-dest-switch
qa-nav-drawer-dest-icon
qa-nav-drawer-surah-rail
qa-nav-drawer-surah-rail-tool
data-testid="browse-mode-surah"
data-testid="browse-mode-juz"
```

Run:

```bash
rg -n "qa-nav-drawer-dest-switch|qa-nav-drawer-dest-icon|qa-nav-drawer-surah-rail|browse-mode-" src/navigate/NavDrawer.svelte
```

Expected: no matches.

- [ ] **Step 8: Run unit tests**

Run:

```bash
pnpm vitest run tests/unit/navigate/drawer.test.ts
```

Expected: pass.

- [ ] **Step 9: Commit source hierarchy**

Run:

```bash
git add src/navigate/NavDrawer.svelte tests/unit/navigate/drawer.test.ts
git commit -m "refactor: make drawer read sources peers"
```

## Task 3: Refine Header Chrome And Daily Wird Ledger Card

**Files:**
- Modify: `src/navigate/NavDrawer.svelte`
- Modify: `src/read/wird/DailyWirdCard.svelte`
- Modify: `tests/unit/navigate/drawer.test.ts`
- Modify: `tests/unit/read/wird/DailyWirdCard.test.ts`

- [ ] **Step 1: Add header unit assertions**

In `tests/unit/navigate/drawer.test.ts`, update `renders Read | Study inside the top bar beside the wordmark and close control` to:

```ts
  it('renders compact logo wordmark, About icon, Read | Study, and close in the header', async () => {
    await mountAndOpen('read', 'surahs')
    const header = document.querySelector('.qa-nav-drawer-hdr') as HTMLElement
    expect(header).not.toBeNull()
    expect(header.querySelector('.qa-nav-drawer-logo')).not.toBeNull()
    expect(header.querySelector('.qa-nav-drawer-wordmark')?.textContent).toContain('QuranAtlas')
    expect(header.querySelector('.qa-nav-drawer-about')).not.toBeNull()
    expect(header.querySelector('.qa-nav-drawer-tabs')?.textContent).toContain('Read')
    expect(header.querySelector('.qa-nav-drawer-tabs')?.textContent).toContain('Study')
    expect(header.querySelector('.qa-nav-drawer-close')).not.toBeNull()
  })
```

- [ ] **Step 2: Add Daily Wird card unit assertions**

In `tests/unit/read/wird/DailyWirdCard.test.ts`, update the active card test to assert the icon is gone:

```ts
  it('renders active plan progress as an icon-free ledger button card', () => {
    render(DailyWirdCard, { props: { summary: active, onOpen: vi.fn() } })
    const card = document.querySelector('[data-testid="wird-card"]') as HTMLButtonElement
    expect(card).not.toBeNull()
    expect(card.querySelector('.qa-wird-card-icon')).toBeNull()
    expect(card.textContent).toContain('Today')
    expect(card.textContent).toContain('2:12')
    const bar = document.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })
```

- [ ] **Step 3: Run unit tests to verify failure**

Run:

```bash
pnpm vitest run tests/unit/navigate/drawer.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
```

Expected: fail because the header lacks `.qa-nav-drawer-logo` / `.qa-nav-drawer-about` and the card still renders `.qa-wird-card-icon`.

- [ ] **Step 4: Replace header markup**

In `src/navigate/NavDrawer.svelte`, replace the header wordmark button with this wordmark plus About button:

```svelte
      <button
        type="button"
        class="qa-nav-drawer-wordmark"
        aria-label="About QuranAtlas"
        onclick={goAbout}
      >
        <span class="qa-nav-drawer-logo" aria-hidden="true">أ</span>
        <span class="qa-nav-drawer-wordmark-text">QuranAtlas</span>
      </button>
      <button
        type="button"
        class="qa-nav-drawer-about"
        aria-label="About QuranAtlas"
        onclick={goAbout}
      >
        <span aria-hidden="true">i</span>
      </button>
```

Keep the existing `Read | Study` tabs and close button after this block.

- [ ] **Step 5: Remove Daily Wird decorative icon markup**

In `src/read/wird/DailyWirdCard.svelte`, remove the entire `<span class="qa-wird-card-icon" aria-hidden="true">` block and its nested SVG content. The button should start with:

```svelte
<button
  type="button"
  class="qa-wird-card"
  data-testid="wird-card"
  onclick={onOpen}
>
  <span class="qa-wird-card-copy">
```

- [ ] **Step 6: Run unit tests**

Run:

```bash
pnpm vitest run tests/unit/navigate/drawer.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit header and card markup**

Run:

```bash
git add src/navigate/NavDrawer.svelte src/read/wird/DailyWirdCard.svelte tests/unit/navigate/drawer.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
git commit -m "refactor: align drawer header and wird card markup"
```

## Task 4: Implement Ledger Rows And Text-Only States

**Files:**
- Modify: `src/navigate/JuzList.svelte`
- Modify: `src/navigate/bookmarks/BookmarksList.svelte`
- Modify: `tests/unit/navigate/drawer.test.ts`

- [ ] **Step 1: Add row/state unit tests**

In `tests/unit/navigate/drawer.test.ts`, add these tests after `renders the Arabic surah name (name_ar) on every row`:

```ts
  it('renders Surah no-results as text-only state', async () => {
    await mountAndOpen('read', 'surahs')
    const search = document.querySelector('.qa-nav-drawer-search-input') as HTMLInputElement
    await fireEvent.input(search, { target: { value: 'not-a-surah' } })
    await flush()

    expect(document.querySelectorAll('.qa-nav-drawer-surah-row').length).toBe(0)
    const state = document.querySelector('.qa-nav-drawer-list-state') as HTMLElement | null
    expect(state).not.toBeNull()
    expect(state!.textContent).toContain('No surahs match your search.')
    expect(state!.querySelector('svg')).toBeNull()
  })

  it('renders Juz rows with chevrons and text markers only', async () => {
    Object.assign(settings, {
      currentPosition: { surah: 2, verse: 150 },
      wirdPlan: {
        id: 'wird-juz-marker',
        startRef: { surah: 1, verse: 1 },
        endRef: { surah: 3, verse: 200 },
        targetDays: 2,
        targetEndOn: '2026-05-05',
        startedOn: '2026-05-04',
        unit: 'verse',
        reminder: { enabled: false, time: '08:00', browserNotifications: 'default' },
        progress: {
          lastReadRef: { surah: 2, verse: 250 },
          nextRef: { surah: 2, verse: 253 },
          dayKey: '2026-05-04',
          todayStartRef: { surah: 2, verse: 253 },
          todayEndRef: { surah: 3, verse: 20 },
          completedThroughRef: { surah: 2, verse: 252 },
        },
        history: [],
      },
    })
    await mountAndOpen('read', 'surahs')
    await fireEvent.click(document.querySelector('[data-testid="read-source-juz"]')!)
    await flush()

    const current = document.querySelector('.qa-juz-row--current') as HTMLElement | null
    const wird = document.querySelector('.qa-juz-row--wird') as HTMLElement | null
    expect(current).not.toBeNull()
    expect(current!.textContent).toContain('Current')
    expect(wird).not.toBeNull()
    expect(wird!.textContent).toContain('Wird')
    expect(document.querySelector('.qa-juz-chev')).not.toBeNull()
    expect(document.querySelector('.qa-juz-row svg')).toBeNull()
  })

  it('renders bookmark group headers with count badge only and row chevrons', async () => {
    await addBookmark('2:255', 'qaloon')
    await addBookmark('2:286', 'qaloon')
    await mountAndOpen('read', 'bookmarks')
    await deepFlush()

    const header = document.querySelector('.qa-bookmarks-section-hdr') as HTMLElement | null
    expect(header).not.toBeNull()
    expect(header!.textContent).toContain('Al-Baqarah')
    expect(header!.querySelector('.qa-bookmarks-section-count')?.textContent).toContain('2')
    expect(header!.querySelector('svg')).toBeNull()
    expect(header!.querySelector('.qa-bookmarks-row-chev')).toBeNull()

    const row = document.querySelector('.qa-bookmarks-row-btn') as HTMLElement | null
    expect(row).not.toBeNull()
    expect(row!.querySelector('.qa-bookmarks-row-chev')).not.toBeNull()
  })
```

- [ ] **Step 2: Run unit tests to verify failure**

Run:

```bash
pnpm vitest run tests/unit/navigate/drawer.test.ts
```

Expected: fail on missing no-results state, Juz chevron, and bookmark row chevron.

- [ ] **Step 3: Add Juz row chevron**

In `src/navigate/JuzList.svelte`, add this span as the last child of `.qa-juz-row-btn`:

```svelte
        <span class="qa-juz-chev" aria-hidden="true">&#x203A;</span>
```

- [ ] **Step 4: Add Bookmarks row chevron**

In `src/navigate/bookmarks/BookmarksList.svelte`, inside `.qa-bookmarks-row-btn`, after `.qa-bookmarks-row-ar`, add:

```svelte
                <span class="qa-bookmarks-row-chev" aria-hidden="true">&#x203A;</span>
```

- [ ] **Step 5: Replace Bookmarks loading state with skeleton rows**

In `src/navigate/bookmarks/BookmarksList.svelte`, replace:

```svelte
    <div class="qa-bookmarks-empty" aria-live="polite">Loading…</div>
```

with:

```svelte
    <div class="qa-bookmarks-loading" aria-live="polite">
      <span>Loading...</span>
      <span class="qa-bookmarks-skeleton-row"></span>
      <span class="qa-bookmarks-skeleton-row"></span>
      <span class="qa-bookmarks-skeleton-row"></span>
    </div>
```

- [ ] **Step 6: Run unit tests**

Run:

```bash
pnpm vitest run tests/unit/navigate/drawer.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit row/state markup**

Run:

```bash
git add src/navigate/JuzList.svelte src/navigate/bookmarks/BookmarksList.svelte tests/unit/navigate/drawer.test.ts
git commit -m "refactor: align drawer list row markup"
```

## Task 5: Apply Tokenized Responsive CSS

**Files:**
- Modify: `src/styles/surfaces/nav.css`

- [ ] **Step 1: Remove obsolete CSS selectors**

In `src/styles/surfaces/nav.css`, delete selector blocks for:

```text
.qa-nav-drawer-dest-switch
.qa-nav-drawer-dest
.qa-nav-drawer-dest-icon
.qa-nav-drawer-surah-rail
.qa-nav-drawer-surah-rail-copy
.qa-nav-drawer-surah-rail-eyebrow
.qa-nav-drawer-surah-rail-title
.qa-nav-drawer-surah-rail-tool
.qa-nav-drawer-browse-line
.qa-nav-drawer-browse-zone
.qa-nav-drawer-ledger-switch
.qa-nav-drawer-ledger-filter
.qa-nav-drawer-ledger-option
.qa-nav-drawer-ledger-option--on
```

- [ ] **Step 2: Update header CSS**

In `src/styles/surfaces/nav.css`, replace `.qa-nav-drawer-hdr`, `.qa-nav-drawer-wordmark`, `.qa-nav-drawer-info`, and `.qa-nav-drawer-close` blocks with:

```css
.qa-nav-drawer-hdr {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px auto 44px;
  gap: 6px;
  align-items: center;
  padding: 10px 14px 8px;
  background: var(--qa-nav-header-surface);
  border-bottom: 1px solid var(--qa-nav-row-separator);
}

.qa-nav-drawer-wordmark {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--qa-text-primary);
  cursor: pointer;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0;
}

.qa-nav-drawer-logo {
  display: grid;
  place-items: center;
  flex: 0 0 28px;
  inline-size: 28px;
  block-size: 28px;
  border: 1px solid var(--qa-nav-control-border);
  border-radius: var(--qa-radius-sm);
  color: var(--qa-accent);
  font-family: var(--qa-font-arabic);
  font-size: 1rem;
  line-height: 1;
}

.qa-nav-drawer-wordmark-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qa-nav-drawer-about,
.qa-nav-drawer-close {
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  border: 0;
  background: transparent;
  color: var(--qa-text-primary);
  cursor: pointer;
}

.qa-nav-drawer-about span {
  display: grid;
  place-items: center;
  inline-size: 24px;
  block-size: 24px;
  border: 1px solid var(--qa-nav-control-border);
  border-radius: var(--qa-radius-circle);
  color: var(--qa-accent);
  font-family: var(--qa-font-mono);
  font-size: 0.72rem;
  font-weight: 700;
}

.qa-nav-drawer-close svg {
  inline-size: 19px;
  block-size: 19px;
}
```

- [ ] **Step 3: Update source-control CSS**

Add this source-control block near the existing Read-mode drawer CSS:

```css
.qa-nav-drawer-source-panel {
  margin: 0 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qa-nav-drawer-source-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 42px;
  padding: 4px;
  border: 1px solid var(--qa-nav-control-border);
  border-radius: var(--qa-radius-md);
  background: var(--qa-nav-control-surface);
  box-shadow: var(--qa-nav-shadow-control);
}

.qa-nav-drawer-source-tab,
.qa-nav-drawer-filter-option {
  min-width: 0;
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: var(--qa-radius-sm);
  background: transparent;
  color: var(--qa-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1;
}

.qa-nav-drawer-source-tab--on,
.qa-nav-drawer-filter-option--on {
  border-color: var(--qa-nav-control-border);
  background: var(--qa-nav-control-selected-surface);
  color: var(--qa-nav-control-selected-text);
}

.qa-nav-drawer-source-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  min-height: 42px;
  border: 1px solid var(--qa-nav-control-border);
  border-radius: var(--qa-radius-md);
  overflow: hidden;
  background: var(--qa-nav-control-surface);
}

.qa-nav-drawer-source-search {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
  padding: 0 10px;
}

.qa-nav-drawer-source-filter {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-left: 1px solid var(--qa-nav-row-separator);
}
```

- [ ] **Step 4: Update Daily Wird card CSS**

Replace `.qa-wird-card` and dependent card icon rules with:

```css
.qa-wird-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin: 8px 14px 12px;
  padding: 13px 11px 13px 14px;
  min-height: 82px;
  border: 1px solid var(--qa-nav-row-border);
  border-radius: var(--qa-radius-md);
  background: var(--qa-nav-row-surface);
  color: var(--qa-text-primary);
  text-align: start;
  box-shadow: var(--qa-nav-shadow-row);
}
```

Delete `.qa-wird-card-icon` and `.qa-wird-card-icon svg`.

- [ ] **Step 5: Update row CSS**

Replace Surah/Juz row surface styles with tokenized ledger rows:

```css
.qa-nav-drawer-surah-row,
.qa-juz-row,
.qa-bookmarks-row {
  flex: 0 0 auto;
  border: 1px solid var(--qa-nav-row-border);
  border-radius: var(--qa-radius-md);
  overflow: hidden;
  background: var(--qa-nav-row-surface);
  box-shadow: inset 0 -1px var(--qa-nav-row-separator);
}

.qa-nav-drawer-surah-row--current,
.qa-juz-row--current {
  background: var(--qa-nav-current-bg);
  border-color: var(--qa-nav-row-border);
  box-shadow:
    inset 3px 0 var(--qa-nav-current-spine),
    var(--qa-nav-shadow-row);
}

.qa-nav-drawer-surah-btn {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) minmax(56px, auto) 16px;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 64px;
  padding: 9px 8px 9px 10px;
  border: 0;
  background: transparent;
  color: var(--qa-text-primary);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.qa-juz-row-btn {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto auto 16px;
  gap: 9px;
  align-items: center;
  width: 100%;
  min-height: 64px;
  padding: 10px;
  border: 0;
  background: transparent;
  color: var(--qa-text-primary);
  text-align: start;
}

.qa-juz-chev,
.qa-bookmarks-row-chev,
.qa-nav-drawer-surah-chev {
  color: var(--qa-text-muted);
  font-size: 1.15rem;
  line-height: 1;
}

.qa-juz-marker,
.qa-bookmarks-section-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 7px;
  border-radius: var(--qa-radius-pill);
  background: var(--qa-nav-badge-surface);
  color: var(--qa-nav-badge-text);
  font-family: var(--qa-font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 6: Add text-only state CSS**

Add:

```css
.qa-nav-drawer-list-state,
.qa-bookmarks-empty,
.qa-bookmarks-loading {
  margin: 0 14px 14px;
  min-height: 132px;
  display: grid;
  align-content: center;
  gap: 9px;
  padding: 16px;
  border: 1px solid var(--qa-nav-row-border);
  border-radius: var(--qa-radius-md);
  background: var(--qa-nav-row-surface);
  color: var(--qa-text-muted);
  text-align: center;
  font-size: 0.9rem;
  line-height: 1.45;
}

.qa-bookmarks-skeleton-row {
  display: block;
  min-height: 11px;
  border-radius: var(--qa-radius-pill);
  background: var(--qa-nav-skeleton-surface);
}
```

- [ ] **Step 7: Update 320px CSS**

Inside the existing `@media (max-width: 359px)` block, replace the current narrow drawer overrides with:

```css
  .qa-nav-drawer-hdr {
    grid-template-columns: minmax(0, 1fr) 40px auto 44px;
    gap: 4px;
    padding-inline: 10px;
  }

  .qa-nav-drawer-logo {
    flex-basis: 24px;
    inline-size: 24px;
    block-size: 24px;
  }

  .qa-nav-drawer-about {
    inline-size: 40px;
  }

  .qa-nav-drawer-tabs {
    min-width: 104px;
  }

  .qa-nav-drawer-tab {
    padding-inline: 7px;
  }

  .qa-wird-card,
  .qa-nav-drawer-source-panel,
  .qa-nav-drawer-surah-list,
  .qa-juz-list,
  .qa-bookmarks-list {
    margin-inline: 10px;
  }

  .qa-nav-drawer-source-tools {
    grid-template-columns: 1fr;
  }

  .qa-nav-drawer-source-filter {
    border-left: 0;
    border-top: 1px solid var(--qa-nav-row-separator);
  }

  .qa-nav-drawer-surah-btn {
    grid-template-columns: 30px minmax(0, 1fr) 16px;
    min-height: 70px;
  }

  .qa-nav-drawer-surah-ar {
    grid-column: 2;
    justify-self: start;
    max-inline-size: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qa-nav-drawer-surah-chev {
    grid-column: 3;
    grid-row: 1 / span 2;
  }

  .qa-juz-row-btn {
    grid-template-columns: auto auto minmax(0, 1fr) 16px;
  }
```

- [ ] **Step 8: Run style and unit checks**

Run:

```bash
pnpm run lint
pnpm vitest run tests/unit/styles/nav-theme-tokens.test.js tests/unit/navigate/drawer.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
```

Expected: all pass.

- [ ] **Step 9: Commit CSS implementation**

Run:

```bash
git add src/styles/surfaces/nav.css tests/unit/navigate/drawer.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
git commit -m "style: implement nav drawer ledger design"
```

## Task 6: Add Browser Visual Screenshot Validation

**Files:**
- Modify: `tests/e2e/fixtures/idb.js`
- Modify: `tests/e2e/navigate/drawer.spec.js`

- [ ] **Step 1: Add bookmark seeding helper**

At the end of `tests/e2e/fixtures/idb.js`, add:

```js
export async function seedBookmarks(page, records) {
  await page.evaluate((rows) => new Promise((resolve, reject) => {
    const open = indexedDB.open('quran-atlas')
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction('bookmarks', 'readwrite')
      const store = tx.objectStore('bookmarks')
      for (const row of rows) {
        const [surahRaw] = row.verseKey.split(':')
        store.put({
          riwayah: row.riwayah ?? 'qaloon',
          verseKey: row.verseKey,
          surah: Number(surahRaw),
          createdAt: Date.now(),
        })
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
    open.onerror = () => reject(open.error)
  }), records)
}
```

- [ ] **Step 2: Import helper in drawer e2e spec**

In `tests/e2e/navigate/drawer.spec.js`, change the import:

```js
import { seedMarks, writeSetting } from '../fixtures/idb.js'
```

to:

```js
import { seedBookmarks, seedMarks, writeSetting } from '../fixtures/idb.js'
```

- [ ] **Step 3: Update old e2e selectors**

In `tests/e2e/navigate/drawer.spec.js`, replace old selectors:

```text
getByTestId('browse-mode-surah')
getByTestId('browse-mode-juz')
.qa-nav-drawer-dest-switch
```

with:

```text
getByTestId('read-source-surah')
getByTestId('read-source-juz')
.qa-nav-drawer-source-tabs
```

Update assertions so Juz and Bookmarks modes expect no `.qa-nav-drawer-search-input` and no `.qa-nav-drawer-source-filter`.

- [ ] **Step 4: Add visual capture helper**

In `tests/e2e/navigate/drawer.spec.js`, add this helper below `applyTestTheme`:

```js
async function captureDrawerVisual(page, testInfo, { width, theme, source }) {
  await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
  await page.goto('/#/s/18')
  await waitForReader(page)
  await applyTestTheme(page, theme)
  await page.locator('.qa-mh-hamburger').click()
  await expect(page.locator('.qa-nav-drawer')).toBeVisible()

  if (source === 'juz') {
    await page.getByTestId('read-source-juz').click()
    await expect(page.locator('.qa-juz-row')).toHaveCount(30)
  } else if (source === 'bookmarks') {
    await page.getByTestId('read-source-bookmarks').click()
    await expect(page.locator('[data-bookmarks-list]')).toBeVisible()
  } else {
    await expect(page.getByTestId('read-source-surah')).toHaveAttribute('aria-selected', 'true')
  }

  const drawer = page.locator('.qa-nav-drawer')
  await drawer.screenshot({
    path: testInfo.outputPath(`navdrawer-${width}-${theme}-${source}.png`),
  })

  return drawer.evaluate((el) => {
    const rows = [
      ...el.querySelectorAll('.qa-nav-drawer-surah-row, .qa-juz-row, .qa-bookmarks-row'),
    ]
    const controls = [
      ...el.querySelectorAll('.qa-nav-drawer-source-tab, .qa-nav-drawer-filter-option, .qa-nav-drawer-close, .qa-nav-drawer-about'),
    ]
    const rowMetrics = rows.map((row) => {
      const box = row.getBoundingClientRect()
      return { width: box.width, height: box.height, text: row.textContent ?? '' }
    })
    const controlMetrics = controls.map((control) => {
      const box = control.getBoundingClientRect()
      return { width: box.width, height: box.height, text: control.textContent ?? '' }
    })
    return {
      drawerOverflow: el.scrollWidth > window.innerWidth,
      bodyOverflow: document.documentElement.scrollWidth > window.innerWidth,
      rowMetrics,
      controlMetrics,
      hasDecorativeSvgInSource: !!el.querySelector('.qa-nav-drawer-source-panel svg'),
      hasDecorativeSvgInRows: !!el.querySelector('.qa-nav-drawer-surah-row svg, .qa-juz-row svg, .qa-bookmarks-row svg'),
    }
  })
}
```

- [ ] **Step 5: Add visual audit test**

In `tests/e2e/navigate/drawer.spec.js`, add:

```js
  test('F-mobile-visual: drawer redesign captures theme screenshots without overflow @mobile', async ({ page }, testInfo) => {
    await writeSetting(page, 'wirdPlan', {
      id: 'wird-visual',
      startRef: { surah: 2, verse: 1 },
      endRef: { surah: 2, verse: 20 },
      targetDays: 2,
      targetEndOn: '2026-05-05',
      startedOn: '2026-05-04',
      unit: 'verse',
      reminder: { enabled: true, time: '08:00', browserNotifications: 'default' },
      progress: {
        lastReadRef: { surah: 2, verse: 1 },
        nextRef: { surah: 2, verse: 8 },
        dayKey: '2026-05-04',
        todayStartRef: { surah: 2, verse: 1 },
        todayEndRef: { surah: 2, verse: 10 },
        completedThroughRef: { surah: 2, verse: 7 },
      },
      history: [],
    })
    await seedBookmarks(page, [
      { verseKey: '2:255', riwayah: 'qaloon' },
      { verseKey: '2:286', riwayah: 'qaloon' },
      { verseKey: '67:1', riwayah: 'qaloon' },
    ])

    for (const width of [320, 390]) {
      for (const theme of ['light', 'sepia', 'dark']) {
        for (const source of ['surah', 'juz', 'bookmarks']) {
          const metrics = await captureDrawerVisual(page, testInfo, { width, theme, source })
          expect(metrics.drawerOverflow, `${width}/${theme}/${source} drawer overflow`).toBe(false)
          expect(metrics.bodyOverflow, `${width}/${theme}/${source} body overflow`).toBe(false)
          expect(metrics.hasDecorativeSvgInSource).toBe(false)
          expect(metrics.hasDecorativeSvgInRows).toBe(false)
          for (const row of metrics.rowMetrics.slice(0, 4)) {
            expect(row.width).toBeLessThanOrEqual(width)
            expect(row.height).toBeGreaterThanOrEqual(44)
          }
          for (const control of metrics.controlMetrics) {
            expect(control.height).toBeGreaterThanOrEqual(34)
          }
        }
      }
    }
  })
```

- [ ] **Step 6: Run the visual audit test**

Run:

```bash
pnpm exec playwright test tests/e2e/navigate/drawer.spec.js -g "F-mobile-visual" --project="Mobile Chrome" --reporter=line
```

Expected: pass and write screenshots in the Playwright test output directory with names such as `navdrawer-320-light-surah.png`.

- [ ] **Step 7: Inspect Playwright screenshots**

Open at least these generated images with the local image viewer or `view_image`:

```text
navdrawer-320-light-surah.png
navdrawer-320-dark-surah.png
navdrawer-320-dark-bookmarks.png
navdrawer-390-sepia-juz.png
navdrawer-390-dark-juz.png
navdrawer-390-light-bookmarks.png
```

Acceptance checklist for each inspected image:

- header logo, About, `Read | Study`, and Close are visible without collision
- Daily Wird card does not overflow and progress dimensions are stable
- `Surah | Juz | Bookmarks` labels are not cramped
- Surah source has search and `All | Recent`; Juz and Bookmarks do not
- Surah rows show Arabic names at `320px`
- Juz rows show `Current` and `Wird` as text markers
- bookmark group headers show only name plus count badge
- delete reveal is visible and restrained when tested manually
- theme colors look intentional in light, sepia, and dark

- [ ] **Step 8: Run the full drawer e2e file**

Run:

```bash
time pnpm exec playwright test tests/e2e/navigate/drawer.spec.js --project="Mobile Chrome" --reporter=line
```

Expected: pass. Note the wall time in the implementation summary because the e2e file has material visual coverage.

- [ ] **Step 9: Commit visual tests**

Run:

```bash
git add tests/e2e/fixtures/idb.js tests/e2e/navigate/drawer.spec.js
git commit -m "test: add nav drawer visual audit"
```

## Task 7: Update Context Dossiers

**Files:**
- Modify: `docs/context/surfaces/navigate.md`
- Modify: `docs/context/surfaces/read.md`

- [ ] **Step 1: Update navigate behavior prose**

In `docs/context/surfaces/navigate.md`, replace the Read-mode nav drawer paragraphs with prose matching this current state:

```markdown
**Read mode** uses the ledger drawer layout: an elevated Daily Wird card with progress/chevron affordance, then a peer source control for `Surah | Juz | Bookmarks`. The selected source uses the raised accent treatment; unselected sources remain muted on the shared rail.

`Surah` shows search plus `All | Recent`, keeps current-surah highlight, and renders ledger-style surah rows with number, English name, verse count, Arabic name, and chevron. `Juz` removes Surah-only search/filter controls, renders 30 Juz rows, marks the Juz containing the current reader position, marks the Juz containing the active Daily Wird next reference, and routes row taps to the Juz start reference. `Bookmarks` renders the existing riwayah-scoped grouped bookmark list with static group headers, count badges, verse references, truncated Arabic snippets, tap-to-jump rows, and swipe-left Delete.
```

Update the invariant currently saying `Browse controls are always present in Browse mode` to:

```markdown
- **Read source controls are peer-owned.** The drawer Read mode exposes `Surah | Juz | Bookmarks` as peer sources. Search and `All | Recent` belong only to Surah; Juz and Bookmarks must not show disabled or decorative Surah controls.
```

- [ ] **Step 2: Update read Daily Wird prose if card behavior changed**

In `docs/context/surfaces/read.md`, keep the Daily Wird behavior but add this sentence to the Daily Wird section:

```markdown
The mobile drawer summary card is a single ledger-style tappable surface above the Read source controls; it reflects plan state and routes to the in-drawer detail without writing progress from render alone.
```

- [ ] **Step 3: Run generated docs derive**

Run:

```bash
pnpm run docs
```

Expected: generated context blocks update only where the source inventory/event/test catalogs changed.

- [ ] **Step 4: Run docs check**

Run:

```bash
pnpm run docs:check
```

Expected: `derive: all clean`.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add docs/context/surfaces/navigate.md docs/context/surfaces/read.md docs/context/events.md docs/context/module-graph.md docs/context/feature-map.md .docs-derive-manifest.json
git commit -m "docs: update nav drawer redesign behavior"
```

## Task 8: Final Validation Gate

**Files:**
- Verify all changed files from Tasks 1-7.

- [ ] **Step 1: Run targeted unit tests**

Run:

```bash
pnpm vitest run tests/unit/styles/nav-theme-tokens.test.js tests/unit/styles/theme-parity.test.js tests/unit/styles/token-usage.test.js tests/unit/navigate/drawer.test.ts tests/unit/read/wird/DailyWirdCard.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run targeted e2e visual and behavior tests**

Run:

```bash
pnpm exec playwright test tests/e2e/navigate/drawer.spec.js --project="Mobile Chrome" --reporter=line
```

Expected: all drawer tests pass and visual screenshots are present in the Playwright output directory.

- [ ] **Step 3: Inspect final Playwright screenshots**

Open the latest screenshot set for:

```text
320 light Surah
320 sepia Surah
320 dark Surah
320 dark Bookmarks
390 light Juz
390 sepia Juz
390 dark Juz
390 light Bookmarks
```

Write the visual inspection result in the implementation summary with these exact labels:

```text
Visual inspection: PASS
Widths inspected: 320, 390
Themes inspected: light, sepia, dark
Sources inspected: Surah, Juz, Bookmarks
```

- [ ] **Step 4: Run project validation**

Run:

```bash
pnpm validate
```

Expected: pass with no warnings from build, lint, check, tests, or docs.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git diff --stat HEAD
git diff -- src/styles/tokens/semantic.css src/styles/surfaces/nav.css src/navigate/NavDrawer.svelte src/navigate/JuzList.svelte src/navigate/bookmarks/BookmarksList.svelte src/read/wird/DailyWirdCard.svelte | sed -n '1,260p'
```

Expected: diff is limited to the planned surface cluster, tests, and docs.

- [ ] **Step 6: Confirm final git state**

Run:

```bash
git status --short
```

Expected: no uncommitted changes. If files are listed, return to the task that owns those paths, make the correction there, rerun that task's verification command, and use that task's commit command.
