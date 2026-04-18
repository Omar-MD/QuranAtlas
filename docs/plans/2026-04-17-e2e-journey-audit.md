# E2E Journey Audit & Repair — Stage 2 (surface-batched)

> **Status:** Stage 1 complete (catalog + specs exist). Stage 2 is active on branch `feature/e2e-stage2` (worktree). This plan replaces the original per-bug Stage-2 sequencing with **surface-batched parallel repair**.

**Why surface-batched:** One Playwright run per surface captures *every* failure on that surface; a subagent fixes them all in one pass. Parallel surface subagents run concurrently when their files don't overlap. This is dramatically faster than per-catalog-entry dispatch, and matches how bugs actually cluster (one cascading root cause tends to light up a whole surface).

**Source catalog:** `docs/plans/e2e-audit-catalog.md` (Stage 1 output; may be partly stale — theme-polish merged since).

---

## What's already fixed on this branch

| Commit | Scope | Catalog ID |
|---|---|---|
| `4d3c9f0` | longPress helper emits TouchEvent | T-2 (partial, reopened below) |
| `29f1527` | More-sheet strict-mode | T-1 |
| `87ab0a4` | `clearAllData` now suppresses `versionchange` → fixes `<body> intercepts pointer events` | Bug-2 (real root cause) |
| `72ed4c5` | `openSettingsSheet` selector, D1/G1 inline selectors | new fixture regressions |
| `901acb6` | Dock route-persistence via `ROUTER_ROUTE_CHANGE` + `AMBIENT_SURFACE` on surah load | Bug-1 |

**Already-passing (confirmed by baseline re-run):** T-5, T-6, A11y-2.

---

## Surface batches — what's left

Each batch below is self-contained: one subagent, one Playwright run scoped to that surface, all fixes in one commit (or a small tight commit cluster).

### Batch R — Reader + Marks surface
**Surface:** reader body + gesture detection + mark editor.
**Test files:** `journey-b-reader.spec.js`, `journey-c-marking.spec.js`.
**App files (likely):** `src/marks/gesture.js`, `src/marks/editor.js`, `src/reader/index.js`, reader CSS in `src/core/theme.css`, `src/app/shell.js` or `index.html` template.
**Failures to clear:**
- **T-2 reopened** — long-press still doesn't open `.qa-sheet--mark`; blocks C1–C6 + I1. Prior commit `4d3c9f0` addressed Touch events but apparently didn't close the gap in chromium project.
- **scrollable-region-focusable** on `#main-content` — new axe P1, fires on A2 + B reader a11y scans. Add `tabindex="0"` to the scrollable region (or confirm first focusable child is reachable).
- **A2 residual contrast** (if present) — `.qa-pill-ref-hint` (3.85:1) and `.qa-dock-item--active > .qa-dock-label` (4.33:1) both miss 4.5:1 in dark theme (observed by Bug-1 reviewer). Nudge the dark tokens.

**Playwright scope:** `pnpm exec playwright test journey-b-reader.spec.js journey-c-marking.spec.js`
**Target:** C-suite green both projects; B a11y clean; A2 a11y clean.

### Batch N — Navigation + Command sheet + Surah list
**Surface:** global navigation chrome — `⌘K` command sheet, surah directory, dock labels.
**Test files:** `journey-f-navigation.spec.js`.
**App files (likely):** `src/nav/command-sheet.js`, `src/surahs/index.js`, `src/core/theme.css` (kbd token).
**Failures to clear:**
- **A11y-1 residual** — one sepia-theme token pair (`#78592e` on `#ddd0b3` ≈ 4.2:1) misses 4.5. Affects `.qa-cmd-kbd` throughout. Adjust the sepia token.
- **axe `list` rule** on `.qa-sl-list` — `<li role="link">` directly inside `<ul>` is invalid; 114 surahs × 1 rule inflates F4 to ~789 violations. Fix: move `role="link"` off `<li>` and use `<a>` inside (preferred), or switch to `listbox/option`.
- **T-7 F5** — card renders now, click was blocked by pre-Bug-2 pointer interception. Should auto-pass; verify.

**Playwright scope:** `pnpm exec playwright test journey-f-navigation.spec.js`
**Target:** F-suite green both projects; F4 a11y count drops from ~789 → 0.

### Batch S — Settings surface
**Surface:** Settings sheet → Clear-data flow.
**Test files:** `journey-d-settings.spec.js`.
**App files (likely):** `src/settings/clear-data.js`, router / boot logic that handles `onboardingComplete=false`.
**Failures to clear:**
- **D4** — after tapping Clear data → Confirm, `.qa-onboarding` never renders. Likely the post-clear navigation doesn't redirect to `#/onboarding`, or `onboardingComplete` isn't reset, or the reset happens after the router has already mounted the reader.

**Playwright scope:** `pnpm exec playwright test journey-d-settings.spec.js`
**Target:** D-suite green both projects, including D4 restart-onboarding.

### Batch H — Offline surface
**Surface:** service worker + offline reload.
**Test files:** `journey-h-offline.spec.js`.
**Config:** `playwright.config.js`, `package.json` scripts.
**Failures to clear:**
- **T-4** — H1 needs preview build (SW not built in dev). Two valid shapes:
  (a) `test.skip(!process.env.PLAYWRIGHT_USE_PREVIEW)` + doc on CI variable, or
  (b) a separate `'Offline (Preview)'` project in `playwright.config.js` whose `webServer.command` is `pnpm preview` instead of `pnpm dev`.
- **Bug-3** — once T-4 lands, verify the SW actually serves reader + command sheet + verse preview from cache offline. If not, root-cause in `src/sw/` or the workbox/manifest config.

**Playwright scope:** `PLAYWRIGHT_USE_PREVIEW=1 pnpm exec playwright test journey-h-offline.spec.js`
**Target:** H1 green both projects (or skipped-cleanly in dev-mode runs with a clear reason).

### Batch X — Cross-tab (sequentially after Batch R)
**Surface:** multi-context BroadcastChannel + IDB versionchange.
**Test files:** `journey-i-cross-tab.spec.js`.
**Dependencies:** needs Batch R's long-press fix (I1 relies on it).
**Failures to clear:**
- **T-3** — `data-verse-key="2:255"` / `1:5` locator wait in second context. Add `waitForReader(pageB)` in I1/I2 setup.

**Playwright scope:** `pnpm exec playwright test journey-i-cross-tab.spec.js`
**Target:** I1, I2, I3 green both projects.

---

## Parallel dispatch plan

**Wave 1 (parallel — no file overlap):** Batches **R**, **N**, **S**, **H**.
- R and N both touch `src/core/theme.css` — they MAY conflict on token edits. Mitigation: R touches dark-theme tokens (reader hint + dock label), N touches sepia-theme kbd token. Disjoint selectors — safe. If conflict surfaces at commit time, sequence R before N.
- S touches `src/settings/` only — no overlap.
- H touches `playwright.config.js` + fixtures — no overlap with app code.

**Wave 2 (sequential on R):** Batch **X**.

**Wave 3 (exit):** full run + doc close-out.

---

## Per-surface subagent brief (template)

Each surface subagent receives:
1. This plan section for its batch (scope + failures + target).
2. The catalog entries relevant to that surface.
3. Instruction to run `pnpm exec playwright test <its-spec-files> --project=chromium --reporter=list` first, enumerate **actual current failures** (catalog may be stale), fix all of them in minimal touches, re-run on both chromium and Mobile Chrome.
4. Commit discipline: one commit per distinct root cause; conventional commit messages; update `docs/context/*` per CLAUDE.md rules 1–2 when behaviour changes.
5. Hard constraints: no `.skip`/`.fixme`/`.only`, no loosened assertions, no scope creep outside the named surface, no touching other surface's test files.
6. Report back: root-cause per failure, files changed, test counts (before/after, both projects), commit SHAs, status flag.

Each subagent runs **independently** — they do not share state. The controller (this session) reviews each in turn: spec compliance, then code quality, then merges into the branch.

---

## Exit criteria (unchanged from original Stage 2)

- `pnpm exec playwright test` green on Mobile Chrome + Tablet + Desktop Chrome.
- `pnpm run test:run` (Vitest) green, no unit-test regressions.
- `pnpm run lint` green.
- `pnpm run build` succeeds.
- Every catalog entry resolved or moved to a "Wontfix / not testable" note.
- `user-journeys.md` updated for any behaviour changes.

## Close-out (unchanged)

- Delete `docs/plans/2026-04-17-e2e-journey-audit.md` (this file).
- Delete `docs/plans/e2e-audit-catalog.md`.
- Commit: `docs: remove completed e2e journey audit plan`.
- Wontfix notes (if any) move inline into `docs/context/user-journeys.md`.
