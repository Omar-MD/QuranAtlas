# UI References

Committed component reference images and adjacent intent notes live here for creative QuranAtlas UI work.

Use this directory when the UI workflow asks for a visual source of truth before implementation.

## Path Taxonomy

Use this path shape for committed references:

- `docs/ui-references/<surface>/<component>/<state>.<viewport>[.<theme>].png`
- `docs/ui-references/<surface>/<component>/<state>.<viewport>[.<theme>].md`

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

Theme labels are optional unless hierarchy, material feel, or contrast differ in a way the image needs to lock down.

## Reference Types

- `Component reference`: one active component in one named state.
- `Assembly reference`: a route or surface assembly when the design concern is the composition, not a single subpart.
- `State matrix note`: a short intent note that names the states a reference does and does not cover.
- `Proof screenshot`: transient capture made during implementation or tests. Proof belongs in `test-output/` or review context, not here.

These files are for committed visual intent, not generated test artifacts. Keep them focused on current accepted UI states, not full-screen composite moodboards or discarded experiments.

## Pairing And Note Rules

- Every committed image must have a same-basename `.md` intent note.
- Every non-allowlisted intent note must have a same-basename image.
- Intent notes must include these headings:
  - `## Component`
  - `## State and viewport`
  - `## Accepted visual traits`
  - `## Forbidden traits`
  - `## Token expectations`
  - `## Responsive differences`
  - `## Non-goals`
- Notes stay current-state only. Do not include progress logs, dates, SHAs, or rejected-option history.

## Workflow Rules

- One implementation pass gets one active reference source at a time.
- `DESIGN.md` is product-style context, not the active component reference.
- Use a committed reference for creative direction work.
- For narrow bug fixes or token cleanup, one accepted current UI state can be the active reference source.
- `test-output/` screenshots, Playwright artifacts, and ad hoc browser captures are not source of truth unless they are explicitly promoted into this directory with a note.
