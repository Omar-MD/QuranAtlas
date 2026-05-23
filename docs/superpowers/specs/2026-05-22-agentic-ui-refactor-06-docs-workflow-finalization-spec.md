# Agentic UI Refactor 06 - Docs Workflow Finalization Implementation Spec

> **For sequential agents:** Start only after Spec 05 is committed. This is the
> final integration spec for generated docs, workflow docs, and full validation.

## Goal

Make the new UI structure discoverable to future agents through generated
context docs, style ownership maps, workflow docs, and final validation.

## Depends On

- Specs 00 through 05 complete and committed in order.
- Nested CSS partials are stable.
- Style-health checks are blocking and passing.
- Visual references use the new taxonomy or documented grandfathering.

## Produces

- Surface dossiers expose style ownership.
- `docs/context/style-map.md` maps component, source, style, reference, and
  test ownership where known.
- `docs/context/architecture.md` and `docs/context/repo-structure.md` describe
  nested style structure.
- `docs/tech-stack.md` matches final package scripts and CI/static checks.
- `docs/ui-refactor-workflow.md` documents the standard agentic UI workflow.
- Repo-local skills match the new docs.
- Full validation passes.

## Non-Goals

- Do not change UI behavior.
- Do not move CSS blocks.
- Do not add new visual references except to repair a broken final docs link.
- Do not hand-edit auto-generated fenced blocks.

## Required Reads

- `scripts/docs/derive.mjs`
- `scripts/docs/derive-inventory.mjs`
- `scripts/docs/lib/scan.mjs`
- `scripts/docs/lib/blocks.mjs`
- `docs/context/surfaces/*.md`
- `docs/context/architecture.md`
- `docs/context/repo-structure.md`
- `docs/tech-stack.md`
- `docs/ui-references/README.md`
- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`
- `package.json`

## Work Requirements

### 1. Surface Style Ownership

Extend surface dossiers with style ownership.

Preferred shape:

- add `style_paths` frontmatter to active surface dossiers;
- extend `scripts/docs/derive-inventory.mjs` or add a focused docs deriver to
  emit a generated style inventory block;
- run `pnpm run docs` so generated fences are updated by tooling.

Active dossiers that need style ownership:

- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md`
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/onboard.md`
- `docs/context/surfaces/infra.md`

Removed-scope dossiers (`mark`, `review`, `listen`) need style ownership only
if retained CSS or tests still reference them.

Do not hand-edit existing `<!-- AUTO-GENERATED:* START -->` fenced content.

### 2. Style Map

Create or generate:

```text
docs/context/style-map.md
```

It must map known relationships:

```text
surface -> component/source -> CSS partial -> visual reference -> unit tests -> e2e tests
```

It must include at least:

- AmbientDock
- AmbientPill
- MarginHeader
- SurahProgress
- Verse row
- Mushaf page
- Nav drawer shell/header
- SettingsShell
- VerseSettings
- MushafSettings
- ThemeNightControls
- NestedAssetPicker
- AssetManagement
- Onboarding riwayah selector
- Quota/update/night overlays when they have retained styles

Unknown relationships should be omitted or marked as not applicable with a
reason. Do not add vague empty rows.

### 3. Architecture And Repo Structure Docs

Update:

- `docs/context/architecture.md`
- `docs/context/repo-structure.md`

Required statements:

- `src/styles/index.css` is the single global style entry.
- `src/styles/tokens/**` owns primitive and semantic tokens.
- `src/styles/patterns/**` owns shared sheet, modal, toast, form-control, and
  equivalent reusable pattern styles.
- `src/styles/surfaces/**` owns component-cluster and surface styles.
- `@layer surfaces` remains the layer for moved pattern and surface rules in
  this refactor.
- Surface dossiers and `docs/context/style-map.md` are the discovery path for
  style ownership.

### 4. Tech Stack And Package Script Docs

Ensure `docs/tech-stack.md` exactly matches final `package.json` scripts.

It must describe these static checks:

- `check-theme-parity.mjs`
- `check-token-usage.mjs`
- `check-at-layer.mjs`
- `check-style-entry.mjs`
- `check-ui-references.mjs`
- `check-selector-liveness.mjs`
- `check-primitive-token-consumption.mjs`
- `check-design-literals.mjs`
- `check-no-svelte-style.mjs`

It must state which checks run in `pnpm run check` and that the style-health
checks are blocking after Spec 04.

### 5. UI Refactor Workflow Doc

Add:

```text
docs/ui-refactor-workflow.md
```

Required sections:

- preflight reads and `git status --short`;
- find style owner through `docs/context/style-map.md` and the surface dossier;
- name one surface, one component, one visual concern, one state matrix, and
  one active reference;
- edit Svelte source and owning CSS partial together;
- keep CSS in `src/styles`, preserve cascade layers, and use semantic tokens;
- run targeted unit proof;
- run `pnpm run check`;
- browser-proof mobile, tablet, and desktop when visual behavior can differ;
- regenerate docs when ownership, imports, tests, or surface contracts change;
- final summary requirements: commands, states, viewports, references, and
  durable e2e decision.

### 6. Skill Alignment

Update repo-local skills only where they diverge from the new docs:

- `.agents/skills/quranatlas-workflow/SKILL.md`
- `.agents/skills/quranatlas-ui-workflow/SKILL.md`

Keep skills concise and point to canonical docs rather than duplicating long
tables. The UI workflow skill must still require `DESIGN.md` and one active
reference source.

## Verification

Run:

```bash
pnpm run docs
pnpm run docs:check
pnpm run check
pnpm run test
pnpm run build
git diff --check
```

Then run final integration:

```bash
pnpm run validate
```

If `pnpm run validate` repeats earlier commands, still run it as the final
integration gate because this spec changes shared UI structure, package
scripts, docs generation, and release-sensitive build inputs.

## Acceptance Criteria

- Generated docs are updated by tooling, not hand-edited inside generated
  fences.
- Surface style ownership is discoverable from dossiers or generated output.
- `docs/context/style-map.md` gives future agents a direct component-to-style
  map.
- Architecture, repo structure, tech stack, UI reference docs, workflow docs,
  and repo-local skills agree.
- All final verification commands pass.
- `git status --short` is clean after commit.

## Commit

Suggested message:

```bash
git commit -m "docs(ui): finalize agentic refactor workflow"
```

## Final Handoff

Summarize:

- commits created across Specs 00 through 06;
- final verification output;
- any intentionally retained allowlists or grandfathered references;
- any deferred non-goals that require a separate future spec.
