# Reader Refactor Readiness Plan

## Summary

The next milestone is not a broad UI expansion. It is a readiness pass that turns the completed Phase 1 data-lane work into a safe reader integration seam, then closes the infra gaps that would otherwise make Phase 2 reflection work unstable. The sequence should be:

1. Runtime seam hardening
2. Reader integration without behavior regression
3. Minimal Knowledge Lane UI
4. Offline / manifest lane integration
5. Reflection Lane implementation on top of the new seam

## Implementation Changes

### 1. Harden the Knowledge Lane runtime contract

- Add dedicated tests for `src/data/knowledge-dataset.ts` covering:
  - successful per-surah load
  - missing knowledge shard returns `null`
  - `getThemesForAyah()` returns `[]` on missing data
  - `getPassageForAyah()` returns `null` when passage lookup is absent
  - cache clearing works deterministically
- Extend reader/data regression coverage so missing `knowledge/**` files cannot break reader boot or verse rendering.
- Keep the Phase 1 invariant unchanged: text rendering must remain independent from knowledge data.

### 2. Add a reader-facing integration seam before adding visible reflection UX

- In the `read` surface, add a lazy knowledge-loading path tied to the current surah lifecycle.
- Knowledge fetch must never block Arabic/translation render; it should resolve after reader content is already usable.
- Expose one internal reader-level access pattern for:
  - current ayah themes
  - current ayah passage
  - surah passage map
- Avoid introducing reflection prompts, journaling, or new interaction modes in this step.
- Update the `read` dossier to document the new behavior and fallback rules.

### 3. Ship the minimum visible Knowledge Lane UI

- Add only Phase 1 UI already implied by the refactor notes:
  - subtle passage context near the relevant ayah cluster or ayah details view
  - lightweight theme chips for an ayah
- Reuse the existing ayah interaction surface instead of adding a new standalone panel or route.
- Keep the UI optional and low-noise:
  - no blocking modal
  - no reader chrome takeover
  - no AI language
  - no long explanatory prose
- If knowledge data is absent, the UI should simply not appear rather than showing an error state in the primary reading flow.

### 4. Close the infra gap for lane-aware offline behavior

- Remove the temporary Phase 1 carve-out where `knowledge/**` is excluded from manifest hashing once the reader actually depends on those assets for enhancement.
- Extend offline categorization so Knowledge Lane assets are represented explicitly under text-adjacent or knowledge-specific route handling.
- Update `src/core/sw/route-defs.ts`, offline download planning, and the infra/configure dossiers so byte estimation and caching rules match the new shipped assets.
- Preserve current failure behavior:
  - reader text still works without cached knowledge
  - offline settings must not claim knowledge is available unless manifest entries exist

### 5. Implement Reflection Lane only after the above is stable

- Build reflection as the next surface increment on top of the reader seam, not in the same change as first knowledge UI.
- Add:
  - reflection dataset builder
  - runtime loader
  - prompt selection helper
  - one entry point inside the existing ayah interaction flow
- Default UX should stay narrow:
  - one prompt shown first
  - optional “more lenses”
  - no full journaling system unless explicitly added as a separate scope item
- Reflection must degrade gracefully when prompts are absent by using the deterministic fallback prompt defined in the refactor notes.

## Public Interfaces / Contracts

- `src/data/knowledge-dataset.ts` becomes a tested, stable runtime seam for reader enrichment.
- Reader integration should treat knowledge and reflection as optional lazy lanes, not required boot dependencies.
- Offline/manifest policy must be updated so shipped lane assets are represented consistently across:
  - manifest contents
  - service worker routing
  - offline selector byte estimates
- No new route or top-level surface should be introduced in this milestone.

## Test Plan

- Unit:
  - knowledge runtime loader behavior
  - missing-file fallbacks
  - reader helper mapping from ayah to themes/passage
  - offline route classification and byte-sum behavior for new lane assets
  - future reflection prompt selection rules
- E2E:
  - reader still opens normally with no knowledge/reflection interaction
  - ayah interaction reveals knowledge context when data exists
  - reader still works if knowledge files are unavailable
  - offline settings reflect new asset availability correctly
  - reflection entry point opens and shows one prompt once Phase 2 lands
- Verification:
  - `pnpm validate`
  - targeted reader journey spec
  - targeted offline/infra spec if manifest and service worker behavior changes
  - `pnpm run docs` and `pnpm run docs:check` whenever dossiers/context docs change

## Commit Strategy

Because this work crosses data, reader, and infra boundaries, do not fold everything into one commit. Use at least these logical commits:

1. Knowledge runtime seam + tests
2. Reader integration + read dossier updates
3. Offline/manifest lane integration + infra/configure docs
4. Reflection lane + reader reflection UX + docs

If you also want the current in-progress changes committed first, do that as a separate checkpoint commit before starting the reader work so the Phase 1 pipeline state is preserved cleanly.

## Assumptions

- Phase 1 pipeline work is considered complete enough to treat the current builder/runtime outputs as the baseline.
- The next reader work should extend the existing ayah interaction flow, not replace tap behavior with a new primary reflection gesture.
- Knowledge UI remains intentionally subtle; the product goal is readiness for refactor, not a full new study surface yet.
- Reflection is the next major product capability after reader-readiness, but only once manifest/offline handling is no longer a temporary carve-out.
