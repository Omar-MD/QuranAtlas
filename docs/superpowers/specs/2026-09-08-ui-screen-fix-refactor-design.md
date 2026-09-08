# QuranAtlas UI Screen Fix & Refactor — Design Spec

**Status:** Approved direction (Approach A, amended: K3 owns commonality first, then
per-screen audits and per-screen design plans).
**Date:** 2026-09-08
**Baseline:** `dev` @ `c8cf103` — `mise run check` ✅, `mise run build:ui` ✅,
`mise run smoke` ✅ (desktop-smoke + mobile-smoke, 2/2). All iteration promises in
this spec are grounded in this proven-green baseline.
**Supersedes:** `.scratch/director-brief-v1.md` as a *binding* document. Landed v1
work (Status/ListRow/Card primitives, pill Button, navigation-drawer Sheet,
radiogroup fixes, status/scrim/chrome tokens, swatch bindings, reduced-motion
global) stays — it is green and guardrail-clean.
**Inputs (history, not binding):** `.scratch/static-visual-audit-current.md`
(open remainder), `.scratch/frontend-ui-ux-polishing-plan.md` (surface journeys),
`.scratch/visual-review-current.md`, `.scratch/search-status-cleanup-report.md`.

---

## 1. Why the last refactor failed — and the guardrail for each cause

Evidence from git (`a25cb02 wip: checkpoint design-system refactor` stalled, then
cleanup commits `481e7e8`, `4f93a31`, model fix `c8cf103`) and `.scratch/`
artifacts:

| Root cause | Evidence | Guardrail (binding) |
|---|---|---|
| Binding-but-wrong K3 brief | v1 §3.3 banned solid-accent selected states while dark theme still forced them; §2.2 "retired" tokens that still had consumers | K3 output is **design-only** and becomes binding only after orchestrator vetting (§6). Token retirement is gated by orchestrator-run zero-consumer grep, never by brief text |
| Watchdog enforcement of a document | v1 header made the brief "the only authorized visual input" with an enforcing advisor | No standing advisor, no watchdog. Enforcement = deterministic repo gates (`mise run check` guardrails, `build:ui`, `smoke`) + advisory seats. Advisors stay `enabled: false` |
| Stalled mid-flight | wip checkpoint commit; milestone never closed; 214 `!important` and 57 `.qar-search-*` selectors remain | No `wip` commits. An iteration lands green end-to-end or is reverted; the next iteration is planned only after the previous one closes |
| Wrong model on a seat | fixed at `c8cf103`; config verified `ui_director: opencode-go/kimi-k3:high`, `ui_visual: opencode-go/kimi-k2.6` | Seat dispatch always via named agents (`.omp/agents/*`); orchestrator confirms seat identity in every dispatch |

## 2. Goals / Non-goals

**Goals**
1. Every screen defect-free and visually consistent: no clipping, no broken
   states, readable in light/sepia/dark (+ night), 44px touch targets, visible
   focus, working reduced-motion.
2. One design language: shared chrome, surfaces, status, rows, controls — owned
   by the commonality layer, consumed by every screen.
3. Refactor remainder closed: search CSS on primitives, token retirements,
   `!important` elimination, touch targets.
4. Every iteration ends with **working e2e code**: green gates, browser-verified
   surfaces, committed.

**Non-goals**
- No auth/security/service-worker/caching/dataset changes (a defect that demands
  one escalates to the user first).
- No new dependencies. No new CSS namespace. No screenshot tests or committed
  screenshots. No e2e assertions on CSS classes, DOM shape, or icon internals.
- No aesthetic decisions by implementation seats; no architecture decisions by
  design seats.

## 3. Roles and decision rights

| Seat | Agent | Owns | Never owns |
|---|---|---|---|
| Design director (Kimi K3) | `ui-director` | Commonality brief (tokens, shared composition language); per-screen design audits; per-screen design plans; per-iteration design addenda | Architecture, file structure, token-retirement gating, e2e/test scope, dependencies |
| Implementer (GLM-5.3-Flash) | `ui-implementer` | Applying a vetted brief exactly; self-verification via `skill://ui-verify`; narrow gates after edits | Any color/spacing/type/motion choice; brief gaps are reported, not filled |
| Visual reviewer (Kimi K2.6) | `ui-visual-reviewer` | Independent rendered-pixel audit (1280×900 + 375×812 × themes); per-iteration re-review of touched surfaces; milestone sign-off (`approve` or concrete deltas) | File edits; TypeScript/persistence/architecture judgment |
| Correctness reviewer (Luna High) | `ui-correctness-reviewer` | Bounded review when behavior, state, persistence, routing, focus, a11y, or TS contracts changed | Styling |
| Orchestrator (Luna, main session) | — | Decomposition, dispatch, K3-output vetting, token-retirement grep gates, iteration admission (green or revert), final response | Production implementation; aesthetic choices |

## 4. Screens in scope

`#/` launch · `#/onboarding` · `#/s/:surah[/:ayah]` reader · `#/m/:page` Mushaf ·
`#/surahs` · `#/bookmarks` · `#/search` · `#/settings` overlay (+`#/assets`
alias) · `#/about` · unsupported-hash fallback.

Surface families for defect-fix waves: **Reader** (reader + Mushaf, shared
`ReaderPageShell`/chrome) · **Navigation** (`#/surahs`, `#/bookmarks`, NavDrawer)
· **Search** · **Settings** (overlay, themes, night, included assets) ·
**Framing** (launch, onboarding, about, unsupported).

## 5. Phase structure and iteration map

### Phase A — Iteration 0: audit and design foundation (documents only; no `src/**` edits)

Ordered per user directive — **commonality before per-screen work**:

1. **K3 commonality brief** (`docs/superpowers/specs/ui/2026-09-08-brief-commonality.md`):
   K3 inspects live UI (via `eval` browser tabs), token files, registry, all
   `src/components/ui/**` primitives, and writes the shared design language:
   token semantics and any token additions/removal-requests (with consumers
   listed), shared chrome composition, surface/card/status/row/control/state
   language, theme + night behavior, motion and reduced-motion rules. This is
   brief v2 part 1.
2. **Orchestrator vets part 1** against §6 checklist; contradictions bounce to
   K3; only then is it binding for step 3.
3. **K3 per-screen design audits + plans** (`docs/superpowers/specs/ui/2026-09-08-brief-<screen>.md`,
   one per §4 screen): grounded in live inspection at 1280×900 and 375×812 in
   light/sepia/dark (+ night where relevant); each plan lists (a) defects seen,
   (b) target composition using commonality language + registry components,
   (c) states (empty/error/loading/selected/disabled/focus), (d) per-viewport
   layout, (e) motion/reduced-motion treatment.
4. **In parallel with step 3** (independent, unanchored — K2.6 does not see K3's
   findings first): **K2.6 pixel audit** of every screen at both viewports ×
   themes; **orchestrator behavioral sweep** — console errors, failed network
   requests, a11y snapshots, focus/return-focus, broken interactions, persisted
   preference round-trips.
5. **Merge**: orchestrator reconciles the three streams (K3 design audit, K2.6
   pixels, behavioral sweep) into a prioritized defect inventory
   (`docs/superpowers/specs/ui/2026-09-08-defect-inventory.md`) with severity
   taxonomy: **blocking** (unusable/broken/a11y violation) · **major** (visible
   inconsistency, clipping, contrast, wrong state) · **minor** (polish). The
   static-audit remainder (§9) is merged in here. Disagreements are adjudicated
   by the orchestrator; behavioral disputes go to the correctness seat.

**Iteration 0 exit:** committed inventory + vetted briefs; `check` still green.

### Phase B — Iteration 1..N: defect-fix waves

- **Iteration 1 — Commonality implementation.** The vetted commonality brief
  lands first (token consolidation, shared chrome/surface/state language), so
  screen fixes consume one language instead of inventing per-screen ones.
- **Iterations 2..6 — Surface-family waves**, ordered by inventory severity
  (blocking → major → minor): expected order Reader, Navigation, Search,
  Settings, Framing — confirmed or reordered by the inventory. One family per
  iteration. Screens with zero findings after merge are skipped and recorded.

### Phase C — Iterations R1..R4: refactor remainder (re-scoped against actual tree)

- **R1 — Search CSS completion:** remaining `.qar-search-*` selectors onto
  `Status`/`ListRow`/primitives (HIGH remainder).
- **R2 — Token retirement completion:** `--qa-react-nav-current-spine`,
  `--qa-react-bookmark-pulse-bg/-edge`, `--qa-react-radius-sm/md/circle` — each
  retired only behind a fresh zero-consumer grep run by the orchestrator; plus
  44px touch-target completion at remaining sites.
- **R3 — `!important` elimination blocks:** adaptive-settings sheet re-layout as
  a real variant; reader-chrome icon + drawer wordmark/about/close overrides onto
  `IconButton` composition; drawer row grids onto `ListRow`.
- **R4 — Cross-surface consistency + final acceptance:** full-app journey on
  desktop + mobile, all themes + night, reduced-motion; K2.6 milestone sign-off.

### Per-iteration execution loop (every iteration, no exceptions)

1. **JIT plan** (writing-plans format) written by the orchestrator to
   `docs/superpowers/plans/2026-09-08-ui-iter-<n>-<name>.md`, referencing this
   spec + the relevant vetted brief; bite-sized tasks with test/verify steps.
2. K3 addendum only where the inventory/brief leaves a real aesthetic choice.
3. `ui-implementer` applies the brief exactly (task-by-task; reports gaps, never
   fills them), self-verifying each touched state via `skill://ui-verify`.
4. Gates: `mise run check` + `mise run build:ui` + `mise run smoke` green;
   `mise run offline` only when service-worker/offline surfaces were touched.
5. K2.6 re-renders every touched surface (both viewports × themes) → `approve`
   or concrete deltas; deltas loop within the iteration.
6. Bounded Luna correctness review when behavior/state/persistence/routing/
   focus/a11y/TS contracts changed.
7. Commit (conventional prefix: `fix:`/`refactor:`/`docs:`), tree clean. Red at
   any gate → fix within the iteration or revert; never commit red, never `wip`.

**Definition of done (per iteration):** all seven steps closed, gates green,
K2.6 approval on touched surfaces, tree clean at a single green commit set.

## 6. K3 output contract and vetting checklist

**In scope for K3:** semantic token values/roles (existing namespaces only),
component variants/states from the registry, per-screen composition, layout at
1280×900/375×812, theme/night/reduced-motion behavior, motion durations/easing.
**Out of scope:** file structure, imports/architecture, which tests exist,
dependency choices, token retirement (may *request*; orchestrator gates).

**Vetting checklist (orchestrator, every K3 artifact, before binding):**
1. Every named primitive/recipe exists in `component-registry.json`.
2. Every named token exists in `semantic.css` for light **and** sepia **and**
   dark (or is proposed with values for all three).
3. Single namespace chain `--qar-* → --qa-react-* → qar:`; no new namespace.
4. No conflict with `check:design`/`check:radix`/`check:ui-patterns`/
   `check:boundaries`/`check:registry` rules.
5. Internal consistency: no two sections prescribe different treatments for the
   same state/surface (the v1 §3.3 failure).
6. Durable-test rules respected: nothing in the brief implies asserting CSS
   classes, DOM shape, or screenshots.
7. Every visual claim traceable to live-UI or source inspection (K3 cites the
   route/state/file).

Failure of any item → the artifact returns to K3 with the specific objection;
it is never partially binding.

## 7. Verification contract

- **Per-edit (implementer):** narrow relevant checks + affected desktop/mobile
  states via `skill://ui-verify`.
- **Per-iteration:** `mise run check` + `mise run build:ui` + `mise run smoke`;
  browser verification at 1280×900 and 375×812, light/sepia/dark (+night),
  reduced-motion, on every touched surface; console and network clean.
- **Conditional:** `mise run offline` when SW/offline behavior touched; e2e spec
  extension only when a user-observable contract changed, asserting accessible
  roles/names, visible content, URLs, persisted state, network outcomes —
  nothing else.
- **Milestone:** K2.6 rendered sign-off; final acceptance = full-app journey
  (reader → drawer → search → settings/theme → about → reader) on both viewports.

## 8. Artifacts

| Artifact | Location | Owner |
|---|---|---|
| This spec | `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` | Orchestrator |
| Commonality brief (v2 pt 1) | `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` | K3, vetted |
| Per-screen design plans (v2 pt 2) | `docs/superpowers/specs/ui/2026-09-08-brief-<screen>.md` | K3, vetted |
| Defect inventory | `docs/superpowers/specs/ui/2026-09-08-defect-inventory.md` | Orchestrator (merged streams) |
| JIT iteration plans | `docs/superpowers/plans/2026-09-08-ui-iter-<n>-<name>.md` | Orchestrator |
| Transient logs, probe output | `.scratch/` (never committed) | any |

## 9. Known open remainder (input to Phase A merge, from the static audit)

- HIGH: 57 `.qar-search-*` selectors; search surfaces not on `Status`/`ListRow`.
- MEDIUM: dark filter-option selected state forces solid accent `!important`
  while light uses token language; token retirement blocked by remaining
  consumers (`nav-current-spine`, `bookmark-pulse-*`, `radius-sm/md/circle`);
  sub-44px touch targets (32–42px sites previously cited in
  `.scratch/static-visual-audit-current.md`).
- Deferred: 214 `!important` declarations; `!important`-relayout of the
  adaptive-settings sheet; reader-chrome/drawer override blocks; over-scoped
  `[data-swatch]` selectors; duplicate view-toggle/wird-status chip recipes.

This list is **input**, not scope: Phase A merge decides what is a defect
(Phase B) vs refactor remainder (Phase C) vs already-resolved.

## 10. Out of scope

Authentication/security, service-worker/caching/offline lifecycle behavior,
datasets/catalog/taxonomy, build tooling, new dependencies, Storybook infra
changes, screenshot-regression infrastructure. Any defect whose fix would cross
these lines escalates to the user before implementation.
