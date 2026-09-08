# UI Iteration 1 — Commonality implementation (JIT plan)

**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` (Phase B, Iteration 1)
**Binding brief:** `docs/superpowers/specs/ui/2026-09-08-brief-commonality.md` (vetted 2026-09-08; §1.2 A1/A2, §1.3 R1/R2, §1.4 D1/D3, §2.4 scrim rule)
**Also binding (vetted per-screen addenda):** settings brief S-P1 (dark scrim value 38%) + S-P2 (adaptive-settings variant re-founding; supersedes narrow D2 task); launch brief L-P1 (Spinner reduced-motion kill); about brief A-P1 (`--qa-react-text-on-danger` token proposal, adopted).
**Owner:** orchestrator plans → `ui-implementer` applies → gates → K2.6 re-review → commit.
**Zero-consumer gates below were re-verified by orchestrator grep on 2026-09-08 and MUST be re-run immediately before Task 4.**

## Tasks

### Task 1 — IconButton 44px default (brief D3)
- `src/components/ui/icon-button.tsx`: base classes `qar:min-h-10 qar:min-w-10` → `qar:min-h-11 qar:min-w-11`.
- Remove now-redundant `qar:min-h-11 qar:min-w-11` ad-hoc additions at call sites that exist only to reach 44px (e.g. `src/components/navigation/ChromeFrame.tsx` chrome IconButtons). Deliberately-larger overrides (reader chrome 48px via `.qar-reader-chrome-icon`) stay.
- Verify: `mise run check:registry` + grep no remaining bare-40px IconButtons; ui-verify spot-check `#/surahs` + `#/s/1` chrome at 375×812 (targets ≥44px, layout unbroken).

### Task 2 — Reader chrome bar consumes the token (brief §1.2 A1)
- `src/design-system/index.css` `.qar-reader-chrome`: replace inline `background: color-mix(in srgb, var(--qa-react-surface) 92%, transparent)` with `background: var(--qa-react-chrome-surface)`; keep `backdrop-filter: blur(14px)` local.
- Verify: ui-verify reader chrome light/sepia/dark at 1280×900 — rendered bar visually identical to before (same mix value); `mise run check:design`.

### Task 3 — Scrim token everywhere + dark value (brief §1.4 D1 / §2.4 + settings S-P1)
- Add ONE shared scrim class in `index.css` consuming `var(--qa-react-scrim)` (pattern exists: `.qar-react-sheet-scrim` at ~1485 — factor so the background rule is shared and z-index stays utility-owned).
- `src/components/ui/overlays.tsx`: `Dialog` overlay and non-navigation-drawer `Sheet` overlay replace `qar:bg-text/30` with the shared scrim class (keep `qar:z-40`). Navigation-drawer mobile scrim unchanged (already token-backed). adaptive-settings `:has()` sibling rule (index.css ~1497-1500) may collapse into the shared class if it becomes redundant — no behavior change.
- **Value change (S-P1b):** `--qa-react-scrim` dark `rgb(0 0 0 / 48%)` → `rgb(0 0 0 / 38%)`; light/sepia stay `32%`. Dark's light ink needs more dimming than light's dark ink, but 48% flattens the dark base.
- Verify: ui-verify — settings sheet + a Dialog (e.g. clear-data confirm in settings) over reader in light/dark; scrims render as neutral black tint, not text-brown; dark base stays legible under 38%; console clean.

### Task 4 — Token retirement R1+R2 (brief §1.3; gates REQUIRED fresh)
- Orchestrator re-runs zero-consumer greps immediately before edit:
  - `grep -rn "var(--qa-react-nav-current-spine)" src/` → must be empty.
  - `grep -rn "var(--qa-react-bookmark-pulse" src/` → must be empty.
- Then delete `--qa-react-nav-current-spine`, `--qa-react-bookmark-pulse-bg`, `--qa-react-bookmark-pulse-edge` from `src/design-system/tokens/semantic.css` (all theme blocks where present).
- Verify: `mise run check` (guardrails) + full-app visual spot (bookmark pulse still animates with selection/accent colors on `#/s/1`).

### Task 5 — Re-found `adaptive-settings` variant + fix the layer war (settings S-P2; fixes S-D1/S-D3/S-D4)
- Symptom (DOM-verified by two seats): the settings sheet computes BASE Sheet utility values (bg canvas, shadow-lg, z-50, w-96/448px, radius 12px, padding 20px, display grid) — every `[data-sheet-variant="adaptive-settings"]` declaration in the components layer LOSES to Tailwind utilities. Same root-cause family as N1 (drawer selected tabs never paint), S-M4 (mobile back visible on desktop), N2 (wird card flat).
- Root-cause the layer/cascade architecture precisely (Tailwind v4 `@import "tailwindcss"` layer chain vs the author `@layer qa-react-*` chain — inspect the BUILT css to see the real layer order) and fix it so component-layer variant recipes reliably beat utilities for the elements they own.
- Re-found `adaptive-settings` so the variant owns: `--qa-react-settings-sheet` bg, `--qa-react-settings-shadow`, z-120, desktop rail `min(28rem, 100vw - 24px)`, radius 0, flex column, padding 0, sticky header (settings brief §5 S-P2 / §4).
- Blast-radius check: if the layer fix changes precedence globally, spot-verify all surfaces; drawer aria-selected rules may START painting (direction is correct per navigation N1 — full SegmentedControl cutover stays in the Navigation wave).
- If the root cause is architectural beyond a contained fix, STOP and report — do not force.
- Verify: ui-verify desktop+mobile settings sheet light/sepia/dark — settings-sheet tone + rail width + z-120 over reader chrome (mobile header no longer collides); `mise run check:ui-patterns` + `check:boundaries`.

### Task 6 — Spinner reduced-motion kill (launch L-P1; commonality §5.2 rule b)
- `Spinner` uses `animate-spin` (1s linear infinite) which does NOT inherit the global duration collapse; under `prefers-reduced-motion: reduce` it spins forever.
- Add one rule on the primitive: `animation: none` under the reduce media query. Frozen ring + label still read as `role=status`.
- Verify: ui-verify with `page.emulateMediaFeatures` reduce — launch splash + reader loading spinner frozen; `mise run check:design`.

### Task 7 — Danger Button ink token (about A-P1)
- Add `--qa-react-text-on-danger` to `semantic.css`: light `#faf1d8`, sepia `#faf1d8`, dark `#f8f2e4` (each ≥5.9:1 on `danger-600 #a63a2f`).
- `button.tsx` `variant="danger"` consumes it instead of `qar:text-surface` (dark pairing today ≈2.66:1). `primary` keeps `text-surface` (dark ≈7.4:1 fine).
- Verify: ui-verify `#/about` clear-data trigger + confirm in dark; `mise run check:design` + `check:registry`.

### Task 8 — Iteration gates + review + commit
- `mise run check` && `mise run build:ui` && `env -u CI mise run smoke` all green (qa-dev holds 5173; the harness injects CI=true which breaks Playwright's server reuse).
- K2.6 re-review of touched surfaces: reader chrome, dialog scrims (light+dark), settings sheet (both viewports × themes), IconButtons, about danger button, frozen spinner under reduce.
- Correctness review: REQUIRED if Task 5's layer fix changes cascade behavior globally — bounded `ui-correctness-reviewer` pass on the layer mechanism + z-order/focus implications.
- Commit `refactor: adopt commonality layer (scrim token, sheet variant, 44px icon buttons, token retirement)`; tree clean (user's unrelated changes excluded).

## Out of scope (later iterations)
Per-screen defect fixes (Iterations 2-6), `.qar-react-search-*` migration (R1), dark-scrim per-surface composition beyond the token (Settings wave), empty-state → `Status` migrations (family waves).
