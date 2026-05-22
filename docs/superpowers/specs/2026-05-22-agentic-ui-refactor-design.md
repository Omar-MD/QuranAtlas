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
- `docs/ui-references` is configure-heavy, mixes assembly and component
  references, and currently has fragile image/note pairing in the working tree.
- Generated surface inventories do not include CSS paths, so agents do not see
  style ownership beside source and test ownership.

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

## Required Supporting Checks

### Style Entry Check

Add a style-entry check script under `scripts`.

Responsibilities:

- Walk planned pattern styles, surface styles, and top-level CSS files imported
  by `src/styles/index.css`.
- Verify every CSS partial that ships is imported exactly once by
  `src/styles/index.css`.
- Verify every `@import` in `src/styles/index.css` resolves to an existing
  file.
- Reject duplicate imports, missing imports, and stale imports.
- Allow explicit non-entry files only through an in-script allowlist with a
  reason.

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
- Extract static `qa-*` class uses from `.svelte`, `.ts`, and `.js`.
- Support an allowlist for known dynamic classes and non-class custom property
  false positives.
- Report CSS-defined classes with no code reference.
- Report code-referenced classes with no CSS definition when the class is meant
  to be styled.
- Treat semantic tokens and custom properties as non-class values.

Initial allowlist examples:

- Theme/generated modifiers such as `qa-onb-sw--light`, `qa-onb-sw--sepia`,
  `qa-onb-sw--dark`, and `qa-onb-sw--auto`.
- Placement modifiers such as `qa-mushaf-controls--below-page`.
- Runtime-created safety or sync classes until those DOM paths move to Svelte
  or documented CSS ownership.
- Cache names and route identifiers that happen to begin with `qa-`.

The completed refactor must leave no unreviewed selector-liveness warnings.

### Hardcoded Design Value Check

Add a targeted design-literal check for surface CSS.

Responsibilities:

- Flag hardcoded hex colors in surface and pattern CSS unless the line has an
  explicit allowlist comment or the file is an approved token file.
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

- Each active surface dossier gains a generated or maintained `style_paths`
  inventory.
- The style inventory points to component-cluster CSS files after the split.
- `docs/context/repo-structure.md` and `docs/context/architecture.md` describe
  `src/styles/surfaces/**`, not only `src/styles/surfaces/*.css`.
- `docs/tech-stack.md` documents any new check scripts added to `pnpm run
  check`.

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

### Workstream 1: Check Infrastructure

- Add style-entry, UI-reference pairing, selector-liveness, and hardcoded-design
  value checks.
- Add `check-style-entry` and `check-ui-references` to `pnpm run check` as
  blocking checks.
- Add selector-liveness and hardcoded-design-value checks as advisory commands
  that exit successfully while printing warnings during baseline cleanup.
- Convert advisory checks to blocking checks before the refactor branch is
  complete.
- Update `docs/tech-stack.md` for new check scripts.
- Add or update unit coverage for check scripts where existing script tests
  make that practical.

### Workstream 2: CSS Partial Split

- Split `nav.css`, `settings.css`, and `reader.css` into component-cluster
  partials while preserving selector names and declaration values.
- Preserve relative import order through `src/styles/index.css`.
- Keep moved rules inside the existing `@layer surfaces`; do not introduce a
  new cascade layer in this refactor.
- Move shared sheet/modal/toast patterns only after their current override
  relationships are mapped.
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
- Update `docs/ui-references/README.md` to document taxonomy, reference types,
  naming labels, and agent guardrails.
- Ensure `check-ui-references` passes before relying on references in subsequent
  implementation work.

### Workstream 6: Docs And Agent Workflow

- Extend surface dossiers with style path ownership.
- Update `docs/context/architecture.md`, `docs/context/repo-structure.md`, and
  `docs/tech-stack.md`.
- Add a UI refactor workflow document under `docs` with the standard agentic
  workflow:
  preflight, pick one surface/component/reference, edit, run checks, browser
  proof, docs update, and final summary.
- Regenerate generated docs through the project docs tooling.

## Agentic UI Workflow

Future agents making UI changes must follow this workflow:

1. Run `git status --short`.
2. Read `AGENTS.md`, `docs/context/repo-structure.md`,
   `docs/context/architecture.md`, the owning surface dossier, and the relevant
   style partials.
3. Name exactly one surface, one component, one visual concern, one state
   matrix, and one active visual reference source.
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
- Surface dossiers or generated docs expose style ownership.
- UI references use the new taxonomy or are explicitly grandfathered with
  passing image/note pairs.
- Selector-liveness warnings are either fixed or intentionally allowlisted.
- Hardcoded design-value warnings are fixed or locally justified.
- No Svelte file contains a `<style>` block.
- `pnpm run check` and docs checks pass.
- Browser proof covers the affected mobile, tablet, and desktop states.

## Risks

- Cascade order drift is the highest regression risk. The split must preserve
  source order before cleanup.
- Selector-liveness checks can produce false positives from dynamic classes,
  custom properties, cache names, and runtime DOM builders. Start advisory and
  promote to blocking only after allowlists are explicit.
- Visual-reference checks will fail on the current tree until reference pairing
  is repaired.
- A complete refactor branch can become hard to review. Keep commits grouped
  by workstream and avoid mixing mechanical moves with visual changes.
- Component extraction after CSS splitting can reveal hidden behavior coupling.
  Extract only when tests and browser proof cover the behavior.

## Locked Implementation Decisions

- Pattern files live under the planned shared pattern styles directory, but all
  moved pattern rules stay inside the existing `@layer surfaces`.
- `check-style-entry` and `check-ui-references` are blocking checks as soon as
  their baselines are repaired.
- Selector-liveness and hardcoded-design-value checks start advisory and become
  blocking before the refactor branch is complete.
- Existing configure references must end the branch in the component-directory
  taxonomy with passing image/note pairs.
