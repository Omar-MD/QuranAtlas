# React Tech Stack Refactor 02 - Svelte Reference Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the current Svelte app as the route-state, viewport, theme, storage, and visual/behavior reference for React parity work.

**Architecture:** Add a committed baseline appendix and, only where necessary, narrow e2e fixture helpers. The baseline is current-state documentation and proof ownership; it does not change Svelte behavior, dataset output, or visual regression provider infrastructure.

**Tech Stack:** Markdown, Playwright fixture patterns, IndexedDB storage-state fixtures, pnpm docs checks.

---

## Required Context

Read these before editing:

- `AGENTS.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `docs/context/repo-structure.md`
- `docs/product-info.md`
- `docs/context/implemented.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/context/style-map.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`
- `tests/e2e/AGENTS.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- `docs/superpowers/plans/2026-05-24-react-tech-stack-repo-refactor-handoff-log.md`
- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-spec.md`

## File Structure

Create:

- `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md` - committed baseline matrix, fixture rules, update policy, accepted differences, and proof owners.

Modify only if a durable helper is required:

- `tests/e2e/fixtures/*.js` - narrow seeded-state helpers following `tests/e2e/AGENTS.md`.

Do not modify:

- Svelte UI or behavior under `src/**`
- `public/dataset/**`
- visual regression provider config
- transient `test-output/**` artifacts

## Task 1: Preflight And Current Proof Inventory

**Files:**
- Read: `docs/context/style-map.md`
- Read: `tests/e2e/**`

- [ ] **Step 1: Confirm existing e2e placement**

Run:

```bash
find tests/e2e -maxdepth 2 -type f | sort
```

Expected: active surface specs are under `tests/e2e/onboard`, `tests/e2e/read`, `tests/e2e/configure`, `tests/e2e/navigate`, and `tests/e2e/infra` where present.

- [ ] **Step 2: Capture proof owners from style map**

Run:

```bash
sed -n '1,220p' docs/context/style-map.md
```

Expected: identify committed UI references and existing unit/e2e owners for read, navigate, configure, onboard, and infra components.

- [ ] **Step 3: Confirm no behavior changes are staged**

Run:

```bash
git diff --name-only -- src public/dataset
```

Expected: no output for this plan. If output exists from another worker, do not modify those files.

## Task 2: Create Baseline Appendix Skeleton

**Files:**
- Create: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md`

- [ ] **Step 1: Add appendix header and rules**

Create the file with this opening:

```markdown
# React Tech Stack Refactor 02 - Svelte Reference Baseline Appendix

## Status

This appendix freezes the current Svelte app as the React parity reference. It
does not change shipped behavior. React may differ only when a row explicitly
marks the difference as accepted v1 product-promise parity.

## Dataset Profile

- Default local proof profile: `pnpm run build`, which chains `pnpm run data -- build`.
- Baseline riwayah product name: Qalun.
- Runtime riwayah id/path: `qaloon`.
- Translation profile: existing committed baseline dataset, including Bridges where available.
- Mushaf pages: use locally available committed/generated Qalun (`qaloon`) page assets; missing optional packs are represented as unavailable/install states.

## Reference Source Rules

- Committed `docs/ui-references/**` images and notes are component visual-intent references where present.
- Playwright owns app-level route, layout, keyboard, reload, offline, and accessibility proof.
- Transient files under `test-output/**` are review artifacts only.
- Provider snapshots, when later selected, are regression evidence only and do not replace this baseline.
```

Expected: appendix states current Svelte reference status and dual-build discipline.

## Task 3: Add Route-State Fixture Matrix

**Files:**
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md`

- [ ] **Step 1: Add matrix table**

Add this table and fill proof-owner paths from current repo files:

```markdown
## Route-State Fixture Matrix

| Fixture id | Route | Seed state | Viewports | Themes / modes | Proof owner | Accepted difference |
| --- | --- | --- | --- | --- | --- | --- |
| `launch-fresh-onboarding` | empty hash | fresh browser before onboarding | 375x812, 320x568 | light, reduced motion | `tests/e2e/onboard/first-run.spec.js` | none |
| `launch-restore-reader` | empty hash | onboarded, `settings.lastSurface` launchable reader route | 375x812, 1280x900 | light, dark | `tests/e2e/read/chrome.spec.js` | none |
| `reader-surah-start` | `#/s/1` | onboarded Qalun (`qaloon`) baseline reader | 375x812, 768x1024, 1280x900 | light, sepia, dark | `tests/e2e/read/chrome.spec.js`; `docs/ui-references/read/verse-row/default.mobile.light.png` | none |
| `reader-ayah-deeplink` | `#/s/2/255` | onboarded, verse reader with translation visible | 375x812, 1280x900 | light, night off/on | `tests/e2e/read/chrome.spec.js`; `tests/e2e/read/text-sources.spec.js` | none |
| `reader-tafsir-open` | `#/s/1` | onboarded, tafsir preview or sheet open | 375x812, 768x1024 | light, dark | `docs/ui-references/read/verse-row/tafsir-open.mobile.light.png`; `tests/e2e/read/chrome.spec.js` | none |
| `mushaf-ready` | `#/m/1` | onboarded, Qalun page assets usable | 375x812, 768x1024, 1280x900 | light, sepia, dark | `docs/ui-references/read/mushaf-page/ready.mobile.light.png`; `docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.png`; `tests/e2e/read/chrome.spec.js` | none |
| `mushaf-missing-pack` | `#/m/1` | optional pack selected or requested but unavailable | 375x812, 1280x900 | light, dark | `tests/e2e/read/chrome.spec.js`; add `Manual baseline note: Mushaf missing-pack state` in this appendix if no durable helper can seed the state yet | none |
| `surah-directory` | `#/surahs` | onboarded baseline | 375x812, 1280x900 | light, sepia | `tests/e2e/navigate/surahs.spec.js`; `tests/e2e/navigate/drawer.spec.js` for drawer entry proof | none |
| `bookmarks-empty` | `#/bookmarks` | onboarded, empty bookmarks store | 375x812, 1280x900 | light, dark | `tests/e2e/navigate/drawer.spec.js` | none |
| `bookmarks-populated` | `#/bookmarks` | onboarded, riwayah-scoped bookmark rows | 375x812, 1280x900 | light, dark | `tests/e2e/navigate/drawer.spec.js` plus fixture helper if needed | none |
| `settings-over-reader` | `#/settings` | last launchable surface is verse reader | 375x812, 768x1024, 1280x900 | light, sepia, dark, night auto | `docs/ui-references/configure/settings-shell/verse.mobile.light.png`; `tests/e2e/configure/settings.spec.js` | none |
| `assets-not-installed` | `#/assets` | onboarded, optional packs not installed | 375x812, 1280x900 | light, dark | `docs/ui-references/configure/asset-management/route.mobile.light.png`; `tests/e2e/configure/settings.spec.js` | none |
| `assets-install-failed` | `#/assets` | onboarded, failed optional pack row | 375x812, 1280x900 | light, dark | `Manual baseline note: Asset failed row state` in this appendix until durable fixture exists | none |
| `about-current` | `#/about` | onboarded baseline | 375x812, 1280x900 | light, dark | `tests/e2e/configure/about.spec.js` | none |
| `offline-shell` | current route under preview | app shell available offline | 1280x900 | light | `tests/e2e/infra/offline.spec.js` | none |
| `quota-banner` | current route | storage warning/quota banner state | 375x812, 1280x900 | light, dark | `tests/e2e/infra/offline.spec.js` | none |
| `daily-wird-default` | current Daily Wird route or entry point | no plan/default state | 375x812, 1280x900 | light, dark | `tests/unit/read/wird/DailyWirdCard.test.ts`; add `Manual baseline note: Daily Wird default route entry` if no browser route proof exists | none |
| `daily-wird-active` | current Daily Wird route or entry point | active plan/in-progress state | 375x812, 1280x900 | light, dark | `tests/unit/read/wird/WirdDetail.test.ts`; `tests/unit/read/wird/progress.test.ts`; add `Manual baseline note: Daily Wird active route entry` if no browser route proof exists | none |
```

Expected: every route-state fixture combines route, seed state, viewport/theme, proof owner, and accepted-difference status.

- [ ] **Step 2: Replace non-existent proof owners**

Run:

```bash
node -e "const fs=require('fs'); const text=fs.readFileSync('docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md','utf8'); for (const m of text.matchAll(/`([^`]+)`/g)) { const p=m[1]; if ((p.startsWith('tests/') || p.startsWith('docs/ui-references/')) && !fs.existsSync(p)) console.log(p); }"
```

Expected: any printed path is corrected to a real path or changed to a named `Manual baseline note: ...` entry in this appendix. Do not leave generic wording such as "existing route proof" or unnamed manual notes.

## Task 4: Add Fixture And Coverage Policy

**Files:**
- Modify: `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md`

- [ ] **Step 1: Add seeded storage policy**

Append:

```markdown
## Seeded Storage Policy

- Use Playwright `storageState: 'tests/e2e/.auth/onboarded.json'` for ordinary onboarded baseline routes.
- Opt out with empty storage only for onboarding, first-run, service-worker, cross-tab, or empty-browser bootstrap proof.
- Prefer existing fixture helpers in `tests/e2e/fixtures/**` for IndexedDB setup.
- Add narrow helpers only for missing state families such as populated bookmarks, optional pack stale/unavailable rows, Daily Wird state, or quota warning state.
- Do not inline broad IndexedDB teardown inside specs. Add or reuse a single-store helper instead.

## Viewport And Theme Coverage

- Required viewports: `320x568`, `375x812`, `768x1024`, `1280x900`, plus mobile landscape for reader chrome/sheet overlap.
- Required themes: light, sepia, dark.
- Night recitation mode states: off, on, auto over reader, settings shell, drawer, and Mushaf proof.
- Reduced motion: cover motion-sensitive flows and story/e2e proofs where animation can affect layout.

## Accepted Product Differences

Initial accepted differences: none.

Any later accepted difference must include:

| Difference | Fixture ids | Reason | Approver / source | Date recorded |
| --- | --- | --- | --- | --- |
```

Expected: future React parity can seed states consistently.

- [ ] **Step 2: Add reference update policy**

Append:

```markdown
## Reference Update Policy

- Svelte reference changes during the React rebuild must land in the same change as the behavior/UI update.
- A changed route-state fixture must update this appendix and its proof owner path.
- A changed committed UI reference must update the adjacent intent note in `docs/ui-references/**`.
- React parity work must not accept a mismatch by editing this appendix unless the change is an explicit v1 product-promise difference.
- Generated or transient screenshots under `test-output/**` are never committed as the only source of truth.
```

Expected: baseline drift has a reviewable policy.

## Task 5: Add Durable Fixture Helpers Only If Needed

**Files:**
- Modify only if needed: `tests/e2e/fixtures/*.js`
- Modify only if needed: existing owning e2e spec

- [ ] **Step 1: Identify missing seed helpers**

Run:

```bash
find tests/e2e/fixtures -type f -maxdepth 1 -print -exec sed -n '1,220p' {} \;
```

Expected: know whether bookmark, settings, asset, or storage-state helpers already exist.

- [ ] **Step 2: Add narrow helper only for a matrix row that cannot be represented**

If bookmark seeding is missing, add a helper shaped like this to the relevant fixture file:

```js
export async function seedBookmark(page, bookmark) {
  await page.evaluate(async (record) => {
    const request = indexedDB.open('quran-atlas')
    const db = await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
    await new Promise((resolve, reject) => {
      const tx = db.transaction('bookmarks', 'readwrite')
      tx.objectStore('bookmarks').put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, bookmark)
}
```

Expected: helper is single-purpose and does not clear unrelated stores.

- [ ] **Step 3: Verify changed e2e owner**

Run the owning spec, for example:

```bash
pnpm exec playwright test tests/e2e/navigate/drawer.spec.js --reporter=line
```

Expected: changed spec passes with no fixed sleeps and no broad setup regressions.

## Task 6: Verification, Commit, And Handoff

**Files:**
- Verify: appendix and any fixture changes

- [ ] **Step 1: Run docs-only checks**

Run:

```bash
pnpm run docs:check
git diff --check
```

Expected: docs check is clean and whitespace check passes.

- [ ] **Step 2: Run targeted e2e only if fixtures changed**

Run the exact owning spec changed in Task 5. Example:

```bash
pnpm exec playwright test tests/e2e/navigate/drawer.spec.js --reporter=line
```

Expected: passes. Skip this step if only the appendix changed.

- [ ] **Step 3: Confirm no forbidden files changed**

Run:

```bash
git diff --name-only -- src public/dataset test-output
```

Expected: no output.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md tests/e2e/fixtures
git commit -m "docs: define svelte parity baseline"
```

Expected: commit succeeds. If no fixture files changed, stage only the appendix. Do not push.

- [ ] **Step 5: Handoff notes**

Record:

```text
Baseline appendix:
- docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-02-svelte-reference-baseline-appendix.md
Accepted differences:
- none
Fixture helpers added:
- none
Verification:
- pnpm run docs:check
- git diff --check
- add the exact targeted e2e spec command only when fixture code changed
```

Expected: later React surface plans can cite fixture ids instead of rediscovering Svelte behavior.
