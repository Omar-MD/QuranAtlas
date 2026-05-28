# React Tech Stack Refactor 02 - Svelte Reference Baseline Spec

> Superseded current-state note: `docs/superpowers/specs/2026-05-28-mvp-default-assets-reset-design.md` replaces the old onboarding/source-choice baseline with the MVP default reader asset profile: Qaloon text/font, Qaloon Mushaf, and Bridges translation. Older baseline rows for tafsir-open, optional-pack install states, or first-run source setup are historical context only.

## Parent

- Master spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-design.md`
- Depends on child spec:
  `docs/superpowers/specs/2026-05-24-react-tech-stack-repo-refactor-01-react-app-shell-and-dual-build-spec.md`

## Purpose

Freeze the current Svelte app as the behavioral and visual reference for React
parity. The baseline must define routes, data profile, storage fixtures,
viewports, themes, screenshots or assertions, update policy, and acceptable
product differences before React feature surfaces start chasing a moving target.

## Scope

In scope:

- Define the Svelte parity route matrix.
- Define seeded storage states for onboarding, reader, source packs, bookmarks,
  settings, offline unavailable states, and Daily Wird.
- Define viewport and theme coverage.
- Define which current Svelte screenshots, Playwright assertions, Storybook-like
  component references, or `docs/ui-references/**` files are used for parity.
- Define an update policy for reference changes while React rebuild work is in
  progress.
- Record product-accepted differences where React intentionally follows the v1
  product promise instead of historical implementation details.

Out of scope:

- Implementing React parity.
- Changing Svelte UI or behavior.
- Adding visual regression provider infrastructure.
- Creating new product scope.
- Updating dataset output.

## Required Reads

- `AGENTS.md`
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
- Parent master spec

## Allowed Files And Directories

Allowed create:

- Baseline appendix docs under `docs/superpowers/specs/`.
- Durable e2e fixture helpers under `tests/e2e/fixtures/**` only after reading
  `tests/e2e/AGENTS.md`.

Allowed modify:

- This child spec or a linked baseline appendix.
- Existing e2e fixtures and proof notes when they stay compatible with current
  Svelte behavior.
- Context docs only when recording current-state baseline ownership.

Forbidden modify:

- Svelte app UI or behavior.
- Dataset outputs.
- Visual regression provider infrastructure.
- Transient `test-output/**` artifacts as committed source of truth.

## Baseline Matrix

The baseline must be a named route-state fixture matrix, not separate route and
state lists that can be satisfied independently. Each fixture must record:

- fixture id;
- route;
- seeded storage/network/asset state;
- viewport coverage;
- theme and night-mode coverage;
- proof owner;
- accepted-difference status.

Routes that need fixture coverage:

- Empty hash launch restore.
- `#/onboarding`.
- `#/s/1`.
- `#/s/2/255`.
- `#/m/1`.
- `#/surahs`.
- `#/bookmarks`.
- `#/settings` over a launchable reader surface.
- `#/assets`.
- `#/about`.

States:

- Fresh browser before onboarding.
- Onboarded baseline Qalun (`qaloon`) reader.
- Verse reader with translation visible.
- Verse reader with tafsir sheet or preview open.
- Mushaf reader with Qalun page assets usable.
- Optional pack unavailable.
- Optional pack installed and verified.
- Active pack stale or unavailable.
- Bookmarks empty.
- Bookmarks populated with riwayah-scoped entries.
- Daily Wird empty/default.
- Daily Wird in-progress.
- Offline mode with app shell available.
- Storage warning or quota banner state.

Viewports:

- Mobile: `375x812`.
- Small mobile stress: `320x568`.
- Tablet: `768x1024`.
- Desktop: `1280x900`.
- Mobile landscape where reader chrome or sheets can overlap content.

Themes:

- Light.
- Sepia.
- Dark.
- Night recitation mode `off`, `on`, and `auto`, composed over at least reader,
  settings shell, drawer, and Mushaf proof.
- Reduced motion where motion-sensitive behavior is present.

Required fixture families:

- reader happy path, translation visible/hidden, tafsir preview/sheet open, and
  live settings update while mounted;
- Mushaf ready state, missing pack, stale pack, page jump, and view-mode change;
- navigation drawer with Surah, Juz, populated bookmarks, and mobile redirect
  behavior;
- Verse Settings and Mushaf Settings over a reader surface;
- onboarding first screen, source choice, completion, and unreachable-after-
  completion state;
- Asset Management not-installed, installing, verified, active delete-blocked,
  storage-full, and failed rows;
- Daily Wird no-plan, active-plan, detail, continue, reminder, and reset states;
- search results and unavailable index states when search is introduced.

## Reference Rules

- Committed `docs/ui-references/**` images and notes are visual-intent
  references for components that already have them.
- Playwright routes own app-level behavior, layout, keyboard, service-worker,
  and accessibility proof.
- Transient screenshots under `test-output/` are review artifacts only.
- Reference changes during the React rebuild must be intentional and recorded in
  the same change that updates the baseline.
- React may differ from Svelte only when the difference is explicitly accepted as
  v1 product-promise parity rather than historical implementation parity.

## Deliverables

- A committed baseline appendix or child-spec update listing approved routes,
  states, fixtures, themes, viewports, and evidence locations.
- Storage fixture strategy using existing e2e fixture patterns, not ad hoc
  per-spec IndexedDB setup.
- A reference update policy for Svelte changes during the React rebuild.
- A list of accepted product differences, initially empty unless a specific
  difference is approved.
- No implementation changes to shipped behavior.

## Acceptance Criteria

- Every route and state in the baseline matrix has a named proof owner:
  Playwright route, committed UI reference, existing unit suite, or documented
  manual baseline note.
- Route-state fixtures cannot be counted by route alone; each fixture records
  the seed state, viewport/theme/night-mode coverage, proof owner, and accepted
  difference status.
- The baseline covers mobile, tablet, desktop, and at least one awkward small
  mobile viewport.
- The baseline includes storage/offline states, not only happy-path reader
  screens.
- The baseline records which dataset profile is used.
- The baseline does not depend on transient screenshot artifacts as the only
  source of truth.

## Verification

For docs-only baseline work, run:

```bash
pnpm run docs:check
git diff --check
```

If durable Playwright proof is added or changed, follow `tests/e2e/AGENTS.md`
and run the owning spec first, for example:

```bash
pnpm exec playwright test tests/e2e/read/chrome.spec.js --reporter=line
```

Expected result:

- Docs checks are clean.
- Any changed e2e spec passes with no fixed sleeps or broad setup regressions.

## Rollback And Failure Handling

- If current Svelte UI fails an existing parity route, record the failing route
  and stop React parity work for that surface until the issue is fixed or
  accepted as a known baseline limitation.
- If a state cannot be seeded with current fixtures, add a narrow fixture helper
  under `tests/e2e/fixtures/` only after reading `tests/e2e/AGENTS.md`.
- If a baseline screenshot differs because of generated dataset changes, resolve
  the dataset change first; do not hide data drift in React parity notes.

## Handoff

Child specs `03` through `15` must reference this baseline when defining their
surface-level parity gates. The visual regression provider spec must not treat
provider snapshots as a replacement for this baseline.
