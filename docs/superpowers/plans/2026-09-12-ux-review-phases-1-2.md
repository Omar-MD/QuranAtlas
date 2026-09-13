# UX Review Phases 1–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 (quick wins: copy, labels, small layout corrections) and Phase 2 (structure: first-run flow, download placement, navigation model, settings/search information architecture, numbering conventions, About) of the verified UX review.

**Architecture:** All changes are surface-level React edits in existing owned components plus one launch-gating change: the offline-download offer stops blocking first launch and becomes a one-shot dismissible prompt that reuses the existing onboarding download screen on demand. No new subsystems, no data pipeline changes, no catalog edits.

**Tech Stack:** React + TypeScript, Vite, owned UI primitives from `src/components/ui`, Playwright e2e (`tests/e2e`), design guardrails via `mise run check`.

**Spec:** `QuranAtlas-UX-Review.md` (repo root) — sections "Phase 1 — Quick wins" (8 items) and "Phase 2 — Structure, navigation, and page hierarchy" (8 items). This plan merges two same-file pairs (edition copy + chooser; surah-1 suppression + intro hierarchy) into single tasks, giving 13 tasks. Deferred from the spec, with rationale: immediate-passage-before-setup onboarding (corpus boot is edition-gated; the launch asset-contract invariant and the `seedOnboardedReader` e2e fixture depend on it) and per-verse Hafs-equivalent display in the reader (needs data-model verification, belongs with Phase 3 visual work). The hero marketing copy targets a homepage that does not exist; the compact informed chooser (Tasks 6–7) is the adopted substitute.

## Global Constraints

- Command front door is mise: `mise run check`, `mise run smoke`, `mise run offline`. One-off Playwright runs: `pnpm exec playwright test tests/e2e/<spec> --project=desktop-smoke`. Never invent npm scripts.
- Durable test rules (AGENTS.md): assert accessible roles, names, visible text, URLs, persisted state, network, service-worker behavior. NEVER assert CSS classes, DOM shape, screenshots, or visual snapshots.
- `mise run check` includes design guardrails (`check:registry`, `check:design`, `check:ui-patterns`). Owned components (NavDrawer, SearchWorkspace, settings sections) must compose owned primitives from `src/components/ui`; no new Radix imports outside `src/components/ui`.
- `data/catalog/**` is a tracked source input: do not edit it. Edition descriptions live in `src/launch/mushaf-edition-setup.ts`.
- pnpm owns `pnpm-lock.yaml`; do not add dependencies (lucide-react icons `Search`, `X`, `Menu`, `Settings` already imported in the touched files).
- The e2e fixture `tests/e2e/fixtures/app.ts` inlines setup-marker versions (`MUSHAF_EDITION_SETUP_VERSION = 1`, `OFFLINE_DOWNLOAD_SETUP_VERSION = 2`). This plan changes no marker versions; do not bump them.
- Commit style follows history: `fix:`, `feat:`, `chore:`, `docs:` — one commit per task.
- Copy strings in this plan are exact — implement them verbatim (including the typographic apostrophe in `Qur'an` where the existing code uses it).

---

## Phase 1 — Quick wins

### Task 1: De-jargon and control copy (MushafSettings, IncludedAssets, About button, Wird)

**Files:**
- Modify: `src/components/settings/MushafSettings.tsx` (~line 55–63, the text-size Slider description)
- Modify: `src/components/settings/IncludedAssetsSection.tsx:96-105` (group title/description + toggle strings)
- Modify: `src/app/routes/settings/AboutRoute.tsx` (~line 167, app-update button label)
- Modify: `src/components/settings/WirdSettingsSection.tsx` OR `src/app/routes/settings/SettingsRoute.tsx:231-241` — grep for `Reading continuity`; whichever file renders that `SettingsGroup`
- Test: `tests/e2e/core-smoke.spec.ts`

**Interfaces:**
- Produces: settings region renamed to `Texts and editions` (consumed by Task 1's own test update and nothing else).

- [x] **Step 1: Write the failing test**

In `tests/e2e/core-smoke.spec.ts`, update the existing settings assertion and add a Mushaf-settings copy assertion. Change:

```ts
await expect(page.getByRole('region', { name: 'Included reading assets' })).toBeVisible()
```

to:

```ts
await expect(page.getByRole('region', { name: 'Texts and editions' })).toBeVisible()
```

and append a new test:

```ts
test('settings use plain-language copy for controls and inventory', async ({ page }) => {
  await seedOnboardedReader(page)

  await page.goto('/#/settings')
  await expect(page.getByText('Read-only inventory for the active reading profile.')).toHaveCount(0)

  await page.goto('/#/mushaf/settings')
  await expect(page.getByText(/% reviewed frame width/)).toHaveCount(0)
  await expect(page.getByText(/Text area \d+%/)).toBeVisible()
})
```

(If `#/mushaf/settings` is not the Mushaf settings hash, use the same hash the app navigates to when switching the settings mode toggle — check `REACT_ROUTES` in `src/app/routes`.)

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke`
Expected: FAIL — region `Texts and editions` not found; `% reviewed frame width` still visible.

- [x] **Step 3: Implement the copy changes**

1. `MushafSettings.tsx`: change the Slider description from `` `${frameWidth}% reviewed frame width` `` to `` `Text area ${frameWidth}%` `` (keep the slider label `Qur'an text size` — it already distinguishes image magnification from the Verse-view `Font size` slider).
2. `IncludedAssetsSection.tsx`: `title="Included reading assets"` → `title="Texts and editions"`; `description="Read-only inventory for the active reading profile."` → `description="Texts included with your current Mushaf edition."`; toggle strings `Hide included reading assets` → `Hide texts and editions` and `Show included reading assets` → `Show texts and editions`.
3. `AboutRoute.tsx`: replace the button label `Fetch latest app` with `Check for updates` (keep the dynamic `Checking...`/`Reloading...` states).
4. The `SettingsGroup` with `title="Reading continuity"`: add `description="A daily reading portion to continue each day."` (`SettingsGroup` accepts `description`, evidenced at `IncludedAssetsSection.tsx:102-105`).

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS (registry/design/ui-pattern guardrails included)

- [x] **Step 6: Commit**

```bash
git add src/components/settings/MushafSettings.tsx src/components/settings/IncludedAssetsSection.tsx src/app/routes/settings/AboutRoute.tsx tests/e2e/core-smoke.spec.ts <wird/settings file from step 3.4>
git commit -m "fix(settings): replace implementation copy with plain language"
```

### Task 2: Remove Hafs-keyed continuation copy from the reading line

**Files:**
- Modify: `src/components/reader/VerseBlock.tsx:99-106`
- Test: `tests/e2e/core-smoke.spec.ts`

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('reader never shows internal Hafs-keyed continuation vocabulary', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByText(/Hafs-keyed/)).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "Hafs-keyed"`
Expected: FAIL — `Hafs-keyed` text present (the continuation marker appears on translation continuations; if Al-Fātiḥah alone does not render one, the test as written passes vacuously on this page — in that case also run the assertion against `/#/s/2` after confirming via the app that a continuation exists; do not weaken the assertion).

- [x] **Step 3: Implement the removal**

In `VerseBlock.tsx:99-106`, delete the block gated by `hasTranslation && translationRole === 'continuation'` that renders `↑ continued from the previous Hafs-keyed verse`. Keep the translation rendering itself untouched — only the marker line goes. If deleting the block leaves `translationRole` unused, remove the now-dead prop/variable; if it is still used elsewhere in the file, leave it.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "Hafs-keyed"`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/reader/VerseBlock.tsx tests/e2e/core-smoke.spec.ts
git commit -m "fix(reader): drop internal continuation vocabulary from translation line"
```

### Task 3: Reduce reading-flow options from five to three

**Files:**
- Modify: `src/components/settings/VerseSettings.tsx:7-13` (FLOW_STEPS)
- Test: `tests/e2e/core-smoke.spec.ts`

**Interfaces:**
- Produces: `FLOW_STEPS` values `xs`/`md`/`xl` retained — the `ReactPreferenceStep` type and all stored-preference values stay valid; only the offered labels change. No migration needed.

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('verse spacing offers three plain-language options', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Verse settings' })).toBeVisible()
  await expect(page.getByText('Comfortable')).toBeVisible()
  await expect(page.getByText('Tight')).toHaveCount(0)
  await expect(page.getByText('Standard')).toHaveCount(0)
  await expect(page.getByText('Spacious')).toHaveCount(0)
  await expect(page.getByText('Wide')).toHaveCount(0)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "verse spacing"`
Expected: FAIL — `Tight`/`Standard`/`Spacious`/`Wide` still visible.

- [x] **Step 3: Implement the change**

In `VerseSettings.tsx:7-13`, replace the FLOW_STEPS array with:

```ts
const FLOW_STEPS: Array<{ label: string; value: ReactPreferenceStep }> = [
  { label: 'Compact', value: 'xs' },
  { label: 'Comfortable', value: 'md' },
  { label: 'Spacious', value: 'xl' },
]
```

Do not change the `ReactPreferenceStep` type — stored preferences at `sm`/`lg` keep working because the CSS is keyed by the value, not the label.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "verse spacing"`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/settings/VerseSettings.tsx tests/e2e/core-smoke.spec.ts
git commit -m "fix(settings): reduce reading flow to three plain-language options"
```

### Task 4: Offline inventory action labels

**Files:**
- Modify: `src/components/settings/OfflineDataSection.tsx:293-353` (row action buttons)
- Test: `tests/e2e/offline-lifecycle.spec.ts` (grep the spec for `Remove`/`Download` button-name assertions and update them)

- [x] **Step 1: Write the failing test**

Grep `tests/e2e/offline-lifecycle.spec.ts` for `getByRole('button', { name: 'Remove'` and `name: 'Download'` and update those assertions to `Remove download` / `Download pages`. If none exist, add to the spec's offline-settings test (whichever test opens the offline data group and performs a removal — it already exists around the removal-dialog flow):

```ts
await expect(page.getByRole('button', { name: 'Remove download' })).toBeVisible()
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke -g "<the updated test title>"`
Expected: FAIL — button still named `Remove`/`Download`.

- [x] **Step 3: Implement the change**

In `OfflineDataSection.tsx`: the not-installed row button text `Download` → `Download pages`; the installed row button text `Remove` → `Remove download`. Keep the removal dialog exactly as is (title `Remove ${removeTarget.rowName}?`, body `This removes the downloaded files from this device. You can download them again.`) — the dialog is already explicit.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/settings/OfflineDataSection.tsx tests/e2e/offline-lifecycle.spec.ts
git commit -m "fix(settings): label offline actions Download pages and Remove download"
```

### Task 5: About — split attribution, add Report an issue

**Files:**
- Modify: `src/app/routes/settings/AboutRoute.tsx:85-174`
- Test: `tests/e2e/core-smoke.spec.ts`

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('about separates sources from build credits and offers a report route', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Built with' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Report an issue' })).toBeVisible()
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "about separates"`
Expected: FAIL — `Sources` heading not found.

- [x] **Step 3: Implement the change**

In `AboutRoute.tsx`: the Attribution section (~lines 90-112) currently holds one credits `<ul>` mixing text/translation/edition credits with framework credits (React/Vite/Workbox appear in it). Split into two headed groups:

```tsx
<h2>Sources</h2>
<ul>{/* the text, translation, and edition credit items */}</ul>
<h2>Built with</h2>
<ul>{/* React, Vite, Workbox */}</ul>
```

Keep every existing `<li>` — move, don't rewrite. Then add to the end of the Attribution section:

```tsx
<p>
  <a href="https://github.com/Omar-MD/QuranAtlas/issues">Report an issue</a>
</p>
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "about separates"`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/app/routes/settings/AboutRoute.tsx tests/e2e/core-smoke.spec.ts
git commit -m "fix(about): split source attribution from build credits, add issue link"
```

### Task 6: Onboarding edition descriptions

**Files:**
- Modify: `src/launch/mushaf-edition-setup.ts:28-40` (option mapping + option type)
- Modify: `src/app/routes/onboarding/OnboardingRoute.tsx:391-435` (chooser JSX)
- Test: `tests/e2e/offline-lifecycle.spec.ts` (the onboarding test) — or core-smoke if onboarding is exercised there; grep for `Choose your Mushaf edition`

**Interfaces:**
- Produces: `MushafEditionOption.description: string` on every element of `setup.editions` (consumed by Task 7's chooser rendering and asserted by Task 6's test).

- [x] **Step 1: Write the failing test**

In the spec that boots a fresh (non-seeded) app — `tests/e2e/offline-lifecycle.spec.ts` around line 317 — after the `Choose your Mushaf edition` heading assertion, add:

```ts
await expect(page.getByText('Minimal monochrome pages from quran.ws.')).toBeVisible()
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke -g "<the onboarding test>"`
Expected: FAIL — description not rendered.

- [x] **Step 3: Implement the change**

1. `src/launch/mushaf-edition-setup.ts`: add a local description table and thread it through the option mapping:

```ts
const EDITION_DESCRIPTIONS: Record<string, string> = {
  'qalun-quran-ws-v1': 'Minimal monochrome pages from quran.ws.',
  'qalun-furatiyyah-2023-v1': '2023 Furatiyyah print with coloured notation and marginal notes.',
}
```

In `loadMushafEditionOptions` (~lines 28-36), add `description: EDITION_DESCRIPTIONS[entry.mushafEditionId] ?? ''` to each mapped option, and add `description: string` to the option's exported type. Do not touch `data/catalog/mushaf-assets.json`.

2. `OnboardingRoute.tsx` chooser (inside `MushafEditionSetupRoute`, ~lines 391-435): after the `SegmentedControl`, render the selected edition's description:

```tsx
{(() => {
  const selected = setup.editions.find((edition) => edition.id === state.selectedEditionId)
  return selected?.description ? (
    <p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">{selected.description}</p>
  ) : null
})()}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke -g "<the onboarding test>"`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/launch/mushaf-edition-setup.ts src/app/routes/onboarding/OnboardingRoute.tsx tests/e2e/offline-lifecycle.spec.ts
git commit -m "feat(onboarding): describe each Mushaf edition in the chooser"
```

### Task 7: Chooser primary action becomes Start reading

**Files:**
- Modify: `src/app/routes/onboarding/OnboardingRoute.tsx:391-435` (the chooser's Continue button)
- Test: `tests/e2e/offline-lifecycle.spec.ts` (grep for `'Continue'` button-name usage in onboarding tests)

- [x] **Step 1: Write the failing test**

In the onboarding test(s), replace `page.getByRole('button', { name: 'Continue' })` with `page.getByRole('button', { name: 'Start reading' })`. If the click is inside the same test touched in Task 6, extend that test; otherwise update every occurrence.

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke -g "<the onboarding test>"`
Expected: FAIL — button still named `Continue`.

- [x] **Step 3: Implement the change**

In the chooser JSX, change the primary button text `Continue` → `Start reading`. Leave the `Retry save` button and the `disabled` logic untouched. Do not change the heading — the hero marketing copy is deferred with the homepage (see Spec note).

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke -g "<the onboarding test>"`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/app/routes/onboarding/OnboardingRoute.tsx tests/e2e/offline-lifecycle.spec.ts
git commit -m "feat(onboarding): name the chooser outcome Start reading"
```

---

## Phase 2 — Structure, navigation, page hierarchy

### Task 8: Non-blocking offline download offer

**Files:**
- Modify: `src/continuity/launch-restore.ts:110-154` (offer branch + `LaunchRestoreState` type)
- Create: `src/components/offline/OfflineOfferPrompt.tsx`
- Modify: `src/App.tsx:176-225` (render the prompt on ready launches with a pending offer)
- Test: `tests/e2e/offline-lifecycle.spec.ts:317-346`

**Interfaces:**
- Consumes: `OfflineDownloadOffer` (exported from `src/launch/offline-download-setup.ts`; shape `{ status: 'offer'; profile; editionLabel; mushafPlan }` with `mushafPlan.packId`), `formatOfflinePackSize` (exported from the same module — mirror its usage at `OnboardingRoute.tsx:169-217`), `writeOfflineDownloadSetupComplete` (same module).
- Produces: `LaunchRestoreState.offlineOffer?: OfflineDownloadOffer | null` — set exactly when `resolveOfflineDownloadOffer()` returns an offer; `App` renders `OfflineOfferPrompt` when `status === 'ready' && offlineOffer != null`. Prompt actions: `onDownload` (navigates to `#/onboarding`), `onLater` (writes the completion marker and dismisses).

**Approach note:** navigating to `#/onboarding` re-runs `useLaunchRestore`'s resolver (its fast path excludes `#/onboarding`); the marker is still unwritten there, so the resolver reproduces the existing blocking offer screen with the full progress/pause UI. No download logic is duplicated.

- [x] **Step 1: Write the failing test**

Rewrite the blocking-flow test at `tests/e2e/offline-lifecycle.spec.ts:317-346` into two tests:

```ts
test('first run reaches the reader before deciding on offline pages', async ({ page }) => {
  await wipeApplicationData(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('heading', { name: 'Choose your Mushaf edition' })).toBeVisible()
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Download for offline reading' })).toBeVisible()
  await page.getByRole('button', { name: 'Not now' }).click()
  await expect(page.getByRole('heading', { name: 'Download for offline reading' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Download for offline reading' })).toHaveCount(0)
})

test('offline pages download still works via the one-shot offer prompt', async ({ page }) => {
  await wipeApplicationData(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await page.getByRole('button', { name: 'Download pages' }).click()
  await expect(page.getByRole('heading', { name: 'Download for offline reading' })).toBeVisible()
  await page.getByRole('button', { name: 'Download for offline reading' }).click()
  await expect(page.getByRole('progressbar', { name: 'Downloading offline reading data' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue reading' }).click()
  await expect(page).toHaveURL(/#\/s\/1$/)
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
})
```

Keep any existing assertions about installed state/downloaded packs from the old test that still apply after `Continue reading` (e.g., service-worker/offline expectations) — port, don't delete.

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke -g "first run reaches|offline pages download"`
Expected: FAIL — the offer screen still blocks before the reader (`main` never becomes visible), or the prompt buttons don't exist.

- [x] **Step 3: Implement the change**

1. `launch-restore.ts`: extend the state type (find the exported `LaunchRestoreState` — it has `status`, `hash`, `sourceHash`, optional `setup`) with `offlineOffer?: OfflineDownloadOffer | null`, importing the type from `./launch/offline-download-setup` (adjust the relative path to the module's actual location — it is `src/launch/offline-download-setup.ts`, so `../launch/offline-download-setup` from `src/continuity/`). In the offer branch (~lines 141-146) replace:

```ts
setupPendingRef.current = true
setState({ status: 'setup', hash: resolvedHash, sourceHash: hash, setup: offer })
```

with:

```ts
setupPendingRef.current = false
setState({ status: 'ready', hash: resolvedHash, sourceHash: hash, offlineOffer: offer })
```

The `else` branch (`setupPendingRef.current = false; setState({ status: 'ready', ... })`) gains `offlineOffer: null`.

2. Create `src/components/offline/OfflineOfferPrompt.tsx`:

```tsx
import { Button, Dialog } from '../ui'
import { formatOfflinePackSize, type OfflineDownloadOffer } from '../../launch/offline-download-setup'

export function OfflineOfferPrompt({
  offer,
  onDownload,
  onLater,
}: {
  offer: OfflineDownloadOffer
  onDownload: () => void
  onLater: () => void
}) {
  return (
    <Dialog aria-label="Download for offline reading" onClose={onLater} open>
      <h2>Download for offline reading</h2>
      <p>
        Your reader texts are saved to this device automatically. Add the complete Mushaf pages to keep
        reading without a connection.
      </p>
      <p>
        Complete Mushaf · {formatOfflinePackSize(offer.mushafPlan.totalBytes)}
      </p>
      <Button onClick={onDownload} type="button">
        Download pages
      </Button>
      <Button onClick={onLater} type="button" variant="secondary">
        Not now
      </Button>
    </Dialog>
  )
}
```

Match the actual `Dialog` primitive's prop surface from `src/components/ui` (the offline download brief already uses it — check `src/components/offline/` for an existing usage to copy the exact invocation); keep the heading, copy, and both button names exactly as written. If `formatOfflinePackSize` takes the plan object rather than bytes, mirror the existing call at `OnboardingRoute.tsx:169-217`.

3. `App.tsx`: where the launch state renders the reader for `status === 'ready'` (~lines 176-225), add local state `const [offerDismissed, setOfferDismissed] = useState(false)` and render alongside the ready reader:

```tsx
{launchState.status === 'ready' && launchState.offlineOffer != null && !offerDismissed ? (
  <OfflineOfferPrompt
    offer={launchState.offlineOffer}
    onDownload={() => {
      window.location.hash = '#/onboarding'
    }}
    onLater={() => {
      void writeOfflineDownloadSetupComplete().catch(() => undefined)
      setOfferDismissed(true)
    }}
  />
) : null}
```

(Use the actual launch-state variable name in App; if App's ready branch is a separate component, place the prompt inside it and thread `offlineOffer` through.) Dismissal is session-scoped; persistence comes from the marker write, so a reload after `Not now` stays quiet — which is what Step 1's reload assertion verifies.

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm exec playwright test tests/e2e/offline-lifecycle.spec.ts --project=desktop-smoke`
Expected: PASS (both new tests plus the rest of the offline suite — run the whole spec, not just the new tests)

- [x] **Step 5: Full smoke**

Run: `mise run smoke`
Expected: PASS — the core smoke journey's search/settings paths are unaffected, and mobile-smoke must pass with the prompt present (the prompt renders on both viewports; that is intended — the offer is not desktop-only).

- [x] **Step 6: Static checks and commit**

Run: `mise run check`
Expected: PASS

```bash
git add src/continuity/launch-restore.ts src/components/offline/OfflineOfferPrompt.tsx src/App.tsx tests/e2e/offline-lifecycle.spec.ts
git commit -m "feat(launch): make the offline download offer a one-shot prompt instead of a gate"
```

### Task 9: Navigation model — search in reader chrome, title as selector, Bookmarks row

**Files:**
- Modify: `src/components/reader/ReaderChrome.tsx` (add search trigger, make title a selector)
- Modify: `src/components/reader/ReaderPageShell.tsx` (wire `onOpenSearch` — find the `<ReaderChrome` JSX and the navigation mechanism the shell already uses)
- Modify: `src/components/navigation/NavDrawer.tsx:381-407` (source segmented control + Bookmarks row)
- Test: `tests/e2e/core-smoke.spec.ts`

**Interfaces:**
- Produces: `ReaderChrome` gains optional `onOpenSearch?: () => void` (rendered as an IconButton labelled `Search Quran`, id `reader-search-trigger`, placed before the settings button); the title becomes a `<button type="button" aria-label="Choose surah">` invoking `onOpenNavigation`. NavDrawer `Read source` segmented control keeps values `surah`/`juz`/`hizb`; `bookmarks` moves to a standalone button.

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('reader chrome exposes search and a surah selector without the drawer', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('button', { name: 'Search Quran' })).toBeVisible()
  await page.getByRole('button', { name: 'Search Quran' }).click()
  await expect(page).toHaveURL(/#\/search/)
  await page.goto('/#/s/2')
  await page.getByRole('button', { name: 'Choose surah' }).click()
  await expect(page.getByRole('dialog', { name: /navigation/i })).toBeVisible()
})

test('bookmarks is a standalone destination in the navigation drawer', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('button', { name: 'Bookmarks', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click()
  await expect(page.getByRole('region', { name: /bookmarks/i })).toBeVisible()
})
```

(Adjust the drawer assertions to the drawer's actual landmark/name — grep `NavDrawer.tsx` for its `role`/`aria-label` and the Bookmarks list landmark; the bookmark list component is `BookmarksList` at `NavDrawer.tsx:402-408`.)

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "reader chrome exposes|bookmarks is a standalone"`
Expected: FAIL — no `Search Quran`/`Choose surah` buttons.

- [x] **Step 3: Implement the change**

1. `ReaderChrome.tsx`: add the prop and import the `Search` icon from `lucide-react` (same import block as `Menu`, `Settings`). Render inside `qar-reader-chrome-right`, before the settings `IconButton`:

```tsx
{onOpenSearch ? (
  <IconButton
    className="qar-reader-chrome-icon"
    id="reader-search-trigger"
    label="Search Quran"
    onClick={onOpenSearch}
  >
    <Search aria-hidden="true" size={26} strokeWidth={1.6} />
  </IconButton>
) : null}
```

2. `ReaderChrome.tsx` title: in both mode branches, replace the `h1`/`span` title element with a button keeping the same class list and `dir`/`lang` attributes:

```tsx
<button
  type="button"
  aria-label="Choose surah"
  className="qar:m-0 qar-reader-chrome-title"
  dir="ltr"
  lang="en"
  onClick={onOpenNavigation}
>
  {title}
</button>
```

(For the verse-mode branch keep `dir="rtl" lang="ar"` and its existing classes; keep the `h1` only if removing it breaks the mushaf page landmark contract — check with `mise run check` and the smoke suite.)

3. `ReaderPageShell.tsx`: find the `<ReaderChrome` JSX and pass `onOpenSearch` navigating to the search route using the same navigation helper the shell already uses for settings/navigation (grep the file for `REACT_ROUTES` — if the shell has no navigate helper, lift one from its parent the way `onOpenSettings` reaches it).

4. `NavDrawer.tsx`: in the `Read source` `SegmentedControl` (~lines 387-400) drop the `{ label: 'Bookmarks', value: 'bookmarks' }` option (keep `surah`/`juz`/`hizb`). Immediately after the `qar-react-nav-drawer-source-tabs` div, add:

```tsx
<div className="qar-react-nav-drawer-source-bookmarks">
  <Button
    onClick={() => setReadSource('bookmarks')}
    type="button"
    variant={readSource === 'bookmarks' ? 'primary' : 'secondary'}
  >
    Bookmarks
  </Button>
</div>
```

The `readSource` state type already includes `'bookmarks'` — no state changes needed. Grep `tests/e2e` for assertions on the four-option segmented control (`Read source`) and update them to the standalone button.

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke`
Expected: PASS (whole spec — the title change and drawer change can affect existing assertions)

- [x] **Step 5: Full smoke and static checks**

Run: `mise run smoke && mise run check`
Expected: PASS — registry guardrails must accept the ReaderChrome/NavDrawer edits (owned primitives only)

- [x] **Step 6: Commit**

```bash
git add src/components/reader/ReaderChrome.tsx src/components/reader/ReaderPageShell.tsx src/components/navigation/NavDrawer.tsx tests/e2e/core-smoke.spec.ts
git commit -m "feat(navigation): expose search in reader chrome, title selector, standalone Bookmarks"
```

### Task 10: Consolidate Theme and Night mode presentation

**Files:**
- Modify: `src/components/settings/ThemeNightControls.tsx:21-86`
- Test: `tests/e2e/core-smoke.spec.ts`

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('theme offers a system-following option and night dimming is named by effect', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('radio', { name: 'Theme: System' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Theme: Auto' })).toHaveCount(0)
  await expect(page.getByText('Dims Mushaf page images in low light.')).toBeVisible()
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "theme offers"`
Expected: FAIL — `Theme: Auto` present, no dimming description.

- [x] **Step 3: Implement the change**

In `ThemeNightControls.tsx`:
1. THEMES (~lines 21-32): change `{ label: 'Auto', value: 'auto' }` to `{ label: 'System', value: 'auto' }` (value unchanged — stored preferences keep working; the aria-label is built as `${prefix}: ${label}` so the radio becomes `Theme: System` automatically).
2. Night mode heading (~lines 45-71): change the section heading text `Night mode` to `Mushaf night dimming` and add directly under it:

```tsx
<p className="qar:m-0 qar:text-sm qar:leading-6 qar:text-muted">
  Dims Mushaf page images in low light.
</p>
```

Keep the Night `Off`/`On`/`Auto` options and their values untouched. Grep `tests/e2e` and `src` for other `Theme: Auto` / `Night mode` references (storybook stories under `src/**` may assert these names — update them in this commit).

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "theme offers"`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check` (includes the storybook-facing guardrails)
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/settings/ThemeNightControls.tsx tests/e2e/core-smoke.spec.ts <any storybook files>
git commit -m "fix(settings): name theme System option and clarify night dimming"
```

### Task 11: Reader intro hierarchy and surah-1 backward navigation

**Files:**
- Modify: `src/components/reader/ReaderVerseSurface.tsx:79-127`
- Modify: `src/data/surah-index.ts:40-43` (only if `FIRST_SURAH` is not already exported — check first)
- Test: `tests/e2e/core-smoke.spec.ts`

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('surah start offers no backward navigation and titles appear once', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/s/1')
  await expect(page.getByRole('main', { name: /verse reader/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Previous surah/i })).toHaveCount(0)
  await expect(page.getByText('All praise be to Allah, Lord of all realms,')).toBeVisible()
  await page.goto('/#/s/2')
  await expect(page.getByRole('button', { name: /Previous surah/i })).toBeVisible()
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "surah start offers"`
Expected: FAIL — `Previous surah` (An-Nās) visible at surah 1.

- [x] **Step 3: Implement the change**

In `ReaderVerseSurface.tsx`:
1. Remove the pre-header previous-button block (~lines 79-90): the `{startsAtSurahBeginning && previousSurah && (<SurahContinuityButton ... direction="previous" ... />)}` JSX above the header deletes entirely.
2. Find the existing post-list next-button block (`{nextSurah && ... direction="next" ...}`) and render the previous button beside it:

```tsx
{previousSurah && readyCorpus.surah.number !== FIRST_SURAH ? (
  <SurahContinuityButton
    currentSurah={readyCorpus.surah.number}
    direction="previous"
    target={previousSurah}
  />
) : null}
```

Import `FIRST_SURAH` from `../../data/surah-index` (check the actual export name at `surah-index.ts:40-43`; if the constant is module-private, export it — no logic change).
3. Remove the redundant Latin metadata line `<p className="qar:m-0 qar:text-sm qar:text-muted">{readyCorpus.surah.nameEnglish}</p>` from the header (~lines 89-101). Keep the Arabic heading, the `Surah N · M verses` meta line, and the basmala block untouched — heading compression (spacing) is Phase 3 visual work.

Do NOT change the wrap logic in `surah-index.ts` — it serves other callers (e.g., the drawer); suppression is a presentation concern at this callsite.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "surah start offers"`
Expected: PASS

- [x] **Step 5: Full smoke and static checks**

Run: `mise run smoke && mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/reader/ReaderVerseSurface.tsx src/data/surah-index.ts tests/e2e/core-smoke.spec.ts
git commit -m "fix(reader): move previous-surah nav below the passage, suppress at surah 1, drop duplicate title"
```

### Task 12: Simplify the empty search screen

**Files:**
- Modify: `src/components/search/SearchWorkspace.tsx:104-248` (tabs gating)
- Modify: `src/components/search/SearchHeader.tsx:45-56` (Save search visibility)
- Test: `tests/e2e/core-smoke.spec.ts`

**Interfaces:**
- Produces: workspace tabs (`Overview`/`Verses`/`Explore`/`Sources`) render only when a query has produced an answer preview or overview; the no-query surface is exactly the existing Status (`title="Search the Quran"`, `description="Enter a word, phrase, or ayah reference."`); `Save search` renders only when `canSave`.

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('search defers tabs and save until a query returns results', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/search')
  await expect(page.getByText('Search the Quran')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save search' })).toHaveCount(0)

  await page.getByLabel('Search Quran text, translation, or context').fill('mercy')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Show all matches' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Verses' })).toBeVisible()
})
```

(If the tab role in the owned Tabs primitive is `tab` with the label as accessible name, this holds; verify against `SearchWorkspace.tsx` tab markup and adjust the role/name pair to match — keep asserting roles/names, never classes.)

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "search defers"`
Expected: FAIL — tabs render without a query.

- [x] **Step 3: Implement the change**

1. `SearchWorkspace.tsx`: derive `const hasQuerySurface = props.answerPreview != null || viewModel.overview != null` (use the actual prop/state names present at lines 104-146 — `props.answerPreview` and `viewModel.overview` are the two existing condition inputs). Render the `<Tabs>` (the items array defining Overview/Verses/Explore/Sources at ~lines 105-248) only when `hasQuerySurface` is true; when false, render in its place:

```tsx
<Status description="Enter a word, phrase, or ayah reference." title="Search the Quran" tone="info" />
```

(`Status` is already imported in the search components — check `SearchOverview.tsx:9-12` for the exact invocation.) Do not delete the tab definitions; gate their rendering.
2. `SearchHeader.tsx:45-56`: replace `disabled={!canSave}` rendering with conditional rendering — `{canSave ? (<Button className="qar-react-search-save" onClick={onSaveSearch} type="button" variant="secondary">Save search</Button>) : null}`. Keep the button unchanged when it renders.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "search defers"`
Expected: PASS

- [x] **Step 5: Full smoke and static checks**

Run: `mise run smoke && mise run check`
Expected: PASS — the existing core-smoke search journey (fill mercy → Show all matches → Open in Reader → URL settle) must still pass with tabs now gated

- [x] **Step 6: Commit**

```bash
git add src/components/search/SearchWorkspace.tsx src/components/search/SearchHeader.tsx tests/e2e/core-smoke.spec.ts
git commit -m "fix(search): defer tabs and save action until results exist"
```

### Task 13: About — reference numbering and edition identification

**Files:**
- Modify: `src/app/routes/settings/AboutRoute.tsx` (after the Task 5 split)
- Test: `tests/e2e/core-smoke.spec.ts`

- [x] **Step 1: Write the failing test**

Append to `tests/e2e/core-smoke.spec.ts`:

```ts
test('about documents reference numbering and identifies editions', async ({ page }) => {
  await seedOnboardedReader(page)
  await page.goto('/#/about')
  await expect(page.getByRole('heading', { name: 'Reference numbering' })).toBeVisible()
  await expect(page.getByText(/QuranAtlas reads in the Qalūn narration/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Editions' })).toBeVisible()
  await expect(page.getByText('Qalun Quran.ws')).toBeVisible()
  await expect(page.getByText('Qalun Furatiyyah 2023')).toBeVisible()
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "about documents"`
Expected: FAIL — sections don't exist.

- [x] **Step 3: Implement the change**

In `AboutRoute.tsx`, after the Attribution section (post-Task-5 split), add two sections using the page's existing section/heading markup pattern:

```tsx
<h2>Reference numbering</h2>
<p>
  QuranAtlas reads in the Qalūn narration. Verse references follow the Qalūn numbering of the active
  edition; Hafs-equivalent references are shown in Search under Sources. Furatiyyah page numbers are the
  edition's own printed pagination.
</p>
<h2>Editions</h2>
<ul>
  <li>Qalun Quran.ws — Qalūn narration, minimal monochrome pages from quran.ws.</li>
  <li>Qalun Furatiyyah 2023 — Qalūn narration, 2023 Furatiyyah print with coloured notation and marginal notes.</li>
</ul>
```

Do not name the English translation here — translation attribution stays in the existing Sources credits (Task 5); inventing an unidentified translation name would be a factual error. If the About copy already identifies the translation in the credits, add `(see Sources)` to the Reference numbering paragraph instead of duplicating it.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm exec playwright test tests/e2e/core-smoke.spec.ts --project=desktop-smoke -g "about documents"`
Expected: PASS

- [x] **Step 5: Static checks**

Run: `mise run check`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/app/routes/settings/AboutRoute.tsx tests/e2e/core-smoke.spec.ts
git commit -m "docs(about): document reference numbering and identify editions"
```

---

## Self-Review

**Spec coverage:** Phase 1 items 1–8 map to Tasks 1–7 (items 1+2 merged into Task 1; item 6 folds into Task 11 — the spec's Phase 1 #6 "Surah-1 previous suppression" and Phase 2 "reader intro hierarchy" touch the same lines, so they ship as one task in Phase 2 order). Phase 2 items 1–8 map to Tasks 6–13 (item 1 adopted as the compact chooser; the immediate-passage variant and hero copy explicitly deferred in the header with rationale; item 8's About content splits across Tasks 5 and 13). Every Phase 1/2 spec item has exactly one implementing task.

**Placeholder scan:** All code steps carry exact strings, file paths, and line anchors from the source-verification pass. Adaptive instructions ("use the actual variable name", "grep for X") appear only where verbatim context was impossible to pin without reading the file, and each names the exact search anchor and the exact strings to apply — no TBD/TODO, no "handle edge cases".

**Type consistency:** `offlineOffer` is produced by Task 8's `LaunchRestoreState` and consumed only by App's prompt rendering in the same task. `MushafEditionOption.description` is produced in Task 6 and consumed in Task 6's own JSX. `onOpenSearch` is produced by Task 9's ReaderChrome and wired in the same task. `FIRST_SURAH` is exported (if needed) and consumed in Task 11's callsite suppression. FLOW_STEPS/`ReactPreferenceStep` values (`xs`/`md`/`xl`) are unchanged, so stored preferences survive Tasks 3 and 10 by construction.

**Cross-task test dependencies:** Task 1 changes a core-smoke assertion that Tasks 2, 3, 10, 12, 13 append after — run tasks in order; each appends rather than rewrites so conflicts are minimal. Task 6–8 rewrite the same onboarding/offline-lifecycle test region — keep their edits in sequence and re-run the full `offline-lifecycle.spec.ts` in Task 8.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-12-ux-review-phases-1-2.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
