# Agentic UI Refactor Design

## Summary

Refactor QuranAtlas UI source organization so agents can find, change, prove,
and preserve high-fidelity UI work quickly. The refactor keeps the current
project architecture that works well: Svelte owns markup and behavior,
`src/styles` owns all CSS, semantic `--qa-*` tokens own design decisions, and
surface dossiers own behavior context. The change is a complete UI-structure
program: split large surface CSS files into component-cluster partials, add
supporting checks, expand visual-reference governance, remove stale selectors,
and document a standard agentic UI workflow.

The implementation must land as one coordinated refactor branch, not as a
series of partial conventions. Inside that branch, work must still be ordered
so the safety checks exist before risky cleanup and class normalization.

## Goals

- Make style ownership mirror component ownership.
- Preserve the no-Svelte-style rule and centralized CSS import model.
- Reduce agent search time by replacing large surface CSS monoliths with
  discoverable component-cluster partials.
- Add checks that prove CSS partials are imported, visual references are
  paired, selectors are live or explicitly allowed, and raw design literals are
  intentional.
- Make `docs/ui-references` reliable enough for high-fidelity component work.
- Update generated/context docs so future agents see source, test, and style
  ownership together.
- Keep current visual behavior stable during mechanical splits, then clean and
  normalize only with reference-backed proof.

## Non-Goals

- Do not introduce Svelte `<style>` blocks, CSS Modules, CSS-in-JS, Tailwind,
  or lazy route CSS.
- Do not make broad product redesign decisions inside the structural refactor.
- Do not average multiple visual references into one implementation target.
- Do not make `test-output` screenshots, generated Arabic text, or Playwright
  artifacts visual source of truth.
- Do not rename classes during the mechanical split step.

## Current Findings

The repo already has strong UI foundations:

- `index.html` is minimal and loads the app plus `src/styles/index.css`.
- UI markup and behavior live mostly in Svelte components under `src/<surface>`.
- CSS is centralized in `src/styles`, layered through `src/styles/index.css`,
  and protected by stylelint plus custom checks.
- Surface dossiers and generated docs give agents a strong behavior map.
- `quranatlas-ui-workflow` already requires one active component, one active
  visual reference, and responsive proof for visual work.

The friction is concentrated in discoverability and liveness:

- `src/styles/surfaces/nav.css`, `settings.css`, and `reader.css` contain many
  unrelated component clusters.
- Read-owned chrome such as `MarginHeader`, `AmbientDock`, `AmbientPill`, and
  `SurahProgress` is styled inside `nav.css`, which looks navigate-owned.
- Settings CSS mixes active shell styles, picker styles, storage/offline
  styles, old sheet rules, and likely stale selectors.
- CSS import order is load-bearing, so splitting files without an import-order
  contract risks regressions.
- Current token checks validate unresolved `var(--qa-*)` references, but do
  not fully enforce the documented token-only design discipline.
- Current static checks and stylelint overrides assume mostly flat
  `src/styles/surfaces/*.css` paths; nested surface folders and
  `src/styles/patterns/**` require those globs and scanners to be updated in
  the same branch.
- `docs/ui-references` is configure-heavy, mixes assembly and component
  references, and currently has fragile image/note pairing in the working tree.
- Generated surface inventories do not include CSS paths, so agents do not see
  style ownership beside source and test ownership.
- Several comments still describe stale paths, old redesign versions, or
  missing historical specs. Those comments are an agent reliability risk even
  when the runtime behavior is correct.

## Target CSS Architecture

Keep one global entry point:

```text
src/styles/index.css
```

Keep base design-system sources:

```text
src/styles/
  reset.css
  base.css
  animations.css
  utilities.css
  tokens/
    primitives.css
    motion.css
    semantic.css
```

Add explicit structure for shared patterns and component-cluster surfaces:

```text
src/styles/
  patterns/
    sheet.css
    modal.css
    toast.css
    form-controls.css
  surfaces/
    app-shell.css
    read/
      ambient-dock.css
      ambient-pill.css
      margin-header.css
      surah-progress.css
      surah-header.css
      verse.css
      tafsir.css
      continuity.css
      mushaf.css
      states.css
      typography.css
      virtualiser.css
      wird.css
    navigate/
      drawer-shell.css
      drawer-read-source.css
      drawer-lists.css
      drawer-bookmarks.css
      drawer-juz.css
      drawer-mushaf.css
      shortcuts-sheet.css
    configure/
      settings-shell.css
      verse-settings.css
      mushaf-settings.css
      settings-preview.css
      theme-night-controls.css
      nested-asset-picker.css
      offline-selector.css
      asset-management.css
      clear-data.css
      about.css
    onboard/
      shell.css
      welcome.css
      theme-step.css
      riwayah-step.css
      translation-step.css
      shortcuts-step.css
      start-step.css
    pages/
      surahs.css
      bookmarks.css
    overlays/
      quota-banner.css
      update-banner.css
      save-failure-toast.css
      night-shift.css
```

The target file list is the refactor default. If implementation proves two
listed files share inseparable selectors, the merged file must still have one
clear owner and the reason must be documented in the owning surface dossier or
workflow doc.

`src/styles/index.css` remains the only CSS entry imported by HTML. The entry
file owns import order. During the split, moved rules must stay in their
current relative order until browser proof shows a safe cleanup.

Every CSS-aware project tool must understand this nested structure before any
partial split lands. Required updates include stylelint overrides,
`check-token-usage`, `check-at-layer`, the new style-entry check, docs
derivers, and any tests that assume `src/styles/surfaces/*.css` is exhaustive.

## Component And Style Ownership Rules

- If a Svelte component is owned by `src/read`, its component-cluster CSS lives
  under the read surface styles directory.
- If a visual block is a shared primitive such as sheet, modal, toast, or form
  control styling, it lives under the planned shared pattern styles directory.
- Route/page CSS that is not owned by a reusable surface component lives under
  the planned page styles directory or the owning surface folder when one
  exists.
- Cross-surface consumers can use a component, but ownership stays with the
  component's source surface. Example: `NavDrawer.svelte` may place Daily Wird,
  but `.qa-wird-*` presentation belongs with `src/read/wird`.
- File comments must describe current ownership and invariants only. Remove
  stale paths, progress notes, revision dates, and old redesign labels unless
  they are load-bearing data.

## Required Implementation File Map

Use this file map when turning the spec into executable tasks. If implementation
chooses different names, update this section and the affected docs in the same
commit.

Check infrastructure:

- Create scripts/check-style-entry.mjs for import coverage and ordered import
  reporting.
- Create scripts/check-ui-references.mjs for image/note pairing and intent
  note field validation.
- Create scripts/check-selector-liveness.mjs for advisory/blocking class
  liveness.
- Create scripts/check-primitive-token-consumption.mjs for primitive-token
  leak detection outside token files.
- Create scripts/check-design-literals.mjs for hardcoded color, motion, and
  radius review.
- Modify `scripts/check-token-usage.mjs` and `scripts/check-at-layer.mjs` so
  nested surfaces and pattern CSS are covered.
- Modify `.stylelintrc.json` so overrides apply to nested `surfaces/**` and
  `patterns/**` files after the split.
- Modify `package.json` and `docs/tech-stack.md` when checks become package
  scripts or part of `pnpm run check`.

Check coverage:

- Add or extend tests/unit/styles/style-entry.test.js.
- Add or extend tests/unit/styles/ui-references.test.js.
- Add or extend tests/unit/styles/selector-liveness.test.js.
- Add or extend tests/unit/styles/primitive-token-consumption.test.js.
- Add or extend tests/unit/styles/design-literals.test.js.

Docs and workflow:

- Create or update `DESIGN.md` as the product style guide for UI redesign,
  refactor, iteration, visual review, component-reference work, and image
  generation.
- Modify `scripts/docs/derive-inventory.mjs` or add a focused docs deriver so
  surface dossiers expose style ownership.
- Create or generate docs/context/style-map.md.
- Modify `docs/context/architecture.md`,
  `docs/context/repo-structure.md`, `docs/tech-stack.md`, and
  `docs/ui-references/README.md`.
- Modify `.agents/skills/quranatlas-ui-workflow/SKILL.md` when reference
  taxonomy or active-reference rules change.
- Add docs/ui-refactor-workflow.md for the standard agentic UI refactor
  procedure.

Baseline reports:

- Store disposable baseline reports under `.scratch/agentic-ui-refactor/`.
  They are review aids, not committed source of truth, unless a later task
  intentionally promotes one into docs.

## Required Supporting Checks

### Style Entry Check

Add a style-entry check script under `scripts`.

Responsibilities:

- Walk `src/styles/patterns/**`, `src/styles/surfaces/**`, top-level
  layer files, and token files imported by `src/styles/index.css`.
- Verify every CSS partial that ships is imported exactly once by
  `src/styles/index.css`.
- Verify every `@import` in `src/styles/index.css` resolves to an existing
  file.
- Reject duplicate imports, missing imports, and stale imports.
- Allow explicit non-entry files only through an in-script allowlist with a
  reason and owner.
- Produce a stable ordered import report that later mechanical-split tasks can
  compare when preserving source order.

Add it to `pnpm run check`.

### UI Reference Pairing Check

Add a UI-reference pairing check script under `scripts`.

Responsibilities:

- Walk `docs/ui-references`.
- Ignore `docs/ui-references/README.md` and allowed non-reference metadata
  files such as `state-matrix.md`.
- Require every `.png` reference to have a same-basename `.md` intent note.
- Require every intent note to have a same-basename `.png` reference, unless it
  is explicitly marked as a matrix or index note in an allowlist.
- Reject stray system files such as `.DS_Store`.
- Require intent notes to include the fields:
  `Component`, `State and viewport`, `Accepted visual traits`,
  `Forbidden traits`, `Token expectations`, `Responsive differences`, and
  `Non-goals`.

Add it to `pnpm run check` after the current reference tree is repaired.

### Selector Liveness Check

Add an advisory selector check first, then make it blocking before the refactor
branch is complete.

Responsibilities:

- Extract `qa-*` class definitions from CSS.
- Extract class uses from `.svelte`, `.ts`, and `.js`, including static
  `class="..."`, Svelte `class:qa-*` directives, string interpolation used for
  BEM-style modifiers, `classList.add/remove/toggle`, `closest()`,
  `querySelector()`, and DOM `className` assignment.
- Ignore CSS custom properties, cache names, route identifiers, element IDs,
  and storage keys that happen to begin with `qa-`.
- Support a typed allowlist file or in-script table with owner, pattern,
  reason, expiry condition, and category (`dynamic-class`, `imperative-dom`,
  `external-artifact`, `id-or-storage-key`, or `legacy-quarantine`).
- Report CSS-defined classes with no code reference.
- Report code-referenced classes with no CSS definition when the class is meant
  to be styled.
- Report uncertain matches separately from proven liveness failures while the
  check is advisory.
- Treat semantic tokens and custom properties as non-class values, including
  `--qa-*` declarations, `var(--qa-*)` references, and inline style custom
  properties.

Initial allowlist examples:

- Theme/generated modifiers such as `qa-onb-sw--light`, `qa-onb-sw--sepia`,
  `qa-onb-sw--dark`, and `qa-onb-sw--auto`.
- Placement modifiers such as `qa-mushaf-controls--below-page`.
- Runtime-created safety or sync classes until those DOM paths move to Svelte
  or documented CSS ownership.
- Cache names and route identifiers that happen to begin with `qa-`.

The completed refactor must leave no unreviewed selector-liveness warnings.

### Primitive Token Consumption Check

Add a token-discipline check for CSS outside token files.

Responsibilities:

- Flag primitive token consumption such as `var(--c-*)`, `var(--s-*)`,
  `var(--r-*)`, `var(--ff-*)`, `var(--fs-*)`, `var(--lh-*)`, `var(--dur-*)`,
  and `var(--ease-*)` outside `src/styles/tokens/**`.
- Allow consumption of semantic `--qa-*` tokens and file-local scoped
  `--qa-*` custom properties.
- Treat legacy compatibility aliases as temporary allowlisted debt with owner
  and removal condition.
- Add focused unit coverage so primitive-token leaks fail before visual work
  depends on them.

The check can start advisory if the baseline contains intentional compatibility
aliases, but the completed refactor must either move them into semantic
`--qa-*` roles or justify them with explicit allowlist entries.

### Hardcoded Design Value Check

Add a targeted design-literal check for surface CSS.

Responsibilities:

- Flag hardcoded hex colors in surface and pattern CSS unless the line has an
  explicit allowlist comment or the file is an approved token file.
- Flag hardcoded hex colors inside `color-mix()`, gradients, SVG masks, and
  browser-control styling unless locally justified.
- Flag raw motion literals such as `120ms ease` outside token files unless
  explicitly allowed.
- Flag raw radius literals when a semantic radius token applies.
- Allow intentional theme swatches, generated preview palettes, SVG/browser
  quirks, and one-off geometry only with local comments.

The goal is not to ban every pixel value. Spacing and sizing may stay literal
where layout requires it. The check targets design decisions that the
architecture requires to be tokenized.

### Docs Ownership Updates

Extend docs generation so surface dossiers include style ownership.

Required output:

- Root `DESIGN.md` captures product style guidance and is referenced by the UI
  workflow skill.
- Each active surface dossier gains a generated or maintained `style_paths`
  inventory.
- The style inventory points to component-cluster CSS files after the split.
- Add a generated or maintained docs/context/style-map.md that maps component
  ownership to Svelte source, CSS partial, reference assets, and relevant test
  files when those relationships are known.
- `docs/context/repo-structure.md` and `docs/context/architecture.md` describe
  `src/styles/surfaces/**`, not only `src/styles/surfaces/*.css`.
- `docs/tech-stack.md` documents any new check scripts added to `pnpm run
  check`.
- The repo-local `.agents/skills/quranatlas-ui-workflow/SKILL.md` must be
  updated when the visual-reference taxonomy changes so future agents receive
  the same source of truth as the docs.

## Visual Reference Taxonomy

Use component directories for new and migrated visual references:

```text
docs/ui-references/<surface>/<component>/<state>.<viewport>[.<theme>].png
docs/ui-references/<surface>/<component>/<state>.<viewport>[.<theme>].md
```

Allowed viewport labels:

- `mobile`
- `mobile-320`
- `tablet-portrait`
- `tablet-landscape`
- `desktop`

Allowed theme labels:

- `light`
- `sepia`
- `dark`
- `night`

Theme labels are required only when hierarchy, material feel, or contrast
meaningfully differs by theme. Otherwise the intent note must state theme
expectations.

Reference types:

- Component reference: authoritative for one component, state, viewport, and
  optional theme.
- Assembly reference: useful for composition relationships, but not valid as
  the single active reference for implementing multiple components at once.
- State matrix note: text-only matrix for enumerating variants when each row
  does not need its own image.
- Proof screenshot: temporary browser evidence that must not be committed under
  `docs/ui-references` unless it is promoted to selected design intent.

During this structural refactor, first-priority references are current-state
baseline captures unless a separate task explicitly asks for a new visual
direction. Generated redesign references belong to later creative UI work, not
to the mechanical CSS split. A baseline capture may be promoted to a component
reference only when the adjacent intent note states the accepted current traits
and forbidden drift.

First required reference targets:

```text
docs/ui-references/read/verse-row/default.mobile.light.{png,md}
docs/ui-references/read/verse-row/tafsir-open.mobile.light.{png,md}
docs/ui-references/read/mushaf-page/ready.mobile.light.{png,md}
docs/ui-references/read/mushaf-page/ready.tablet-portrait.light.{png,md}
docs/ui-references/read/margin-header/verse.mobile.light.{png,md}
docs/ui-references/read/margin-header/mushaf.mobile.light.{png,md}
docs/ui-references/navigate/nav-drawer-header/read.mobile.light.{png,md}
docs/ui-references/configure/settings-shell/verse.mobile.light.{png,md}
docs/ui-references/configure/settings-shell/mushaf.mobile.light.{png,md}
docs/ui-references/configure/theme-night-controls/default.mobile.light.{png,md}
docs/ui-references/onboard/riwayah-selector/default.mobile.light.{png,md}
docs/ui-references/onboard/riwayah-selector/unavailable.mobile.light.{png,md}
```

Existing flat configure references may be migrated into this structure as part
of the refactor. Until migrated, they must still satisfy image/note pairing.

## Complete Refactor Workstreams

The implementation must be planned as one complete refactor branch with these
workstreams. Workstreams may be delegated to parallel agents only when their
write sets are disjoint.

### Phase 0: Baseline And Drift Cleanup

Complete this phase before adding new blocking checks to `pnpm run check`.

- Run `git status --short` and identify unrelated dirty files before touching
  the refactor branch.
- Repair `docs/ui-references` pairing, remove stray system files, and decide
  whether each existing flat configure reference is preserved, migrated, or
  intentionally deleted.
- Capture baseline reports for current CSS imports, selector liveness,
  primitive-token consumption, hardcoded design values, and visual-reference
  pairing.
- Clean stale comments that misroute future agents, including missing spec
  links, old component paths, redesign-version labels, and progress-note
  comments.
- Update stylelint overrides and existing check-script globs so flat and nested
  CSS paths are both covered before any split lands.
- Do not make visual redesign changes in this phase.

### Workstream 1: Check Infrastructure

- Add style-entry, UI-reference pairing, selector-liveness, and hardcoded-design
  value checks.
- Add the primitive-token consumption check.
- Add `check-style-entry` and `check-ui-references` to `pnpm run check` as
  blocking checks.
- Add selector-liveness, primitive-token consumption, and hardcoded-design-value
  checks as advisory commands that exit successfully while printing warnings
  during baseline cleanup.
- Convert advisory checks to blocking checks before the refactor branch is
  complete.
- Update `.stylelintrc.json` overrides for `src/styles/patterns/**` and nested
  `src/styles/surfaces/**` paths before moving CSS into those directories.
- Update `docs/tech-stack.md` for new check scripts.
- Add or update unit coverage for check scripts where existing script tests
  make that practical.

### Workstream 2: CSS Partial Split

- Split `nav.css`, `settings.css`, and `reader.css` into component-cluster
  partials while preserving selector names and declaration values.
- Preserve relative import order through `src/styles/index.css`.
- Maintain a mechanical split ledger that records each moved selector block,
  original file, original order, destination file, and declaration hash.
- Compare the pre-split and post-split selector/declaration report before any
  cleanup so agents can prove the split did not change CSS content.
- Keep moved rules inside the existing `@layer surfaces`; do not introduce a
  new cascade layer in this refactor.
- Move shared sheet/modal/toast patterns only after their current override
  relationships are mapped.
- Keep comments only when they describe current invariants. Do not mix stale
  comment cleanup or wording polish into the same commit as a mechanical block
  move unless the moved block comment would become actively misleading.
- Do not delete or rename selectors in this workstream except for exact
  duplicate selectors proven by checks.

### Workstream 3: Ownership And Component Normalization

- Align CSS file names with component ownership.
- Move read-owned chrome styles out of navigate-owned CSS.
- Move Daily Wird presentation styles under read ownership.
- Normalize Verse Settings and Mushaf Settings row dialects so shared controls
  use one grammar.
- Split large Svelte files only where it improves searchable ownership without
  changing behavior. Candidate: split `Onboarding.svelte` screen bodies into
  screen components after the CSS split is stable.
- Keep bridge modules, `App.svelte`, route mounting, and state ownership intact.

### Workstream 4: Stale CSS And Class Cleanup

- Use selector-liveness output to identify dead selectors.
- Remove verified-dead removed-scope or legacy selectors.
- Quarantine retained removed-scope selectors in clearly named files only when
  cleanup is not safe in the same branch.
- Normalize class prefixes one component at a time after moved CSS has stable
  ownership.
- For every class rename, update component code, CSS, tests, and docs in the
  same change.

### Workstream 5: Visual Reference Migration

- Repair current configure reference pairing.
- Migrate existing flat configure references into component directories before
  the refactor branch is complete.
- Add first-priority references for read, navigate, configure, and onboard.
- Prefer current accepted UI captures for structural-refactor references.
  Generated images are reserved for explicit future visual-direction work.
- Update `docs/ui-references/README.md` to document taxonomy, reference types,
  naming labels, and agent guardrails.
- Update `.agents/skills/quranatlas-ui-workflow/SKILL.md` so it requires
  `DESIGN.md` for UI redesign, refactor, iteration, visual review,
  component-reference work, and image generation, and so its reference path
  examples and source-of-truth language match the new component-directory
  taxonomy.
- Ensure `check-ui-references` passes before relying on references in subsequent
  implementation work.

### Workstream 6: Docs And Agent Workflow

- Extend surface dossiers with style path ownership.
- Update `docs/context/architecture.md`, `docs/context/repo-structure.md`, and
  `docs/tech-stack.md`.
- Add or update docs/context/style-map.md so future agents can discover
  component, style, reference, and test ownership from one place.
- Add a UI refactor workflow document under `docs` with the standard agentic
  workflow:
  preflight, pick one surface/component/reference, edit, run checks, browser
  proof, docs update, and final summary.
- Update repo-local workflow skills when their UI-reference or style-path
  instructions diverge from the new docs.
- Regenerate generated docs through the project docs tooling.

## Agentic UI Workflow

Future agents making UI changes must follow this workflow:

1. Run `git status --short`.
2. Read `AGENTS.md`, `DESIGN.md`, `docs/context/repo-structure.md`,
   `docs/context/architecture.md`, the owning surface dossier, and the relevant
   style partials. When present, read docs/context/style-map.md first to find
   the owning style partial and reference path.
3. Name exactly one surface, one component, one visual concern, one state
   matrix, and one active visual reference source. For structural refactor work
   that preserves UI behavior, use a current accepted UI state or baseline
   capture rather than a generated redesign reference.
4. Edit the Svelte component and its owning style partial together.
5. Keep CSS in `src/styles`, preserve cascade layers, and use semantic tokens
   for design decisions.
6. Run the smallest relevant unit proof.
7. Run `pnpm run check`.
8. Browser-proof changed states at mobile, tablet, and desktop, adding awkward
   viewports when the component can fail there.
9. Regenerate docs when ownership, imports, tests, or surface contracts change.
10. Summarize commands, states, viewports, references, and whether durable e2e
    coverage was added or skipped.

## Verification Requirements

For the completed refactor branch:

- `pnpm run check`
- `pnpm run test`
- `pnpm run build`
- `pnpm run docs`
- `pnpm run docs:check`
- `git diff --check`

Run `pnpm run validate` before integration if the branch changes shared UI
structure, package scripts, docs generation, or release-sensitive assets.

Before the first blocking-check commit, save baseline reports for style entry,
selector liveness, primitive-token consumption, hardcoded design values, and UI
reference pairing. Before completing the branch, rerun those reports and confirm
there are no unreviewed warnings.

Browser proof must include:

- Mobile `<768`.
- Real tablet `768x1024`.
- Desktop `>=1180`.
- `320x568` for settings, drawer, onboarding, and any dense reader chrome.
- Light, sepia, dark, and Night overlay checks for changed visual systems.

Durable e2e coverage is added only where unit tests cannot prove the
behavior, such as real layout overflow, focus trap traversal, restored focus,
gesture timing, service-worker/cache behavior, or reload persistence.

## Completion Criteria

The refactor is complete when:

- Large CSS monoliths are replaced by discoverable component-cluster partials.
- `src/styles/index.css` imports every shipping CSS partial exactly once.
- CSS-aware scripts and `.stylelintrc.json` cover both nested surface files and
  shared pattern files.
- `DESIGN.md` exists as the product style guide and the UI workflow skill
  requires it for UI redesign, refactor, iteration, visual review,
  component-reference work, and image generation.
- Surface dossiers or generated docs expose style ownership.
- docs/context/style-map.md or equivalent generated ownership output maps
  components to style partials and reference assets.
- UI references use the new taxonomy or are explicitly grandfathered with
  passing image/note pairs.
- Selector-liveness warnings are either fixed or intentionally allowlisted.
- Primitive-token consumption outside token files is removed or intentionally
  allowlisted with owner and removal condition.
- Hardcoded design-value warnings are fixed or locally justified.
- No Svelte file contains a `<style>` block.
- `pnpm run check` and docs checks pass.
- Browser proof covers the affected mobile, tablet, and desktop states.

## Risks

- Cascade order drift is the highest regression risk. The split must preserve
  source order before cleanup and must use the mechanical split ledger to make
  that preservation reviewable.
- Tooling drift is a high regression risk. Any stylelint override or custom
  check that still assumes flat `src/styles/surfaces/*.css` can create false
  confidence after files move into nested directories.
- Selector-liveness checks can produce false positives from dynamic classes,
  custom properties, cache names, and runtime DOM builders. Start advisory and
  promote to blocking only after allowlists are explicit.
- Token-discipline checks can expose existing primitive alias leaks. Treat those
  as baseline debt to migrate or justify, not as permission to weaken the
  semantic-token rule.
- Visual-reference checks will fail on the current tree until reference pairing
  is repaired.
- A complete refactor branch can become hard to review. Keep commits grouped
  by workstream and avoid mixing mechanical moves with visual changes.
- Component extraction after CSS splitting can reveal hidden behavior coupling.
  Extract only when tests and browser proof cover the behavior.

## Locked Implementation Decisions

- Pattern files live under the planned shared pattern styles directory, but all
  moved pattern rules stay inside the existing `@layer surfaces`.
- Phase 0 baseline cleanup must complete before new check scripts are made
  blocking in `pnpm run check`.
- `check-style-entry` and `check-ui-references` are blocking checks as soon as
  their baselines are repaired.
- Selector-liveness, primitive-token consumption, and hardcoded-design-value
  checks start advisory and become blocking before the refactor branch is
  complete.
- Mechanical CSS splits require an auditable selector/declaration ledger before
  cleanup, class normalization, or visual polish begins.
- Structural refactor references are current-state baselines unless a separate
  visual-direction task explicitly requests generated references.
- Existing configure references must end the branch in the component-directory
  taxonomy with passing image/note pairs.
