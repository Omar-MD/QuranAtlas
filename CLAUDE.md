# CLAUDE.md — project instructions

Project rules auto-loaded by Claude Code in this repo.

## Context docs

Read before spelunking code — save first 30min grep:

- **`docs/context/architecture.md`** — stack, boot flow, router, events, IDB, cross-cutting patterns.
- **`docs/context/feature-map.md`** — every user-facing surface: entry, route, files, behavior.
- **`docs/context/module-graph.md`** — per-dir imports-from / imported-by, mermaid graph.
- **`docs/context/events.md`** — mitt event catalog: emitters, listeners, payloads, dead events.
- **`docs/context/data-model.md`** — IDB stores, keys, indexes, record shapes, writers.
- **`docs/context/user-journeys.md`** — cross-surface happy paths user can walk.
- **`docs/context/future-work.md`** — agreed-but-unscheduled features, dataset roadmap, dropped ideas. Single home for deferred scope.

Context doc disagree with code → code win. Update doc in PR.

**Surface + data invariants live in relevant context doc**, not rules below. Before change, read context doc for surface touched (Rule 4) — load-bearing decisions + "do-not-regress" callouts there. Look for **Invariant** sections in `user-journeys.md` and `data-model.md`. Examples: mark editor sole per-verse action surface (`user-journeys.md` §C6), one writer per IDB store (`data-model.md` §Cross-cutting rules).

## Mandatory rules

### Rule 1 — Update `user-journeys.md` with every UI change

**Any change altering user-facing behavior must update `docs/context/user-journeys.md` in same commit.** Includes:

- New surfaces, screens, sheets, dialogs.
- Renamed/moved buttons/CTAs, reordered screens, altered flow steps.
- New keyboard shortcuts or gestures.
- Changes to where surface reached from (e.g. "Settings moved out of More sheet").
- Deletions of above — move journey to **Deprecated** section with commit SHA; no silent delete.

Change alter anything user see or do → too small to skip `user-journeys.md`. Too small to doc there → too small to ship user-facing. **Internal refactors, build tooling, type-only changes, doc-only commits skip `user-journeys.md` update**, still fall under Rule 2 for context doc touched. Journeys drift fastest; honesty = only reason stay useful.

Keep steps **surface-level** ("tap Save", "open More sheet") — not pixel-level. Skip animations, exact labels, hover states. Those belong in specs.

### Rule 2 — Update the relevant context doc when its subject changes

- Changed IDB store, key, index, record shape → update `data-model.md`.
- Added/removed/rewired event → update `events.md`.
- Added/moved/deleted module or crossed new dep boundary → update `module-graph.md`.
- Added new route or surface → update `feature-map.md` (and `user-journeys.md` if surface reachable end-to-end).
- Changed boot flow, router behavior, cross-cutting pattern → update `architecture.md`.
- Changed `package.json` script, added/removed/upgraded dev tool, bumped pinned version, changed CI gate → update `docs/tech-stack.md`.
- Added, removed, redesigned user-facing feature; changed "What's NOT included" scope; changed attribution strings — update `docs/product-info.md` (and About page text if attribution changed).
- **Renamed/moved/deleted file or dir cited by name in `CLAUDE.md`, `docs/workflow/*.md`, `docs/tech-stack.md`, any `docs/context/*.md`** → update every cite same commit. File-path cites rot fastest; PR moving file owns doc churn.
- **Agreed future feature / deferred scope / dataset-roadmap idea not in active plan** → add to `docs/context/future-work.md`. When work starts, move entry into the live plan; when shipped, delete from future-work (lasting record lives in code + git + the other context docs).

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

### Rule 5 — Major bug uncaught by tests → add a regression test, validated against the bug

When a bug significant enough to warrant a fix slips past the existing test suite, the fix is incomplete until a new or extended test exists that would have caught it. Same commit (or its immediate follower) — never "I'll add the test later".

**Validation protocol (mandatory):**

1. Run the new test against the **buggy** version of the code (revert the fix locally, e.g. `cp` the pre-fix file from `git show <sha>:<path>`). It must **fail**.
2. Restore the fix. The test must **pass**.
3. Only then commit. The commit message records that both legs were verified.

A test that passes on the buggy code is not a regression guard — it's confirmation theatre. If step 1 passes, the test isn't actually exercising the bug; redesign it (different repro, stricter assertion, harder-to-cheat scenario) until it fails on the buggy version.

Extend the owning `tests/e2e/journey-X-*.spec.js` per Rule 4; add a unit test alongside if the bug is a pure-function regression. Cite the new test from the journey entry's persistence/regression-guard line so future readers know which spec defends it.

### Rule 6 — Default PR target is `dev`

**All feature work, bug fixes, refactors, code-level PRs → `dev` unless I say otherwise.** Remote branches:

- `dev` → deploys `dev.quranatlas.org` on push/merge.
- `staging` → deploys `staging.quranatlas.org`; receives merge commits from `dev` via PR only.
- `main` → deploys `quranatlas.org`; receives merge commits from `staging` via PR only.

Flow: feature branch → PR → `dev` → (promote) → PR `dev → staging` → (promote) → PR `staging → main`. Merge commits only (no squash, no rebase). Three env branches protected from deletion + force-push; feature branches auto-delete on merge.

**Target `staging` or `main` direct only if I ask hotfix, promotion PR, or name branch.** Default elsewhere: `dev`. Using `gh pr create`, pass `--base dev` unless instruction contradicts.

### Rule 7 — Playwright e2e tests must not bloat suite wall time

E2e suite speed is a renewable budget — every careless spec spends it. Audit 2026-04-26 found ~110s wall time dominated by setup duplication, not assertions. Below sub-rules keep new specs from re-introducing the same waste. Violations rejected at review.

**7.1 — No fixed sleeps. Ever.**
`page.waitForTimeout(N)`, `setTimeout(resolve, N)`, `await new Promise(r => setTimeout(r, N))` banned in test code. Replace with `await expect(locator).toHaveX(...)`, `await expect.poll(fn).toBe(...)`, `await expect(async () => { ... }).toPass({ timeout })`, or `page.waitForFunction(fn)` against the actual condition. Sleeps either over-pay (wasted ms × thousands of runs) or under-pay (flake). The only acceptable timing call is the `actionTimeout`-bound assertion. Carve-outs: (a) gesture fixtures simulating physical timing (`fixtures/chrome.js` double-tap interval) — keep ≤150ms; (b) long-press tests where the hold itself is the gesture — keep within ~30ms of the app's own threshold (e.g. 380ms when the app fires at 350ms). Document the threshold in a comment on the line.

**7.2 — Scope IDB resets to what the test actually mutates.**
Default to `clearStore('settings')` (or whichever single store the test touches) over `clearAllData(page)`. Full DB drop forces app cold-boot + reader re-mount + 5 object stores recreated; tens of seconds wasted across the suite. Only reach for `clearAllData` when the test exercises cross-store invariants, onboarding flow, or clear-data UX itself. Add the scoped helper to `tests/e2e/fixtures/idb.js` if it does not yet exist — do not inline `page.evaluate(() => indexedDB.delete...)` in specs.

**7.3 — One `beforeEach` per spec file. Nested `describe` blocks do not get their own.**
Pre-2026-04-26 `journey-d-settings.spec.js` had 5 redundant `beforeEach` blocks all running `clearAllData → markOnboardingComplete → goto → waitForReader`. If a sub-group needs different setup, hoist the shared pieces to the outer hook and let the inner block override only the delta (viewport, route, single store). If a sub-group has zero overlap with the outer setup, it belongs in a separate spec file, not a nested describe.

**7.4 — Mobile Chrome project tag-gate (`@mobile`).**
Tests that assert mobile-specific behavior (`MarginHeader`, drawer swipe, gear long-press, header auto-hide, viewport-conditional layout) tag with `@mobile`. The Mobile Chrome project's `grep` filters to `@mobile` only. Untagged tests run on chromium once. Default assumption: viewport-agnostic = chromium-only. Re-tagging later is cheap; running 100+ tests twice for a year is not. If unsure whether a behavior is viewport-agnostic, tag it `@mobile` AND leave it on chromium — small cost.

**7.5 — Reuse onboarded `storageState` for any test whose first action is "skip onboarding."**
The `tests/e2e/.auth/onboarded.json` snapshot (created by `global-setup.ts`) carries onboarding-complete + default settings. Tests use it via `test.use({ storageState: 'tests/e2e/.auth/onboarded.json' })` instead of `markOnboardingComplete(page)` + `clearAllData` + cold-boot. Saves ~1–2s per test. Tests that exercise the onboarding flow itself opt out with `test.use({ storageState: { cookies: [], origins: [] } })`. If `global-setup.ts` does not yet exist when this rule first applies, build it before adding the next setup-heavy spec — do not extend the old fixture-call cargo cult.

**7.6 — Default to the dev server. Reach for the preview build only when the SW must be exercised.**
Empirically (2026-04-26) the Vite dev server runs the suite faster than the preview build (~30s vs ~37s on chromium); preview's per-test render path is slower without HMR's bundle pre-warming and the build cost does not amortise. The Offline (Preview) project remains the single carve-out — the SW only emits in production builds. New specs default to the dev server (no env flag needed). If a test genuinely needs preview-only behavior (minified bundle, real SW, production CSP), tag it `@offline` to route it through the existing preview project rather than spawning a new one.

**7.7 — Time the new spec before merging.**
Run `time pnpm playwright test tests/e2e/<your-spec>.spec.js --reporter=line` locally. If a spec adds >5s to its journey file's wall time, justify it in the PR description (or shrink it). New spec files cap at 15s wall on chromium project; nest into existing `journey-X-*.spec.js` rather than spawn a new file (Rule 4 already says this — Rule 7.7 enforces the perf side).

### Rule 8 — Zero build warnings before commit

**No commit may introduce or carry forward a warning from `pnpm build`, `pnpm lint`, or `pnpm check`.** Run all three before staging — if any prints a warning (rolldown `INEFFECTIVE_DYNAMIC_IMPORT`, eslint `Unused eslint-disable directive`, svelte-check `0 ERRORS 0 WARNINGS` violation, etc.), fix it in the same change. "Pre-existing warning" is not an excuse — fix it as part of the commit that touches the area, or split a separate cleanup commit ahead of yours.

**Why:** warnings rot. A single accepted warning trains the eye to skip output, and the next ten warnings hide in the noise. The audited 2026-04-26 build had two — an unused `eslint-disable no-console` and a dynamic-import that was statically imported elsewhere — both surviving because every prior commit treated them as someone else's problem. Treat the warning bar as `error`; if the bar were lower we would have caught the dynamic-import bundle bloat months earlier.

**How to apply:** before `git add`, run `pnpm lint && pnpm check && pnpm build` and read every line of output. Any non-empty warning section gates the commit. If the warning is genuinely intractable (third-party tool emits a false positive that cannot be silenced cleanly), document the exception inline next to the offending code (`// rolldown bug #1234 — silenced via .browserslistrc`) AND in the PR description — never silently.

## Workflow

Scripts, tooling, stack refs: see `docs/tech-stack.md`.