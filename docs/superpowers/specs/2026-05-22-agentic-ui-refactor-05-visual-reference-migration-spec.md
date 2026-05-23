# Agentic UI Refactor 05 - Visual Reference Migration Implementation Spec

> **For sequential agents:** Start only after Spec 04 is committed. This spec
> makes `docs/ui-references` reliable enough for future high-fidelity UI work.

## Goal

Migrate UI references to component directories, add first-priority baseline
references, and document visual-reference taxonomy without introducing a new
visual direction.

## Depends On

- Spec 04 complete and committed.
- `check-ui-references` is blocking and passing.
- Style-health checks are blocking and passing.
- Current UI states are stable after CSS split and cleanup.

## Produces

- Component-directory visual references under `docs/ui-references/**`.
- Adjacent intent notes for every committed reference image.
- Updated `docs/ui-references/README.md`.
- Updated `.agents/skills/quranatlas-ui-workflow/SKILL.md` if examples or
  taxonomy language diverge.
- Passing `check-ui-references`.

## Non-Goals

- Do not use generated redesign images unless the user starts a separate
  visual-direction task.
- Do not commit Playwright `test-output` artifacts.
- Do not add references for multiple components from one composite screenshot.
- Do not average several references into one implementation target.
- Do not change component styling except for tiny fixes needed to make current
  accepted UI captureable and already covered by prior specs.

## Required Reads

- `DESIGN.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `docs/ui-references/README.md`
- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- owning CSS partials for each captured component
- owning Svelte components for each captured component

## Taxonomy

Use this path shape for new and migrated references:

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

## Intent Note Template

Every reference note must include these headings:

```markdown
# <Component> - <State> - <Viewport>

## Component

## State and viewport

## Accepted visual traits

## Forbidden traits

## Token expectations

## Responsive differences

## Non-goals
```

Keep notes concise and current-state focused. Do not include progress logs,
capture dates, commit SHAs, or rejected-option history.

## First-Priority Reference Targets

Create or migrate these exact pairs unless the component has been removed from
current scope. If a target is not applicable, document the reason in
`docs/ui-references/README.md` and the handoff.

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

## Migration Requirements

### Existing Flat Configure References

For each existing flat configure reference, choose one:

- migrate to component-directory taxonomy;
- keep temporarily as a grandfathered pair documented in README;
- delete both image and note if the reference no longer reflects current UI.

Grandfathering must be rare and have an owner plus removal condition.

### Baseline Captures

Use current accepted UI states. Capture references through the best available
browser-proof workflow and crop to the component when practical. The reference
must show the actual component state, not a blurred, darkened, or decorative
scene.

For Arabic, Quran, Mushaf, or tafsir regions:

- use real app rendering or abstract non-readable neutral blocks only
  when the component itself is not about content rendering;
- never generate readable Quran-like text;
- never use generated Arabic as content or proof.

### README Updates

`docs/ui-references/README.md` must document:

- component reference;
- assembly reference;
- state matrix note;
- proof screenshot;
- allowed path taxonomy;
- allowed viewport and theme labels;
- image/note pairing rule;
- required intent-note fields;
- one-active-reference rule;
- statement that `test-output` artifacts are not source of truth.

## Verification

Run:

```bash
node scripts/check-ui-references.mjs
pnpm run check
pnpm run docs:check
git diff --check
```

If browser captures require an app run, also run the smallest relevant surface
proof and summarize the routes, themes, and viewports captured.

## Acceptance Criteria

- Every committed reference image has a same-basename intent note.
- Every non-allowlisted intent note has a same-basename image.
- Required intent-note fields pass `check-ui-references`.
- First-priority targets exist or have explicit documented non-applicability.
- Existing flat configure references are migrated, grandfathered, or deleted in
  valid pairs.
- README and UI workflow skill agree on taxonomy and active-reference rules.
- Verification commands pass.

## Commit

Suggested message:

```bash
git commit -m "docs(ui): migrate component visual references"
```

## Handoff To Spec 06

Tell the next agent:

- which first-priority references were created;
- which references were grandfathered and why;
- which viewports/themes were captured;
- whether README or UI workflow examples changed;
- that `check-ui-references` passes after migration.
