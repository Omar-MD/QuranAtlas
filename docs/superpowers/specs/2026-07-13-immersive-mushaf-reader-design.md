# Immersive Mushaf Reader Design

## Goal

The Mushaf reader uses the complete viewport for the page on phones, tablets, desktops, portrait, and landscape. Reader controls are temporary overlays, page turns remain continuous while assets prepare, and transient loading failures never masquerade as authoritative page unavailability.

## Scope

This design changes the Mushaf reader surface, page-window loading, V1 Mushaf manifest metadata, and durable Reader verification. It preserves the existing Verse reader, single-page physical navigation direction, reading preferences, bookmark storage, Daily Wird progression, route hashes, and Settings and Navigation ownership.

The reader continues to display one Mushaf page at a time on wide viewports. A two-page spread, permanent desktop sidebar, new reading mode, and changes to the source edition are out of scope.

## Immersive Viewport Contract

The Mushaf stage owns the full `100dvh` at every supported viewport. Top and bottom reader controls overlay the page and do not reserve grid rows, padding, or calculated available-height space. The page remains centered by its active framing ratio and uses safe-area-aware inline bounds.

The top overlay is a translucent bar with three logical zones:

- Navigation remains at the physical left.
- The current Arabic Surah name is geometrically centered in the viewport rather than centered in leftover flex space. It truncates before overlapping either action zone.
- Daily Wird, Reading view, and Settings remain at the physical right.

The bottom overlay is a centered floating dock containing the higher-page action, current page number, lower-page action, and page bookmark. It preserves the existing Mushaf direction: the higher page is reached from the left action and the lower page from the right action. The page number remains centered within the dock rather than the entire viewport when the bookmark is present.

Both overlays share one visibility state. Hiding them removes their descendants from pointer interaction, sequential focus, and the accessibility tree.

## Responsive Adaptation

All viewports use the same interaction model with adapted geometry:

- Phone portrait uses near-edge-to-edge page content, 48 CSS pixel targets, and a compact bottom dock above the safe-area inset.
- Tablet portrait uses capped overlay content widths and a page centered by its active aspect ratio.
- Desktop and wide landscape retain one centered page. Additional width becomes breathing room rather than permanent chrome or a two-page spread.
- Short landscape uses 44–48 CSS pixel controls, compressed overlay height, safe side insets, and the existing Fit-width readability preference. Rotation preserves the visible page, stage scroll offset, and chrome visibility.

The complete page remains reachable in Fit width and continuous modes through the owned stage scroller. Single plus Fit page remains document-scroll-free.

## Chrome Lifecycle And Interaction

A Mushaf route session begins when Mushaf mode mounts and ends when the reader leaves Mushaf mode. The overlays become visible when that session's first readable page is committed. A single 2,500-millisecond discovery timer then hides them.

The discovery timer does not restart because of:

- a page turn or passive continuous-scroll page synchronization;
- a preview-to-full rendition upgrade;
- a retry completing;
- a viewport resize or orientation change;
- a framing, flow, or Fit-width preference change.

A center-stage tap or click toggles both overlays. Existing edge taps, horizontal swipes, keyboard arrows, and dock actions continue to turn pages. A committed page turn hides the overlays immediately but does not start another timer. Stage scrolling alone never reveals them.

The discovery timer pauses with its remaining duration while focus is inside the overlays, while Navigation or Settings is open, or while actionable recovery is present. `Escape` reveals hidden overlays without starting a new discovery timer. Deliberate dismissal restores focus to the stage without scrolling it.

Reduced-motion preference removes overlay and page-turn travel while preserving visibility timing and state transitions.

## Loading Diagnosis

The current page-window pipeline creates avoidable delay and misleading failures:

- Initial neighbor preparation waits for the requested page's full preparation.
- A V2 current page selects and decodes the 2,136-pixel rendition before it becomes readable; the 1,280-pixel rendition is treated only as a neighbor preview.
- When an in-flight preview becomes current, the request is aborted and restarted for the larger rendition.
- A failed full upgrade can replace a usable preview entry with an error.
- V1 outer-window entries called descriptors still fetch, parse, sanitize, scan, and serialize complete SVG pages.
- Framing capability loads the same index and manifest independently from the page window.
- Navigation to an unready neighbor merely retries preparation and requires another navigation action after it becomes ready.
- Transient load and decode errors are rendered with the same unavailable copy as authoritative absence.

## Shared Profile Session

One profile session owns the validated Mushaf asset index, edition manifest, page count, framing capability, and edition identity. Page preparation and Settings-facing framing availability derive from this shared context. The context is recreated only when the edition or riwayah changes or an explicit retry replaces a failed context.

This removes duplicate index and manifest requests while preserving existing identity and contract validation.

## Page Window And Rendition State

The retained window distinguishes metadata from prepared media. Its conceptual states are:

- `descriptor`: validated page metadata with no prepared media;
- `loading`: requested media is being prepared for the first time;
- `retrying`: a bounded automatic retry is in progress;
- `ready-preview`: readable lower-resolution media is committed;
- `ready-full`: the preferred rendition is committed;
- `transient-error`: automatic retries are exhausted but retry remains meaningful;
- `confirmed-missing`: a `404` or validated asset contract proves the page is absent.

An entry with readable media remains readable while an upgrade or retry proceeds. Upgrade failure records supplementary state and never demotes the entry.

The requested page receives the highest priority. Its immediate lower and higher neighbors begin preparation without waiting for preferred-quality completion of the requested page. Outer pages remain descriptor-only until the window moves.

For V2 external-image editions, the requested page and immediate neighbors use the 1,280-pixel rendition as the first readable asset. The requested page upgrades to the 2,136-pixel rendition in place after the preview commits. If a loading preview becomes current, that request is preserved; the full upgrade is queued instead of replacing it.

For V1 SVG editions, only the requested page and its immediate neighbors are fetched and prepared. Outer entries use manifest metadata and do not fetch SVG bytes.

## V1 Build Metadata

The V1 manifest adds the stable display viewBox needed by the Reader in addition to the source viewBox. The Mushaf page build computes this value from the reviewed themed SVG and validates that it is finite, positive, contained by the source viewBox, and present for all pages.

Runtime preparation continues to validate the same-origin URL, manifest identity, source viewBox, and SVG safety contract. It uses the generated display viewBox instead of scanning page paths to rediscover framing on every load. Existing generated-context fences are regenerated through `pnpm run docs` where inventories change.

## Queued Navigation

Navigation to a page without readable media records one pending destination. The current readable page remains mounted and authoritative while the destination prepares. A polite, unobtrusive status names the loading destination without covering the page or exposing recovery actions prematurely.

When the destination becomes readable, the pending navigation commits automatically through the same discrete route-history path used by a ready page turn. A later navigation intent replaces the earlier pending destination. Cancelling, leaving Mushaf mode, changing edition, opening an interaction-suspending overlay, or reaching a terminal failure clears the pending commit safely.

Continuous scroll does not use queued discrete navigation. It reconciles only ready entries and keeps its current retained-anchor behavior.

## Retry And Failure Semantics

Network failures, `5xx` responses, and decode failures receive a small bounded automatic retry with backoff. An authoritative `404`, invalid manifest/index agreement, unsafe SVG, or identity mismatch is not retried automatically.

Background-neighbor loading and retrying are not announced. Their transient failures remain quiet until the reader requests that page.

If a requested destination exhausts automatic retries, the current readable page stays mounted and the existing reachable `Retry page N` and `Stay on page M` recovery actions appear. Only `confirmed-missing` uses unavailable or not-installed language. Generic loading, retrying, and transient failure never do.

The asset gate remains reserved for sessions in which no readable page exists. A readable preview is sufficient to keep the Reader mounted even if its preferred rendition fails.

## Accessibility

- Every interactive target is at least 44 by 44 CSS pixels, with 48 pixels preferred where space permits.
- Safe-area insets protect overlay controls in portrait and landscape.
- The centered Surah title is exposed once as the current contextual title and hides with the top overlay.
- Hidden overlays cannot receive focus and are not exposed as active navigation.
- Auto-hide pauses while focus is within an overlay and resumes only after focus leaves.
- Requested-page loading and terminal recovery use polite announcements; background preparation is silent.
- Focus, Settings, Navigation, and terminal recovery pin the overlays visible until interaction completes.

## Durable Verification

Unit coverage proves:

- the discovery reveal occurs once after the first readable page and never rearms on page changes, rendition upgrades, retries, resize, rotation, or preference changes;
- center tap toggles chrome, a committed navigation hides it, focus and recovery pin it, and hidden controls are not focusable;
- one shared profile context serves page preparation and framing capability;
- V2 preview commits before full, an in-flight preview survives promotion, and failed full upgrades retain readable media;
- V1 outer descriptors do not fetch or parse page SVGs;
- an unready navigation destination commits automatically when readable;
- transient failure retries without unavailable copy, confirmed absence does not retry, and terminal failure retains the visible page;
- overlapping windows retain ready entries and stale completions cannot overwrite newer state.

Reader browser coverage uses phone portrait, tablet portrait, desktop landscape, and short phone landscape to prove:

- exact viewport ownership, increased page area, geometrically centered Surah title, safe overlay placement, and absence of document overflow;
- initial reveal and timeout, no reveal after navigation, center-tap reveal, keyboard and `Escape` behavior, reduced motion, and orientation preservation;
- delayed-neighbor navigation completes without a blank or unavailable page;
- a first transient failure recovers automatically, while persistent failure retains the current page with reachable recovery;
- production service-worker behavior makes revisited and adjacent cached pages available offline.

The V1 manifest contract receives build and dataset coverage for complete display-viewBox metadata and agreement with emitted SVG pages.

## Documentation Impact

The implementation updates the Read surface dossier for immersive overlay ownership, queued navigation, page-window priorities, rendition promotion, and failure semantics. Data-model or source-data-flow context is updated for the V1 display-viewBox field. Generated inventories are refreshed with `pnpm run docs` when their inputs change.

## Acceptance Criteria

- The Mushaf page uses the full viewport on phone, tablet, desktop, portrait, and landscape with no permanently reserved chrome rows.
- Surah name, navigation, reading actions, page controls, and bookmark appear as safe-area-aware overlays.
- Controls reveal once per Mushaf route session and never reappear merely because a page changes.
- A reader can navigate repeatedly without seeing a blank destination or transiently inaccurate unavailable state.
- V2 pages become readable from preview media before preferred-quality completion.
- V1 outer window entries do not fetch or prepare SVG bytes.
- Unready discrete navigation completes automatically when the destination becomes readable.
- Readable content survives upgrade, retry, neighbor, and destination failures.
- The focused unit, browser, data, static, and documentation gates pass without warnings.
