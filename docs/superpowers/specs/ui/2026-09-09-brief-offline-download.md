# QuranAtlas Offline Download Design Brief — onboarding offer + settings group

**Status:** Director design brief (per-screen, glm seat standing in for `@ui_director`). Advisor-reviewed; all five advisor deltas incorporated (§11). Binding for the `ui-implementer` and the `ui-visual-reviewer`; neither consults the director.
**Date:** 2026-09-09
**Scope (closed list — nothing outside these two surfaces is designed here):**
1. Onboarding offer + download-progress step (extends `OnboardingRoute`, composed on Tier C `OnboardingPageRecipe`, `kicker="QuranAtlas"`).
2. Settings group "Offline reading data" (new `src/components/settings/OfflineDataSection.tsx`, `SettingsGroup` shell like `IncludedAssetsSection.tsx`, rendered in `SettingsRoute` in both modes directly above `IncludedAssetsSection`).

**Consumes:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (§2 chrome tiers, §3 ownership/state map, §4 theme/night, §5 motion), `…-brief-onboarding.md` (recipe composition, focus/retry pattern), `…-brief-settings.md` (settings sheet structure §1, group order, Dialog/confirm precedent). **No new tokens, colors, easings, namespaces, or dependencies.** Approved primitives only: `Button`, `Status`, `Progress`, `Badge`, `Dialog`, `SettingsGroup`, `OnboardingPageRecipe`.

**Evidence base.** Live walk at 1280×900 and 375×812 (light) of `#/s/1` + settings overlay: confirmed group order (mode panel → Reading continuity → Appearance → Included reading assets), `SettingsGroup` heading/description shell, `.qar-react-settings-row` two-column rows collapsing to one column on mobile, full-bleed mobile sheet, asset-row icon/main/status precedent, clear-data Dialog idiom (`initialFocusRef` on Cancel, ghost Cancel, `qar:flex qar:flex-wrap qar:justify-end qar:gap-2` actions row, muted `leading-6` body). Sources read in full: `src/components/settings/{IncludedAssetsSection,SettingsGroup,VerseSettings}.tsx`, `src/app/routes/settings/SettingsRoute.tsx`, `src/app/routes/onboarding/OnboardingRoute.tsx`, `src/app/routes/settings/AboutRoute.tsx` (Dialog idiom), `src/design-system/recipes/onboarding-page.tsx`, `src/components/ui/{feedback,overlays,button}.tsx`, `src/design-system/index.css` (settings rows :1140–1300, status tones :2230–2252, layers :1017–1044, select z:130 :221–223), `src/design-system/registry/component-registry.json`, `src/design-system/tokens/semantic.css`.

---

## 1. Shared decisions (apply to both surfaces)

**SD-1 — Status-string mapping (exact, one mapping, both surfaces).** Snapshot/record `status` → visible status string:

| Record state | Exact status string |
|---|---|
| (no record for the active-profile pack) | `Not downloaded` |
| `installing` | `Downloading` |
| `paused-user` | `Paused` |
| `paused-network` | `Waiting for connection` |
| `installed` | `Downloaded` |
| `failed` | `Failed` |

Never render the raw state tokens (`installing`, `paused-user`, …) in UI. These six strings are the e2e contract (§5).

**SD-2 — Size line (exact).** A pack's size segment is `formatOfflineBytes(totalBytes)` when `totalBytes != null` (e.g. `405.4 MB`, `3.2 MB`), otherwise exactly `size unavailable` (lowercase). The separator between a label and its size/status segment is ` · ` (middle dot, single spaces). Offer lines and settings row meta both use this form.

**SD-3 — Row names (exact).** The two managed packs are named `Reader texts` (reader-core) and the Mushaf edition label (e.g. `Qalun Quran.ws`) — the label comes from the record (`record.label`) when a record exists, else from the edition index entry, else the fallback `Mushaf edition` (§SD-P6 offline-no-metadata case).

**SD-4 — Pack↔row identity.** The section/step derives both pack ids from the ACTIVE reader profile (`readerCorePackId(profile)`, `mushafPackId({riwayah, mushafEditionId})` with `DEFAULT_READER_ASSET_PROFILE` fallbacks — same resolution as `resolveOfflineDownloadOffer`). Only the two active-profile packs render; other profiles' records are invisible in v1 (cross-profile visibility is out of scope, per plan).

**SD-5 — Status typography.** Inline status strings render as muted secondary text (`text-sm`, `--qa-react-text-muted`) — same treatment as `.qar-react-settings-row-control`. Status is never color-only: the string itself carries the state. Tinted `Status`/`Badge` blocks are used only where §2/§3 explicitly prescribe them (consent failure, failed rows, onboarding completion).

**SD-6 — Unknown-size packs: known-bytes bar + count line, never a fake value; completion is record-state only.** The `Progress` primitive is determinate-only (`value: number`, fill by translate). Where a pack (or aggregate) has unknown sizes, the bar covers KNOWN bytes only and a muted count line `{filesDone} of {fileCount} files` is the indeterminate/unknown-size treatment — the visible motion signal for those files. When any total is null, the known-bytes bar reaching 100% is NOT overall completion: completion is expressed exclusively by the record states (both packs `installed`), which is the only condition that hides progress and shows the `Downloaded` treatment. Never fabricate a determinate value (onboarding brief O-D1 precedent).

---

## 2. Surface A — Onboarding offer + progress step (`OnboardingRoute`)

Composition: `OnboardingPageRecipe kicker="QuranAtlas"`. Local step machine `'offer' | 'downloading'` inside the offer branch (ordered before the `editions.length === 0` check; the offer variant has no `editions`). Single h1 throughout: **`Download for offline reading`** — it does not change between offer and downloading steps (stable layout, no heading churn; the content below the header communicates state).

**OD-P1 — Offer step (single prescription).** Column content, top → bottom:
1. Muted instruction line (`text-sm leading-6 text-muted`), exact copy: `Save the complete Mushaf and your reader texts to this device so the reader works without a connection.`
2. Pack size list: `<div class="qar:grid qar:gap-1">` with exactly two lines, each `<p class="qar:m-0 qar:text-sm qar:text-text">`:
   - `Complete Mushaf · {size}` — size per SD-2 from `mushafPlan.totalBytes`
   - `Reader texts · {size}` — size per SD-2 from `readerCorePlan.totalBytes`
   The size segment sits in a `<span class="qar:text-muted">` so the label reads primary and the size secondary. Generic labels here (not the edition label); the settings rows carry the edition label.
3. Consent-failure `Status` (only in state c, OD-P4).
4. Buttons `<div class="qar:grid qar:gap-2">`, both full column width, 44px:
   - `Button variant="primary"` exact `Download for offline reading` — the consent action (plan: `startOfflineDownloadFromOnboarding`, marker written only after successful enqueue).
   - `Button variant="secondary"` exact `Skip for now` — writes the completion marker and continues (`onComplete?.(pendingHash)`, fallback `window.location.hash = pendingHash`).

No loading/skeleton state exists on this step: the offer is resolved before the variant mounts (launch-restore holds the reader; `LaunchSplash` covers boot). If offer resolution failed, the step never mounts (plan behavior; not a UI state).

**OD-P2 — Downloading step (single prescription).** Column content, top → bottom:
1. Labelled determinate `Progress`, accessible name exactly **`Downloading offline reading data`**. Value = `min(100, round(100 * ΣbytesDone / ΣknownTotalBytes))` where both sums cover ONLY the packs whose `totalBytes != null`, across BOTH pack ids; if `ΣknownTotalBytes === 0`, value = `0`. Per SD-6: with a null total in play, the bar is a known-bytes indicator, not a completion gauge.
2. Muted count line (`text-sm text-muted`), exact form `{filesDone} of {fileCount} files` — the unknown-size treatment per SD-6 — rendered once BOTH pack ids are present in the subscription snapshot (sum over both items). Before that (async enqueue window), the Progress renders alone at its computed value.
3. Persistence-denied note (only when `persisted === false` from the start result, state d, OD-P5).
4. Buttons `<div class="qar:grid qar:gap-2">`, full column width:
   - `Button variant="primary"` exact `Continue reading`, ENABLED immediately → `onComplete?.(pendingHash)` (fallback hash write). This is the primary exit; the download continues in the background.
   - `Button variant="secondary"` exact `Pause download`, DISABLED (`disabled` attr; opacity-55 + pointer-events-none per commonality §3.2) until the subscription snapshot contains BOTH pack ids. Clicking pauses both packs (`pauseOfflinePack` × 2). While either pack is `paused-user`/`paused-network`, the same button reads exact `Resume download` and resumes both (`ensureStoragePersistence()` first — user-activated consent boundary — then `resumeOfflinePack` × 2). One button, label flips; it never disappears while either pack is unfinished.
5. Completion treatment (BOTH snapshot items `installed` — the only completion condition): remove the Progress, the count line, the note, AND the Pause/Resume button; render `Badge tone="success"` with exact text `Downloaded` (the primitive's existing success treatment — accent border/ink; muted inline pill, calm, not celebratory). `Continue reading` remains the only button.

**OD-P3 — Focus rule (repo pattern).** On the offer→downloading swap, focus moves to the `Continue reading` button: `useEffect` on `step === 'downloading'` → `continueRef.current?.focus()`, mirroring the `retryRef` pattern in `OnboardingRoute.tsx` (`persistenceStatus === 'error'` → `retryRef.current?.focus()`). No scroll, no announce; the swap itself is instant (§8).

**OD-P4 — Consent failure (state c).** The enqueue (`startOfflineDownloadFromOnboarding`) throws → the route STAYS on the offer step and renders between the size list and the buttons: `Status tone="warning"` with title exactly `Connect to the internet to download`, description `The download could not be started. Check your connection and try again.`, icon slot `AlertTriangle` (lucide, `aria-hidden`, size 18 — the gate-icon precedent O-P2/M-P3), action slot `Button variant="secondary"` exact `Retry download`. The retry control receives focus (same `retryRef` mechanism, effect keyed on the failure flag). Warning, not error: this is degraded/offline, per commonality §3.2. **Retry is idempotent:** the consent flow enqueues reader-core before mushaf, so a failed consent may have already durably enqueued the first pack; `requestOfflinePackInstall` no-ops on records already `installing`/`installed`, so retry preserves and reuses the already-enqueued pack instead of duplicating it. The completion marker stays unwritten until BOTH enqueues succeed. Nothing on the offer step changes visually on a partial enqueue (the download proceeds in the background; the settings group is its management surface).

**OD-P5 — Persistence denied (state d).** When the consent-time `ensureStoragePersistence()` returned false, the downloading step renders one muted line (`text-sm text-muted`, no icon, no `Status`), exact copy: `Your browser may remove downloaded data under storage pressure.` Placed under the count line, above the buttons. Shown only on the onboarding downloading step — the settings surface does not repeat it (§3 rows stay at the pinned status strings; one honest notice per flow).

**OD-P6 — Not designed here (boundary).** No interstitial for already-onboarded users (they go straight to the reader; plan-decided). No cancel/abandon action during downloading other than Pause (Continue leaves; the download proceeds; management moves to Settings). No success navigation — completion never auto-advances.

---

## 3. Surface B — Settings group `OfflineDataSection`

**SD-P1 — Shell and placement (single prescription).** `SettingsGroup` (registry `settings-group`; consumers `src/components/settings/**` — allowed) with title exactly **`Offline reading data`** and description exactly `Saved on this device for reading without a connection.` Rendered in `SettingsRoute` ONCE, outside the `mode` conditional (so both verse and mushaf modes show it), directly above `<IncludedAssetsSection …>` — i.e. group order becomes: mode panel → Reading continuity → Appearance → **Offline reading data** → Included reading assets. No disclosure/collapse toggle (always expanded; two rows do not need one). The group is independent of `settingsWriteError`/`useSettingsForm` — it is not a settings-form surface.

**SD-P2 — Aggregate line (single prescription).** First element inside the group content: a single muted line (`<p class="qar:m-0 qar:text-sm qar:text-muted">`, exact text `Downloaded`) rendered ONLY when BOTH rows are `installed`. In every other combination the aggregate line renders nothing — per-row status (SD-P3) carries the state, and a mixed-state aggregate would be ambiguous noise. (Dispatch requirement — aggregate `Downloaded` only when both installed — met literally.)

**SD-P3 — Rows (single prescription per state).** Two rows, one per pack (SD-4). Each row is a `.qar-react-settings-row` (two-column desktop `minmax(0,1fr) auto`; collapses to one column <768px with the copy stacking above the action — existing CSS, no new rules). Row anatomy:
- Copy cell (`.qar-react-settings-row-copy`):
  - Line 1 — row name per SD-3 (`.qar-react-settings-row-label`).
  - Line 2 — status line (muted, SD-5): the exact status string (SD-1). For `not-installed` rows the line is `{status} · {size}` (e.g. `Not downloaded · 405.4 MB`, or `Not downloaded · size unavailable`). For `installed`, `failed`, `paused-*` rows the line is the status string alone.
  - `installing` rows only: after the status line, the per-row `Progress` — accessible name exactly `Downloading {rowName}` (e.g. `Downloading Reader texts`, `Downloading Qalun Quran.ws`), value per SD-6 known-bytes rule, plus the muted count line `{filesDone} of {fileCount} files` (the unknown-size treatment).
- Action cell (right column, `qar:flex qar:items-center`): per-state action, `Button size="sm"`, min 44px:
  - `not-installed` → `Button variant="secondary"` exact `Download`.
  - `installing` → `Button variant="secondary"` exact `Pause` → `pauseOfflinePack(packId)`.
  - `paused-user` → `Button variant="secondary"` exact `Resume` → `ensureStoragePersistence()` then `resumeOfflinePack(packId)`.
  - `paused-network` → NO button (auto-resumes; the status line `Waiting for connection` is the whole story).
  - `installed` → `Button variant="danger"` exact `Remove` → opens the confirm Dialog (§4).
  - `failed` → NO button in the action cell; the row renders `Status tone="error"` below the row spanning full width, title exactly `Failed`, description = the record's `error` message when present (honest technical detail, muted by the primitive), icon slot `AlertTriangle` (`aria-hidden`, 18), action slot `Button variant="secondary"` exact `Retry` → rebuild the plan from the record's embedded files (`{packId, kind, label, files: record.files, totalBytes: record.totalBytes}` — no network needed) and `requestOfflinePackInstall(plan, { persisted: record.persisted })`. Retry while offline lands the pack in `paused-network` (downloader classification) and auto-resumes later — correct, no special casing.

**SD-P4 — Not-installed + Download availability (single prescription; advisor-revised).** The `Download` button's gate is ACTUAL plan-metadata availability — never `navigator.onLine` alone, never byte-size availability:
- The reader-core plan builds entirely from the active profile (settings); unknown byte sizes are part of the offer contract (`totalBytes: null` → `size unavailable`, SD-2). The reader row's `Download` is therefore ENABLED whenever no record exists — including offline (an offline enqueue is classified `paused-network` by the downloader and auto-resumes on reconnect; that is the system working as designed).
- The mushaf plan requires the edition index entry (`entry.files`). `Download` on the mushaf row is DISABLED only when no plan can be built AND no record exists (edition index unavailable — offline with no cached index).
- Re-resolution happens on (a) the `window` `online` event (listener added in the section's mount effect, removed on cleanup) and (b) overlay reopen (SettingsRoute remounts per open — existing behavior, relied upon).
- Clicking: `const persisted = await ensureStoragePersistence(); await requestOfflinePackInstall(plan, { persisted })` — user-activated consent boundary per plan.

**SD-P5 — Source of truth and loading (single prescription).** Records/snapshot are the ONLY source of truth for row state. On mount: seed from `getOfflineDownloadSnapshot()` (synchronous) and read `readOfflinePackRecords()` under an `AbortController` aborted on unmount — the `IncludedAssetsSection` AbortController-on-mount pattern, pinned for ANY fetch the section performs (`loadMushafEditionEntries`, `loadDatasetByteSizes`). Subscribe `subscribeOfflineDownloads`; the effect RETURNS the unsubscribe (plus `controller.abort()` and listener removal) in cleanup. Until the FIRST records read resolves, the section renders its two rows as neutral placeholders: row names per SD-3, `aria-busy="true"` on the group content, no status line, no buttons — never a premature `Not downloaded` for an installed pack (mirrors the `Loading asset name` precedent). After resolution, records win over snapshot labels (record.label, record.totalBytes, `size unavailable` for null totals); when a record exists, only the record-state actions are offered (per SD-P3 map) — plan metadata is never required to render record states.

**SD-P6 — Offline-no-metadata row rendering (single prescription; narrowed by SD-P4).** When no record exists AND no plan can be built: the reader row shows name `Reader texts`, status `Not downloaded · size unavailable`, `Download` enabled (builds profile-only; SD-P4). The mushaf row shows fallback name `Mushaf edition` (SD-3), status `Not downloaded · size unavailable`, `Download` disabled. Nothing else changes; the `online` event / overlay reopen re-resolves.

---

## 4. Remove confirmation — Dialog layering prescription

**SD-P7 — Two-step confirm, Dialog primitive, stackable above the sheet (single prescription).** `Remove` opens the repo `Dialog` (registry `dialog`, simple confirm — NOT the typed-DELETE clear-data pattern, which stays clear-data-specific):
- `title` exactly `Remove {rowName}?` (e.g. `Remove Reader texts?`, `Remove Qalun Quran.ws?`).
- Body copy (one line, exact classes `qar:m-0 qar:text-sm qar:leading-6 qar:text-muted`, matching the clear-data idiom): `This removes the downloaded files from this device. You can download them again.` (Shared files another pack still claims are kept by the downloader; the copy does not over-promise per-file accounting.)
- Actions row `qar:flex qar:flex-wrap qar:justify-end qar:gap-2` (clear-data idiom): `Button variant="ghost"` exact `Cancel` and `Button variant="danger"` exact `Remove`. `initialFocusRef` on `Cancel` (clear-data precedent — the destructive action never receives initial focus). Confirm calls `removeOfflinePack(packId)` for the confirmed row only, then closes; the row returns to `not-installed` via the subscription.
- **Layering fix (required primitive evolution, scoped):** the settings sheet is z-120 (index.css:1041) and the `Dialog` overlay/content utilities are `qar:z-40`/`qar:z-50` (overlays.tsx) — a dialog opened from inside the sheet would be buried. Change the `Dialog` primitive's overlay class to `qar:z-[125]` and content class to `qar:z-[130]` in `src/components/ui/overlays.tsx`. Z-index is not tokenized anywhere in this repo (select popup is a literal `z-index: 130` at index.css:221–223; drawer 100/101; sheet 120), so literals are the established idiom. Effect: dialogs are top-most modals everywhere (above sheet z-120, drawer z-101); the About clear-data dialog gains nothing visually (it was already top-most in practice) and the night wash (z-9999) still covers all. No registry variant/slot changes; `dialog` allowedVariants stay `["default"]`.

---

## 5. Exact accessible-string contract (e2e asserts these)

| Element | Exact string |
|---|---|
| Settings group title (region name) | `Offline reading data` |
| Settings row 1 name | `Reader texts` |
| Settings row 2 name | the Mushaf edition label (live, e.g. `Qalun Quran.ws`) |
| Status strings (both surfaces) | `Downloaded` · `Downloading` · `Paused` · `Waiting for connection` · `Not downloaded` · `Failed` |
| Aggregate line (both installed only) | `Downloaded` |
| Onboarding h1 (both steps) | `Download for offline reading` |
| Onboarding primary CTA | `Download for offline reading` |
| Onboarding secondary (offer) | `Skip for now` |
| Onboarding primary (downloading) | `Continue reading` |
| Onboarding secondary (downloading) | `Pause download` ⇄ `Resume download` |
| Onboarding progressbar name | `Downloading offline reading data` |
| Settings per-row progressbar name | `Downloading {rowName}` |
| Settings row actions | `Download` · `Pause` · `Resume` · `Remove` · `Retry` |
| Remove dialog | title `Remove {rowName}?`; body `This removes the downloaded files from this device. You can download them again.`; buttons `Cancel`, `Remove` |
| Consent-failure Status | title `Connect to the internet to download`; action `Retry download` |
| Persistence note | `Your browser may remove downloaded data under storage pressure.` |
| Size fallback | `size unavailable` |

Note for the e2e authors: `Downloading`/`Downloaded` can co-occur (row + per-row progress name contains `Downloading …`; aggregate line). Locators must narrow (row-scoped or role-scoped); the brief deliberately does not deduplicate these strings.

---

## 6. Per-viewport layout

**1280×900 (desktop).** Onboarding: recipe column `max-w-md` (448px) centered; h1 24px/600; both buttons full column width (448px), 44px, above the fold; size list two lines; consent-failure Status fits above the fold with both buttons. Settings: right-anchored rail `min(28rem, 100vw − 24px)`; the new group renders between Appearance and Included reading assets in the existing `--qa-react-settings-space-4` grid; rows two-column (copy | action); per-row Progress spans the copy cell; remove Dialog centered (`w-96`) over the full viewport with overlay z-125 above the sheet's z-120.
**375×812 (mobile).** Onboarding: column 335px; identical stack; buttons full width, `Continue reading` and the progress sit above the fold. Settings: full-bleed `100dvh` sheet, scrollable body; rows collapse to one column (copy stacks above the action button — existing mobile rule :1392–1400); the Dialog content is `w-96 max-w-full` → fits 335px minus padding; the actions row may wrap to two lines (`flex-wrap`) — acceptable, both buttons stay 44px tall.
**Both viewports, all states:** no horizontal overflow (`scrollWidth === viewport`); the group works in verse AND mushaf modes identically.

## 7. Themes + night

All colors via `--qa-react-*` tokens through owned primitives; three-theme correctness is by construction. Specifics: onboarding completion uses `Badge tone="success"` — the primitive's EXISTING success treatment (accent border/ink, `qar:border-accent qar:text-accent` on surface); it is deliberately kept as shipped (advisor delta 4 — no token substitution, no primitive change). Consent-failure and `Status tone="warning"` use `--qa-react-status-warning-*` (dark derives from the overridden `--qa-react-offline-warning #d6ae37` — the commonality §4 canonical override); `Status tone="error"`/`Remove` danger use `--qa-react-danger`. Night mode: the `.qar-react-night-shift` wash covers both surfaces uniformly; no per-component dimming.

## 8. Motion / reduced-motion (advisor-revised)

This brief ADDS no motion: no animation, no transition, no keyframe is introduced on either surface. The offer→downloading swap, state transitions, aggregate appearance, and dialog open are instant (consistent with onboarding's instant auto-advance and the settings sheet's instant appearance per settings brief §6). Two shipped-primitive behaviors are noted, not changed: the `Progress` Indicator carries the primitive's existing `qar:transition-transform` (a raw ~150ms transform transition — pre-existing, untouched; it animates only the fill translate on value change), and the Dialog scrim paints `--qa-react-scrim` with NO transition in source (there is no existing scrim fade; none is prescribed). Should a future pass add shared transitions, they MUST consume `--qa-react-transition-fast`/`settle` and inherit the reduced-motion 1ms collapse (commonality §5.2). Reduced-motion today: nothing to kill — this brief introduces no motion; state changes remain instant and visible.

## 9. 44px targets

Every interactive element is ≥44×44: all `Button`s carry `qar:min-h-11` (all sizes are `min-h-11`); dialog buttons `md`/`sm` both 44px tall; rows keep the settings 44px min-height rules (:1214–1218 for role'd controls; the action Buttons are 44px themselves). No icon-only controls exist on either surface, so no IconButton surface-area concerns.

## 10. Design rulings (decided defaults — recorded so the implementer never asks)

1. **Onboarding h1 duplication with the CTA** (`Download for offline reading` as both heading and button): chosen deliberately — clearest honest heading, zero e2e ambiguity, different roles so no accessible-name collision. Ruled: keep.
2. **Dialog z-bump is a shared-primitive edit** (`qar:z-40/50` → `qar:z-[125]/[130]`): required for ANY in-sheet dialog; literal z-index matches the repo's select/drawer/sheet idiom (z is untokenized). Ruled: sanctioned, scoped to overlays.tsx Dialog classes only.
3. **Aggregate line hidden in mixed states:** a mixed aggregate (e.g. one failed + one installed) has no honest single string; rows carry it. Ruled: `Downloaded`-only aggregate.
4. **Persistence note is onboarding-only:** settings rows stay at the six pinned strings; v1 does not surface per-row `persisted === false`. Ruled: exclude from settings.
5. **Fallback row name `Mushaf edition`** when offline, no record, no index: rare (offline + never downloaded), and the status line explains itself. Ruled: keep fallback.
6. **Retry-from-record** (failed rows rebuild the plan from `record.files`, not from network metadata): makes Retry work without network and matches the downloader's record-as-source-of-truth design. Ruled: record-based rebuild.
7. **Dialog idiom parity:** Cancel is `variant="ghost"` with `initialFocusRef`, actions row `flex-wrap justify-end` — mirrors the shipped clear-data dialog exactly (one convention, not two).

## 11. Advisor review log (all deltas accepted and verified)

1. **SD-P4 gating** — accepted after verification: the reader-core plan is profile-only (valid with null sizes), so `navigator.onLine` must not gate it; the downloader owns offline classification (`paused-network` + auto-resume). Gating is now plan-buildability only.
2. **OD-P4 partial-enqueue** — accepted: consent enqueues reader-core before mushaf; retry is pinned idempotent (install no-ops on `installing`/`installed`); marker written only after both succeed.
3. **SD-6 completion semantics** — accepted: unknown-size bar ≠ completion; only both-`installed` hides progress and shows `Downloaded`.
4. **§7 Badge success token** — advisor claim verified in source (`feedback.tsx`: success tone = `qar:border-accent qar:text-accent`); brief now cites the existing treatment, not `--qa-react-success`.
5. **§8 motion claims** — advisor claims verified (`Progress` Indicator is raw `qar:transition-transform`; `.qar-react-scrim` has no transition rule); §8 rewritten to claim zero added motion and no scrim fade.

---

## 12. Revision 2026-09-09 (post-review): required reader texts, optional Mushaf pages

Owner ruling after the initial implementation: the two packs are NOT peers.

1. **Reader texts (`reader-core`) are required offline data, never an offer.**
   `beginRequiredReaderCoreDownload(profile)` (`src/launch/offline-download-setup.ts`)
   enqueues the pack automatically (idempotently) for every launch-resolved
   reader — fresh onboarding AND already-onboarded users. No consent UI, no
   opt-out; `Skip for now` declines only the page pack.
2. **The onboarding offer (§2 OD-P1) covers the Mushaf page pack only.** The
   offer's size list drops the `Reader texts · {size}` line; the instruction
   copy becomes exactly: `Your reader texts are saved to this device
   automatically. Add the complete Mushaf pages to keep reading without a
   connection.` `Complete Mushaf · {size}` (SD-2) remains. The downloading
   step still aggregates BOTH pack ids (the auto reader-core run plus the
   consented page pack) under the SD-6 known-bytes rule, and completion is
   still both-`installed`.
3. **Already-onboarded users** get the same one-time page-pack offer
   (`OFFLINE_DOWNLOAD_SETUP_VERSION = 2` supersedes the v1 silent marker);
   `resolveOfflineDownloadOffer` and the auto enqueue run identically for
   them. Marker v2 is written only when the user answers the offer.
4. **Edition coverage:** the offer and settings rows support BOTH Mushaf
   source kinds — inline-SVG editions (v1, quran.ws shape, `pages/NNN.svg`)
   and external-image editions (v2, private PDF shape, `pages/NNN-1280.webp`
   + `pages/NNN-2136.webp` pairs, `version: "v2"` + `pageUrls` index rows).
   `parseMushafEditionEntry`, the offline pack URL identity, and the media
   type check accept both shapes; v2 page-pack downloads are part of the
   e2e contract.
5. **Deployment contract:** Mushaf page media ships as pinned GitHub Release
   artifacts fetched by `mise run data:media` before `data:build` (CI: on
   dataset-cache miss). Heavy media never enters git history; the tracked
   `data/catalog/mushaf-asset-index.json` anchor remains the shipping
   contract the built dataset is verified against.
