# UI Iteration 4 — Search family defect wave (JIT plan)

**Spec:** `docs/superpowers/specs/2026-09-08-ui-screen-fix-refactor-design.md` (Phase B, Iteration 4; folds Phase-C R1)
**Binding brief:** `docs/superpowers/specs/ui/2026-09-08-brief-search.md` (defects §1, composition §2, states §3, lanes §5, migration map §6, decisions §7). Inventory §2.
**Prerequisites:** Iteration 1 (44px IconButton base, layer fix). Independent of Iterations 2-3 except shared Tabs primitive (D-T1).
**Owner:** orchestrator plans → `ui-implementer` → gates → K2.6 re-review + correctness review → commit.

## Tasks

### Task 1 — BLOCKING: detail-panel lifecycle (D-B1, fixes S-B1)
- Clear `selectedPreviewMatch` AND `selectedResult` on every query submit; preview-detail Close reliably clears its panel. State-ownership fix in `SearchWorkspace`/`SearchShell`.
- Constraint: no detail panel may outlive the query that produced it.
- Verify: repro from brief §1 S-B1 (`mercy` → Show all matches → Details `1:1` → new query `2:255`) — no ghost panel; Close works; run twice.

### Task 2 — Lane contract + copy (D-M1 + §5, fixes S-M1, S-M2)
- Route zero-match lookups to the existing `No results` Status (both Overview + Verses panels); answer-preview lane reserved for queries with claims/evidence.
- Rewrite per §5: lookup lane leads with match summary (no "Answer limits" apology, no "No best evidence" stacking); ask lane shows `Status tone="info"` title "No supported answer", description "The sources on this device do not contain enough evidence to answer this as a question. The matching verses are shown below."; mode line = "Answer preview"/"Partial answer"/"Evidence only"; no "v1"/"as prose"/"claims" user-facing.
- Lane decision lives in the presentation model (`search-presentation-model.ts`); brief binds visible outcomes.
- Verify: `mercy`, `2:255`, `الرحمن`, `zzxqwv` — correct lane each; copy strings exact.

### Task 3 — Tabs selected variant (D-T1, fixes S-M3)
- `Tabs` trigger active state: solid `bg-accent`/`text-surface` → `--qa-react-nav-control-selected-bg` + `--qa-react-accent` text (commonality §3.2). Shared primitive — sweep ALL Tabs consumers for the new selected look (report list in review).
- Verify: workspace tabs selected in 3 themes; other Tabs consumers unbroken.

### Task 4 — Detail close split + jump target (D-M4, D-M5; fixes S-M4, S-M5)
- Back-arrow `IconButton` rendered only ≤767px, Close ghost `Button` only ≥768px (conditional render — NOT a display:none class). Delete `.qar-react-search-detail-back` display rules.
- Jump `IconButton` 44px via base; delete `.qar-react-search-result-jump` 34px overrides + the redundant `.qar:inline-flex` 34px rule.
- Verify: desktop detail shows Close only; mobile shows back only; jump target 44×44 measured.

### Task 5 — Evidence-basis grid (fixes S-M6)
- Grid → `repeat(3, minmax(0,1fr))` desktop / single column ≤520px; items sized to content (no forced stretch).
- Verify: no 110px dead-space cards at 1280×900; no ragged orphan at 375×812.

### Task 6 — Status/Spinner gates (fixes S-M7)
- `SearchIndexGate` → `Status tone="info"` + `Spinner` (loading) / `tone="warning"` (pack unavailable) — never a raw `<p>`.
- `SearchGraphExplore` loading sheen → labelled `Spinner`/`Status`; delete bespoke sheen + keyframes (keep reduced-motion freeze semantics via primitive). Explore error → `Status tone="error"`.
- Verify: states exercised (throttle/block index fetch); roles/names only.

### Task 7 — `.qar-react-search-*` migration per brief §6 map (folds Phase-C R1)
- Result rows → `ListRow` (num←ref, title←snippet, arabic, action←jump/Details); selected → `ListRow current` (nav-current + `aria-current`); collapse the two divergent selected rules.
- Overview/answer-preview/evidence-basis/detail/explore module cards → `Card`; chips → `Badge`; preview-tab-note → `Status tone="info"` + Button actions.
- Controls-bar surface → `--qa-react-chrome-surface` (A1 single prescription).
- Keep ONLY thin layout shells per §6 (page grid, sticky controls positioning, verses list/detail grid areas, responsive swaps).
- Clean cutover: delete every migrated bespoke selector; no parallel systems.
- Verify: `#/search` full journey (empty → results → detail → no-results → tabs → sources) both viewports × 3 themes; console clean.

### Task 8 — Status row demotion (S-m3)
- Healthy "Search data is ready on this device." no longer persistently visible — render on state change or fold into the polite region (keep the polite semantics).
- Verify: healthy state shows no ambient line; degraded state still announces.

### Task 9 — Gates + review + commit
- `mise run check` && `mise run build:ui` && `env -u CI mise run smoke`.
- K2.6 re-review: full search journey both viewports × themes; Tabs consumers spot-check.
- Correctness review: REQUIRED — Tasks 1-2 change state/presentation behavior (user-observable contract: lane copy, detail lifecycle); Task 3 radiogroup/tab semantics.
- Commit `fix: search family wave (detail lifecycle, lane contract, primitive migration)`.

## Deferred-advisory (recorded, not scheduled)
S-m1/S-m2 light-theme hairline washout (Badge/secondary border definition) — token-level border decision; revisit at R4 with K2.6 if it reads as major there. Saved-searches drawer panel — Navigation family already covered.
