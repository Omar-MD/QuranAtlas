# Cluster-by-surface — workflow playbook

Referenced by root `AGENTS.md`. Read this before splitting work by surface, delegating by area, or adding Playwright specs.

## The unit

A **surface** is a user-visible region with a documented dossier and one owning Playwright spec folder. The table below is the canonical surface → dossier / spec map; the surface → *source files* mapping is not duplicated here because each dossier's frontmatter `src_paths` already owns it (Rule 1 keeps it fresh — `pnpm run docs` regenerates the auto Inventory block from the globs).

| Surface | Dossier | Spec |
|---|---|---|
| `read` (reader + ambient chrome + cross-surah scroll + typography) | `docs/context/surfaces/read.md` | `tests/e2e/read/*.spec.js` |
| `mark` (removed personal-layer implementation/cleanup scope) | `docs/context/surfaces/mark.md` | `tests/e2e/mark/*.spec.js` |
| `review` (removed personal-layer implementation/cleanup scope) | `docs/context/surfaces/review.md` | `tests/e2e/review/*.spec.js` |
| `navigate` (command sheet + drawer + surah list + bookmarks) | `docs/context/surfaces/navigate.md` | `tests/e2e/navigate/*.spec.js` |
| `listen` (removed audio implementation/cleanup scope) | `docs/context/surfaces/listen.md` | `tests/e2e/listen/*.spec.js` *(cleanup only if retained)* |
| `configure` (Settings sheet + About) | `docs/context/surfaces/configure.md` | `tests/e2e/configure/*.spec.js` |
| `onboard` (first-run wizard + session restore) | `docs/context/surfaces/onboard.md` | `tests/e2e/onboard/*.spec.js` |
| `infra` (SW + cross-tab + manifest) | `docs/context/surfaces/infra.md` | `tests/e2e/infra/*.spec.js` |

The **unit of work** is a surface, or a contiguous cluster of surfaces that share source files or invariants. A single bug is never a unit.

Removed-scope implementation surfaces still count as surface clusters while their code exists. Use their dossiers and tests only for cleanup, regression containment, or source removal work; do not treat them as active product expansion lanes.

When you need the surface → source-files mapping for a unit, open the matching dossier — its §Inventory section is the auto-generated file list (regenerate with `pnpm run docs` if stale). Surfaces routinely reach across multiple `src/<feature>/` dirs — that's expected, and that cross-surface reach is exactly what makes the surface a cluster, not a single dir.

## Brainstorming rules

Applies to any UI, theme, layout, or design brainstorm — whether initiated explicitly via a brainstorm skill or implicitly when the user asks "what would it take to…".

1. **Ground in the real source before the first clarifying question.** Read `src/styles/tokens/semantic.css` (tokens and shell rules) and the surface's own `.svelte` / `.ts` files before opening a scope card or asking scoping questions. Cite actual selectors (`.qa-sl-seg-item--on`, `.qa-mark-chips--all`, `.qa-review-controls`) and tokens (`--qa-accent`, `--qa-ambient-accent`) in the first round — not abstracted descriptions.
2. **No placeholder mockups as the opener.** A visual companion should show real computed colors, real selectors, real DOM structure — not invented swatches.
3. **One brainstorm per surface-cluster**, not one per concern. Bundle every open question for that surface into the single brainstorm (mirrors Planning rule §1).

## Planning rules

1. **One unit per surface-cluster.** If two candidate units both touch `src/<same-feature>/`, collapse them.
2. **A journey that spans surfaces is one unit, not two.** Example: cleanup or regression containment for a mark deleted in Tab B while Tab A editor is open touches `src/mark/` AND `src/infra/safety/sync.ts`. That's one unit — the coupling is the point.
3. **Docs land with the unit.** Owning dossier's §Behavior + §Reach + §Invariants (Rule 1), plus `data-model.md` / `architecture.md` if cross-cutting (Rule 2), are part of the unit. `events.md` / `module-graph.md` / `feature-map.md` regenerate automatically (`pnpm run docs`) — no manual update. Not a separate task. Not a delegated follow-up.
4. **Tests land with the unit.** If the unit adds new behavior to a dossier, the matching Playwright spec is part of the same commit. Extend the owning surface folder and reuse an existing spec there when the concern already has a natural home.
5. **Plan lifecycle.** Completed plans are deleted in the final commit, not archived. The lasting record lives in code + `git log` + `docs/context/`.

## Subagent dispatch rules

1. **Default to the main session.** Delegation is worth the coordination cost only when (a) the parent context would overflow, or (b) surfaces are truly independent with no shared files / selectors / events.
2. **Parallel = distinct surfaces.** Max concurrent delegated work items = number of distinct surface-clusters, not number of bugs.
3. **Do not delegate a surface already loaded in main context.** You've paid for the reads; delegation re-pays them.
4. **One delegated worker per surface carries the whole cluster** — the source files, the owning journey spec, every bug/tweak/question for that surface. Not one worker per bug.
5. **Sequencing over fan-out** when there's a data dependency (e.g. "cross-tab work needs long-press gesture fixed first"). Don't parallelise past a dependency.

## Testing rules

1. **Surface folder is canonical.** The folder at `tests/e2e/<surface>/` is the e2e home for that surface. Add or extend specs there; do not create a parallel folder.
2. **New top-level e2e folder iff new dossier.** A new `surfaces/<surface>.md` is the sole trigger for a new top-level e2e folder.
3. **One spec per cluster during verification.** Run the surface's journey spec at the real viewport. Don't run the full suite to verify a single-surface change.
4. **Flake reproduction = `--repeat-each=N --workers=M` on the one spec.** Not the whole suite.
5. **Tag-scoped projects are not extra specs.** `@a11y`, `@desktop`, `@keyboard`, `@reduced-motion`, `@offline` are assertions inside the owning journey spec — not separate files.
6. **Unit tests (Vitest + `fake-indexeddb/auto`) verify data/state invariants.** They do not replace a Playwright pass on the surface. Journey coverage is a first-class deliverable (per Rule 1).

## Verification rules

- **Real viewport, real Playwright, real IDB.** Not "the code looks right." Measure computed styles, bounding rects, DOM state.
- **Desktop variants** (`@desktop`, 1440×900, chromium-only) must be verified when the surface has `desktop-variants` blocks in its journey spec.
- **Scope verification to the surfaces the cluster touched.** Don't re-run unchanged journeys.
- **Type check and lint are prerequisites**, not feature-correctness evidence.

## Red-flag checklist — run before dispatching

| Smell | Fix |
|---|---|
| Two units / delegated workers touch the same `src/<feature>/` tree | Collapse to one unit |
| Plan has N units for N bugs on one surface | Collapse to one unit |
| New spec file proposed outside an existing surface folder | Extend the owning surface folder |
| Dossier §Behavior update queued as a separate task or delegated worker | Fold into the surface's unit |
| "Run full e2e suite" to verify a single-surface change | Run the one journey spec |
| Playwright invoked with different specs within one cluster | Collapse to the owning spec |
| Subagent spawned for work that fits in main context | Execute in main session |
| Brainstorm opened bug-by-bug for related items on one surface | One brainstorm per surface |
| Plan file kept "for reference" after implementation | Delete in final commit |

## Cross-cutting exceptions (virtual surfaces)

These changes don't map to a single UI surface. Treat each as its own cluster with a broader verification scope. The **Canonical doc** column points at the context doc that owns the mapping to actual source files — follow it to find the current paths (Rules 1–2 keep those docs fresh).

| Virtual surface | Canonical doc | Verify |
|---|---|---|
| IDB schema / store contracts | `docs/context/data-model.md` (cross-cutting rules) + owning dossier §Data | Every dossier whose surface reads/writes the changed store |
| Event bus | `docs/context/events.md` (auto-gen catalog) + each dossier's §Events block | Every dossier whose §Events emit/listen block touches the changed event |
| Router / launch-restore / `lastSurface` | `docs/context/architecture.md` §Router | `onboard` (launch-restore), `navigate` + `read` (any surface that writes `lastSurface`) |
| Safety / sync (versionchange, BroadcastChannel) | `docs/context/surfaces/infra.md` §Cross-tab coherence | `infra` + cleanup surfaces that still use BroadcastChannel, `configure` (clear-data) |
| Theme tokens (not per-surface selectors) | `docs/context/architecture.md` §Stack + `src/styles/tokens/semantic.css` `:root` / `[data-theme]` blocks | `read` (auto theme), `configure` (theme swap), `@a11y` across surfaces |
| Runes state modules | `docs/context/module-graph.md` (auto-gen) | Every dossier that imports the changed state slice |
| Chunk budgets | `docs/tech-stack.md` §scripts | Build + `pnpm run validate`; no journey spec needed |
| Service worker / offline | `docs/context/surfaces/infra.md` + `docs/context/architecture.md` §Boot flow | `infra` — `PLAYWRIGHT_INCLUDE_OFFLINE=1`, preview server, production build |

For virtual surfaces: still one cluster, still one plan unit, but verification runs the batch of affected journey specs — as one Playwright invocation, not N.

## Decision tree — "one unit or two?"

```
Do the candidates share any file under src/<feature>/ ?
  └─ Yes → one unit.
  └─ No → Do they share a dossier in docs/context/surfaces/ ?
            └─ Yes → one unit.
            └─ No → Do they share an event, IDB store, or state slice ?
                      └─ Yes → one unit (virtual surface).
                      └─ No → two units (parallel-safe).
```

## What this playbook is not

- Not a replacement for brainstorming / planning / TDD / verification skills. It's a clustering overlay on top of them.
- Not a gate against legitimate fan-out — genuinely independent work across 3 surfaces can still run in parallel when the tool surface supports delegation.
- Not a ban on iterative Playwright runs — re-run the same spec as often as you need within a cluster; what's banned is running *different* specs for each fix.
