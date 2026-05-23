# Agentic UI Refactor 02 - CSS Partial Split Implementation Spec

> **For sequential agents:** Start only after Spec 01 is committed. This spec
> is a mechanical split. Keep behavior, selectors, declarations, and visuals
> stable.

## Goal

Replace large surface CSS monoliths with discoverable component-cluster
partials while preserving cascade order and visual behavior.

## Depends On

- Spec 00 complete and committed.
- Spec 01 complete and committed.
- `pnpm run check` passes before edits.
- `scripts/check-style-entry.mjs --report` is available.
- UI-reference pairing is blocking and passing.

## Produces

- Nested CSS files under `src/styles/patterns/**` and
  `src/styles/surfaces/**`.
- Updated `src/styles/index.css` import list.
- A local mechanical split ledger under `.scratch/agentic-ui-refactor/`.
- Passing style-entry, token, layer, stylelint, and no-Svelte-style checks.
- Surface visual behavior preserved.

## Non-Goals

- Do not rename selectors.
- Do not normalize class prefixes.
- Do not delete stale selectors except exact duplicate selector blocks proven
  safe by checks.
- Do not change declaration values.
- Do not introduce visual redesign.
- Do not split Svelte components.

## Required Reads

- `src/styles/index.css`
- `src/styles/surfaces/nav.css`
- `src/styles/surfaces/settings.css`
- `src/styles/surfaces/reader.css`
- `src/styles/surfaces/reader-virtualiser.css`
- `src/styles/surfaces/reading-typography.css`
- `src/styles/surfaces/assets.css`
- `src/styles/surfaces/onboarding.css`
- `src/styles/surfaces/sheet.css`
- `src/styles/surfaces/modal.css`
- `src/styles/surfaces/toast.css`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `DESIGN.md`

## Target CSS Tree

Create target files only when rules actually move into them. Do not add empty
CSS files just to satisfy the tree.

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

If two listed files prove inseparable because selectors share a current
override contract, keep them together under the clearest owner and record the
reason in the handoff.

## Mechanical Split Rules

- Preserve each moved block's selector text exactly.
- Preserve declaration text exactly except for comments that become actively
  misleading after the move.
- Preserve current relative order through `src/styles/index.css`.
- Keep all moved surface rules inside `@layer surfaces`.
- Keep pattern files inside `@layer surfaces` for this refactor.
- Move shared sheet, modal, and toast patterns only after their override
  relationships are mapped.
- Keep `src/styles/index.css` as the only shipped CSS entry.

## Split Ledger

Before moving rules:

```bash
mkdir -p .scratch/agentic-ui-refactor
node scripts/check-style-entry.mjs --report > .scratch/agentic-ui-refactor/02-style-entry-before.txt
```

Maintain a local ledger at:

```text
.scratch/agentic-ui-refactor/02-css-split-ledger.tsv
```

Each row must include:

```text
original_file  original_order  destination_file  selector_or_block_label  declaration_hash
```

The declaration hash can be generated with any stable local command. The point
is reviewability, not a committed artifact. Do not stage `.scratch/**`.

After moving rules:

```bash
node scripts/check-style-entry.mjs --report > .scratch/agentic-ui-refactor/02-style-entry-after.txt
```

Compare before/after reports and explain any import-order differences in the
handoff.

## Required Move Groups

Move blocks by component ownership:

- Read-owned chrome from `nav.css` to:
  - `src/styles/surfaces/read/ambient-dock.css`
  - `src/styles/surfaces/read/ambient-pill.css`
  - `src/styles/surfaces/read/margin-header.css`
  - `src/styles/surfaces/read/surah-progress.css`
- Navigate drawer blocks from `nav.css` to:
  - `src/styles/surfaces/navigate/drawer-shell.css`
  - `src/styles/surfaces/navigate/drawer-read-source.css`
  - `src/styles/surfaces/navigate/drawer-lists.css`
  - `src/styles/surfaces/navigate/drawer-bookmarks.css`
  - `src/styles/surfaces/navigate/drawer-juz.css`
  - `src/styles/surfaces/navigate/drawer-mushaf.css`
  - `src/styles/surfaces/navigate/shortcuts-sheet.css`
- Reader body blocks from `reader.css`, `reader-virtualiser.css`, and
  `reading-typography.css` to read partials.
- Settings shell, Verse Settings, Mushaf Settings, previews, theme/night
  controls, nested asset picker, offline selector, asset management, clear
  data, and about styles from `settings.css`, `assets.css`, and `about.css` to
  configure partials.
- Onboarding shell and step-specific styles from `onboarding.css` to onboard
  partials.
- Current `surahs.css` and `bookmarks.css` to `surfaces/pages/**`.
- `quota-banner.css`, `update-banner.css`, and `night-shift.css` to
  `surfaces/overlays/**`.
- Current shared `sheet.css`, `modal.css`, and `toast.css` to
  `src/styles/patterns/**`.

## Verification

Run after each substantial move group:

```bash
pnpm run check
```

Run at the end:

```bash
pnpm vitest run tests/unit/styles/style-entry.test.js tests/unit/styles/token-usage.test.js tests/unit/styles/at-layer.test.js
pnpm run check
git diff --check
```

Browser-proof a representative accepted current state for changed surfaces:

- read mobile and desktop;
- configure settings mobile and desktop;
- navigate drawer mobile and desktop;
- onboard mobile.

Use the best available browser proof path. Screenshots are review evidence, not
source of truth, unless Spec 05 promotes them into `docs/ui-references`.

## Acceptance Criteria

- `nav.css`, `settings.css`, and `reader.css` are gone or reduced to documented
  transitional stubs with no orphaned rules.
- Every shipping CSS partial is imported exactly once.
- Moved declarations are unchanged except for comments that would otherwise
  mislead.
- Import order changes are deliberate and documented in the handoff.
- No class names or selectors are renamed.
- `pnpm run check` passes.
- Browser proof finds no visible regression in representative states.

## Commit

Suggested message:

```bash
git commit -m "refactor(ui): split surface css partials"
```

## Handoff To Spec 03

Tell the next agent:

- which target files were created;
- which target files were deferred because no rules existed or blocks were
  inseparable;
- where the split ledger lives;
- any selector groups that look ready for ownership cleanup;
- any advisory liveness, token, or literal warnings introduced by the split.
