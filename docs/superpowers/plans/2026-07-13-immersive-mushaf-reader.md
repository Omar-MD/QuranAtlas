# Immersive Mushaf Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Mushaf reader use the complete viewport across phone, tablet, desktop, portrait, and landscape while providing progressive page rendering, queued navigation, and truthful recovery from transient failures.

**Architecture:** One edition-scoped profile session validates and shares the Mushaf index, manifest, and framing capability. A five-entry logical window keeps outer entries metadata-only, makes the current page and immediate neighbours readable concurrently, promotes V2 previews without blocking, and retains readable media through retries and quality upgrades. Reader chrome becomes one responsive overlay system controlled by a session-scoped discovery timer.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind v4 semantic CSS, Vitest 4, Testing Library, Playwright 1.59, Node.js ESM dataset builders, generated same-origin Mushaf manifests, and Workbox CacheFirst dataset assets.

## Global Constraints

- Approved design: `docs/superpowers/specs/2026-07-13-immersive-mushaf-reader-design.md`.
- Preserve the Verse reader, one-page Mushaf model, physical Mushaf direction, route hashes, bookmark schema, Daily Wird semantics, Settings ownership, Navigation ownership, and existing Fit page/Fit width/continuous preferences.
- Do not add a two-page spread, permanent desktop sidebar, new reading mode, new runtime dependency, or direct Radix import outside `src/components/ui/**`.
- Top and bottom Mushaf chrome MUST overlay the page and MUST NOT reserve viewport rows or calculated top/bottom page space.
- Controls reveal once for exactly 2,500 milliseconds after the first readable page in a Mushaf route session; page turns, upgrades, retries, resize, rotation, and preference changes MUST NOT restart the timer.
- Hidden chrome MUST be removed from pointer interaction, sequential focus, and the accessibility tree.
- V2 current pages MUST commit the 1,280-pixel rendition before the 2,136-pixel rendition and MUST retain readable preview media through upgrade failure.
- V1 outer entries MUST remain metadata-only and MUST NOT fetch or parse SVG page bodies.
- Automatic retries use exactly two retry delays, `150` and `500` milliseconds, after the first attempt. Explicit Retry begins a new three-attempt cycle.
- `404` is confirmed missing. Network errors, `5xx`, and image decode errors are transient. Invalid profile contracts fail the profile session without retry; unsafe or invalid individual page content is terminal but MUST NOT use missing/unavailable copy.
- A discrete request for an unready page retains the visible page, queues one destination, and commits automatically when readable. A newer request replaces the prior pending destination.
- QuranAtlas project rules override the generic writing-plans TDD default. Add durable tests in the same task as changed behavior, but do not enforce test-first ordering.
- Unit tests assert public state, callbacks, accessible names, copy, routes, and data contracts. Real geometry, paint, safe areas, scrolling, orientation, service workers, and gesture timing remain in Playwright.
- Never hand-edit generated context fences. Regenerate them with `pnpm run docs`.
- Each task stages only its listed files and preserves unrelated worktree changes.

---

## File And Interface Map

### New focused modules

- `scripts/data/mushaf-pages/display-view-box.mjs`
  - Computes and validates the stable V1 display viewBox during the Mushaf page build.
- `src/app/routes/read/useMushafProfileSession.ts`
  - Owns one validated index/manifest request per active edition and derives framing capability from that context.
- `src/app/routes/read/mushaf-page-window-state.ts`
  - Defines page descriptor, readable rendition, retry, and terminal-state helpers without React lifecycle concerns.
- `src/components/reader/useMushafChromeVisibility.ts`
  - Owns the one-shot discovery timer, manual toggle/reveal/hide, and pause sources.

### Existing ownership boundaries

- `scripts/data/mushaf-pages/build.mjs`
  - Emits V1 `displayViewBox`, bumps the transform identity, and refreshes generated manifests and indexes.
- `src/packs/mushaf-page-asset.ts`
  - Validates V1/V2 descriptors, prepares page media, classifies load failures, and consumes generated V1 framing metadata.
- `src/app/routes/read/useMushafPageWindow.ts`
  - Schedules current/neighbor preparation, V2 promotion, bounded retry, stale-result rejection, and retention.
- `src/app/routes/read/MushafRoute.tsx`
  - Composes the shared profile session, visible page, pending discrete destination, truthful recovery, and chrome controller.
- `src/components/reader/{ReaderPageShell,ReaderChrome,MushafPageViewer}.tsx`
  - Render the overlay title/actions/dock and expose public interaction outcomes.
- `src/design-system/index.css`
  - Owns full-viewport stage geometry, overlay placement, responsive adaptations, safe areas, and reduced motion.
- `tests/unit/scripts/mushaf-pages.test.js`
  - Owns V1 generated metadata contracts.
- `tests/unit/react-read/{mushaf-page-window,reader-wave3}.test.tsx`
  - Own profile/window/retry/queued-navigation/chrome behavior.
- `tests/e2e/read/{mushaf-responsive,react-golden}.spec.ts`
  - Own browser geometry, interaction, delayed navigation, and production recovery outcomes.
- `tests/e2e/infra/react-offline.spec.ts`
  - Owns production service-worker proof for revisited current and adjacent Mushaf pages.

### Generated outputs

- `public/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json`
- `public/dataset/mushaf-pages/qaloon/manifest.json`
- `public/dataset/indexes/mushaf-assets.json`
- `public/dataset/manifest.json`

Do not edit these four files manually. Generate them through the focused Mushaf page build in Task 1.

---

### Task 1: Generate Stable V1 Display Framing

**Files:**
- Create: `scripts/data/mushaf-pages/display-view-box.mjs`
- Modify: `scripts/data/mushaf-pages/build.mjs`
- Modify: `tests/unit/scripts/mushaf-pages.test.js`
- Generate: `public/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json`
- Generate: `public/dataset/mushaf-pages/qaloon/manifest.json`
- Generate: `public/dataset/indexes/mushaf-assets.json`
- Generate: `public/dataset/manifest.json`

**Interfaces:**
- Produces `deriveMushafDisplayViewBox(svgText, filename): string`.
- Adds required `displayViewBox: string` to every V1 manifest page while retaining the existing source `viewBox`.
- Task 2 consumes both fields and rejects missing or out-of-bounds display framing.

- [ ] **Step 1: Add the build-time display-viewBox module**

Move the existing page-ink bounding algorithm from `src/packs/mushaf-page-asset.ts` into an ESM build helper. Parse build-owned themed SVG with the already installed `jsdom` development dependency; recognize build tokens `var(--qa-mushaf-ink)` and `var(--qa-mushaf-accent)`.

The public API and output contract are:

```js
import { JSDOM } from 'jsdom'

const QURAN_WS_SOURCE = { x: 0, y: 0, width: 900, height: 1379.25 }
const QURAN_WS_FALLBACK = { x: 60, y: 60, width: 790, height: 1270 }

export function deriveMushafDisplayViewBox(svgText, filename) {
  const document = new JSDOM(String(svgText), { contentType: 'image/svg+xml' }).window.document
  const root = document.documentElement
  if (root.localName !== 'svg') throw new Error(`Mushaf page ${filename} is not an SVG document`)
  const source = parseViewBox(root.getAttribute('viewBox'), filename)
  const display = isQuranWsSource(source)
    ? displayInkBounds(root, source) ?? QURAN_WS_FALLBACK
    : source
  assertContainedViewBox(display, source, filename)
  return serializeViewBox(display)
}
```

Port `displayInkBoundsForMushafPage`, `clippedPathBounds`, `nearestClipPathId`, `pathDataBounds`, three-decimal rounding, and containment validation without changing the current 24-unit margin or fallback rectangle.

- [ ] **Step 2: Emit the new manifest field**

In `build.mjs`:

```js
import { deriveMushafDisplayViewBox } from './display-view-box.mjs'

const BUILD_TRANSFORM_ID = 'quranatlas-mushaf-pages-theme-v2'

// During the quran.ws page loop:
pageViewBoxes.set(page, viewBoxForThemedPage(themed, filename))
pageDisplayViewBoxes.set(page, deriveMushafDisplayViewBox(themed, filename))

// In buildMushafManifestPayload:
pages.push({
  page,
  assetPath: `pages/${filename}`,
  viewBox,
  displayViewBox,
  bytes,
  sourcePdfUrl: quranWsPagePdfUrl(sourceSlug, page),
  firstVerse: first,
})
```

Require `pageDisplayViewBoxes` for every V1 page and throw `No display viewBox mapping for Mushaf page N` when absent.

- [ ] **Step 3: Extend the existing script contract tests**

Add assertions that prove:

```js
expect(deriveMushafDisplayViewBox(
  '<svg viewBox="0 0 900 1379.25"><path fill="var(--qa-mushaf-ink)" d="M 100 200 L 300 400"/></svg>',
  '001.svg',
)).toBe('76 176 248 248')

expect(deriveMushafDisplayViewBox(
  '<svg viewBox="0 0 900 1379.25"><path fill="var(--qa-mushaf-ground)" d="M 0 0 L 900 1379.25"/></svg>',
  '001.svg',
)).toBe('60 60 790 1270')

expect(manifest.pages[0]).toMatchObject({
  viewBox: '0 0 10 20',
  displayViewBox: '0 0 10 20',
})
```

Also assert that a display rectangle outside its source viewBox throws and that every emitted quran.ws page includes a parseable positive rectangle.

- [ ] **Step 4: Run the focused script test and generate output**

```bash
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon --check
```

Expected: the Vitest file passes; the build updates only the generated Mushaf manifests/index membership needed by the new manifest bytes; check mode reports current output.

- [ ] **Step 5: Inspect and commit the data contract**

```bash
git diff --check
git status --short
git add scripts/data/mushaf-pages/display-view-box.mjs scripts/data/mushaf-pages/build.mjs tests/unit/scripts/mushaf-pages.test.js public/dataset/mushaf-pages/qaloon/qalun-quran-ws-v1/manifest.json public/dataset/mushaf-pages/qaloon/manifest.json public/dataset/indexes/mushaf-assets.json public/dataset/manifest.json
git commit -m "data: precompute Mushaf display framing"
```

Expected: the commit contains build code, contract coverage, and generated metadata; SVG page bodies remain unchanged.

---

### Task 2: Share One Profile Context And Split Descriptors From Media

**Files:**
- Create: `src/app/routes/read/useMushafProfileSession.ts`
- Modify: `src/packs/mushaf-page-asset.ts`
- Modify: `src/app/routes/read/useMushafPageWindow.ts`
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `tests/unit/react-read/mushaf-page-window.test.tsx`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`

**Interfaces:**
- Produces `MushafPageDescriptor`, `describeMushafPage`, `prepareMushafDescriptorMedia`, and `deriveMushafFramingCapability`.
- Produces `useMushafProfileSession({ enabled, profile })` returning one stable validated context and retry function.
- Task 3 consumes descriptors without fetching outer V1 bodies.

- [ ] **Step 1: Add explicit descriptor and failure contracts**

In `mushaf-page-asset.ts`, introduce:

```ts
export type MushafPageDescriptor =
  | {
      kind: 'inline-svg'
      assetUrl: string
      displayViewBox: SvgViewBox
      sourceViewBox: SvgViewBox
      resolved: MushafResolvedPage
    }
  | PreparedExternalMushafPage

export type MushafMediaPurpose = 'readable' | 'full'

export class MushafAssetHttpError extends Error {
  constructor(readonly url: string, readonly status: number) {
    super(`Failed to fetch ${url}: ${status}`)
  }
}

export type MushafPageFailureKind = 'transient' | 'confirmed-missing' | 'contract-error'
```

`describeMushafPage(context, page)` performs identity, manifest membership, descriptor/index agreement, and viewBox containment validation but no page-body or image request. For V1 it reads `viewBox` and `displayViewBox` from the manifest. For V2 it returns the current prepared external descriptor object.

`prepareMushafDescriptorMedia(descriptor, purpose, signal)` fetches/sanitizes V1 only for `readable`, selects V2 preview for `readable`, and selects V2 full for `full`.

- [ ] **Step 2: Consume generated V1 framing without path scanning**

Change inline preparation to accept the descriptor rectangles:

```ts
export function prepareReactInlineMushafSvg(
  text: string,
  expected: { sourceViewBox: SvgViewBox; displayViewBox: SvgViewBox },
): ReactInlineMushafSvg {
  // Parse and validate safety exactly as today.
  // Reject source viewBox disagreement.
  // Remove owned accessibility attributes and rewrite paint.
  root.setAttribute('viewBox', serializeViewBox(expected.displayViewBox))
  return { markup: serializer.serializeToString(root), viewBox: expected.displayViewBox, viewBoxText }
}
```

Set V1 `resolved.displaySize` from `displayViewBox.width` and `displayViewBox.height`. Delete the runtime-only ink bounds, clip bounds, path-number scanning, CSS escaping, and quran.ws fallback functions after all callers use manifest metadata. Keep runtime SVG safety validation and paint rewriting unchanged.

- [ ] **Step 3: Derive framing capability from an existing context**

Add:

```ts
export function deriveMushafFramingCapability(context: MushafPageProfileContext): MushafFramingCapability {
  if (context.manifest.version !== 2) return { hasValidFraming: false }
  const valid = context.manifest.pages.length === context.manifest.pageCount
    && context.manifest.pages.every((page, index) => page.page === index + 1 && isMushafPageFraming(page.framing))
  if (!valid) return { hasValidFraming: false }
  const representativeTextFrame = context.manifest.pages[Math.floor(context.manifest.pages.length / 2)]?.framing.textFrame
  return representativeTextFrame ? { hasValidFraming: true, representativeTextFrame } : { hasValidFraming: false }
}
```

Retain `loadMushafFramingCapability` only as a compatibility wrapper that loads one context and delegates. `MushafRoute` must stop calling that wrapper.

- [ ] **Step 4: Add the profile-session hook**

Use this public contract:

```ts
export type MushafProfileSession =
  | { status: 'idle' | 'loading'; key: string | null; context: null; framingCapability: MushafFramingCapability; retry: () => void }
  | { status: 'ready'; key: string; context: MushafPageProfileContext; framingCapability: MushafFramingCapability; retry: () => void }
  | { status: 'error'; key: string; context: null; error: Error; framingCapability: MushafFramingCapability; retry: () => void }

export function useMushafProfileSession(input: {
  enabled: boolean
  profile: { mushafEditionId: string; riwayah: Riwayah } | null
}): MushafProfileSession
```

Key the request by `riwayah:mushafEditionId`, abort it only when that key changes or the route unmounts, and keep retry generation local to the session. On ready, derive framing synchronously from the returned context.

Keep `loadPreparedMushafPage` as a compatibility composition for non-window callers: it calls `describeMushafPage`, then prepares V1 readable media or the existing V2 full rendition. The page window must use the split descriptor/media APIs directly.

- [ ] **Step 5: Pass the session into the window and route**

Replace the window's internal `createProfileRequest` with inputs:

```ts
useMushafPageWindow({
  enabled: assetState === 'ready',
  page,
  session: profileSession,
})
```

The route uses `profileSession.framingCapability` and the session retry for a profile-level asset gate. Do not clear a retained visible page merely because the replacement profile session is loading or errors.

- [ ] **Step 6: Extend unit coverage and run it**

Prove through existing test files that one route session calls `loadMushafPageProfileContext` once, framing derivation causes no second fetch, five descriptors are created with only the current and immediate V1 pages eligible for media preparation, invalid `displayViewBox` fails the contract, and changed edition identity aborts stale work.

```bash
pnpm exec vitest run tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
```

Expected: both focused suites and the static gate pass without warnings.

- [ ] **Step 7: Commit the shared profile boundary**

```bash
git add src/app/routes/read/useMushafProfileSession.ts src/app/routes/read/useMushafPageWindow.ts src/app/routes/read/MushafRoute.tsx src/packs/mushaf-page-asset.ts tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
git commit -m "refactor: share Mushaf profile context"
```

---

### Task 3: Make Page Preparation Progressive And Retryable

**Files:**
- Create: `src/app/routes/read/mushaf-page-window-state.ts`
- Modify: `src/app/routes/read/useMushafPageWindow.ts`
- Modify: `src/packs/mushaf-page-asset.ts`
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `tests/unit/react-read/mushaf-page-window.test.tsx`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`

**Interfaces:**
- Produces truthful window entry states and helpers consumed by Task 4.
- Preserves the existing `MushafReadyPageAssetState` renderer boundary.

- [ ] **Step 1: Define the explicit window-state union**

Use this state model in `mushaf-page-window-state.ts`:

```ts
export type MushafPageWindowEntry =
  | { page: number; descriptor: MushafPageDescriptor; status: 'descriptor' }
  | { page: number; descriptor: MushafPageDescriptor; attempt: number; status: 'loading' | 'retrying' }
  | {
      page: number
      descriptor?: MushafPageDescriptor
      asset: MushafReadyPageAssetState
      rendition: 'preview' | 'full'
      status: 'ready'
      upgradeStatus: 'idle' | 'loading' | 'retrying' | 'failed'
    }
  | { page: number; descriptor: MushafPageDescriptor; error: Error; status: 'transient-error' | 'contract-error' }
  | { page: number; descriptor: MushafPageDescriptor; reason: string; status: 'confirmed-missing' }

export const MUSHAF_RETRY_DELAYS_MS = [150, 500] as const

export function readableAsset(entry: MushafPageWindowEntry | undefined): MushafReadyPageAssetState | null {
  return entry?.status === 'ready' ? entry.asset : null
}
```

Add pure immutable helpers for setting an attempt, committing a preview, committing full media, preserving a ready asset on upgrade failure, and rejecting stale generation writes.

`descriptor` is optional only for the synthetic retained-ready entry that keeps a visible page mounted outside the requested five-page window. Internal window entries always retain their descriptor; full promotion never runs for a synthetic entry until that page re-enters the owned window and regains its validated descriptor.

- [ ] **Step 2: Classify failures at the asset boundary**

`fetchJson` and `fetchText` throw `MushafAssetHttpError`. Export:

```ts
export function classifyMushafPageFailure(error: unknown): MushafPageFailureKind {
  if (error instanceof MushafAssetHttpError) {
    if (error.status === 404) return 'confirmed-missing'
    if (error.status >= 500) return 'transient'
    return 'contract-error'
  }
  if (error instanceof DOMException && error.name === 'AbortError') throw error
  if (error instanceof DOMException && error.name === 'EncodingError') return 'transient'
  if (error instanceof TypeError) return 'transient'
  if (error instanceof Error && /decode|Failed to load Mushaf image/i.test(error.message)) return 'transient'
  return 'contract-error'
}
```

Never map a contract error to confirmed missing.

- [ ] **Step 3: Schedule readable media without serial blocking**

When a ready profile context arrives, create descriptors for the retained five-page logical window synchronously. Start readable preparation for the requested page and its immediate neighbours in the same effect without awaiting preferred quality:

```ts
void ensureReadable(requestedPage, generation)
for (const neighbor of [requestedPage - 1, requestedPage + 1]) {
  if (descriptors.has(neighbor)) void ensureReadable(neighbor, generation)
}
```

Do not call `prepareMushafDescriptorMedia` for `requestedPage ± 2`. Track requests by `${page}:readable` and `${page}:full` so a full upgrade never aborts an in-flight preview.

- [ ] **Step 4: Promote V2 preview after it becomes readable**

For external-image descriptors, every first readable request uses purpose `readable`. Commit its 1,280-pixel asset immediately. If the page is current, then start purpose `full`; when its 2,136-pixel media succeeds, replace the asset in place. Abort a still-loading full request when that page leaves the current position so it cannot compete with the new current page, but never abort its readable preview request. When full preparation exhausts retries, keep `status: 'ready'`, preserve the preview asset, and set `upgradeStatus: 'failed'` without surfacing unavailable copy.

V1 readable preparation commits once as rendition `full` and never has an upgrade request.

- [ ] **Step 5: Add bounded automatic retry**

For transient failure, wait using an abort-aware timer and retry with attempt indices 1 and 2. State is `loading` for attempt 0 and `retrying` for attempts 1 and 2. After attempt 2 fails, use `transient-error` unless a readable asset already exists; upgrade failure uses `upgradeStatus: 'failed'` instead.

Confirmed missing and contract error commit immediately with no timer. Explicit `retry(page)` resets that page to attempt 0 and starts a new cycle. Profile retry remains owned by Task 2.

- [ ] **Step 6: Make viewer copy truthful**

Replace the current catch-all unavailable branch with:

```tsx
{entry.status === 'loading' || entry.status === 'retrying' ? (
  <div aria-live="polite" className="qar-react-mushaf-page-status" role="status">
    {entry.status === 'retrying' ? `Retrying Mushaf page ${entry.page}` : `Loading Mushaf page ${entry.page}`}
  </div>
) : entry.status === 'confirmed-missing' ? (
  <div className="qar-react-mushaf-page-status">Mushaf page {entry.page} is unavailable.</div>
) : entry.status === 'transient-error' || entry.status === 'contract-error' ? (
  <div className="qar-react-mushaf-page-status">Mushaf page {entry.page} could not be loaded.</div>
) : null}
```

Hidden/background cells do not use live regions. Route-level requested status owns announcements.

- [ ] **Step 7: Extend progressive-loading tests**

Add behavior assertions that:

- current and immediate neighbors begin before full promotion completes;
- outer V1 descriptors call no page-body fetch;
- initial V2 current commits width `1280` before width `2136`;
- an in-flight neighbor preview survives promotion to current;
- failed full promotion leaves width `1280` ready;
- transient failure calls exactly three attempts and succeeds without unavailable text;
- `404` performs one attempt and becomes confirmed missing;
- contract error performs one attempt and does not use unavailable text;
- stale retries and stale full completions cannot overwrite a newer profile/window generation.

Use fake timers only around `MUSHAF_RETRY_DELAYS_MS`; do not assert CSS or DOM placement.

- [ ] **Step 8: Run focused tests and commit**

```bash
pnpm exec vitest run tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
git diff --check
git add src/app/routes/read/mushaf-page-window-state.ts src/app/routes/read/useMushafPageWindow.ts src/packs/mushaf-page-asset.ts src/components/reader/MushafPageViewer.tsx tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
git commit -m "fix: make Mushaf page loading progressive"
```

Expected: focused suites and static checks pass; the commit contains no generated or unrelated files.

---

### Task 4: Queue Unready Navigation And Preserve Recovery

**Files:**
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`
- Modify: `tests/e2e/read/react-golden.spec.ts`

**Interfaces:**
- Produces `pendingPage: number | null` and one automatic discrete commit path.
- Consumes Task 3 `readableAsset`, `retry`, and explicit window-entry statuses.
- Task 5 consumes `recoveryPinned` and loading status for chrome visibility.

- [ ] **Step 1: Route every discrete page request through one handler**

In `MushafRoute`, use:

```ts
const [pendingPage, setPendingPage] = useState<number | null>(null)

const requestDiscretePage = useCallback((nextPage: number) => {
  const ready = readyWindowPage(windowState.entries, nextPage)
  if (ready) {
    commitDiscretePage(ready)
    return
  }
  setPendingPage(nextPage)
  windowState.request(nextPage)
}, [windowState.entries, windowState.request])
```

`commitDiscretePage` advances Daily Wird only for forward movement, commits the ready asset, clears pending state, hides chrome, and assigns the protected Mushaf hash exactly once.

- [ ] **Step 2: Commit pending navigation automatically**

Add an effect that observes only the pending entry's readable asset:

```ts
useEffect(() => {
  if (interactionSuspended) {
    setPendingPage(null)
    return
  }
  if (pendingPage === null) return
  const ready = readyWindowPage(windowState.entries, pendingPage)
  if (ready) commitDiscretePage(ready)
}, [interactionSuspended, pendingPage, windowState.entries])
```

A newer page request replaces `pendingPage`. Clear it when leaving Mushaf mode through cleanup, when the edition key changes, when the user chooses Stay, when Settings or Navigation opens, or when its entry reaches `transient-error`, `contract-error`, or `confirmed-missing`. Task 5 routes the shell-owned Navigation pin through the same clear path.

- [ ] **Step 3: Keep gesture and button behavior unified**

`MushafPageViewer` keeps physical-direction readiness for the drag animation. A non-ready edge tap, arrow, dock button, or gesture destination calls `onRequestPage(nextPage)` once and settles the current page; it never requires a second user action. A ready destination calls `onNavigate(nextPage)`.

Before hiding controls from a focused dock action, focus the stage with `{ preventScroll: true }` so a removed control never retains focus.

- [ ] **Step 4: Add requested loading and terminal recovery states**

While `pendingPage` is loading or retrying, render one polite route-level status:

```tsx
<div aria-live="polite" className="qar-react-mushaf-request-loading" role="status">
  {entry.status === 'retrying' ? `Retrying page ${pendingPage}` : `Loading page ${pendingPage}`}
</div>
```

Do not reveal Retry/Stay until automatic retries finish. On terminal failure, retain the visible page and show Retry/Stay. `confirmed-missing` may say unavailable; transient and contract failure say could not be loaded. The asset gate appears only when no readable page exists.

- [ ] **Step 5: Extend unit and browser recovery coverage**

Unit tests prove a delayed neighbor request leaves the current page mounted, then changes the route automatically when ready; a second request replaces the first; overlay suspension defers but does not lose a ready commit; Stay restores the visible hash; and forward Daily Wird advancement happens once.

Extend `react-golden.spec.ts` with request interception for:

- first page request `503`, second request `200`: no unavailable copy and eventual visible destination;
- persistent `503`: visible prior page plus reachable Retry/Stay after three attempts;
- requested `404`: one attempt and confirmed unavailable recovery;
- failed background neighbor: no live failure announcement until requested.

- [ ] **Step 6: Run focused verification and commit**

```bash
pnpm exec vitest run tests/unit/react-read/reader-wave3.test.tsx
pnpm playwright test tests/e2e/read/react-golden.spec.ts --project=chromium --reporter=line
pnpm run check
git diff --check
git add src/app/routes/read/MushafRoute.tsx src/components/reader/MushafPageViewer.tsx tests/unit/react-read/reader-wave3.test.tsx tests/e2e/read/react-golden.spec.ts
git commit -m "fix: queue Mushaf page navigation"
```

Expected: the focused unit and browser suites pass and no page request needs a second user action.

---

### Task 5: Add One-Shot Immersive Chrome Semantics

**Files:**
- Create: `src/components/reader/useMushafChromeVisibility.ts`
- Modify: `src/app/routes/read/MushafRoute.tsx`
- Modify: `src/components/reader/ReaderPageShell.tsx`
- Modify: `src/components/reader/ReaderChrome.tsx`
- Modify: `src/components/reader/MushafPageViewer.tsx`
- Modify: `tests/unit/react-read/reader-wave3.test.tsx`

**Interfaces:**
- Produces a session-scoped `MushafChromeController`.
- Moves the Surah label into `ReaderChrome` and the bookmark into the bottom page dock.
- Task 6 supplies responsive geometry without changing these interaction contracts.

- [ ] **Step 1: Implement the visibility controller**

Use this public API:

```ts
export const MUSHAF_CHROME_DISCOVERY_MS = 2_500
export type MushafChromePin = 'drawer' | 'focus' | 'interaction' | 'recovery'

export type MushafChromeController = {
  visible: boolean
  hide: () => void
  reveal: () => void
  toggle: () => void
  setPinned: (source: MushafChromePin, pinned: boolean) => void
}

export function useMushafChromeVisibility(readable: boolean): MushafChromeController
```

The first `false -> true` readable transition starts one 2,500-millisecond timer. Store its deadline and remaining duration in refs. The first pin reveals chrome and pauses the timer; removing the last pin resumes the remaining duration only when the discovery timer was already armed. `reveal()` and `Escape` set visible without arming another timer. `hide()` and a page commit hide immediately. Unmount clears the timer; page/rendition/resize updates do not recreate it.

- [ ] **Step 2: Wire pause sources through the shell**

Add `onChromePinChange?: (source: MushafChromePin, pinned: boolean) => void` and `surahLabel?: string` to `ReaderPageShell`.

- Pin `drawer` from `drawerState.open`.
- Pin `interaction` from the Settings `interactionSuspended` prop.
- Pin `focus` on top-chrome focus capture and clear it only when related focus leaves the chrome.
- Pin `recovery` from route-level requested failure.
- Reveal before opening Navigation or Settings.
- Pass the same pin callback to `MushafPageViewer`; the bottom dock pins `focus` on focus capture and clears it only when related focus leaves the dock.

Verse mode keeps its existing scroll-driven behavior and does not instantiate the Mushaf controller.

- [ ] **Step 3: Put the Surah title in the top chrome**

Add `title?: ReactNode` to `ReaderChrome` and group the three logical zones explicitly:

```tsx
<div className="qar-reader-chrome-left">
  <IconButton id="reader-navigation-trigger" label="Open navigation" onClick={onOpenNavigation}>
    <Menu aria-hidden="true" size={26} strokeWidth={1.8} />
  </IconButton>
</div>
{title ? <div className="qar-reader-chrome-title" dir="rtl" lang="ar">{title}</div> : null}
<div className="qar-reader-chrome-right">
  {wirdStatus}
  {onModeChange ? <ReadingViewToggle mode={mode} onModeChange={onModeChange} /> : null}
  {!hideSettings ? (
    <IconButton id="reader-settings-trigger" label="Open settings" onClick={onOpenSettings}>
      <Settings aria-hidden="true" size={26} strokeWidth={1.6} />
    </IconButton>
  ) : null}
</div>
```

At route composition, add these exact props to the existing `ReaderPageShell` call so the retained visible page owns the title:

```tsx
chromeVisible={chrome.visible}
onChromePinChange={handleChromePin}
onChromeVisibleChange={(visible) => visible ? chrome.reveal() : chrome.hide()}
surahLabel={currentSurahLabel}
```

Set `aria-hidden={!visible}` and `inert={!visible ? true : undefined}` on the top `nav`. Keep the title a single contextual label, not a second heading. Remove the standalone `qar-react-mushaf-page-surah` element from `MushafPageViewer`.

Delete the old `qar-reader-chrome-spacer` element and its CSS rule; the explicit grid zones replace it for Verse and Mushaf routes.

When `drawer` or `interaction` becomes pinned, route the notification through a wrapper that also clears `pendingPage`:

```ts
function handleChromePin(source: MushafChromePin, pinned: boolean) {
  chrome.setPinned(source, pinned)
  if (pinned && (source === 'drawer' || source === 'interaction')) setPendingPage(null)
}
```

- [ ] **Step 4: Make the bottom dock one accessible overlay**

Render the page actions and bookmark together only while chrome is visible:

```tsx
{chromeVisible ? (
  <nav aria-label="Mushaf page navigation" className="qar-react-mushaf-page-actions">
    <IconButton label="Next Mushaf page" onClick={() => requestOrNavigate(resolved.page + 1)}>
      <ChevronLeft aria-hidden="true" />
    </IconButton>
    <div aria-label={`Mushaf page ${resolved.page}`} className="qar-react-mushaf-page-counter">{resolved.page}</div>
    <IconButton label="Previous Mushaf page" onClick={() => requestOrNavigate(resolved.page - 1)}>
      <ChevronRight aria-hidden="true" />
    </IconButton>
    <IconButton aria-pressed={bookmarked} label={bookmarkLabel} onClick={onToggleBookmark}>
      <Bookmark aria-hidden="true" fill={bookmarked ? 'currentColor' : 'none'} size={17} strokeWidth={1.85} />
    </IconButton>
  </nav>
) : null}
```

Do not leave an opacity-zero bookmark button mounted and focusable. Center-stage tap calls `controller.toggle`; committed navigation calls `controller.hide`; stage scrolling performs neither.

- [ ] **Step 5: Add lifecycle and accessibility unit coverage**

With fake timers and public queries, prove:

- no timer runs before a readable page;
- first readable page shows controls for exactly 2,500 milliseconds;
- page changes, V2 promotion, retry completion, preference changes, and rerender do not rearm it;
- manual center tap reveals and hides controls;
- `Escape` reveals without starting a timer;
- focus, drawer, Settings, and recovery pause the remaining duration;
- a page commit hides controls and moves focus to the stage;
- hidden top and bottom controls are absent from tab order and the accessibility tree;
- the centered Arabic Surah label changes with the visible retained page, not an unready requested page.

- [ ] **Step 6: Run focused verification and commit**

```bash
pnpm exec vitest run tests/unit/react-read/reader-wave3.test.tsx
pnpm run check
git diff --check
git add src/components/reader/useMushafChromeVisibility.ts src/app/routes/read/MushafRoute.tsx src/components/reader/ReaderPageShell.tsx src/components/reader/ReaderChrome.tsx src/components/reader/MushafPageViewer.tsx tests/unit/react-read/reader-wave3.test.tsx
git commit -m "feat: add immersive Mushaf chrome"
```

---

### Task 6: Make The Full-Viewport Layout Responsive And Close Verification

**Files:**
- Modify: `src/design-system/index.css`
- Modify: `tests/e2e/read/mushaf-responsive.spec.ts`
- Modify: `tests/e2e/infra/react-offline.spec.ts`
- Modify: `docs/context/surfaces/read.md`
- Modify: `docs/context/data-model.md`
- Modify: `docs/context/source-data-flow.md`
- Regenerate if changed: `docs/context/module-graph.md`
- Regenerate if changed: `docs/context/feature-map.md`

**Interfaces:**
- Finalizes the visual contract for Tasks 4 and 5.
- Updates current-state docs for the manifest and reader behavior.

- [ ] **Step 1: Remove permanent Mushaf chrome allocation**

Replace the title/number grid rows and calculated available height with full-surface variables:

```css
.qar-react-mushaf-page-surface {
  --qa-react-mushaf-safe-left: max(.25rem, env(safe-area-inset-left));
  --qa-react-mushaf-safe-right: max(.25rem, env(safe-area-inset-right));
  --qa-react-mushaf-safe-bottom: max(.5rem, env(safe-area-inset-bottom));
  --qa-react-mushaf-available-height: 100%;
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
  padding-inline: var(--qa-react-mushaf-safe-left) var(--qa-react-mushaf-safe-right);
}

[data-mushaf-layout-mode='single'][data-mushaf-fit-width='false'] .qar-react-mushaf-page-stage {
  align-self: center;
  width: min(100%, calc(100dvh * var(--qa-react-mushaf-page-ratio)));
  max-height: 100%;
  aspect-ratio: var(--qa-react-mushaf-page-ratio);
}
```

Fit width and continuous stages use `height: 100%`. Remove `--qa-react-mushaf-title-top`, `--qa-react-mushaf-title-space`, `--qa-react-mushaf-number-space`, and their grid-row consumers. Keep the app wrapper and Mushaf shell at exact clipped `100dvh`.

- [ ] **Step 2: Position safe overlay chrome**

Top chrome remains fixed and safe-area-aware. Use equal outer grid tracks on tablet/desktop so the center track is geometric viewport center, then adapt narrow portrait to a second centered title row so the complete action group cannot overlap it:

```css
.qar-reader-chrome {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr);
  align-items: center;
}

.qar-reader-chrome-left { grid-column: 1; justify-self: start; }
.qar-reader-chrome-right {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

.qar-reader-chrome-title {
  grid-column: 2;
  justify-self: center;
  max-width: min(100%, 24rem);
  overflow: hidden;
  color: var(--qa-react-accent);
  font-family: 'Scheherazade New', 'Noto Naskh Arabic', var(--qa-react-font-arabic);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 520px) and (orientation: portrait) {
  .qar-reader-chrome {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 48px auto;
    height: calc(env(safe-area-inset-top) + 88px);
  }
  .qar-reader-chrome-left { grid-column: 1; grid-row: 1; }
  .qar-reader-chrome-right { grid-column: 2; grid-row: 1; }
  .qar-reader-chrome-title {
    grid-column: 1 / -1;
    grid-row: 2;
    max-width: min(80vw, 20rem);
  }
}
```

The bottom dock is absolutely positioned above the safe-area inset, centered, translucent, and bounded to the stage width. It uses at least 48-pixel targets by default and never contributes layout height.

At short landscape (`orientation: landscape` and `max-height: 600px`), use 44–48-pixel targets, smaller gaps, and safe side insets. At tablet/desktop widths cap overlay content and keep the single page centered; do not create persistent side controls. Reduced motion removes overlay/page translation but does not change visibility timing.

- [ ] **Step 3: Replace outdated browser geometry assertions**

Update `mushaf-responsive.spec.ts` to test these exact viewport matrices:

```ts
const IMMERSIVE_VIEWPORTS = [
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'desktop landscape', width: 1440, height: 900 },
  { name: 'phone landscape', width: 844, height: 390 },
] as const
```

For every viewport, prove the app, shell, and Mushaf surface equal the visual viewport; document overflow is absent; the Fit-page stage height is within one CSS pixel of `min(viewportHeight, safeInlineWidth / pageRatio)`; controls remain inside safe geometry; and the Surah title center differs from viewport center by no more than one CSS pixel. Geometry assertions belong here, not in Vitest.

- [ ] **Step 4: Add interaction and rotation browser coverage**

Through visible roles and outcomes, prove:

- top and bottom chrome appear on first readable page and disappear after the discovery interval using `expect.poll` rather than a fixed sleep;
- turning ten pages does not reveal the chrome;
- center tap reveals the Surah title, page navigation, and bookmark together;
- `Escape` reveals hidden controls;
- scrolling Fit width or continuous mode does not reveal controls;
- focused controls, Navigation, Settings, and terminal recovery remain visible;
- rotation preserves page, stage scroll offset, and hidden state;
- short landscape keeps Fit width vertically reachable;
- reduced motion preserves route and visibility outcomes.

Extend `tests/e2e/infra/react-offline.spec.ts` with one baseline quran.ws journey: open page 42 online, wait until pages 41–43 have been fetched by the readable window, wait for the production service worker, go offline, reload page 42, and turn to both cached adjacent pages without loading, retrying, unavailable, or asset-gate copy. Keep unfetched-page failure coverage separate and truthful.

- [ ] **Step 5: Update current-state docs and regenerate derived context**

Update:

- `docs/context/surfaces/read.md` for immersive overlays, one-shot discovery, progressive V2 promotion, metadata-only outer entries, queued discrete navigation, and truthful retry states.
- `docs/context/data-model.md` for required V1 `displayViewBox` and shared profile/window behavior.
- `docs/context/source-data-flow.md` for build-time display framing derivation and manifest emission.

Run `pnpm run docs`; review generated changes and never edit generated fences directly.

- [ ] **Step 6: Run focused browser and data verification**

```bash
time pnpm playwright test tests/e2e/read/mushaf-responsive.spec.ts --project=chromium --reporter=line
pnpm exec vitest run tests/unit/scripts/mushaf-pages.test.js tests/unit/react-read/mushaf-page-window.test.tsx tests/unit/react-read/reader-wave3.test.tsx
pnpm run data -- mushaf-pages build --profile=baseline --require-riwayah=qaloon --check
pnpm run docs:check
pnpm run check
git diff --check
```

Expected: all focused suites and checks pass without warnings; the timed browser spec has no duplicated setup or fixed sleeps outside the existing gesture carve-out.

- [ ] **Step 7: Run the release-sensitive gate**

Because this change affects shared Reader behavior, dataset contracts, generated runtime output, and service-worker-cached page assets, run:

```bash
pnpm run validate
```

Expected: validation completes without warnings or failures. If the gate rebuilds generated metadata, rerun `git diff --check` and confirm the output agrees with Task 1 rather than hand-editing it.

- [ ] **Step 8: Commit the responsive layout and docs**

```bash
git add src/design-system/index.css tests/e2e/read/mushaf-responsive.spec.ts tests/e2e/infra/react-offline.spec.ts docs/context/surfaces/read.md docs/context/data-model.md docs/context/source-data-flow.md docs/context/module-graph.md docs/context/feature-map.md
git commit -m "feat: maximize the Mushaf reading viewport"
```

Omit unchanged generated docs from `git add`. Do not push, merge, or open a pull request unless the user asks.

---

## Final Acceptance Checklist

- [ ] Phone, tablet, desktop, portrait, and landscape use one full-viewport single-page experience with no permanent chrome allocation.
- [ ] The Arabic Surah title is geometrically centered in the top overlay and follows the retained visible page.
- [ ] Page navigation and bookmark share one safe-area-aware bottom dock.
- [ ] Discovery chrome appears once per Mushaf route session for 2,500 milliseconds and never rearms on page navigation or rendition changes.
- [ ] Hidden chrome is absent from pointer interaction, sequential focus, and the accessibility tree.
- [ ] One profile context supplies manifest/index validation and framing capability.
- [ ] V2 current pages commit 1,280-pixel media before 2,136-pixel promotion and retain previews through upgrade failure.
- [ ] V1 outer entries perform no SVG fetch, parse, scan, or serialization.
- [ ] Unready discrete navigation commits automatically when readable without a second action.
- [ ] Transient failures retry at 150 and 500 milliseconds; confirmed missing and contract errors do not retry.
- [ ] Loading, retrying, transient error, contract error, and confirmed missing use truthful distinct outcomes.
- [ ] A readable page survives all neighbor, destination, retry, and upgrade failures.
- [ ] Focused unit, browser, data, docs, static, and `pnpm run validate` gates pass without warnings.
