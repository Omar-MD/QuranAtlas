# QuranAtlas Commonality Design Brief — v2 Part 1

**Status:** Director design brief (K3 seat). Binding only after orchestrator vetting against spec §6.
**Date:** 2026-09-08
**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md`
**Scope:** Shared design language consumed by every per-screen plan (v2 part 2) and the Phase-B iteration-1 implementer. No `src/**` edits are prescribed or made here.

**Evidence base.** Live inspection of the running app at `http://127.0.0.1:5173` across routes `#/` (boot → `#/s/1`), `#/onboarding` (source), `#/s/1`, `#/s/2/255`, `#/m/1`, `#/surahs`, `#/bookmarks`, `#/search`, `#/settings` overlay, `#/about`, `#/nope`; at 1280×900 and 375×812; in light, sepia, dark, and dark+night. Sources: `src/design-system/tokens/{primitives,semantic,tailwind-theme}.css`, `src/design-system/registry/component-registry.json`, every primitive in `src/components/ui/**`, `src/design-system/index.css`, `src/components/navigation/ChromeFrame.tsx`, `src/app/routes/onboarding/OnboardingRoute.tsx`, `src/app/App.tsx`.

---

## 1. Token semantics

The namespace chain is `--qar-*` (primitives.css, raw values) → `--qa-react-*` (semantic.css, themed roles) → `qar:` Tailwind utilities (tailwind-theme.css). **No new namespace.** Every themed value must be a `--qa-react-*` token defined for light **and** sepia **and** dark; per-theme overrides belong only in the `html[data-theme="sepia"]` and `html[data-theme="dark"]` blocks of `semantic.css`.

### 1.1 Role of each semantic token family

| Token | Role | Light / Sepia / Dark (current) |
|---|---|---|
| `--qa-react-canvas` | App/page background; the deepest layer every route sits on. | `#fbf8f0` / `#f7ebd0` / `#0f1215` |
| `--qa-react-surface` | Default raised surface: cards, inputs, menu/popover/toast/dialog bodies, list rows. | `#f8f2e4` / `#f4e6c4` / `#181c21` |
| `--qa-react-surface-raised` | Alias of `--qa-react-surface`; kept as a distinct semantic hook. No current visual distinction (all three themes set it `= var(--qa-react-surface)`). | alias |
| `--qa-react-sheet` | Sheet/drawer fill for overlays (settings sheet, nav drawer rail). | `#faf1d8` / `#f2dfb7` / `#14181c` |
| `--qa-react-border` | Hairline borders on surfaces and controls. | `#f1e9d3` / `#d9c595` / `#1d2328` |
| `--qa-react-text` / `--qa-react-text-primary` | Primary ink (`-primary` aliases `-text`). | `#2d2820` / `#2f281f` / `#dcdcdc` |
| `--qa-react-text-muted` | Secondary ink: meta, descriptions, kicker, placeholder. | `#5a4d38` / `#665133` / `#a3a3a3` |
| `--qa-react-text-danger` | Danger ink (`= --qa-react-danger`). | alias |
| `--qa-react-accent` | Brand bronze: links, selected text, focus-tinted surfaces, live progress. | `#78592e` / `#815c2b` / `#d4a253` |
| `--qa-react-accent-strong` | Pressed/hover accent, selected-text on tinted bg. | `#5e3a18` / `#674019` / `#e4b882` |
| `--qa-react-focus` | Focus ring color. Always used as a `2px` outline with `2px` offset. | `#78592e` / `#815c2b` / `#d4a253` |
| `--qa-react-text-on-accent` | Ink on solid accent/danger fills. | `#faf1d8` (light) / inherit light (sepia) / `#15110a` (dark) |
| `--qa-react-success` | Success ink/accent. | `#2f6634` / `#315f30` / `#91c98a` |
| `--qa-react-danger` | Destructive fill (`= --qar-color-danger-600`). | `#a63a2f` |
| `--qa-react-status-{error,warning,info,success}-{border,bg}` | Status tone borders and tinted fills; composed as color-mix over `--qa-react-surface`. `warning` derives from `--qa-react-offline-warning`, not accent. | see semantic.css:13-22 |
| `--qa-react-scrim` | Modal overlay backdrop. **Not currently consumed** — see §1.4 defect D1. | `rgb(0 0 0 / 32%)` / same / `rgb(0 0 0 / 48%)` |
| `--qa-react-night-wash` | Night-mode dimming wash color, applied via `.qar-react-night-shift` (index.css:1430-1450). | `rgb(28 18 7 / 13%)` |
| `--qa-react-chrome-surface` | Translucent floating-chrome pill background (92% surface + blur). Consumed by the reader-chrome icon buttons and view-toggle (index.css:1993, 2025). | `color-mix(surface 92%, transparent)` |
| `--qa-react-page-max-width` | Prose/content column cap for recipes (`qar:max-w-page`). | `72rem` |
| `--qa-react-drawer-width` | Desktop nav drawer rail width. | `360px` |
| `--qa-react-reader-page/-text/-muted/-selection` | Reader canvas/text/muted/verse-selection tint. `-selection` drives the bookmark-pulse keyframe background. | see semantic.css:31-34 |
| `--qa-react-bookmark-accent` + `-pulse-bg` + `-pulse-edge` | Bookmark accent; pulse keyframe edge/bg. **`-pulse-bg` and `-pulse-edge` have zero runtime consumers** (grep, §1.4 R1) — the pulse keyframe (index.css:3645-3659) uses `-selection` + `-bookmark-accent` directly. | — |
| `--qa-react-nav-*` (header/row/current/control/badge/delete/shadow) | Navigation drawer + nav list rows. Row surfaces are canvas/surface mixes; `current` = accent-tinted bg + 3px inset accent spine (index.css:2384-2391); control selected = `--qa-react-nav-control-selected-bg`. | semantic.css:38-55 + per-theme overrides |
| `--qa-react-nav-current-spine` | Current-row spine accent. **Zero consumers** (grep) — the spine is painted with `var(--qa-react-accent)` directly (index.css:2387, 2388). §1.4 R1. | `var(--qa-react-accent)` |
| `--qa-react-settings-*` (backdrop/sheet/header/group/group-border/divider/selected/selected-text/muted/shadow/space-*) | Settings overlay shell and groups. Sheet = `--qa-react-sheet`; header = sheet/surface mix; group = surface/sheet mix with accent-tinted border; `selected` = 15% accent over group bg. | semantic.css:56-70 |
| `--qa-react-mushaf-*` (ground/ink/border/accent/page-turn-duration/-easing/boundary-surface/safe-*) | Mushaf page viewer. `page-turn-duration/easing` wire the page-flip animation; reduced-motion sets duration to `0ms` (index.css:3537-3540). | see semantic.css:71-77 + index.css:1411-1427 |
| `--qa-react-offline-warning` | Offline/degraded status hue. Dark overrides the light `#806100` (too dark) to `#d6ae37` (semantic.css dark comment). | `#806100` / same / `#d6ae37` |
| `--qa-react-storage-danger` | Storage/destructive alias of danger. | alias |
| `--qa-react-theme-swatch-{light,sepia,dark}` | Appearance-picker swatch fills (`data-swatch` bindings, index.css:1832-1841). | `#fbf8f0` / `#f7ebd0` / `#0f1215` |
| `--qa-react-radius-{control,surface,pill}` | Radius scale: control `0.5rem`, surface `0.75rem`, pill `999px`. | primitives |
| `--qa-react-space-control-{x,y}` + `--qa-react-settings-space-{1,2,3,4,6}` | Control padding + settings rhythm, mapping to `--qar-space-*`. | primitives |
| `--qa-react-control-touch-target` | Min interactive size = `--qar-size-touch-target` = `2.75rem` (44px). **The single touch-target rule.** | `44px` |
| `--qa-react-font-{ui,arabic,translation,mono}` | Type stacks. `--qa-react-font-arabic` is riwayah-switched via `:root[data-riwayah]` (semantic.css:96-106). | primitives |
| `--qa-react-transition-{fast,settle}` | Motion: `fast` = `120ms ease-standard`, `settle` = `240ms ease-standard`. | primitives |
| `--qar-motion-{fast,settle}`, `--qar-ease-{standard,direct-manipulation}` | Raw durations/easings. Reduced-motion collapses both durations to `1ms` (index.css:98-102). | `120ms`/`240ms` |

### 1.2 Token additions (proposals — values for all three themes)

**A1 — `--qa-react-chrome-surface-solid`.** The reader chrome bar (`index.css:1895`) hand-writes `color-mix(in srgb, var(--qa-react-surface) 92%, transparent)` — the same mix the token `--qa-react-chrome-surface` already encodes — because the token is only consumed for the *pill* backgrounds, and the bar additionally needs `backdrop-filter: blur(14px)`. To make the chrome language single-sourced, the chrome bar must consume `--qa-react-chrome-surface` for its background (drop the inline mix) and keep the blur as a local property. **No new color token is needed**; this is a consumer cutover, not an addition.

**A2 — `--qa-react-scrim` adoption (not an addition; an existing token with zero consumers).** See defect D1. The overlay scrim is currently the utility `qar:bg-text/30` (overlays.tsx:37,155), which bypasses the token and is *text-colored* (dark blue-black) rather than the intended neutral black scrim. The brief directs all modal scrims to `var(--qa-react-scrim)`. No new token.

**No net-new color/space/radius tokens are proposed.** The existing families cover every observed pattern; the gaps are *un-consumed existing tokens*, not missing scales.

### 1.3 Token retirements — requests only (orchestrator runs the zero-consumer grep gate; spec §6 item 2)

**R1 — `--qa-react-nav-current-spine`** (semantic.css:44). Requested for retirement. Current consumers found by my grep: **none** (`var(--qa-react-nav-current-spine)` appears nowhere outside its own definition). The current-row spine is painted with `var(--qa-react-accent)` at `src/design-system/index.css:2387` and `:2388`. Before removal the orchestrator MUST run the authoritative zero-consumer grep; if any consumer is found, this request is void.

**R2 — `--qa-react-bookmark-pulse-bg`** (semantic.css:36) and **`--qa-react-bookmark-pulse-edge`** (semantic.css:37). Requested for retirement. Consumers found by my grep: **none** (the pulse keyframe `qar-reader-verse-pulse`, index.css:3645-3659, uses `--qa-react-reader-selection` for bg and `--qa-react-bookmark-accent` for edges). Orchestrator grep gate applies.

**R3 — spec-listed `--qa-react-radius-{sm,md,circle}`.** The spec §Phase-C R2 lists these as retirement candidates. **They do not exist** in `semantic.css` (the radius scale is `-control`/`-surface`/`-pill`). This is a stale spec entry; the orchestrator should confirm absence and drop them from the retirement list. My grep for `radius-sm|radius-md|radius-circle` returned no token definitions and no consumers.

### 1.4 Cross-cutting defects discovered (hand to inventory)

- **D1 — Scrim token not consumed.** All modal scrims use `qar:bg-text/30` (overlays.tsx:37 default Sheet/Dialog, :155 non-navigation-drawer Sheet). The navigation-drawer *does* use `.qar-react-sheet-scrim` → `var(--qa-react-scrim)` (index.css:1485-1488) but only on mobile (desktop rail is non-modal, no overlay rendered — overlays.tsx:153). Effect: settings/dialog scrims are `text@30%` (a warm dark-brown `oklab(0.28 …)` in light) instead of the intended `scrim` black; dark theme gets no 48% boost. **Fix direction (Phase B/C):** route every modal overlay through `--qa-react-scrim`.
- **D2 — Settings sheet surface/shadow not applied where authored.** The adaptive-settings block (`index.css:1506-1520`) sets `background: var(--qa-react-settings-sheet)` and `box-shadow: var(--qa-react-settings-shadow)`, but computed values on the live desktop sheet were `background: #fbf8f0` (canvas) and `box-shadow: none`. Root cause appears to be later/stronger rules or variant ordering in the sheet body path; needs a correctness look. Visual effect confirmed at `#/s/1` with the settings sheet open (light theme, 1280×900): sheet reads as canvas, not the warmer `#faf1d8` sheet tone, and casts no elevation shadow.
- **D3 — IconButton base touch target is 40px, not 44px.** `icon-button.tsx` sets `qar:min-h-10 qar:min-w-10` (40px). The reader-chrome override `.qar-reader-chrome .qar-reader-chrome-icon` (index.css:1962-1965) forces 48px, and the ChromeFrame IconButtons add `qar:min-h-11 qar:min-w-11` (ChromeFrame.tsx), so *rendered* reader/chrome targets are 44–48px. But any consumer using bare `IconButton` without an override gets 40px, violating the 44px rule (§3.6). **Fix direction:** raise the primitive default to `min-h-11 min-w-11`.

---

## 2. Shared chrome composition

One composition language, three chrome tiers. Every route uses exactly one.

### 2.1 Tier A — Reader chrome (`qar-reader-chrome`)
Used by `#/s/:surah[/:ayah]` and `#/m/:page`. A **fixed top bar**, `z-index: 95`, height `calc(env(safe-area-inset-top) + 56px)`, background `--qa-react-chrome-surface` (92% surface, translucent) + `backdrop-filter: blur(14px)`, grid `minmax(0,1fr) auto minmax(0,1fr)` (left / centered title / right). Left: navigation `IconButton` (`qar-reader-chrome-icon`, 48px). Center: surah/page title in accent (`--qa-react-accent`), Arabic display font, clamp `1.28rem→1.75rem`. Right: optional wird status, `ReadingViewToggle` (IconButton, 44px), settings `IconButton`. Hidden state: `transform: translate3d(0,-100%-8px,0)` (`--hidden`), transition `var(--qa-react-transition-fast)`. Source: `index.css:1890-1960`, `src/components/reader/ReaderChrome.tsx:34-72`.

### 2.2 Tier B — App chrome bar (`qar-react-chrome-bar` via `ChromeFrame`)
Used by `#/surahs`, `#/bookmarks`, `#/search`, `#/about`, `#/nope`. An **in-flow `<header>`** (not fixed): `flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3`, plus `padding-top: env(safe-area-inset-top)` (index.css:1494-1496). Left: wordmark `Button variant="ghost"` with the unlayered Georgia `.qar-react-chrome-wordmark` (index.css:3942-3945) — the wordmark font intentionally overrides `font-ui`. Right: navigation + settings `IconButton`s at 44px (`qar:min-h-11 qar:min-w-11`). Composition + single polite status region + single drawer host are owned by `ChromeFrame` (registry `chrome-frame`, `src/components/navigation/ChromeFrame.tsx`). **Rule:** no route mounts a second header or drawer host.

### 2.3 Tier C — Page recipes (content canvas, no bar)
- `ReaderPageRecipe` (`reader-page.tsx`): full-bleed canvas, centered `qar:max-w-page` column.
- `NavigationPageRecipe` (`navigation-page.tsx`): `main` landmark + single h1 + optional muted kicker, `px-5 py-5 gap-4`. Surahs/Bookmarks/unsupported content.
- `SettingsPageRecipe` (`settings-page.tsx`): same heading rhythm; About + settings-sheet content.
- `OnboardingPageRecipe` (`onboarding-page.tsx`): centered `max-w-md` column; onboarding + boot `LaunchSplash` fallback.

### 2.4 Overlays and scrims (single language)
- **Nav drawer** — `Sheet variant="navigation-drawer"`. Mobile (<768px): full-screen modal, `bg-canvas`, animation `qar-react-drawer-in` over `--qa-react-transition-settle`, scrim `.qar-react-sheet-scrim` = `var(--qa-react-scrim)` at z-100, drawer at z-101. Desktop (≥768px): non-modal 360px left rail (`--qa-react-drawer-width`), `border-inline-end: 1px solid border`, **no scrim**, background stays interactive, manual Tab loop (`containDrawerFocus`, overlays.tsx:86-110). Source: overlays.tsx:117-200, index.css:1453-1488.
- **Settings sheet** — `Sheet variant="adaptive-settings"`. Mobile: full-screen `100dvh`, `bg = --qa-react-settings-sheet`, z-120, header sticky at `--qa-react-settings-header`, body `--qa-react-settings-sheet`. Desktop (≥768px & ≥560px tall): right-anchored rail `width: min(28rem, 100vw - 24px)` (index.css:1850-1856). **Scrim must be `var(--qa-react-scrim)`** (currently `bg-text/30` — defect D1).
- **Dialog / Popover / Toast / Tooltip** — centered dialog `w-96 max-w-full rounded-surface border bg-canvas` over the shared scrim; popover/toast `rounded-surface border bg-surface shadow-lg`; tooltip is the only tooltip mechanism (no `title` attributes).
- **Scrim rule (single prescription):** every modal overlay uses `var(--qa-react-scrim)` — never `qar:bg-text/30` and never a hardcoded rgba. Navigation drawer mobile and settings sheet both conform after D1 lands.

---

## 3. Surface / card / status / row / control / state language

### 3.1 Ownership map (registry id → pattern)

| Pattern | Owning primitive (registry) | Notes |
|---|---|---|
| Bordered content card | `Card` (`feedback.tsx`) | `rounded-surface border bg-surface p-4`; optional header. Never nest in a row. |
| Empty / error / offline / gate / loading-block | `Status` (`feedback.tsx`) | tones `info/success/warning/error`; `role=status` except error → `role=alert`. Never hand-roll. |
| Navigable list row | `ListRow` + `ListRowActions` (`feedback.tsx`) | variants `default/selected/current`; slots `num/title/meta/arabic/action`. |
| Inline status pill | `Badge` (`feedback.tsx`) | tones `neutral/success/warning/danger`; never raw palette pills. |
| Determinate progress | `Progress` (`feedback.tsx`) | labelled progressbar; never color-alone. |
| Indeterminate loading | `Spinner` (`feedback.tsx`) | labelled `role=status`. |
| Text/title action | `Button` (`button.tsx`) | variants `primary/secondary/ghost/danger/pill`; sizes `sm/md/lg`. |
| Icon-only action | `IconButton` (`icon-button.tsx`) | required accessible name. |
| Text field / area | `Input` / `Textarea` (`form-controls.tsx`) | visible label; `min-h-11`. |
| Single choice (list) | `Select` (`form-controls.tsx`) | Radix select; portal above sheets (z-130, index.css:217). |
| Mutually-exclusive modes | `SegmentedControl` (`form-controls.tsx`) | explicit `role=radiogroup`; **never pill buttons for modes**. |
| Binary toggle | `Switch` (`form-controls.tsx`) | not a Checkbox. |
| Boolean option | `Checkbox` (`form-controls.tsx`) | labelled. |
| Continuous value | `Slider` (`form-controls.tsx`) | labelled; numeric value. |
| Overlay surfaces | `Dialog` `Sheet` `SheetBody` `Popover` `Toast` (`overlays.tsx`) | Radix dialog/select/etc. stay inside `src/components/ui/**`. |
| Menus / tab sets / command lists | `DropdownMenu` `Tabs` `Command` (`menus.tsx`) | — |
| Collapsible panel | `Disclosure` (`disclosure.tsx`), `Accordion` (`menus.tsx`) | native disclosure semantics. |
| Triggered hint | `Tooltip` (`tooltip.tsx`) | no `title` attributes. |

### 3.2 States (single prescription per state — internal consistency guard)

- **Hover (hover-capable only):** controls tint toward accent (`hover:border-accent` on IconButton/secondary Button; `hover:bg-surface` on ghost). List rows hover `--qa-react-nav-row-surface-hover`. Applied under `@media (hover: hover)` where it would otherwise stick on touch (index.css:3705, 2796).
- **Focus-visible (every interactive element):** `outline: 2px solid var(--qa-react-focus); outline-offset: 2px`. Inset `-2px` only where an outer ring would clip (drawer source tabs, index.css:2281). Never removed; never color-only.
- **Selected (single-choice within a control):** segmented/radio/tab selected = `--qa-react-nav-control-selected-bg` background + accent text; settings appearance choice adds `--qa-react-settings-selected` bg + accent-strong border (index.css:1809-1812). Source-tab selected adds a 2px accent underline (index.css:2274-2279).
- **Current (location in a list):** `--qa-react-nav-current-bg` background + `inset 3px 0 0 0 var(--qa-react-accent)` spine + `aria-current=true` (ListRow `data-current`, index.css:3234-3244). Distinct from `selected`; a row is never both.
- **Disabled:** `opacity-55` + `pointer-events-none` (Button/IconButton/fields). Never reduce to color-only.
- **Empty:** `Status tone="info"` with a title + description; optional action. (Observed gap: `#/bookmarks` empty and `#/search` empty render bordered boxes, not `Status` — flagged for the per-screen plans.)
- **Loading (block):** `Spinner` with a label; skeleton sheens are allowed only behind `@media (prefers-reduced-motion: no-preference)` and must freeze under reduce (index.css:762-766).
- **Error:** `Status tone="error"` (`role=alert`) with a recovery `Button`. Offline/degraded uses `tone="warning"` (never error-red) so it reads as caution, consistent with `--qa-react-status-warning-*` deriving from `--qa-react-offline-warning`.

### 3.3 Touch-target rule (44px)
Every interactive element has a minimum **44×44px** (`--qa-react-control-touch-target` = `--qar-size-touch-target`) rendered target. Settings rows enforce `min-height` on radios/switches/comboboxes (index.css:1642-1646). Drawer source tabs/options enforce `min-height: var(--qa-react-control-touch-target)` (index.css:2237). **Exception being corrected:** bare `IconButton` is 40px (defect D3) — the primitive default rises to 44px so overrides are no longer required for compliance.

---

## 4. Theme + night behavior

**Themes** are `document.documentElement.dataset.theme ∈ {light, sepia, dark}`. Every themed surface must draw only from `--qa-react-*` tokens so all three themes stay correct by construction; per-theme overrides live **only** in the `html[data-theme=…]` blocks of `semantic.css`.

Required behavior per surface:
- **Canvas** (`--qa-react-canvas`): light `#fbf8f0` → sepia warmer `#f7ebd0` → dark near-black `#0f1215`. Body and every recipe root consume it.
- **Surfaces/borders/text** shift as a set (§1.1); no surface may hardcode a hex.
- **Accent** warms in sepia (`#815c2b`) and lightens for contrast in dark (`#d4a253`); `--qa-react-accent-strong` and `--qa-react-focus` follow.
- **Status warning/offline**: dark must use the overridden `--qa-react-offline-warning: #d6ae37` (the inherited `#806100` fails contrast on `#0f1215` — semantic.css dark comment). This is the canonical example of a required dark override.
- **Shadows** deepen in dark: `--qa-react-nav-shadow-*` and `--qa-react-settings-shadow` use higher alpha in dark (semantic.css dark block).
- **Swatches** (`--qa-react-theme-swatch-*`) always show the *target* theme's canvas regardless of active theme (`data-swatch` bindings, index.css:1832-1841).
- **Focus ring** stays visible in all three: `--qa-react-focus` = accent per theme.

**Night mode** is orthogonal: `dataset.nightMode='on'` (or `'auto'` under `prefers-color-scheme: dark`). It is *not* a fourth theme. The single mechanism is `.qar-react-night-shift` (index.css:1430-1450): a fixed, `pointer-events: none`, z-9999 overlay painting `--qa-react-night-wash` + 5% accent in `mix-blend-mode: multiply` at `opacity: 0.78`, fading in/out over `--qa-react-transition-fast`. Every surface must remain legible *under* this wash; components must not implement their own dimming. Confirmed live: dark + `nightMode=on` at `#/s/1` visibly dims the whole reader via the overlay with no per-component change.

---

## 5. Motion + reduced-motion rules

### 5.1 Durations / easing per interaction class

| Interaction class | Duration | Easing | Token |
|---|---|---|---|
| Micro feedback (hover, focus, chrome hide/show, scrim fade, night-shift fade) | 120ms | `cubic-bezier(0.2,0,0,1)` | `--qa-react-transition-fast` (`--qar-motion-fast` + `--qar-ease-standard`) |
| Structural settle (drawer slide-in `qar-react-drawer-in`, sheet, accordion/disclosure open) | 240ms | `cubic-bezier(0.2,0,0,1)` | `--qa-react-transition-settle` (`--qar-motion-settle`) |
| Direct manipulation (Mushaf page turn) | 240ms | `cubic-bezier(0.32,0.72,0,1)` | `--qa-react-mushaf-page-turn-duration/-easing` (`--qar-ease-direct-manipulation`) |
| One-shot emphasis (bookmark pulse `qar-reader-verse-pulse`) | 1000ms, `ease-out`, 1 iteration | keyframe | local keyframe, index.css:3645 |

All motion must reference these tokens; no raw `ms` transitions on themed surfaces.

### 5.2 Reduced-motion contract (`prefers-reduced-motion: reduce`)

1. **Global:** `--qar-motion-fast` and `--qar-motion-settle` collapse to `1ms` (index.css:98-102), so every `--qa-react-transition-*` consumer becomes near-instant automatically.
2. **Explicit kills:** the verse/bookmark pulse is `animation: none` (index.css:3662-3666); Mushaf page-turn duration → `0ms` (index.css:3537-3540); search loading sheen `animation: none` (index.css:762-766); bookmarks row transitions `transition: none` (index.css:3668-3671).
3. **Rule for all new motion:** any animation/transition must either (a) consume a `--qa-react-transition-*` token (inherits the 1ms collapse), or (b) add an explicit `animation: none` / `transition: none` inside a `@media (prefers-reduced-motion: reduce)` block. State changes must remain instant and *visible* — reduced motion removes movement, never the resulting state.

---

## 6. Consistency & vetting notes for the orchestrator

- **Single scrim prescription** (D1): scrims = `--qa-react-scrim` everywhere; the current dual `bg-text/30` vs `sheet-scrim` is the one place two sections of the codebase prescribe different treatments — this brief resolves it to the token.
- **Single chrome-surface prescription:** the reader bar and the floating pills both use `--qa-react-chrome-surface` (§1.2 A1); no inline `color-mix` duplicates.
- **Selected vs current** are distinct and never merged (§3.2).
- **No new namespace, no new dependencies, no CSS-class/DOM-shape/screenshot assertions** are implied anywhere in this brief.
- Retirement requests R1/R2 are gated by the orchestrator's zero-consumer grep (spec §6); R3 is a stale spec entry to confirm-and-drop.

**Handoff:** per-screen plans (v2 part 2) consume §2 chrome tiers, §3 ownership/state map, and §4/§5 theme-motion contracts without inventing any new tokens, colors, or easings.
