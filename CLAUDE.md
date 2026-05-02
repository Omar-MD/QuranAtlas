# CLAUDE.md — project instructions

Project rules auto-loaded by Claude Code in this repo.

## Context docs

Read before spelunking code — save first 30min grep:

- **`docs/context/surfaces/<surface>.md`** — per-surface dossier. 8 surfaces: `read`, `mark`, `review`, `navigate`, `listen`, `configure`, `onboard`, `infra`. Each carries Reach (entry + route) + Inventory (auto) + Behavior (journey steps) + Data (owned store body) + Events (auto, emit/listen) + Invariants + Regression guards.
- **`docs/context/architecture.md`** — stack, boot flow, router, init-graph DAG, cross-cutting patterns.
- **`docs/context/data-model.md`** — cross-cutting rules + auto-gen store→owner index (per-store body lives in owning dossier).
- **`docs/context/events.md`** — auto-generated event catalog (emit/listen call-site scan).
- **`docs/context/module-graph.md`** — auto-generated per-dir imports-from / imported-by + mermaid graph.
- **`docs/context/feature-map.md`** — auto-generated dossier index (surface → dossier file + purpose).
- **`docs/context/glossary.md`** — single-source vocabulary dictionary.
- **`docs/context/riwayat-dataset.md`** — KFGQPC dataset, font pairing, line-height floors, license caveats.
- **`docs/context/csp-allowlist.md`** — per-feature CSP directive registry; new outbound origins must land here + in `public/_headers` in the same commit (regression guard at `tests/unit/safety/csp-headers.test.ts`).
- **`docs/context/implemented.md`** — surface-grouped overview of features live in the app today.
- **`docs/context/roadmap.md`** — surface-grouped overview of features agreed but not yet shipped. Single home for deferred scope.
- **`docs/context/open-issues.md`** — known bugs, edge cases, and blocking debt. Resolve and delete the entry; do not leave a "we know" record after fixing.

Context doc disagree with code → code win. Update doc in PR.

**Auto-gen primacy.** Sections fenced with `<!-- AUTO-GENERATED:<name> START -->` … `END` are written exclusively by `scripts/docs/derive-*.mjs`. Hand-edits inside the fence fail CI (SHA-256 manifest mismatch). When manual prose conflicts with the auto-generated block, the auto-generated block wins — re-run `pnpm docs:derive`.

**Surface + data invariants live in the dossier**, not rules below. Before change, read the surface's dossier — load-bearing decisions + "do-not-regress" callouts there under §Invariants. Examples: fast-tag panel sole per-verse-action surface (`surfaces/mark.md` §Invariants), one writer per IDB store (`data-model.md` §Cross-cutting rules + each dossier §Invariants).

## Mandatory rules

### Rule 1 — Update the owning surface dossier with every UI change

**Any change altering user-facing behavior must update `docs/context/surfaces/<surface>.md` in same commit.** Edit the §Behavior section of the dossier whose `surface:` frontmatter matches the unit of work. Includes:

- New surfaces, screens, sheets, dialogs → update Behavior + Reach.
- Renamed/moved buttons/CTAs, reordered screens, altered flow steps → update Behavior.
- New keyboard shortcuts or gestures → update Reach (single-surface) or `navigate` §Global keyboard reference (cross-cutting).
- Changes to where a surface is reached from → update Reach in both source and destination dossiers.
- New invariant ("do-not-regress" callout) → add to §Invariants of the dossier that owns the rule.
- Deletions of above — strip the entry from §Behavior / §Reach / §Inventory in the same commit. Do not leave a gravestone in the dossier; git carries the history. If the deletion is large enough that a future reader would benefit from a one-line "what replaced it" note, add it to the relevant §Behavior step inline.

Change alter anything user see or do → too small to skip dossier update. Too small to doc there → too small to ship user-facing. **Internal refactors, build tooling, type-only changes, doc-only commits skip behavior update**, still fall under Rule 2 for context doc touched. Dossiers drift fastest; honesty = only reason they stay useful.

Auto-generated fence blocks (Inventory, Data, Events, Regression guards) **must not be hand-edited** — re-run `pnpm docs:derive` after changing the source. CI fails on fence hash mismatch.

Keep Behavior steps **surface-level** ("tap Save", "open More sheet") — not pixel-level. Skip animations, exact labels, hover states. Those belong in specs.

### Rule 2 — Update the relevant context doc when its subject changes

- Changed IDB store keyPath, index, record shape, or sole-writer → update the **owning dossier's §Data** (per the store→owner index in `data-model.md`). Cross-cutting write-gate / invariant changes → `data-model.md`.
- Added/removed/rewired event → no manual update needed. `pnpm docs:derive` regenerates `events.md` + per-dossier event blocks from the `emit(Events.X)` / `on(Events.X)` call sites.
- Added/moved/deleted module or crossed a new dep boundary → no manual update needed. `pnpm docs:derive` regenerates `module-graph.md` from import statements.
- Added new route or surface →
  - If it absorbs into one of the 8 existing surfaces, extend that dossier's Reach + Inventory + Behavior.
  - If it is a wholly new surface (rare — 8 dossiers were chosen to absorb v1.1–v2.2 roadmap), create `docs/context/surfaces/<new>.md` with frontmatter (`surface`, `src_paths`, `owns_stores`, `test_paths`) and run `pnpm docs:derive` to populate the auto blocks. `feature-map.md` re-renders to include the new dossier automatically.
- Changed boot flow, router behavior, init-graph DAG, cross-cutting pattern → update `architecture.md`.
- Changed `package.json` script, added/removed/upgraded dev tool, bumped pinned version, changed CI gate → update `docs/tech-stack.md`.
- Added, removed, redesigned user-facing feature; changed "What's NOT included" scope; changed attribution strings → update `docs/product-info.md` (and About page text if attribution changed).
- **Renamed/moved/deleted file or dir cited by name in `CLAUDE.md`, `docs/workflow/*.md`, `docs/tech-stack.md`, any `docs/context/*.md`** → update every cite same commit. `pnpm docs:check` enforces this via `derive-cite-check.mjs` (CI-gated). File-path cites rot fastest; PR moving the file owns the doc churn.
- **Agreed future feature / deferred scope / dataset-roadmap idea not in active plan** → add a one-line entry to `docs/context/roadmap.md` under the right surface section. When work starts, move entry into the live plan; when shipped, move the entry to `docs/context/implemented.md` (lasting record lives in code + git + the dossier).
- **Known bug / edge case / blocking debt** → add to `docs/context/open-issues.md`. Resolve and delete the entry; do not leave a "we know" record after fixing.

### Rule 3 — Local-first for context retrieval

**Why:** single-dev project. Feature branches, worktrees, uncommitted changes, unpushed commits all live this machine. Remote hold `main` + run CI — never ahead of local for active work, no feature branches to consult.

**Consequence:** "why", "what changed recently", "what's this branch for", "what's in progress" — remote have nothing local don't, often behind. Use local only:

- `git log`, `git show`, `git diff`, `git blame`, `git status`, working tree, untracked files.
- Everything under `docs/` (especially `docs/context/`).

**No use for context:** `gh issue …`, `gh pr …`, `gh api`, `git fetch`, `git log origin/*`. Slower than local, mislead (local authoritative).

**Carve-outs:** explicit user ask ("look at PR #42", "check CI on main") override. Write ops (`git push`, `gh pr create`) neither context-gathering nor blocked.

### Rule 4 — Cluster work by surface

Before plan, dispatch subagents, add Playwright specs, read **`docs/workflow/cluster-by-surface.md`**. Defines surface model, planning/subagent/testing/verification rules, red-flag checklist, cross-cutting-exceptions table, "one unit or two?" decision tree.

**TL;DR:** unit of work = surface or contiguous cluster of surfaces — never bug, never file. Parallel subagents = distinct surfaces only. Extend owning `tests/e2e/journey-X-*.spec.js` rather than create new specs. **Playbook canonical** — summary disagree with it → playbook win.

### Rule 5 — Default PR target is `dev`

**All feature work, bug fixes, refactors, code-level changes target `dev` unless I say otherwise.** Remote branches:

- `dev` → deploys `dev.quranatlas.org` on push/merge.
- `staging` → deploys `staging.quranatlas.org`; receives merge commits from `dev` via PR only.
- `main` → deploys `quranatlas.org`; receives merge commits from `staging` via PR only.

**Direct push to `dev` is the default for small / medium changes.** PRs + worktree isolation are reserved for large incremental work that benefits from review or in-progress branch isolation. The `dev → staging` and `staging → main` promotions are always PR-based with merge commits (no squash, no rebase). Three env branches protected from deletion + force-push; feature branches auto-delete on merge.

**Target `staging` or `main` direct only if I ask for a hotfix, promotion PR, or name a branch explicitly.** Default elsewhere: `dev`. Using `gh pr create`, pass `--base dev` unless instruction contradicts.

### Rule 6 — Playwright e2e tests must not bloat suite wall time

E2e suite speed is a renewable budget — every careless spec spends it. Setup duplication, not assertions, is what bloats wall time. Below sub-rules keep new specs from re-introducing the same waste. Violations rejected at review.

**6.1 — No fixed sleeps. Ever.**
`page.waitForTimeout(N)`, `setTimeout(resolve, N)`, `await new Promise(r => setTimeout(r, N))` banned in test code. Replace with `await expect(locator).toHaveX(...)`, `await expect.poll(fn).toBe(...)`, `await expect(async () => { ... }).toPass({ timeout })`, or `page.waitForFunction(fn)` against the actual condition. Sleeps either over-pay (wasted ms × thousands of runs) or under-pay (flake). The only acceptable timing call is the `actionTimeout`-bound assertion. Carve-outs: (a) gesture fixtures simulating physical timing (`fixtures/chrome.js` double-tap interval) — keep ≤150ms; (b) long-press tests where the hold itself is the gesture — keep within ~30ms of the app's own threshold (e.g. 380ms when the app fires at 350ms). Document the threshold in a comment on the line.

**Corollary — always drain async UI state before `page.reload()` or navigation.** After clicking a button that triggers async work (IDB writes, SW messages, network fetches), wait for a DOM signal that the async completed before calling `page.reload()` / `page.goto()`. Use the button's own state change as the signal — e.g. a "Saving…" → original-label transition means `busy` flipped back to false and the write is done. Never assume a click + immediate reload is race-free: the reload cancels in-flight microtasks and the IDB write is lost. Pattern:
```js
await btn.click()
await expect(btn).toHaveText('Saving…', { timeout: 2_000 }) // busy=true
await expect(btn).toHaveText('Save',    { timeout: 10_000 }) // busy=false = write done
await page.reload()
```

**6.2 — Scope IDB resets to what the test actually mutates.**
Default to `clearStore('settings')` (or whichever single store the test touches) over `clearAllData(page)`. Full DB drop forces app cold-boot + reader re-mount + 5 object stores recreated; tens of seconds wasted across the suite. Only reach for `clearAllData` when the test exercises cross-store invariants, onboarding flow, or clear-data UX itself. Add the scoped helper to `tests/e2e/fixtures/idb.js` if it does not yet exist — do not inline `page.evaluate(() => indexedDB.delete...)` in specs.

**6.3 — One `beforeEach` per spec file. Nested `describe` blocks do not get their own.**
Stacked `beforeEach` blocks all running `clearAllData → markOnboardingComplete → goto → waitForReader` are pure waste. If a sub-group needs different setup, hoist the shared pieces to the outer hook and let the inner block override only the delta (viewport, route, single store). If a sub-group has zero overlap with the outer setup, it belongs in a separate spec file, not a nested describe.

**6.4 — Mobile Chrome project tag-gate (`@mobile`).**
Tests that assert mobile-specific behavior (`MarginHeader`, drawer swipe, gear long-press, header auto-hide, viewport-conditional layout) tag with `@mobile`. The Mobile Chrome project's `grep` filters to `@mobile` only. Untagged tests run on chromium once. Default assumption: viewport-agnostic = chromium-only. Re-tagging later is cheap; running 100+ tests twice for a year is not. If unsure whether a behavior is viewport-agnostic, tag it `@mobile` AND leave it on chromium — small cost.

**6.5 — Reuse onboarded `storageState` for any test whose first action is "skip onboarding."**
The `tests/e2e/.auth/onboarded.json` snapshot (created by `global-setup.ts`) carries onboarding-complete + default settings. Tests use it via `test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })` instead of `markOnboardingComplete(page)` + `clearAllData` + cold-boot. Saves ~1–2s per test. Tests that exercise the onboarding flow itself opt out with `test.use({ storageState: { cookies: [], origins: [] } })`. If `global-setup.ts` does not yet exist when this rule first applies, build it before adding the next setup-heavy spec — do not extend the old fixture-call cargo cult.

**6.6 — Default to the dev server. Reach for the preview build only when the SW must be exercised.**
The Vite dev server runs the suite faster than the preview build; preview's per-test render path is slower without HMR's bundle pre-warming and the build cost does not amortise. The Offline (Preview) project remains the single carve-out — the SW only emits in production builds. New specs default to the dev server (no env flag needed). If a test genuinely needs preview-only behavior (minified bundle, real SW, production CSP), tag it `@offline` to route it through the existing preview project rather than spawning a new one.

**6.7 — Time the new spec before merging.**
Run `time pnpm playwright test tests/e2e/<your-spec>.spec.js --reporter=line` locally. If a spec adds >5s to its journey file's wall time, justify it in the PR description (or shrink it). New spec files cap at 15s wall on chromium project; nest into existing `journey-X-*.spec.js` rather than spawn a new file (Rule 4 already says this — Rule 6.7 enforces the perf side).

### Rule 7 — Zero build warnings before commit

**No commit may introduce or carry forward a warning from `pnpm build`, `pnpm lint`, or `pnpm check`.** Run all three before staging — if any prints a warning (rolldown `INEFFECTIVE_DYNAMIC_IMPORT`, eslint `Unused eslint-disable directive`, svelte-check `0 ERRORS 0 WARNINGS` violation, etc.), fix it in the same change. "Pre-existing warning" is not an excuse — fix it as part of the commit that touches the area, or split a separate cleanup commit ahead of yours.

**Why:** warnings rot. A single accepted warning trains the eye to skip output, and the next ten warnings hide in the noise. Treat the warning bar as `error` — accepted warnings are how dynamic-import bundle bloat and unused-eslint-disable cruft pile up undetected for months.

**How to apply.** Before staging an edit, run two commands and read every line of output:

1. `pnpm docs:derive` — regenerates all auto-generated doc blocks (events, module-graph, feature-map, inventory, data, tests, cite-check). CI runs `docs:check` which fails on any hash mismatch; derive first so the check passes. Re-read the output for any `ERROR` lines (cite-check path mismatch, broken fence, etc.).
2. `pnpm validate` — composite gate defined in `package.json`: `lint → lint:css → check:styles → check → test:run → build → check-chunks`. Zero warnings allowed across the chain.

Any non-empty warning section gates the commit. If a warning is genuinely intractable (third-party tool emits a false positive that cannot be silenced cleanly), document the exception inline next to the offending code AND in the commit message — never silently.

### Rule 8 — Unit-first. E2E reserved for things only e2e can prove.

**Default new test placement = `tests/unit/`.** A test belongs in `tests/e2e/` ONLY if it depends on AT LEAST ONE of the following — every one of which fails in jsdom + `@testing-library/svelte`:

1. **Real layout / paint** — `getComputedStyle`, `getBoundingClientRect`, viewport-conditional CSS branches that need actual cascade (`@media`, `var(--…)` resolution against the real stylesheet), `if (isDesktop)` paths whose assertion differs by viewport.
2. **Real touch / pointer gesture timing** — double-tap window (300 ms), long-press hold, swipe distance/velocity, scroll-driven auto-hide, pointer capture across multiple elements.
3. **Real service-worker lifecycle** — `controllerchange`, `SKIP_WAITING`, real precache, `@offline` project (production build).
4. **Real cross-tab behavior** — `BroadcastChannel` between two `BrowserContext`s, IDB `versionchange` racing across tabs.
5. **axe-core a11y scans** — needs a fully-painted page; jsdom resolves `display: none` / contrast incorrectly.
6. **Real keyboard nav across multi-screen flows** — Tab loops through Onboarding screens, focus-visible across components mounted by the router.
7. **Real `page.reload()` + re-hydrate** — proves boot wires the right init function (e.g. `initNightMode`, `initRiwayah`) into the actual app shell.
8. **Performance budget** — real first-paint timing.
9. **Real router + hash navigation** — only when the test asserts the URL change AND the resulting surface mounted; pure parser/redirect logic stays unit (router has its own unit suite).

**If none of the above apply, the test is a unit test.** Component structure, state-machine transitions, IDB read/write, event-bus emit/listen, router-parser pure logic, single-component keyboard handlers, settings/font/theme/marks/edges/tag-session/review/drawer/command-sheet runes — all unit. Mount Svelte components with `@testing-library/svelte` (vitest config already wires the browser-condition plugin); use `fake-indexeddb` for IDB; mock data/dataset / safety/sync / a11y/announcer / marks/store at the module boundary.

**Why:** every e2e adds 0.3–2.5 s to wall time × every CI run for the life of the test; a unit costs ~10–80 ms and never flakes on viewport, SW timing, or browser quirks. New e2e written for behavior a unit could prove silently erodes the suite-time budget.

**How to apply (BEFORE writing a new test):**

1. Walk the 9-criterion list above. If you cannot point to a specific criterion the test depends on, write it as a unit test. Default to unit.
2. If the test you would have written hits unit-level concerns (DOM count, role/aria queries, IDB write, event emit, single-component keyboard handler), open the matching `tests/unit/<surface>/*.test.ts` instead and extend it. Do not start with the e2e file.
3. If the test mixes a unit-level concern with an e2e-level concern (e.g. "click swatch → IDB write → reload → attribute persists"), split it: unit for the click→write leg, e2e for the reload→re-hydrate leg. Cite both from the journey entry's regression-guard line.
4. If unsure, write the unit version first. If the unit cannot express the assertion at all (because of one of the 9 criteria), upgrade to e2e and document why in a one-line comment on the test (`// e2e because: real layout — assertion is on getBoundingClientRect`).

**Component testing recipe:**

```ts
import { render, fireEvent } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock module-boundary deps the component imports.
vi.mock('../../../src/data/dataset', () => ({ getSurahs: vi.fn(async () => []) }))

import MyComponent from '../../../src/foo/MyComponent.svelte'
// Import bridge / store the component registers with on mount, then drive it.
import { openMyThing } from '../../../src/foo/my-bridge'

async function flush() { for (let i = 0; i < 4; i++) { await Promise.resolve() } }

describe('MyComponent.svelte', () => {
  it('does the thing', async () => {
    render(MyComponent)
    await flush()
    openMyThing()
    await flush()
    // assert against document.querySelector / fireEvent.click / vi.waitFor.
  })
})
```

`vitest.config.js` already includes `@testing-library/svelte/vite`'s `svelteTesting()` plugin so Svelte resolves to the browser build; `tests/setup.js` already auto-loads `fake-indexeddb`. New unit specs need no extra wiring.

**Cross-references:** Rule 4 still scopes work by surface — extend the owning unit file rather than spawn a new one when the surface already has one. Rule 6's wall-time discipline ceases to matter the moment the test moves to vitest, which is the entire point.

### Rule 9 — Docs + source comments carry current state only

**Forbidden in `docs/` and in source-code comments:**

- Revision narrative: "v7 polish redesign", "post-N21 layout", "retired YYYY-MM-DD", "fixed in mid-2026", "previously did X, now does Y".
- Dated breadcrumbs in section titles, parentheticals, or prose: "(2026-04-25)", "(post 2026-04-26)", "as of 2026-05-01".
- Commit-SHA references: `b997c76`, `a83c2a3`, etc. — git log carries those.
- Internal codename leaks once the work has shipped: N21, R-13, CC-7, P3.24, "audit Q4", phase-letters, etc. — they have no reader value after the plan that owned them is done.
- Explanatory padding about what the diff just changed and why.

**Where revision / tracking content goes instead:**

- **Commit message** — the legitimate home for "what changed in this diff and why". Any depth of summary is welcome there. (Style still per the `feedback_commit_style` memory: caveman commits, no Co-Authored-By trailer.)
- **`.scratch/` (gitignored)** — for an agent's own progress notes, intermediate decisions, scratch reasoning. Convention: `.scratch/<surface>-<topic>.md` (surface prefix matches Rule 4's clustering, so parallel subagents working on distinct surfaces never collide). Non-surface-scoped work: `.scratch/<topic>.md` with a unique name. Cleaned up at end of task; never committed.

**Carve-outs:**

- **§Invariants in dossiers** may name a forbidden past shape when knowing the shape is load-bearing for the guardrail — e.g., *"Don't reintroduce a tag-only route (legacy `#/t/:tag` was removed pre-release)."* The past reference is part of the rule, not retrospective narration.
- **Auto-generated fence blocks** (`<!-- AUTO-GENERATED:* START -->` … `END`) — written by `scripts/docs/derive-*.mjs`; this rule does not apply inside them. If a source-file leading comment leaks a forbidden phrase into an auto-gen inventory block, edit the source comment.
- **Machine-emitted data files** (`provenance.json`, `manifest.json`, etc.) — dated values there are data, not narrative.

**Parallel agents.** When dispatching subagents (Rule 4), subagents inherit Rule 9. A parent agent cannot bypass the rule by routing tracking content through a subagent. Each agent — parent or subagent — writes its own scratch under `.scratch/`, never into `docs/`. The surface-prefixed scratch path keeps concurrent runs collision-free.

**How to apply.** Before staging an edit to `docs/` or to a source-code comment, scan the diff:

1. Any past-tense narrative (X happened, Y was retired, Z changed)? → move to commit message; remove from the diff.
2. Any date, commit-SHA, codename, or audit identifier in the prose? → remove; the lasting record is git.
3. Tracking / progress notes? → write to `.scratch/<topic>.md` (gitignored), not to `docs/`.

If after that scan the diff is empty, the change wasn't load-bearing — drop it.

## Workflow

Scripts, tooling, stack refs: see `docs/tech-stack.md`.