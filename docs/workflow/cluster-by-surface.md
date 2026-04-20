# Cluster-by-surface — workflow playbook

Referenced by `CLAUDE.md` Rule 6. Read this before writing a multi-unit plan, dispatching subagents, or adding new Playwright specs.

## The unit

A **surface** is a user-visible region with a documented journey and a Playwright spec. The table below is the canonical surface → journey/spec map; the surface → *source files* mapping is not duplicated here because `docs/context/user-journeys.md` already owns it (Rule 1 keeps it fresh — follow the journey row to the modules it touches).

| Surface | Journey / spec |
|---|---|
| First-run onboarding + session restore | A — `journey-a-onboarding.spec.js` |
| Reader + ambient chrome (dock, pill) | B — `journey-b-reader.spec.js` |
| Mark editor | C — `journey-c-marking.spec.js` |
| Settings sheet, theme, clear-data | D — `journey-d-settings.spec.js` |
| Review hub + FVR | E — `journey-e-review.spec.js` |
| Command sheet + surah directory | F — `journey-f-navigation.spec.js` |
| About + shortcuts + PWA install | G — `journey-g-about.spec.js` |
| Offline activation (`@offline`) | H — `journey-h-offline.spec.js` |
| Cross-tab sync | I — `journey-i-cross-tab.spec.js` |

The **unit of work** is a surface, or a contiguous cluster of surfaces that share source files or journey rows. A single bug is never a unit.

When you need the surface → source-files mapping for a unit (e.g. "which modules does Journey A touch?"), open the matching `user-journeys.md` section and follow the modules it references. Journeys routinely reach across multiple `src/<feature>/` dirs — that's expected, and that cross-surface reach is exactly what makes the journey a cluster.

## Brainstorming rules

Applies to any UI, theme, layout, or design brainstorm — whether initiated explicitly via a brainstorm skill or implicitly when the user asks "what would it take to…".

1. **Ground in the real source before the first clarifying question.** Read `src/core/theme.css` (tokens and shell rules) and the surface's own `.svelte` / `.ts` files before opening a scope card or asking scoping questions. Cite actual selectors (`.qa-sl-seg-item--on`, `.qa-mark-chips--all`, `.qa-review-controls`) and tokens (`--qa-accent`, `--qa-ambient-accent`) in the first round — not abstracted descriptions.
2. **No placeholder mockups as the opener.** A visual companion should show real computed colors, real selectors, real DOM structure — not invented swatches.
3. **One brainstorm per surface-cluster**, not one per concern. Bundle every open question for that surface into the single brainstorm (mirrors Planning rule §1).

## Planning rules

1. **One unit per surface-cluster.** If two candidate units both touch `src/<same-feature>/`, collapse them.
2. **A journey that spans surfaces is one unit, not two.** Example: I2 (mark deleted in Tab B while Tab A editor open) touches `src/marks/` AND `src/safety/sync.ts`. That's one unit — the coupling is the point.
3. **Docs land with the unit.** `user-journeys.md` (Rule 1), plus any affected `data-model.md` / `events.md` / `module-graph.md` / `architecture.md` / `feature-map.md` (Rule 2), are part of the unit. Not a separate task. Not a subagent handoff.
4. **Tests land with the unit.** If the unit adds a new `user-journeys.md` row, the matching Playwright spec (new or extended) is part of the same commit. If the journey already exists, extend the owning `journey-X-*.spec.js` — do not create a parallel spec.
5. **Plan lifecycle.** Completed plans are deleted in the final commit, not archived. The lasting record lives in code + `git log` + `docs/context/`.

## Subagent dispatch rules

1. **Default to main session.** A subagent is worth the coordination cost only when (a) the parent context would overflow, or (b) surfaces are truly independent with no shared files / selectors / events.
2. **Parallel = distinct surfaces.** Max concurrent subagents = number of distinct surface-clusters, not number of bugs.
3. **Never dispatch a subagent for a surface already loaded in main context.** You've paid for the reads; a subagent re-pays them.
4. **One subagent per surface carries the whole cluster** — the source files, the owning journey spec, every bug/tweak/question for that surface. Not one subagent per bug.
5. **Sequencing over fan-out** when there's a data dependency (e.g. "cross-tab work needs long-press gesture fixed first"). Don't parallelise past a dependency.

## Testing rules

1. **Journey spec is canonical.** The spec at `tests/e2e/journey-X-*.spec.js` is the *only* e2e home for its surface(s). Extend it; do not create a new spec file for a covered journey.
2. **New spec file iff new `user-journeys.md` row.** This is the sole trigger for a new spec.
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
| Two units / subagents touch the same `src/<feature>/` tree | Collapse to one unit |
| Plan has N units for N bugs on one surface | Collapse to one unit |
| New spec file proposed for a covered journey | Extend the journey spec |
| `user-journeys.md` update queued as a separate task or subagent | Fold into the surface's unit |
| "Run full e2e suite" to verify a single-surface change | Run the one journey spec |
| Playwright invoked with different specs within one cluster | Collapse to the owning spec |
| Subagent spawned for work that fits in main context | Execute in main session |
| Brainstorm opened bug-by-bug for related items on one surface | One brainstorm per surface |
| Plan file kept "for reference" after implementation | Delete in final commit |

## Cross-cutting exceptions (virtual surfaces)

These changes don't map to a single UI surface. Treat each as its own cluster with a broader verification scope. The **Canonical doc** column points at the context doc that owns the mapping to actual source files — follow it to find the current paths (Rules 1–2 keep those docs fresh).

| Virtual surface | Canonical doc | Verify |
|---|---|---|
| IDB schema / store contracts | `docs/context/data-model.md` | Every journey whose surface reads/writes the changed store |
| Event bus | `docs/context/events.md` | Every journey whose surface emits or listens to the changed event |
| Router / launch-restore / `lastSurface` | `docs/context/architecture.md` §Router | A (launch-restore), F (navigation), any surface that writes `lastSurface` |
| Safety / sync (versionchange, BroadcastChannel) | `docs/context/architecture.md` §IndexedDB + `data-model.md` §Cross-cutting | I (cross-tab), D4 (clear-data) |
| Theme tokens (not per-surface selectors) | `docs/context/architecture.md` §Stack (theme refs) + `src/core/theme.css` `:root` / `[data-theme]` blocks | B6 (auto theme), D3 (theme swap), `@a11y` across journeys |
| Runes state modules | `docs/context/module-graph.md` | Every surface that imports the changed state slice |
| Chunk budgets | `docs/tech-stack.md` §scripts | Build + `pnpm run check-chunks`; no journey spec needed |
| Service worker / offline | `docs/context/architecture.md` §Boot flow + `docs/context/data-model.md` §`activationState` | H — `PLAYWRIGHT_INCLUDE_OFFLINE=1`, preview server, production build |

For virtual surfaces: still one cluster, still one plan unit, but verification runs the batch of affected journey specs — as one Playwright invocation, not N.

## Decision tree — "one unit or two?"

```
Do the candidates share any file under src/<feature>/ ?
  └─ Yes → one unit.
  └─ No → Do they share a journey row in user-journeys.md ?
            └─ Yes → one unit.
            └─ No → Do they share an event, IDB store, or state slice ?
                      └─ Yes → one unit (virtual surface).
                      └─ No → two units (parallel-safe).
```

## What this playbook is not

- Not a replacement for brainstorming / planning / TDD / verification skills. It's a clustering overlay on top of them.
- Not a gate against legitimate fan-out — genuinely independent work across 3 surfaces absolutely should run 3 subagents in parallel.
- Not a ban on iterative Playwright runs — re-run the same spec as often as you need within a cluster; what's banned is running *different* specs for each fix.
