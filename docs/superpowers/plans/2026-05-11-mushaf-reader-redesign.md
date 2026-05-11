# Mushaf Reader Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Mushaf mode into a full-viewport, theme-aware Quran page reader that preserves same-origin quran.ws-derived SVG vector fidelity, uses physical right-to-left Mushaf navigation, and prevents broken Hafs/Warsh switching through explicit optional package state.

**Architecture:** Keep Mushaf as a read-surface sibling to Verse mode on `#/m/:page`. Runtime routing remains page-only and the active riwayah remains `settings.riwayah`. Phase 1 replaces the current `<img>` preview and footer controls with a measured inline-SVG read surface, overlay controls, and pure direction/sizing helpers. Phase 2 adds a same-origin riwayah package index, explicit package-state semantics, and settings gating. Phase 3 wires package install, retry, remove, progress, and an explicit previous-usable-riwayah/install-intent owner so failed or partial installs never strand the reader on an unusable active riwayah.

**Tech Stack:** Svelte 5 runes, TypeScript, Vite, Vitest with jsdom, Playwright, Workbox route definitions, Node data scripts, generated same-origin dataset assets, CSS tokens in `src/styles/tokens/semantic.css`, surface CSS in `src/styles/surfaces/*.css`.

---

## Source Notes

- Read the redesign spec before starting implementation: `docs/superpowers/specs/2026-05-11-mushaf-reader-redesign-design.md`.
- Current v1 files already exist and should be evolved rather than re-created:
  - `src/read/mushaf/MushafReader.svelte`
  - `src/read/mushaf/MushafPage.svelte`
  - `src/read/mushaf/MushafControls.svelte`
  - `src/read/mushaf/navigation.ts`
  - `src/read/mushaf/types.ts`
  - `src/data/mushaf-pages.ts`
  - `src/data/offline.ts`
  - `src/configure/riwayah.ts`
  - `src/configure/Panel.svelte`
  - `src/infra/offline/offline-selector.svelte`
  - `src/styles/surfaces/reader.css`
  - `src/styles/surfaces/app-shell.css`
- Current v1 pain points that must be removed:
  - normal ready state rendered through `<img>`
  - `.qa-mushaf-page-wrap` and related controls capped at `760px`
  - fitted height capped with `calc(100dvh - 220px)`
  - visible page card, sheet, shadow, rounded page frame, footer row, scrubber, and permanent previous/next buttons
- Current route stays `#/m/:page`; do not put riwayah in the route.
- Runtime must not fetch quran.ws. Browser fetches stay under `/dataset/**`.
- Qaloon is the baseline/default usable riwayah. Hafs and Warsh are optional installable packages.
- Package-state vocabulary is strict:
  - **available**: the deployment publishes a complete same-origin package in `/dataset/indexes/riwayah-packages.json`.
  - **installable**: the package is available but the local expected caches do not yet contain every required text and page URL.
  - **installed**: every required package URL is present in its expected cache, or Qaloon baseline assets are verified available from the shipped dataset.
  - **usable**: the riwayah may be persisted to `settings.riwayah` and rendered without falling back to another riwayah. For optional Hafs/Warsh this means installed, not merely available online.

## Implementation Constraints

- Do not implement tap-to-verse, translation overlays, tafsir overlays, or hit testing inside the SVG.
- Do not rasterize, canvas-render, screenshot, blur, image-generate, or CSS-invert Mushaf text.
- Do not silently fall back from Hafs or Warsh to Qaloon when assets are missing.
- Keep generated context fence blocks owned by `pnpm run docs`.
- Commit steps are execution checkpoints only. If the implementer has not been asked to commit, run verification and leave the working tree uncommitted.
- Owning context docs are part of the task that changes behavior or ownership. Do not defer first-time dossier, architecture, data-model, source-data-flow, or infra documentation to the final sweep.
- Inline SVG runtime rendering uses `{@html}` only after same-origin URL validation, DOM parsing, descendant sanitization, URL/reference validation, and serialization from the sanitized DOM.
- Keep work clustered by surface:
  - Phase 1: read surface.
  - Phase 2: data/configure/infra state.
  - Phase 3: configure/infra install flows plus read-surface missing-package prompts.

## File Structure

Phase 1 read-surface files:

- Modify `src/read/mushaf/navigation.ts`: add physical action helpers for `towardEnd` and `towardStart`.
- Create <code>src/read/mushaf/sizing.ts</code>: pure viewBox fitting and chip-placement helpers.
- Create <code>src/read/mushaf/svg-page.ts</code>: runtime same-origin SVG loading, viewBox extraction, and inline-SVG preparation helpers.
- Modify `src/read/mushaf/types.ts`: add viewBox, inline SVG, and page-load state types.
- Modify `src/data/mushaf-pages.ts`: validate and expose per-page manifest viewBox metadata for first-render sizing.
- Modify `src/read/mushaf/MushafReader.svelte`: own route loading, page-turn actions, keyboard navigation, and suppress controls while jump input is open.
- Modify `src/read/mushaf/MushafPage.svelte`: render themeable inline SVG as one accessible image; keep non-ready states separate.
- Modify `src/read/mushaf/MushafControls.svelte`: replace footer controls with overlay edge zones and page chip/jump input.
- Modify `src/styles/tokens/semantic.css`: add explicit Mushaf tokens for light, sepia, and dark.
- Modify `src/styles/surfaces/reader.css`: full-viewport Mushaf layout and overlays.
- Modify `src/styles/surfaces/app-shell.css`: remove Verse column cap and Verse bottom padding budget for Mushaf mode.
- Modify `scripts/data/mushaf-pages/build.mjs`: emit theme-tokenized SVG output.
- Create <code>scripts/data/mushaf-pages/theme-svg.mjs</code>: color classification and SVG tokenization.
- Modify `tests/unit/read/mushaf/navigation.test.ts`.
- Create <code>tests/unit/read/mushaf/sizing.test.ts</code>.
- Create <code>tests/unit/read/mushaf/svg-page.test.ts</code>.
- Modify `tests/unit/read/mushaf/reader.test.ts`.
- Modify `tests/unit/scripts/mushaf-pages.test.js`.
- Modify `tests/e2e/read/chrome.spec.js`.
- Modify `tests/e2e/read/performance.spec.js`.

Phase 2 package discovery and gating files:

- Create <code>data/catalog/riwayah-packages.json</code>: package policy, baseline/default marker, and expected riwayah package members.
- Create <code>scripts/data/riwayah-packages/build.mjs</code>: generate same-origin package index from current dataset artifacts.
- Modify `scripts/data/cli.mjs`: include package-index generation in dataset build.
- Modify `scripts/data/manifest/inventory.mjs`: include generated package index in the text index lane.
- Create <code>src/data/riwayah-packages.ts</code>: package index fetch, validation, state derivation, byte planning, and cache-name helpers.
- Modify `src/data/mushaf-pages.ts`: use package availability to distinguish missing package from page asset error.
- Modify `src/data/dataset.ts`: keep active-riwayah text missing as a promptable error, not fallback content.
- Modify `src/configure/riwayah.ts`: persist only usable riwayah choices.
- Modify `src/configure/state.svelte.ts`: add package-install state, install intent, and previous-usable-riwayah state outside `settings.riwayah`.
- Modify `src/core/constants.ts`: add package install/progress/error events if existing events are not specific enough.
- Modify `src/infra/sw/route-defs.ts`: route the package index as `text-index` so window, SW, and offline planning share one cache policy.
- Modify `tests/unit/data/mushaf-pages.test.ts`.
- Create <code>tests/unit/data/riwayah-packages.test.ts</code>.
- Modify `tests/unit/configure/riwayah.test.ts`.
- Modify `tests/unit/data/offline.test.js`.
- Modify `tests/unit/infra/sw/route-defs.test.ts`.

Phase 3 install/remove flow files:

- Modify `src/data/offline.ts`: add text+page riwayah package install, remove, retry, quota preflight, and progress orchestration.
- Modify `src/data/offline-client.ts`: expose package install/remove helpers.
- Modify `src/infra/offline/offline-selector.svelte`: show riwayah package state and package byte plan.
- Modify `src/configure/Panel.svelte`: settings recitation picker shows installed/installable/installing/unavailable/error states.
- Modify `src/read/mushaf/MushafPage.svelte`: missing riwayah prompt supports install, stay current, settings, retry, and Verse mode where valid.
- Modify `tests/unit/configure/panel.test.ts`.
- Modify `tests/unit/infra/offline/offline-selector.test.ts`.
- Modify `tests/e2e/configure/settings.spec.js`.
- Modify `tests/e2e/infra/offline.spec.js`.

Context docs to update inside the task that changes each subject:

- `docs/context/surfaces/read.md`
- `docs/context/surfaces/navigate.md` if drawer or mode-switch wording changes
- `docs/context/surfaces/configure.md`
- `docs/context/surfaces/infra.md`
- `docs/context/architecture.md`
- `docs/context/data-model.md`
- `docs/context/source-data-flow.md`
- `docs/tech-stack.md` if scripts, release packaging, or external tooling requirements change

Final verification may re-run generated docs and check for missed drift, but it must not be the first place behavior documentation is written.

## Task 0: Baseline And Guardrails

**Files:** no source edits.

- [ ] Run `git status --short`.

Expected: note existing user or generated changes. Do not revert unrelated changes.

- [ ] Read:

```bash
sed -n '1,360p' docs/superpowers/specs/2026-05-11-mushaf-reader-redesign-design.md
sed -n '1,240p' docs/context/surfaces/read.md
sed -n '1,220p' docs/context/surfaces/configure.md
sed -n '1,220p' docs/context/surfaces/infra.md
sed -n '1,220p' docs/context/architecture.md
sed -n '1,220p' docs/context/source-data-flow.md
```

- [ ] Capture the current failure baseline that the redesign must fix:

```bash
pnpm test -- tests/unit/read/mushaf/navigation.test.ts tests/unit/read/mushaf/reader.test.ts tests/unit/scripts/mushaf-pages.test.js
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project=chromium
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project="Mobile Chrome" --grep @mobile
```

Expected: existing tests pass before edits. The E2E suite does not yet assert the redesigned Mushaf layout.

## Task 1: Direction And Sizing Contracts

**Files:**

- Modify `src/read/mushaf/navigation.ts`
- Create <code>src/read/mushaf/sizing.ts</code>
- Modify `tests/unit/read/mushaf/navigation.test.ts`
- Create <code>tests/unit/read/mushaf/sizing.test.ts</code>

- [ ] Extend navigation helpers with physical Mushaf actions:

```ts
export type MushafPhysicalAction = 'towardEnd' | 'towardStart'

export function deltaForMushafAction(action: MushafPhysicalAction): 1 | -1 {
  return action === 'towardEnd' ? 1 : -1
}

export function pageForMushafAction(
  page: number,
  pageCount: number,
  action: MushafPhysicalAction,
): number {
  return clampMushafPage(page + deltaForMushafAction(action), pageCount)
}

export function actionForMushafSwipe(deltaX: number): MushafPhysicalAction | null {
  if (deltaX < 0) return 'towardEnd'
  if (deltaX > 0) return 'towardStart'
  return null
}

export function actionForMushafKey(key: string): MushafPhysicalAction | 'first' | 'last' | null {
  if (key === 'ArrowLeft') return 'towardEnd'
  if (key === 'ArrowRight') return 'towardStart'
  if (key === 'Home') return 'first'
  if (key === 'End') return 'last'
  return null
}
```

- [ ] Add unit tests proving physical direction semantics:
  - swipe left maps to `towardEnd`
  - swipe right maps to `towardStart`
  - left edge tap uses `towardEnd`
  - right edge tap uses `towardStart`
  - `ArrowLeft` uses `towardEnd`
  - `ArrowRight` uses `towardStart`
  - page 1 clamps `towardStart` to 1
  - final page clamps `towardEnd` to `pageCount`

- [ ] Create <code>src/read/mushaf/sizing.ts</code> with pure fit helpers:

```ts
export type RectSize = { width: number; height: number }
export type SvgViewBox = { minX: number; minY: number; width: number; height: number }
export type MushafFit = {
  width: number
  height: number
  scale: number
  x: number
  y: number
}

export function parseViewBox(value: string): SvgViewBox {
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`Invalid SVG viewBox: ${value}`)
  }
  const [minX, minY, width, height] = parts as [number, number, number, number]
  if (width <= 0 || height <= 0) throw new Error(`Invalid SVG viewBox dimensions: ${value}`)
  return { minX, minY, width, height }
}

export function fitViewBoxIntoRect(viewBox: SvgViewBox, available: RectSize): MushafFit {
  if (available.width <= 0 || available.height <= 0) {
    return { width: 0, height: 0, scale: 0, x: 0, y: 0 }
  }
  const scale = Math.min(available.width / viewBox.width, available.height / viewBox.height)
  const width = viewBox.width * scale
  const height = viewBox.height * scale
  return {
    width,
    height,
    scale,
    x: (available.width - width) / 2,
    y: (available.height - height) / 2,
  }
}
```

- [ ] Add chip-placement helper in `sizing.ts`:

```ts
export type ChipPlacement = 'bottom-center' | 'below-page' | 'inside-safe-bottom'

export function choosePageChipPlacement(input: {
  available: RectSize
  pageFit: MushafFit
  chip: RectSize
  margin: number
}): ChipPlacement {
  const bottomSlotTop = input.available.height - input.margin - input.chip.height
  const pageBottom = input.pageFit.y + input.pageFit.height
  if (pageBottom + input.margin <= bottomSlotTop) return 'bottom-center'
  if (input.available.height - pageBottom >= input.chip.height + input.margin) return 'below-page'
  return 'inside-safe-bottom'
}
```

The helper must never create a permanent toolbar row. It only returns an overlay placement decision.

- [ ] Add <code>tests/unit/read/mushaf/sizing.test.ts</code>:
  - invalid viewBox rejects
  - tall page is height-limited when height is the smaller constraint
  - wide desktop page exceeds `760px` when viewBox and height budget permit it
  - chip placement stays `bottom-center` when there is room
  - chip placement changes when the fitted page would collide with the default chip slot

- [ ] Run:

```bash
pnpm test -- tests/unit/read/mushaf/navigation.test.ts tests/unit/read/mushaf/sizing.test.ts
```

Expected: tests pass and no implementation names use "previous" or "next" for physical edge actions.

## Task 2: Themeable SVG Build Output

**Files:**

- Create <code>scripts/data/mushaf-pages/theme-svg.mjs</code>
- Modify `scripts/data/mushaf-pages/build.mjs`
- Modify `tests/unit/scripts/mushaf-pages.test.js`
- Modify `src/styles/tokens/semantic.css`
- Modify `docs/context/source-data-flow.md`
- Modify `docs/context/csp-allowlist.md` only if emitted generated SVG still contains inline `style`
- Modify `tests/unit/infra/safety/csp-headers.test.ts` only if the CSP registry rationale changes

- [ ] Create a focused SVG transformer module:

```js
export const MUSHAF_COLOR_TOKENS = {
  ground: 'var(--qa-mushaf-ground)',
  ink: 'var(--qa-mushaf-ink)',
  ornament: 'var(--qa-mushaf-ornament)',
  accent: 'var(--qa-mushaf-accent)',
}

export function classifyMushafColor(value, colorMap) {
  const key = normalizeColorLiteral(value)
  const token = colorMap[key]
  if (!token) throw new Error(`Unclassified Mushaf SVG color: ${value}`)
  return token
}
```

The final module must export:

- `normalizeColorLiteral(value)`
- `classifyMushafColor(value, colorMap)`
- `themeMushafSvg(text, { filename, colorMap })`
- `assertThemeableSvgIntegrity(before, after, filename)`

- [ ] Define the allowed mutation policy in code:
  - allowed rewrites: `fill`, `stroke`, inline `style` declarations for `fill` and `stroke`
  - preserved exactly: `viewBox`, path `d`, source element order, `fill-rule`, `clip-path`, opacity attributes, transform attributes, IDs, same-document references
  - rejected: script elements, foreignObject, event attributes, remote URL references, data URL references, unclassified color literals, geometry-changing rewrites, style imports

Prefer rewriting eligible inline `style` color declarations into presentation attributes (`fill="var(...)"`, `stroke="var(...)"`) and deleting the consumed declarations when the remaining `style` is empty. If any emitted generated SVG still contains inline `style`, update `docs/context/csp-allowlist.md` in the same task to add the Mushaf page renderer to the existing `style-src 'unsafe-inline'` rationale and run `pnpm test -- tests/unit/infra/safety/csp-headers.test.ts`.

- [ ] Use an explicit source color map. Keep it near the transformer or in `data/catalog/mushaf-pages.json`:

```json
{
  "themeColorMap": {
    "#ffffff": "ground",
    "#000000": "ink"
  }
}
```

When real normalized quran.ws SVGs contain additional colors, add each literal to the map with one of: `ground`, `ink`, `ornament`, `accent`. Do not add a catch-all classifier.

- [ ] Modify `build.mjs` so page output passes through:

```js
const source = await readFile(sourceFile, 'utf8')
const optimized = optimizeSvgForDataset(source)
const themed = themeMushafSvg(optimized, { filename, colorMap: catalog.themeColorMap })
assertSafeSvg(filename, themed)
await writeFile(join(outDir, 'pages', filename), themed, 'utf8')
```

- [ ] Extend `writeMushafManifest()` to persist the validated SVG viewBox for each page:

```js
function viewBoxForThemedPage(text, filename) {
  const match = String(text).match(/\sviewBox=(["'])(.*?)\1/i)
  if (!match) throw new Error(`Mushaf page ${filename} is missing viewBox`)
  return match[2].trim()
}
```

Thread a `pageViewBoxes: Map<number, string>` from the build loop into `writeMushafManifest()` and emit:

```js
{
  page,
  assetPath: `pages/${filename}`,
  viewBox: pageViewBoxes.get(page),
  bytes: (await stat(join(outDir, 'pages', filename))).size,
  sourcePdfUrl: quranWsPagePdfUrl(sourceSlug, page),
  firstVerse: first,
}
```

The manifest viewBox is the first-render sizing contract. Runtime may still re-parse the inline SVG and must reject if the fetched page viewBox differs from the manifest entry.

- [ ] Add transform tests in `tests/unit/scripts/mushaf-pages.test.js`:
  - same `viewBox` before/after
  - same path count before/after
  - path `d` values preserved
  - `fill-rule`, `clip-path`, and opacity preserved
  - known colors emit `var(--qa-mushaf-*)`
  - hard-coded theme colors are absent from emitted output
  - unknown colors reject
  - unsafe attributes and remote references reject
  - generated page manifest includes `viewBox` for every page
  - manifest `viewBox` matches the corresponding transformed SVG root

- [ ] Add explicit theme tokens in `src/styles/tokens/semantic.css`:

```css
:root {
  --qa-mushaf-ground: #fbf7ee;
  --qa-mushaf-ink: #17120b;
  --qa-mushaf-ornament: #7a5b28;
  --qa-mushaf-accent: var(--qa-accent);
}

[data-theme="sepia"] {
  --qa-mushaf-ground: #efe0bf;
  --qa-mushaf-ink: #2d2113;
  --qa-mushaf-ornament: #80602b;
  --qa-mushaf-accent: #9a6b2f;
}

[data-theme="dark"] {
  --qa-mushaf-ground: #16130f;
  --qa-mushaf-ink: #eee2c8;
  --qa-mushaf-ornament: #c6a15a;
  --qa-mushaf-accent: #d2ad62;
}
```

Adjust values to match existing token vocabulary, but keep separate declarations for light, sepia, and dark. Sepia must not inherit light values.

- [ ] Update `docs/context/source-data-flow.md` to document that Mushaf page SVGs are sanitized and tokenized at build time while preserving geometry.

- [ ] Because this task changes source-data behavior, update `docs/context/source-data-flow.md` in this task before moving on. Do not leave this for the final docs sweep.

- [ ] Run:

```bash
pnpm test -- tests/unit/scripts/mushaf-pages.test.js
pnpm run data -- mushaf-pages build --profile=catalog --check
pnpm run data -- mushaf-pages build --profile=baseline
pnpm run docs
pnpm run docs:check
```

Expected: transformer tests pass, catalog/check mode does not require local 604-page body artifacts, the ignored local baseline Qaloon page output under `public/dataset/mushaf-pages/` is regenerated with tokenized SVGs before runtime/browser tests, and source-data docs match the generated context.

## Task 3: Inline SVG Runtime Rendering

**Files:**

- Create <code>src/read/mushaf/svg-page.ts</code>
- Modify `src/read/mushaf/types.ts`
- Modify `src/data/mushaf-pages.ts`
- Modify `src/read/mushaf/MushafPage.svelte`
- Modify `src/read/mushaf/MushafReader.svelte`
- Create <code>tests/unit/read/mushaf/svg-page.test.ts</code>
- Modify `tests/unit/read/mushaf/reader.test.ts`

- [ ] Add runtime SVG helpers:

```ts
export type InlineMushafSvg = {
  markup: string
  viewBox: SvgViewBox
  viewBoxText: string
}

const MUSHAF_PAGE_ASSET_RE = /^\/dataset\/mushaf-pages\/(hafs|warsh|qaloon)\/pages\/\d{3}\.svg$/

export async function loadInlineMushafSvg(assetUrl: string, signal?: AbortSignal): Promise<InlineMushafSvg> {
  let decodedPath = ''
  try {
    decodedPath = decodeURIComponent(assetUrl.split(/[?#]/, 1)[0] ?? '')
  } catch {
    throw new Error(`Invalid Mushaf asset URL: ${assetUrl}`)
  }
  if (
    assetUrl !== decodedPath
    || decodedPath.includes('..')
    || !MUSHAF_PAGE_ASSET_RE.test(decodedPath)
  ) {
    throw new Error(`Invalid Mushaf asset URL: ${assetUrl}`)
  }
  const response = await fetch(decodedPath, { signal })
  if (!response.ok) throw new Error(`Failed to load Mushaf page SVG: ${response.status}`)
  return prepareInlineMushafSvg(await response.text())
}
```

- [ ] Update manifest validation in `src/data/mushaf-pages.ts`:
  - every page entry must have a string `viewBox`
  - parse it with `parseViewBox()`
  - expose `viewBox` and `viewBoxText` on `MushafResolvedPage`
  - reject any manifest page whose `viewBox` is missing, invalid, or changes page aspect ratio unexpectedly within one riwayah

- [ ] In `prepareInlineMushafSvg(text)`:
  - parse the root `<svg>` with `DOMParser` or an equivalent DOM API; do not use regex rewriting for runtime sanitization
  - read and validate `viewBox`
  - add `class="qa-mushaf-svg"`
  - set `aria-hidden="true"`
  - set `focusable="false"`
  - remove any `tabindex`, `role`, `aria-*`, `<title>`, and `<desc>` from SVG descendants so the wrapper is the only accessible image
  - walk every descendant and remove any descendant `tabindex`
  - reject any focusable SVG descendant after sanitization
  - reject missing `viewBox`
  - reject any runtime script/event/foreignObject/style-import/remote-reference/data-URL reference even though build already checks them
  - validate every URL-bearing attribute and CSS `url(...)` reference; allow only same-document fragment references like `url(#clip0)`
  - serialize the sanitized DOM back to markup; never return the original input text after validation

- [ ] Update `MushafPage.svelte` ready state to render one accessible image wrapper:

```svelte
<div
  class="qa-mushaf-page-figure"
  role="img"
  aria-label={`Mushaf page ${resolved.page}, ${resolved.riwayahLabel}, beginning near ${resolved.firstVerse.surah}:${resolved.firstVerse.verse}`}
  style={`--qa-mushaf-viewbox-ratio:${viewBox.width / viewBox.height}`}
>
  {@html inlineSvg.markup}
</div>
```

Use the actual type names in the implementation. Keep decorative SVG internals hidden from the accessibility tree.

- [ ] Add non-ready behavior:
  - manifest-loading state may use a compact centered loader before page metadata exists
  - SVG-loading state after `resolveMushafPage()` uses `resolved.viewBox` and the same sizing variables as the eventual page
  - install prompt is compact and not a normal ready-state card
  - asset error offers retry and Verse mode where a usable text corpus exists
  - no state silently loads a different riwayah page

- [ ] Update `MushafReader.svelte` request handling:
  - abort stale SVG fetches on route/page changes
  - use existing `requestId` guard for manifest/page resolution
  - after manifest/page resolution, publish manifest `viewBox` data to layout sizing before the inline SVG fetch completes
  - after SVG fetch, compare inline SVG `viewBoxText` with `resolved.viewBoxText`; mismatch is an asset integrity error
  - theme changes update CSS variables without refetching the SVG

- [ ] Add tests:
  - SVG helper rejects non-dataset URLs
  - SVG helper rejects query strings, encoded traversal, `..`, and non-page dataset SVG paths
  - SVG helper rejects missing viewBox
  - SVG helper strips descendant `tabindex`, `role`, `aria-*`, `<title>`, and `<desc>`
  - SVG helper hides internals from a11y/focus and rejects any remaining focusable descendant
  - SVG helper rejects remote URL references, data URL references, style imports, event attributes, script, and foreignObject
  - `resolveMushafPage()` exposes parsed manifest viewBox data
  - fetched inline SVG viewBox mismatch renders asset error instead of a fitted page
  - `MushafReader` renders `role="img"` wrapper and no `<img>` in ready light/sepia/dark paths
  - missing optional riwayah prompt still renders no page content

- [ ] Run:

```bash
pnpm test -- tests/unit/read/mushaf/svg-page.test.ts tests/unit/read/mushaf/reader.test.ts
```

Expected: ready state is inline SVG, one page image is exposed to assistive tech, and internal paths are not focusable.

## Task 4: Overlay Navigation And Page Chip

**Files:**

- Modify `src/read/mushaf/MushafControls.svelte`
- Modify `src/read/mushaf/MushafReader.svelte`
- Modify `src/read/mushaf/navigation.ts`
- Modify `tests/unit/read/mushaf/reader.test.ts`
- Modify `tests/unit/read/mushaf/navigation.test.ts`
- Modify `tests/e2e/read/chrome.spec.js`

- [ ] Replace footer controls with an overlay layer:
  - left edge button: `aria-label="Advance Mushaf page"` and action `towardEnd`
  - right edge button: `aria-label="Return to previous Mushaf page"` and action `towardStart`
  - page chip button: visible text like `42 / 604`
  - numeric jump input appears only while chip is open
  - no scrubber
  - no footer row
  - no permanent previous/next button pair

- [ ] Implement page chip behavior:
  - `Enter` or `Space` on chip opens input
  - input has `type="number"`, `inputmode="numeric"`, min `1`, max `pageCount`
  - `Enter` commits clamped route through `navigate(pageHref(clamped))`
  - `Escape` cancels and restores focus to chip
  - outside tap closes
  - while open, edge zones and swipe handlers are suppressed

- [ ] Implement swipe behavior in `MushafReader.svelte` or a small helper:
  - track pointer start only for primary pointer/touch
  - ignore when jump input is open
  - ignore when initial target is an input/button other than edge zones
  - threshold: distance at least `48px` or velocity at least `0.35px/ms`
  - vertical guard: `Math.abs(deltaY) <= Math.abs(deltaX) * 0.75`
  - left swipe maps to `towardEnd`
  - right swipe maps to `towardStart`
  - use pointer capture only while the gesture is active

- [ ] Implement keyboard parity on the reader root:
  - `ArrowLeft`: `towardEnd`
  - `ArrowRight`: `towardStart`
  - `Home`: page 1
  - `End`: final page
  - no keyboard page turn while jump input is open except input commit/cancel

- [ ] Add component/unit tests:
  - edge zones call the expected physical action
  - disabled boundary state on page 1 and final page
  - chip opens, clamps, commits, cancels, and restores focus
  - edge tap does not fire while input is open
  - `ArrowLeft` advances and `ArrowRight` returns

- [ ] Add E2E assertions in `tests/e2e/read/chrome.spec.js`:
  - `/#/m/1` left edge tap routes to `#/m/2`
  - `/#/m/2` right edge tap routes to `#/m/1`
  - swipe left advances
  - swipe right returns
  - chip jump to page 42 routes to `#/m/42`
  - ready state has no `.qa-mushaf-scrubber`

- [ ] Update `docs/context/surfaces/read.md` in this task for the physical edge-tap/swipe/keyboard direction semantics, page chip behavior, and removal of the footer scrubber. If mode-switch wording changes, update `docs/context/surfaces/navigate.md` in the same task.

- [ ] Run:

```bash
pnpm test -- tests/unit/read/mushaf/navigation.test.ts tests/unit/read/mushaf/reader.test.ts
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project=chromium --grep "Mushaf"
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project="Mobile Chrome" --grep "@mobile.*Mushaf|Mushaf.*@mobile"
pnpm run docs
pnpm run docs:check
```

Expected: physical Mushaf navigation works in tap, swipe, and keyboard paths.

## Task 5: Full-Viewport Read Surface CSS

**Files:**

- Modify `src/styles/surfaces/app-shell.css`
- Modify `src/styles/surfaces/reader.css`
- Modify `src/read/mushaf/MushafReader.svelte`
- Modify `src/read/mushaf/MushafPage.svelte`
- Modify `tests/e2e/read/chrome.spec.js`
- Modify `tests/e2e/read/performance.spec.js`

- [ ] Update app shell Mushaf exception:

```css
#main-content:has(.qa-mushaf-reader) {
  max-width: none;
  width: 100%;
  padding: 0;
  overflow: hidden;
}
```

If mobile header overlap appears, solve it inside `.qa-mushaf-reader` with measured top chrome budget or a CSS variable. Do not restore the normal Verse bottom padding.

- [ ] Replace current Mushaf CSS rules:
  - remove every `width: min(100%, 760px)` from Mushaf ready-state selectors
  - remove every `max-height: calc(100dvh - 220px)` from Mushaf ready-state selectors
  - remove ready-state page background sheet, shadow, visible border, and page border radius
  - remove `.qa-mushaf-controls` footer layout
  - use CSS variables from measured fit: `--qa-mushaf-page-width`, `--qa-mushaf-page-height`, `--qa-mushaf-page-x`, `--qa-mushaf-page-y`

- [ ] Use a measured viewport contract based on the actual content box:
  - primary measurement is `document.getElementById('main-content')!.getBoundingClientRect()`
  - fallback is `window.visualViewport.width/height` when available, then `window.innerWidth/innerHeight`
  - do not manually subtract the desktop rail or app-shell safe-area padding when using `#main-content.getBoundingClientRect()`; the shell has already applied those budgets
  - subtract only overlay chrome that truly overlaps the content rect, such as the visible mobile `MarginHeader`
  - subtract a small breathing margin once, inside the measured-layout helper, so CSS and JS do not double-count it
  - fit against the SVG viewBox via `fitViewBoxIntoRect`
  - update on `visualViewport.resize`, `window.resize`, route page change, SVG viewBox load, mobile header visibility changes, and orientation changes

- [ ] Style the page and overlays:

```css
.qa-mushaf-reader {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  touch-action: pan-y;
}

.qa-mushaf-page-wrap {
  position: absolute;
  width: var(--qa-mushaf-page-width);
  height: var(--qa-mushaf-page-height);
  transform: translate3d(var(--qa-mushaf-page-x), var(--qa-mushaf-page-y), 0);
}

.qa-mushaf-page-figure,
.qa-mushaf-svg {
  width: 100%;
  height: 100%;
  display: block;
}
```

Adapt selector names to the implementation. The final CSS must keep the page unframed in the ready state.

- [ ] Style overlay controls:
  - edge zones are transparent and at least `44px` wide on coarse pointers
  - focus-visible state is visible in light, sepia, and dark
  - chip is a compact overlay in the bottom safe area
  - chip placement class follows `choosePageChipPlacement`
  - chip must not occlude critical page content at tested viewports

- [ ] Add E2E layout assertions:
  - set viewport `390x844`, route `/#/m/1`, wait for `.qa-mushaf-page-figure`
  - compute expected fit in the browser from the measured `#main-content` rect, actual `viewBox`, visible overlapping chrome, safe-area facts already present in the rect, and the same breathing margin as the implementation
  - assert page box width/height are within `2px` of expected
  - assert page bottom uses the area formerly reserved for footer controls
  - set viewport `1440x1000`, assert fitted box within `2px` of expected
  - assert width exceeds `760px` whenever height budget and viewBox permit
  - assert no ready-state ancestor has box shadow or sheet/card frame
  - assert `.qa-mushaf-controls` does not occupy layout height

- [ ] Add page-turn performance implementation support before asserting the budget:
  - keep an in-memory cache for the current page's sanitized inline SVG markup
  - after rendering page N, prefetch and sanitize adjacent page N+1 or N-1 when the route boundary permits
  - abort stale prefetches on route/riwayah changes
  - do not let prefetch failures replace the visible page; they only warm the next navigation

- [ ] Add performance assertions:
  - define the measured page-turn window as pointer/key action start through `.qa-mushaf-page-figure[data-page="2"]` becoming visible
  - page turn from 1 to 2 has no `PerformanceLongTaskTiming` entry above `50ms` inside that window after adjacent prefetch has completed
  - if the browser does not expose `PerformanceLongTaskTiming`, assert that the fallback `performance.now()` route-to-visible duration stays under the project-local threshold chosen in the test and document the threshold inline
  - page-turn animation uses transform/opacity after SVG mount
  - reduced-motion disables or simplifies page-turn animation

- [ ] Update `docs/context/surfaces/read.md` in this task for the full-viewport unframed layout, measured sizing contract, inline-SVG theme behavior, and no runtime quran.ws fetch. Do not defer this behavior update.

- [ ] Run:

```bash
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project=chromium --grep "Mushaf"
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project="Mobile Chrome" --grep "@mobile.*Mushaf|Mushaf.*@mobile"
pnpm test:e2e -- tests/e2e/read/performance.spec.js --project=chromium
pnpm run docs
pnpm run docs:check
```

Expected: no 760px cap, no 220px height cap, no card frame, no footer row, and no long task above 50ms during ordinary page turns.

## Task 6: Theme, Accessibility, And Visual Fidelity

**Files:**

- Modify `src/styles/tokens/semantic.css`
- Modify `src/styles/surfaces/reader.css`
- Modify `src/read/mushaf/MushafPage.svelte`
- Modify `tests/unit/read/mushaf/reader.test.ts`
- Modify `tests/e2e/read/chrome.spec.js`

- [ ] Assert light, sepia, and dark have distinct Mushaf token values:
  - `--qa-mushaf-ground`
  - `--qa-mushaf-ink`
  - `--qa-mushaf-ornament`
  - `--qa-mushaf-accent`

- [ ] Add component tests:
  - ready path uses inline SVG, not `<img>`, for light, sepia, and dark
  - wrapper exposes one labeled image
  - internal SVG paths are not focusable
  - edge controls and chip are keyboard focusable and have accessible names

- [ ] Add E2E theme checks:
  - light screenshot
  - sepia screenshot
  - dark screenshot
  - pixel sample from SVG ink differs across all three themes
  - dark ink is light over dark/warm ground, not black-on-light fallback
  - sepia ink and ground differ from light theme
  - computed `filter` on the SVG/page is `none`
  - computed `image-rendering` does not force pixelated raster behavior

- [ ] Add E2E accessibility checks:
  - run existing axe fixture on `/#/m/1`
  - tab order reaches left edge, right edge, and page chip
  - tab order does not enter path elements
  - `Enter`/`Space` opens chip input and `Escape` restores focus

- [ ] Time the materially expanded read journey spec per `tests/e2e/AGENTS.md`:

```bash
time pnpm playwright test tests/e2e/read/chrome.spec.js --reporter=line
```

Expected: note the new wall time in the task notes. If the added coverage materially increases wall time, shrink repeated setup or document why the browser-only coverage is required.

- [ ] Run:

```bash
pnpm test -- tests/unit/read/mushaf/reader.test.ts
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project=chromium --grep "Mushaf"
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project="Mobile Chrome" --grep "@mobile.*Mushaf|Mushaf.*@mobile"
```

Expected: all three themes render the same vector geometry with distinct token colors and accessible overlay controls.

## Task 7: Riwayah Package Index And Gating

**Files:**

- Create <code>data/catalog/riwayah-packages.json</code>
- Create <code>scripts/data/riwayah-packages/build.mjs</code>
- Modify `scripts/data/cli.mjs`
- Modify `scripts/data/manifest/inventory.mjs`
- Create <code>src/data/riwayah-packages.ts</code>
- Modify `src/data/mushaf-pages.ts`
- Modify `src/data/dataset.ts`
- Modify `src/configure/riwayah.ts`
- Modify `src/configure/state.svelte.ts`
- Modify `src/core/constants.ts`
- Modify `src/infra/sw/route-defs.ts`
- Create <code>tests/unit/data/riwayah-packages.test.ts</code>
- Modify `tests/unit/data/mushaf-pages.test.ts`
- Modify `tests/unit/configure/riwayah.test.ts`
- Modify `tests/unit/data/offline.test.js`
- Modify `tests/unit/infra/sw/route-defs.test.ts`

- [ ] Add package catalog:

```json
{
  "version": 1,
  "defaultRiwayah": "qaloon",
  "baselineRiwayah": "qaloon",
  "riwayat": {
    "qaloon": { "optional": false },
    "hafs": { "optional": true },
    "warsh": { "optional": true }
  }
}
```

- [ ] Generate `/dataset/indexes/riwayah-packages.json` with this runtime shape:

```ts
export type RiwayahPackageIndex = {
  version: 1
  defaultRiwayah: 'qaloon'
  packages: Array<{
    riwayah: Riwayah
    optional: boolean
    available: boolean
    text: { urls: string[]; totalBytes: number; available: boolean }
    pages: { manifestUrl: string; urls: string[]; totalBytes: number; available: boolean }
    totalBytes: number
  }>
}
```

- [ ] Builder rules:
  - Qaloon is baseline and must be available in baseline profile.
  - Hafs and Warsh may be `available: false` when artifacts are absent.
  - URLs are same-origin `/dataset/**` paths.
  - page URLs come from `/dataset/mushaf-pages/{riwayah}/manifest.json`.
  - text URLs come from `/dataset/riwayat/{riwayah}/NNN.json`.
  - total bytes sum text and pages.
  - generated index is included in the dataset manifest as a text index asset.

- [ ] Update dataset build ordering so the generated package index is present before the final manifest is written.
  Current `scripts/data/mushaf-pages/build.mjs` refreshes `public/dataset/manifest.json` after page generation. Do not leave the new index out of that final manifest. Use one of these concrete approaches:
  - move the final manifest refresh into `scripts/data/cli.mjs` after text, knowledge, Mushaf pages, and package-index generation have all completed; or
  - keep the Mushaf refresh and then run <code>scripts/data/riwayah-packages/build.mjs</code> followed by a final manifest refresh from the CLI.

Whichever approach is chosen, `pnpm run data -- build` must leave `public/dataset/manifest.json` containing `indexes/riwayah-packages.json`.

- [ ] Update `src/infra/sw/route-defs.ts` so the package index follows the existing text-index route:

```ts
url.pathname === '/dataset/indexes/sources.json' ||
url.pathname === '/dataset/indexes/source-assets.json' ||
url.pathname === '/dataset/indexes/riwayah-packages.json' ||
url.pathname === '/dataset/provenance.json' ||
url.pathname === '/dataset/manifest.json'
```

Add or update the route-def unit assertion so `categoryFor(new URL('/dataset/indexes/riwayah-packages.json', location.origin))` returns `'text-index'` and `cacheNameFor(...)` returns `CACHE_DATASET`.

- [ ] Add <code>src/data/riwayah-packages.ts</code>:

```ts
export type RiwayahPackageStatus =
  | { kind: 'installed'; riwayah: Riwayah; totalBytes: number }
  | { kind: 'installable'; riwayah: Riwayah; totalBytes: number }
  | { kind: 'installing'; riwayah: Riwayah; cached: number; total: number }
  | { kind: 'unavailable'; riwayah: Riwayah }
  | { kind: 'error'; riwayah: Riwayah; message: string; totalBytes: number }
```

The module must export:

- `loadRiwayahPackageIndex()`
- `getRiwayahPackageEntry(riwayah)`
- `getRiwayahPackageStatus(riwayah)`
- `isRiwayahUsable(riwayah)`
- `planRiwayahPackageInstall(riwayah)`
- `cacheNamesForRiwayahPackage(riwayah)`
- `clearRiwayahPackageCacheForTests()`

- [ ] Implement package-state semantics exactly:
  - `available` means the package index lists complete same-origin text and page assets for that riwayah in the current deployment.
  - `installable` means `available === true` but at least one planned URL is absent from its expected cache.
  - `installed` means every planned URL is present in its expected cache; for baseline Qaloon, shipped dataset availability is enough because Qaloon is bundled.
  - `usable` means `setRiwayah(next)` may persist `next` and Reader/MushafReader may render it. Optional Hafs/Warsh are usable only when `installed`.
  - online availability alone must not make optional Hafs/Warsh usable; the UI must show installable until the local cache verification passes.
  - if an optional riwayah is already active from stale settings but is not usable, surfaces show a prompt and no fallback content; settings writes must still refuse to re-persist it.

- [ ] Define installed state:
  - Qaloon is installed when baseline Qaloon text and page manifest are available from same-origin dataset.
  - Hafs/Warsh are installed only when the package index has both text and pages available and every planned URL is present in its expected cache, or the package is explicitly verified as usable by the package helper in the current environment.
  - No helper may mark Hafs/Warsh usable because Qaloon is available.

- [ ] Update `setRiwayah(next)`:
  - reject invalid IDs as before
  - return `false` and do not write IDB when `isRiwayahUsable(next)` is false
  - keep applying and emitting only after a successful write
  - keep `settings.riwayah` unchanged after failed persistence

- [ ] Add package-install state outside `settings.riwayah`:

```ts
export type RiwayahInstallState = Record<Riwayah, RiwayahPackageStatus>
```

Store this in a runtime state owner that is not the active riwayah setting. If it needs persistence, use a separate settings key such as `riwayahPackageState`.

- [ ] Add an explicit previous-usable-riwayah/install-intent owner outside `settings.riwayah`:

```ts
export type RiwayahInstallIntent = {
  requested: Riwayah | null
  previousUsable: Riwayah
}
```

Rules:

- Initialize `previousUsable` to the currently loaded usable riwayah, or `qaloon` after Qaloon verifies usable.
- When the user starts installing an optional riwayah, set `requested` to that riwayah and keep `previousUsable` unchanged.
- If install succeeds and `setRiwayah(requested)` succeeds, set `previousUsable` to `requested` and clear `requested`.
- If install fails, clear or mark the package error state but keep `settings.riwayah` and `previousUsable` unchanged.
- If stale settings load an unusable optional riwayah, keep that value visible as the missing active choice for the prompt, but route "stay current usable riwayah" to `previousUsable` or verified Qaloon; do not infer usability from Qaloon availability alone.

- [ ] Update `mushaf-pages.ts` and `dataset.ts` errors:
  - missing active riwayah page package throws a promptable package error
  - missing active riwayah text package throws a promptable package error
  - neither helper returns Qaloon content while `settings.riwayah` is Hafs or Warsh

- [ ] Add unit tests:
  - Qaloon reports installed when baseline assets exist
  - Hafs reports installable with byte estimate when index has text+pages but cache lacks them
  - Hafs reports available-but-not-usable until all planned text and page URLs exist in expected caches
  - Warsh reports unavailable when index lacks artifacts
  - stale setting to Hafs does not persist when unusable
  - no silent fallback from Hafs/Warsh to Qaloon
  - package index rejects non-dataset URLs
  - cache names are per riwayah, for example `qa-pages-hafs-v1`
  - failed install intent leaves `previousUsable` unchanged

- [ ] Update context docs in this task:
  - `docs/context/surfaces/configure.md` for settings gating, package states, and install intent.
  - `docs/context/surfaces/infra.md` for package index, per-riwayah caches, and package-state verification.
  - `docs/context/architecture.md` for package availability ownership if new cross-cutting ownership is introduced.
  - `docs/context/data-model.md` if any package state is persisted.
  - `docs/context/source-data-flow.md` for generated package index membership.

- [ ] Run:

```bash
pnpm run data -- build
pnpm test -- tests/unit/data/riwayah-packages.test.ts tests/unit/data/mushaf-pages.test.ts tests/unit/configure/riwayah.test.ts tests/unit/data/offline.test.js tests/unit/infra/sw/route-defs.test.ts
pnpm run docs
pnpm run docs:check
```

Expected: package index exists in <code>public/dataset/indexes/riwayah-packages.json</code>, Qaloon remains usable, and optional riwayat cannot become active until usable.

## Task 8: Settings And Offline Install/Remove Flows

**Files:**

- Modify `src/data/offline.ts`
- Modify `src/data/offline-client.ts`
- Modify `src/infra/offline/offline-selector.svelte`
- Modify `src/configure/Panel.svelte`
- Modify `src/read/mushaf/MushafPage.svelte`
- Modify `tests/unit/configure/panel.test.ts`
- Modify `tests/unit/infra/offline/offline-selector.test.ts`
- Modify `tests/e2e/configure/settings.spec.js`
- Modify `tests/e2e/infra/offline.spec.js`

- [ ] Add package install orchestration in `src/data/offline.ts`:

```ts
export async function startRiwayahPackageInstall(riwayah: Riwayah): Promise<boolean>
export async function removeRiwayahPackage(riwayah: Riwayah): Promise<void>
export async function retryRiwayahPackageInstall(riwayah: Riwayah): Promise<boolean>
```

Rules:

- plan bytes from `planRiwayahPackageInstall`
- preflight quota with `getStorageBudget`
- cache text URLs into `CACHE_DATASET`
- cache page URLs into `qa-pages-{riwayah}-v1`
- emit progress after each cached URL
- emit a package-specific error on failed fetch/cache write
- on failure, keep previous `settings.riwayah`
- on success, call `setRiwayah(riwayah)` only after package verification passes
- on success, update `RiwayahInstallIntent.previousUsable` only after `setRiwayah(riwayah)` returns `true`
- on failure, preserve both `settings.riwayah` and `RiwayahInstallIntent.previousUsable`
- Qaloon remove is disabled

- [ ] Add `offline-client.ts` exports for package install, retry, remove, and status refresh.

- [ ] Update Settings recitation picker:
  - installed rows switch immediately
  - installable rows show byte estimate and install action
  - installing rows show progress and disable switching
  - unavailable rows are disabled and state why
  - error rows show retry
  - current active row remains visibly active until install succeeds

- [ ] Update Storage selector:
  - display riwayah package entries, not just page packs
  - byte plan combines text and page bytes
  - applying an install updates package state
  - removing Hafs/Warsh removes text and page caches
  - removing the active optional riwayah first switches to Qaloon only if Qaloon verifies usable; otherwise refuse removal with an error

- [ ] Update Mushaf missing-package prompt:
  - show active missing riwayah
  - action: install package
  - action: stay on current usable riwayah routes to `RiwayahInstallIntent.previousUsable` when it verifies usable, otherwise verified Qaloon
  - action: open Settings
  - action: retry
  - action: open Verse mode only when the active riwayah text corpus is usable
  - if stale settings put the app on Hafs/Warsh while unusable, the prompt labels Hafs/Warsh as the missing active choice but does not render Qaloon text or pages behind that label

- [ ] Add unit tests:
  - install success caches text and pages then switches
  - install failure keeps prior active riwayah
  - install failure keeps `previousUsable` unchanged
  - stale active optional riwayah "stay current usable" routes to `previousUsable` or verified Qaloon without rendering fallback content under the stale label
  - retry clears error and restarts install
  - remove deletes both cache groups for optional riwayah
  - removing the active optional riwayah switches to verified Qaloon before deletion and refuses removal if Qaloon verification fails
  - unavailable row cannot call `setRiwayah`
  - Settings row labels expose installed/installable/installing/unavailable/error state

- [ ] Add E2E tests:
  - installable Hafs path installs and switches
  - unavailable optional package cannot break active reader
  - simulated failed install keeps previous `settings.riwayah`
  - simulated failed install keeps the previous usable row active and leaves "stay current usable" routing intact
  - retry state is visible after failure
  - removing optional package returns row to installable state

- [ ] Update context docs in this task:
  - `docs/context/surfaces/configure.md` for install, retry, unavailable, error, active-row preservation, and previous-usable behavior.
  - `docs/context/surfaces/infra.md` for install/remove/cache/quota orchestration.
  - `docs/context/surfaces/read.md` for missing-package prompt actions and no fallback rendering.
  - `docs/context/data-model.md` if install intent or package state is persisted.
  - `docs/context/architecture.md` if package install ownership becomes a cross-cutting boot or event concern.

- [ ] Run:

```bash
pnpm test -- tests/unit/configure/panel.test.ts tests/unit/infra/offline/offline-selector.test.ts tests/unit/data/offline.test.js
PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm test:e2e -- tests/e2e/infra/offline.spec.js --project="Offline (Preview)" --grep "@offline.*riwayah|riwayah.*@offline"
pnpm test:e2e -- tests/e2e/configure/settings.spec.js --project=chromium --grep "riwayah"
pnpm run docs
pnpm run docs:check
```

Expected: optional riwayah install/remove states are visible, progress is deterministic, and failed or partial installs never change the active riwayah.

## Task 9: Generated Inventories And Cross-Doc Sweep

**Files:** only files that were already updated in the owning implementation tasks, plus generated context inventories.

- Modify `docs/context/surfaces/read.md`
- Modify `docs/context/surfaces/configure.md`
- Modify `docs/context/surfaces/infra.md`
- Modify `docs/context/surfaces/navigate.md` only if navigation drawer or mode switch wording changes
- Modify `docs/context/architecture.md`
- Modify `docs/context/data-model.md`
- Modify `docs/context/source-data-flow.md`
- Modify `docs/tech-stack.md` only if script/tooling requirements changed

- [ ] Confirm `read.md` was already updated by the read-surface tasks:
  - Mushaf is full-viewport and unframed
  - route is `#/m/:page`
  - active riwayah comes from Settings
  - edge-swipe/edge-tap physical direction semantics
  - page chip behavior
  - inline SVG theme behavior
  - no tap-to-verse, overlays, or quran.ws runtime fetch

- [ ] Confirm `configure.md` was already updated by the package-state/configure tasks:
  - Settings exposes riwayah package state
  - only installed/usable riwayat persist to `settings.riwayah`
  - installable/unavailable/error rows behavior
  - pending install state is separate from active riwayah
  - previous-usable-riwayah/install-intent behavior is documented if user-visible

- [ ] Confirm `infra.md` was already updated by the package-state/infra tasks:
  - package index path
  - per-riwayah page caches
  - text+page package install/remove
  - quota preflight
  - service-worker cache route ownership

- [ ] Confirm `architecture.md` and `data-model.md` were already updated only for changed ownership:
  - package availability owner
  - `settings.riwayah` sole-writer constraints
  - package install state storage, if persisted

- [ ] Confirm `source-data-flow.md` was already updated by the data-build tasks:
  - build-time SVG tokenization and integrity checks
  - optional riwayah package index generation
  - baseline Qaloon and optional Hafs/Warsh artifacts

- [ ] If any required context doc item above is missing, go back to the owning task and apply it there. Do not treat this task as permission to batch new behavior docs after implementation.

- [ ] Run:

```bash
pnpm run docs
pnpm run docs:check
```

Expected: generated inventories are current, no generated fence block was hand-edited, and the final sweep finds no behavior doc that was deferred from its owning task.

## Task 10: Final Verification

**Files:** no new source ownership; run verification against the full change.

- [ ] Run targeted unit suites:

```bash
pnpm test -- \
  tests/unit/read/mushaf/navigation.test.ts \
  tests/unit/read/mushaf/sizing.test.ts \
  tests/unit/read/mushaf/svg-page.test.ts \
  tests/unit/read/mushaf/reader.test.ts \
  tests/unit/scripts/mushaf-pages.test.js \
  tests/unit/data/mushaf-pages.test.ts \
  tests/unit/data/riwayah-packages.test.ts \
  tests/unit/configure/riwayah.test.ts \
  tests/unit/configure/panel.test.ts \
  tests/unit/infra/offline/offline-selector.test.ts \
  tests/unit/data/offline.test.js \
  tests/unit/infra/sw/route-defs.test.ts
```

Expected: all targeted unit suites pass.

- [ ] Run targeted E2E suites:

```bash
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project=chromium --grep "Mushaf"
pnpm test:e2e -- tests/e2e/read/chrome.spec.js --project="Mobile Chrome" --grep "@mobile.*Mushaf|Mushaf.*@mobile"
pnpm test:e2e -- tests/e2e/read/performance.spec.js --project=chromium
pnpm test:e2e -- tests/e2e/configure/settings.spec.js --project=chromium --grep "riwayah"
PLAYWRIGHT_INCLUDE_OFFLINE=1 pnpm test:e2e -- tests/e2e/infra/offline.spec.js --project="Offline (Preview)" --grep "@offline.*riwayah|riwayah.*@offline"
time pnpm playwright test tests/e2e/read/chrome.spec.js --reporter=line
```

Expected: Mushaf layout, navigation, theme, package state, and install flows pass.

- [ ] Run full validation:

```bash
pnpm validate
```

Expected: lint, stylelint, theme checks, Svelte check, unit tests, build, chunk check, and docs check all pass with no warnings treated as acceptable noise.

- [ ] Run a final diff scan:

```bash
git diff --check
rg -n "760px|100dvh - 220px|qa-mushaf-scrubber" src tests scripts docs/context
rg -n "quran\\.ws" src tests scripts docs/context
```

Expected:

- `git diff --check` has no output.
- `760px`, `100dvh - 220px`, and `qa-mushaf-scrubber` do not appear in active Mushaf ready-state implementation or tests except in historical/spec assertions that prove removal.
- `quran.ws` appears only in source attribution, catalog, build/import scripts, source-data-flow documentation, and tests that assert no runtime fetch. The scan intentionally excludes `docs/superpowers/plans/**` and `docs/superpowers/specs/**` because those docs preserve the historical requirement language being implemented.

## Implementation Risks

- Inline SVG rendering can become an XSS or accessibility problem if runtime accepts untrusted markup. Keep build-time sanitization, runtime same-origin URL validation, parsed-DOM descendant sanitization, URL/reference validation, and sanitized-DOM serialization all in place.
- SVG recoloring can damage Mushaf fidelity if classification is too broad. Reject unknown colors and inspect real generated pages before expanding the color map.
- The viewport fit can regress if CSS and JS each subtract chrome. Base the ready-state fit on the actual `#main-content` rectangle and subtract only overlapping chrome once; E2E expected-fit assertions must compute from the same measured facts used by the implementation.
- The chip can occlude page content on small mobile devices if it is only visually positioned. Use the chip-placement helper and assert collision-free boxes in E2E.
- Page turns can exceed the long-task budget if every navigation parses and mounts a large inline SVG from cold state. Cache sanitized markup for the visible page and prefetch/sanitize adjacent pages before asserting the page-turn budget.
- Package state can create broken UI if `settings.riwayah` is updated before install verification. Keep pending install state and previous-usable-riwayah/install intent separate, and switch only after verification.
- Optional package terminology can drift. Keep `available`, `installable`, `installed`, and `usable` meanings aligned across package helpers, Settings, offline UI, prompts, and docs.
- Offline install tests need the preview service-worker project. Keep those under the existing `@offline` workflow to avoid dev-server false positives.

## Verification Gaps Closed By This Plan

- Bounding-box assertions at `390x844` and `1440x1000`.
- Assertions that the old `760px` width cap and `100dvh - 220px` height cap are gone.
- Assertions that no ready-state frame/card/shadow/footer row remains.
- Physical Mushaf navigation tests across swipe, edge tap, keyboard, and boundaries.
- Page chip open, clamp, commit, cancel, focus restore, and input suppression tests.
- SVG transform tests for geometry preservation, color classification, and unsafe content rejection.
- Light, sepia, and dark token/pixel checks proving no CSS inversion or light fallback.
- Accessibility checks for one labeled page image, focusable overlays, and non-focusable internal paths.
- Package index, availability/installability/installed/usability semantics, unavailable, failure, retry, remove, and active-riwayah preservation tests.
- Previous-usable-riwayah/install-intent tests for failed installs, stale unusable active settings, and "stay current usable" routing.
- Context docs land in owning implementation tasks, with generated inventory verification as the final sweep.
- E2E timing pass for the materially expanded read journey spec.

## Self-Review Checklist

- [ ] Every redesign spec requirement maps to at least one task above.
- [ ] No task depends on a riwayah route parameter; active riwayah remains settings-owned.
- [ ] Phase 1 can ship Qaloon reader redesign without Hafs/Warsh install flows.
- [ ] Phase 2 prevents broken riwayah persistence before Phase 3 adds full install/remove UX.
- [ ] Phase 2 defines `available`, `installable`, `installed`, and `usable` semantics without ambiguity.
- [ ] Phase 3 preserves the previous usable riwayah on failed or partial install through explicit install-intent state.
- [ ] Runtime inline SVG rendering requires parsed-DOM sanitization and sanitized serialization before `{@html}`.
- [ ] Viewport fitting starts from the measured `#main-content` rect and avoids double-subtracting shell chrome.
- [ ] Page-turn performance assertions have adjacent-page prefetch/caching support and a defined measurement window.
- [ ] Behavior docs are updated inside the task that changes the behavior, not deferred to the final sweep.
- [ ] Materially expanded E2E work includes the required spec timing command.
- [ ] Test commands use existing project scripts from `package.json`.
- [ ] No step asks workers to hand-edit generated context fences.
- [ ] The plan contains no unresolved open slots.
