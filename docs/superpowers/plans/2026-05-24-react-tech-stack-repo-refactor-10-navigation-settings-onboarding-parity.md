# React Tech Stack Refactor 10 - Navigation, Settings, And Onboarding Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build React navigation, settings, asset management, about, and onboarding parity while preserving Reader First route behavior and install-before-activate source safety.

**Architecture:** Compose product surfaces from Wave 2 owned UI primitives, registry entries, and page recipes, using Wave 08 storage/offline adapters and Wave 09 reader entry points. Navigation/settings/onboarding live in `src-react/components/{navigation,settings,offline,sources}/**` and `src-react/app/routes/**`, with e2e proof under owning surface folders. Svelte remains the shipped default.

**Tech Stack:** React, TypeScript, QuranAtlas React design-system components, Radix-backed owned sheets/dialogs/tabs/switches/sliders, Dexie-backed settings writers from Wave 08, Storybook, Vitest, Playwright React e2e.

---

## Dependencies And Sequencing

This plan runs after Wave 02, 07, 08, 08A, and 09. It must finish before Wave 11 search entry points, Wave 13 continuity/bookmark proof, and Wave 14 Daily Wird composition.

## UI And Visual Proof Rule

Before implementing each navigation, settings, asset, or onboarding component, read `DESIGN.md`, use the Wave 2 registry, choose exactly one active reference source for that component pass, and record whether it is a committed `docs/ui-references/**` image/note or an accepted current Svelte UI state from Wave 02. Storybook and Playwright proof must cover mobile `<768`, tablet `768-1179`, desktop `>=1180`, light/sepia/dark where relevant, and awkward states such as short sheets, long labels, disabled source rows, unavailable packs, focus rings, and safe-area edges.

## File Structure

- Create: `src-react/components/navigation/NavDrawer.tsx`
- Create: `src-react/components/navigation/SurahList.tsx`
- Create: `src-react/components/navigation/JuzList.tsx`
- Create: `src-react/components/navigation/BookmarksList.tsx`
- Create: `src-react/components/navigation/ShortcutSheet.tsx`
- Create: `src-react/components/navigation/navigation.stories.tsx`
- Create: `src-react/components/settings/SettingsShell.tsx`
- Create: `src-react/components/settings/VerseSettings.tsx`
- Create: `src-react/components/settings/MushafSettings.tsx`
- Create: `src-react/components/settings/SourcePicker.tsx`
- Create: `src-react/components/settings/settings.stories.tsx`
- Create: `src-react/components/sources/AssetRow.tsx`
- Create: `src-react/components/sources/SourcePickerRow.tsx`
- Create: `src-react/components/offline/AssetManagementPage.tsx`
- Create: `src-react/components/offline/offline-assets.stories.tsx`
- Create: `src-react/app/routes/navigation/SurahsRoute.tsx`
- Create: `src-react/app/routes/navigation/BookmarksRoute.tsx`
- Create: `src-react/app/routes/settings/SettingsRoute.tsx`
- Create: `src-react/app/routes/settings/AssetsRoute.tsx`
- Create: `src-react/app/routes/settings/AboutRoute.tsx`
- Create: `src-react/app/routes/onboarding/OnboardingRoute.tsx`
- Create: `src-react/design-system/recipes/navigation-page.tsx`
- Create: `src-react/design-system/recipes/settings-page.tsx`
- Create: `src-react/design-system/recipes/asset-management-page.tsx`
- Create: `src-react/design-system/recipes/onboarding-page.tsx`
- Modify: `src-react/app/router/routes.ts`
- Modify: `src-react/design-system/registry/component-registry.json`
- Create: `tests/unit/navigate/react-navigation.test.tsx`
- Create: `tests/unit/configure/react-settings-assets.test.tsx`
- Create: `tests/unit/onboard/react-onboarding.test.tsx`
- Create: `tests/e2e/navigate/react-drawer.spec.js`
- Create: `tests/e2e/configure/react-settings-assets.spec.js`
- Create: `tests/e2e/onboard/react-first-run.spec.js`
- Modify docs only if current behavior/scripts/registry/style ownership changes.

## Task 1: Preflight And Scope Guard

**Files:**
- Read: required docs listed in the spec, including `docs/product-info.md`.

- [ ] **Step 1: Confirm reader and offline dependencies exist**

Run:

```bash
test -f src-react/app/routes/read/ReaderRoute.tsx
test -f src-react/app/routes/read/MushafRoute.tsx
test -f src-react/storage/settings-writer.ts
test -f src-react/offline/pack-status.ts
test -f src-react/design-system/registry/component-registry.json
```

Expected: all files exist. Stop if Wave 09 or Wave 08 is incomplete.

- [ ] **Step 2: Confirm no new external API docs are needed**

Run:

```bash
rg -n "react-router|tanstack/router|xstate|zustand|notification|gesture" package.json src-react || true
```

Expected: no new routing/form/gesture/storage library is introduced by this plan. If a new implementation-sensitive library is added, run Context7 `library` then `docs` for that exact library before writing code.

- [ ] **Step 3: Confirm forbidden scopes are clean**

Run:

```bash
git diff --name-only -- src public/dataset docs/superpowers/specs docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-0*.md
```

Expected: no output from this implementation. Do not revert unrelated dirty files.

## Task 2: Navigation Drawer, Lists, And Shortcuts

**Files:**
- Create: `src-react/components/navigation/NavDrawer.tsx`
- Create: `src-react/components/navigation/SurahList.tsx`
- Create: `src-react/components/navigation/JuzList.tsx`
- Create: `src-react/components/navigation/BookmarksList.tsx`
- Create: `src-react/components/navigation/ShortcutSheet.tsx`
- Create: `src-react/design-system/recipes/navigation-page.tsx`
- Test: `tests/unit/navigate/react-navigation.test.tsx`

- [ ] **Step 1: Add navigation tests**

Create `tests/unit/navigate/react-navigation.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NavDrawer } from '../../../src-react/components/navigation/NavDrawer'

describe('React NavDrawer', () => {
  it('shows reader mode switch and verse-only source controls in Verse mode', () => {
    render(<NavDrawer open mode="verse" currentLabel="Al-Fatihah" onClose={vi.fn()} onNavigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Verse' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Surah' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Juz' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bookmarks' })).toBeInTheDocument()
  })

  it('hides Surah/Juz/Bookmarks source controls in Mushaf mode', () => {
    render(<NavDrawer open mode="mushaf" currentLabel="Page 1" onClose={vi.fn()} onNavigate={vi.fn()} />)
    expect(screen.getByText('Page 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Surah' })).toBeNull()
  })
})
```

Expected: fails until `NavDrawer` exists.

- [ ] **Step 2: Implement navigation page recipe**

Create `src-react/design-system/recipes/navigation-page.tsx`:

```tsx
export function NavigationPageRecipe(props: { title: string; controls?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="qar:navigation-page-recipe" aria-labelledby="react-navigation-title">
      <header>
        <h1 id="react-navigation-title">{props.title}</h1>
        {props.controls ?? null}
      </header>
      {props.children}
    </section>
  )
}
```

Expected: Surahs and bookmarks routes share a registry-backed page recipe.

- [ ] **Step 3: Implement drawer shell**

Create `src-react/components/navigation/NavDrawer.tsx`:

```tsx
import { Sheet, Tabs } from '../ui'

export function NavDrawer(props: {
  open: boolean
  mode: 'verse' | 'mushaf'
  currentLabel: string
  onClose: () => void
  onNavigate: (hash: string) => void
  children?: React.ReactNode
}) {
  return (
    <Sheet open={props.open} onOpenChange={(open) => { if (!open) props.onClose() }} title="Navigation">
      <header className="qar:nav-drawer-header">
        <button type="button" onClick={() => props.onNavigate('#/about')} aria-label="About QuranAtlas">QuranAtlas</button>
        <button type="button" onClick={props.onClose} aria-label="Close navigation">Close</button>
      </header>
      <div role="group" aria-label="Reader mode">
        <button type="button" aria-pressed={props.mode === 'verse'} onClick={() => props.onNavigate('#/s/1')}>Verse</button>
        <button type="button" aria-pressed={props.mode === 'mushaf'} onClick={() => props.onNavigate('#/m/1')}>Mushaf</button>
      </div>
      {props.mode === 'verse' ? (
        <Tabs
          ariaLabel="Read source"
          tabs={[
            { id: 'surah', label: 'Surah', content: props.children ?? null },
            { id: 'juz', label: 'Juz', content: null },
            { id: 'bookmarks', label: 'Bookmarks', content: null },
          ]}
        />
      ) : (
        <section aria-label="Mushaf continuation">
          <p>{props.currentLabel}</p>
          <button type="button" onClick={() => props.onNavigate('#/m/1')}>Open</button>
        </section>
      )}
    </Sheet>
  )
}
```

Expected: drawer uses owned behavior components and keeps source controls verse-only.

- [ ] **Step 4: Implement list components**

Create `SurahList.tsx`, `JuzList.tsx`, and `BookmarksList.tsx` with these exported props:

```ts
export type NavigationRow = { id: string; label: string; meta: string; href: string; active?: boolean }
export type NavigationListProps = { rows: NavigationRow[]; onNavigate: (href: string) => void }
```

Each component renders rows as buttons with `aria-current="page"` when `active` is true and calls `onNavigate(row.href)`.

Expected: navigation lists are local navigation only; full-text Quran search is not added here.

- [ ] **Step 5: Implement shortcut sheet**

Create `src-react/components/navigation/ShortcutSheet.tsx` with rows for `?`, `g h`, `g s`, `g a`, `j`, `k`, `]`, `[`, `Home`, `End`, `m`, `t`, `n`, `+`, `-`, `0`, and `d`.

Expected: active Reader First shortcuts only; no mark/review/listen shortcuts.

- [ ] **Step 6: Run navigation tests**

Run:

```bash
pnpm run test:react -- tests/unit/navigate/react-navigation.test.tsx
```

Expected: tests pass.

## Task 3: Settings Shell And Source Pickers

**Files:**
- Create: `src-react/components/settings/SettingsShell.tsx`
- Create: `src-react/components/settings/VerseSettings.tsx`
- Create: `src-react/components/settings/MushafSettings.tsx`
- Create: `src-react/components/settings/SourcePicker.tsx`
- Create: `src-react/design-system/recipes/settings-page.tsx`
- Test: `tests/unit/configure/react-settings-assets.test.tsx`

- [ ] **Step 1: Add settings test for atomic activation**

Create `tests/unit/configure/react-settings-assets.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SourcePicker } from '../../../src-react/components/settings/SourcePicker'

describe('React SourcePicker', () => {
  it('does not call activate for an unverified row', async () => {
    const onActivate = vi.fn()
    render(<SourcePicker rows={[{ id: 'hafs', label: 'Hafs', status: 'not-installed', active: false }]} onActivate={onActivate} />)
    await userEvent.click(screen.getByRole('button', { name: /Hafs/ }))
    expect(onActivate).not.toHaveBeenCalled()
    expect(screen.getByText(/not installed/i)).toBeInTheDocument()
  })
})
```

Expected: fails until `SourcePicker` exists.

- [ ] **Step 2: Add settings recipe**

Create `src-react/design-system/recipes/settings-page.tsx`:

```tsx
export function SettingsPageRecipe(props: { title: string; subtitle: string; body: React.ReactNode; footer: React.ReactNode }) {
  return (
    <section className="qar:settings-page-recipe" aria-labelledby="react-settings-title">
      <header>
        <h1 id="react-settings-title">{props.title}</h1>
        <p>{props.subtitle}</p>
      </header>
      <div>{props.body}</div>
      <footer>{props.footer}</footer>
    </section>
  )
}
```

Expected: Verse and Mushaf settings share shell structure.

- [ ] **Step 3: Implement source picker**

Create `src-react/components/settings/SourcePicker.tsx`:

```tsx
import type { PackStatus } from '../../offline/pack-status'

export type SourcePickerRow = {
  id: string
  label: string
  status: PackStatus
  active: boolean
}

export function SourcePicker(props: { rows: SourcePickerRow[]; onActivate: (id: string) => void }) {
  return (
    <div role="list" aria-label="Source choices">
      {props.rows.map((row) => {
        const verified = row.status === 'verified' || row.status === 'active'
        return (
          <button
            key={row.id}
            type="button"
            role="listitem"
            aria-pressed={row.active}
            aria-disabled={!verified}
            onClick={() => { if (verified) props.onActivate(row.id) }}
          >
            <span>{row.label}</span>
            <span>{row.active ? 'Active' : row.status}</span>
            {!verified ? <span>{row.status === 'not-installed' ? 'Not installed' : 'Unavailable'}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
```

Expected: visible active label cannot change until row is verified or active.

- [ ] **Step 4: Implement mode-aware settings shell**

Create `src-react/components/settings/SettingsShell.tsx`:

```tsx
import { Sheet } from '../ui'
import { SettingsPageRecipe } from '../../design-system/recipes/settings-page'

export function SettingsShell(props: {
  open: boolean
  mode: 'verse' | 'mushaf'
  onClose: () => void
  onManageAssets: () => void
  children: React.ReactNode
}) {
  const title = props.mode === 'verse' ? 'Verse Settings' : 'Mushaf Settings'
  const subtitle = props.mode === 'verse' ? 'Reading comfort and sources' : 'Page view and Mushaf source'
  return (
    <Sheet open={props.open} onOpenChange={(open) => { if (!open) props.onClose() }} title={title}>
      <SettingsPageRecipe
        title={title}
        subtitle={subtitle}
        body={props.children}
        footer={<button type="button" onClick={props.onManageAssets}>Manage Assets</button>}
      />
    </Sheet>
  )
}
```

Expected: `#/settings` can infer and open the correct mode after Wave 09.

- [ ] **Step 5: Implement Verse and Mushaf settings bodies**

Create `VerseSettings.tsx` with controls for Font Size, Reading Flow, Active Riwayah, Quran Text Style, Translation Source, Show Translation, and Tafsir Source. Create `MushafSettings.tsx` with controls for Active Riwayah and Mushaf Edition only.

Expected: Mushaf Settings does not render Verse typography or legacy storage rows.

- [ ] **Step 6: Run settings unit tests**

Run:

```bash
pnpm run test:react -- tests/unit/configure/react-settings-assets.test.tsx
```

Expected: tests pass.

## Task 4: Asset Management And About Routes

**Files:**
- Create: `src-react/components/sources/AssetRow.tsx`
- Create: `src-react/components/offline/AssetManagementPage.tsx`
- Create: `src-react/design-system/recipes/asset-management-page.tsx`
- Create: `src-react/app/routes/settings/AssetsRoute.tsx`
- Create: `src-react/app/routes/settings/AboutRoute.tsx`
- Test: extend `tests/unit/configure/react-settings-assets.test.tsx`

- [ ] **Step 1: Add asset-row blocked-delete test**

Append to `tests/unit/configure/react-settings-assets.test.tsx`:

```tsx
import { AssetRow } from '../../../src-react/components/sources/AssetRow'

it('blocks deleting an active optional asset', async () => {
  const onDelete = vi.fn()
  render(<AssetRow id="saheeh" label="Saheeh International" status="active" optional active onDelete={onDelete} />)
  await userEvent.click(screen.getByRole('button', { name: /Delete/ }))
  expect(onDelete).not.toHaveBeenCalled()
  expect(screen.getByText('Switch to another compatible asset before deleting.')).toBeInTheDocument()
})
```

Expected: fails until `AssetRow` exists.

- [ ] **Step 2: Implement asset row**

Create `src-react/components/sources/AssetRow.tsx`:

```tsx
import type { PackStatus } from '../../offline/pack-status'

export function AssetRow(props: {
  id: string
  label: string
  status: PackStatus
  optional?: boolean
  active?: boolean
  onInstall?: (id: string) => void
  onVerify?: (id: string) => void
  onActivate?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const [message, setMessage] = React.useState<string | null>(null)
  const blockDelete = props.optional && props.active
  return (
    <article className="qar:asset-row" aria-label={props.label}>
      <strong>{props.label}</strong>
      <span>{props.active ? 'Active' : props.status}</span>
      {props.status === 'not-installed' ? <button type="button" onClick={() => props.onInstall?.(props.id)}>Install</button> : null}
      {props.status === 'verified' && !props.active ? <button type="button" onClick={() => props.onActivate?.(props.id)}>Set Active</button> : null}
      <button
        type="button"
        onClick={() => {
          if (blockDelete) setMessage('Switch to another compatible asset before deleting.')
          else props.onDelete?.(props.id)
        }}
      >
        Delete
      </button>
      {message ? <p role="status">{message}</p> : null}
    </article>
  )
}
```

Expected: active optional delete is blocked before Cache Storage mutation.

- [ ] **Step 3: Implement asset management page**

Create a page with grouped sections for Quran Text Styles, Mushaf Editions, Translations, Tafsir, Metadata, and Search Index. Each row receives state from Wave 08 typed pack adapters. Search rows can render only after Wave 11 defines concrete status sources; before then they render `not-installed` or `unavailable-offline` from a typed interim state.

Expected: storage/source controls are operational rows, not decorative cards, and route-level status uses `aria-live="polite"`.

- [ ] **Step 4: Implement About route**

Create `src-react/app/routes/settings/AboutRoute.tsx` with mission, attribution, install app button hook, and clear-data entry. Do not show marks/tags/review stats.

Expected: About stays Reader First and removed-scope-free.

## Task 5: Onboarding

**Files:**
- Create: `src-react/app/routes/onboarding/OnboardingRoute.tsx`
- Create: `src-react/components/onboarding/OnboardingFlow.tsx`
- Create: `src-react/design-system/recipes/onboarding-page.tsx`
- Test: `tests/unit/onboard/react-onboarding.test.tsx`

- [ ] **Step 1: Add onboarding tests**

Create `tests/unit/onboard/react-onboarding.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OnboardingFlow } from '../../../src-react/components/onboarding/OnboardingFlow'

describe('React OnboardingFlow', () => {
  it('preselects Qalun and exposes optional riwayat as unavailable until usable', () => {
    render(<OnboardingFlow onComplete={vi.fn()} usableRiwayat={['qaloon']} />)
    expect(screen.getByRole('radio', { name: /Qalun/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Hafs/i })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Warsh/i })).toBeDisabled()
  })
})
```

Expected: fails until onboarding flow exists.

- [ ] **Step 2: Implement onboarding recipe and flow**

Create `OnboardingPageRecipe.tsx` and `OnboardingFlow.tsx` with screens:

```text
Welcome
Theme
Riwayah
Translation
Shortcuts
Start Reading
```

The Riwayah screen defaults to Qalun (`qaloon`) and disables Hafs/Warsh unless the pack state is `verified` or `active`. The Shortcuts screen teaches `?`, `g h`, `g s`, `j`, `k`, `]`, `[`, `m`, `t`, `+`, `-`, `0`.

Expected: onboarding does not mention marks/tags/review/audio/AI.

- [ ] **Step 3: Implement onboarding route completion**

Create `src-react/app/routes/onboarding/OnboardingRoute.tsx` so completion writes `settings.onboardingComplete` through the approved settings writer helper from Wave 08 or a dedicated `src-react/storage/onboarding.ts` writer that writes only `{ key: 'onboardingComplete', value: true }`.

Expected: completion routes to `#/s/1` or `#/surahs`; once complete, continuity in Wave 13 prevents returning to onboarding.

- [ ] **Step 4: Run onboarding tests**

Run:

```bash
pnpm run test:react -- tests/unit/onboard/react-onboarding.test.tsx
```

Expected: tests pass.

## Task 6: Route Integration, Registry, Stories, Visual Proof

**Files:**
- Modify: `src-react/app/router/routes.ts`
- Modify: `src-react/design-system/registry/component-registry.json`
- Create: `src-react/components/navigation/navigation.stories.tsx`
- Create: `src-react/components/settings/settings.stories.tsx`
- Create: `src-react/components/offline/offline-assets.stories.tsx`

- [ ] **Step 1: Register routes**

Modify React router route list with:

```ts
{ pattern: '#/surahs', name: 'surahs', component: SurahsRoute }
{ pattern: '#/bookmarks', name: 'bookmarks', component: BookmarksRoute }
{ pattern: '#/settings', name: 'settings', component: SettingsRoute }
{ pattern: '#/assets', name: 'assets', component: AssetsRoute, launchable: false }
{ pattern: '#/about', name: 'about', component: AboutRoute }
{ pattern: '#/onboarding', name: 'onboarding', component: OnboardingRoute, launchable: false }
```

Expected: `#/settings` opens over previous reader hash and `#/assets` is not launchable.

- [ ] **Step 2: Add registry entries**

Add sorted registry entries for:

```text
asset-management-page
asset-management-page-recipe
asset-row
bookmarks-list
juz-list
nav-drawer
navigation-page-recipe
onboarding-flow
onboarding-page-recipe
settings-page-recipe
settings-shell
shortcut-sheet
source-picker
source-picker-row
surah-list
```

Expected: every product component has stories, tests, accessibility expectations, and visual proof references.

- [ ] **Step 3: Add stories**

Stories must cover mobile drawer, desktop drawer, Surah all/recent/search, Juz current and Daily Wird next marker pending Wave 14, Bookmarks empty/populated, Verse Settings, Mushaf Settings, Asset Management populated/installing/error, Onboarding first-run/unavailable-riwayah, light/sepia/dark.

Expected: Storybook proof extends Wave 2 registry/page recipe conventions.

- [ ] **Step 4: Run registry and Storybook checks**

Run:

```bash
pnpm run check:react-registry
pnpm run test:storybook:react
```

Expected: registry and stories pass.

## Task 7: E2E, Docs, Verification, Commit

**Files:**
- Create: `tests/e2e/navigate/react-drawer.spec.js`
- Create: `tests/e2e/configure/react-settings-assets.spec.js`
- Create: `tests/e2e/onboard/react-first-run.spec.js`
- Modify docs only for current-state changes.

- [ ] **Step 1: Add e2e proof**

Add tests for:

```text
mobile drawer opens/closes and switches Verse/Mushaf
desktop #/surahs renders, mobile #/surahs redirects to drawer
settings opens in Verse and Mushaf modes and restores focus
asset row install/unavailable/delete states are explicit
fresh boot reaches #/onboarding and completion reaches #/s/1
```

Expected: e2e files live under owning surface folders and use React Playwright config.

- [ ] **Step 2: Run targeted e2e**

Run:

```bash
pnpm run test:e2e:react -- tests/e2e/navigate/react-drawer.spec.js tests/e2e/configure/react-settings-assets.spec.js tests/e2e/onboard/react-first-run.spec.js --reporter=line
```

Expected: browser-only route, focus, drawer, and onboarding proof passes.

- [ ] **Step 3: Run full checks**

Run:

```bash
pnpm run test:react -- tests/unit/navigate tests/unit/configure tests/unit/onboard
pnpm run check:react
pnpm run build:react
pnpm run docs:check
git diff --check
pnpm run check
```

Expected: React and shipped Svelte checks pass.

- [ ] **Step 4: Inspect changed files**

Run:

```bash
git diff --name-only
```

Expected: no `src/**`, `public/dataset/**`, specs, or earlier Wave plans changed. `package.json` changes appear only if a current-state script/dependency change was required and `docs/tech-stack.md` was updated.

- [ ] **Step 5: Commit**

Run:

```bash
git add src-react tests docs package.json pnpm-lock.yaml
git commit -m "feat: add react navigation settings onboarding parity"
```

Expected: commit succeeds. Stage only files that exist and changed. Do not push.

## Reviewer Checklist

- Verify atomic reader bundle activation uses Wave 08 writer and never changes active labels before verification.
- Verify `#/assets`, `#/settings`, and `#/onboarding` are excluded from launch restore.
- Verify onboarding defaults to Qalun/runtime `qaloon`.
- Verify no removed-scope branches or shortcut rows were reintroduced.
