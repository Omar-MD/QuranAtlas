# Module graph

> AUTO-GENERATED from `src/**/*.{ts,js,svelte}` import statements. Run `pnpm run docs` to regenerate.

Top-level src directories: **13**.

## Mermaid (top-level)

<!-- AUTO-GENERATED:mermaid START -->
```mermaid
graph LR
  src["src"]
  src_App_svelte["src/App.svelte"]
  src_a11y["src/a11y"]
  src_configure["src/configure"]
  src_continuity["src/continuity"]
  src_core["src/core"]
  src_data["src/data"]
  src_infra["src/infra"]
  src_metadata["src/metadata"]
  src_navigate["src/navigate"]
  src_onboard["src/onboard"]
  src_packs["src/packs"]
  src_read["src/read"]
  src --> src_App_svelte
  src --> src_configure
  src --> src_continuity
  src --> src_core
  src --> src_infra
  src --> src_navigate
  src --> src_read
  src_configure --> src_a11y
  src_configure --> src_continuity
  src_configure --> src_core
  src_configure --> src_data
  src_configure --> src_infra
  src_configure --> src_packs
  src_configure --> src_read
  src_continuity --> src_core
  src_continuity --> src_data
  src_continuity --> src_infra
  src_continuity --> src_packs
  src_core --> src
  src_core --> src_a11y
  src_core --> src_continuity
  src_core --> src_data
  src_core --> src_packs
  src_core --> src_read
  src_data --> src_configure
  src_data --> src_continuity
  src_data --> src_core
  src_data --> src_infra
  src_data --> src_packs
  src_infra --> src_core
  src_metadata --> src_core
  src_metadata --> src_data
  src_navigate --> src_a11y
  src_navigate --> src_configure
  src_navigate --> src_continuity
  src_navigate --> src_core
  src_navigate --> src_data
  src_navigate --> src_packs
  src_navigate --> src_read
  src_onboard --> src_configure
  src_onboard --> src_core
  src_onboard --> src_data
  src_onboard --> src_packs
  src_packs --> src_core
  src_packs --> src_infra
  src_packs --> src_read
  src_read --> src_a11y
  src_read --> src_configure
  src_read --> src_continuity
  src_read --> src_core
  src_read --> src_data
  src_read --> src_infra
  src_read --> src_metadata
  src_read --> src_navigate
  src_read --> src_packs
```
<!-- AUTO-GENERATED:mermaid END -->

## Per-directory

<!-- AUTO-GENERATED:dirs START -->
### `src`

- **Imports from:** `src/App.svelte`, `src/configure`, `src/continuity`, `src/core`, `src/infra`, `src/navigate`, `src/read`
- **Imported by:** `src/core`

### `src/App.svelte`

- **Imports from:** _(none)_
- **Imported by:** `src`

### `src/a11y`

- **Imports from:** _(none)_
- **Imported by:** `src/configure`, `src/core`, `src/navigate`, `src/read`

### `src/configure`

- **Imports from:** `src/a11y`, `src/continuity`, `src/core`, `src/data`, `src/infra`, `src/packs`, `src/read`
- **Imported by:** `src`, `src/data`, `src/navigate`, `src/onboard`, `src/read`

### `src/continuity`

- **Imports from:** `src/core`, `src/data`, `src/infra`, `src/packs`
- **Imported by:** `src`, `src/configure`, `src/core`, `src/data`, `src/navigate`, `src/read`

### `src/core`

- **Imports from:** `src`, `src/a11y`, `src/continuity`, `src/data`, `src/packs`, `src/read`
- **Imported by:** `src`, `src/configure`, `src/continuity`, `src/data`, `src/infra`, `src/metadata`, `src/navigate`, `src/onboard`, `src/packs`, `src/read`

### `src/data`

- **Imports from:** `src/configure`, `src/continuity`, `src/core`, `src/infra`, `src/packs`
- **Imported by:** `src/configure`, `src/continuity`, `src/core`, `src/metadata`, `src/navigate`, `src/onboard`, `src/read`

### `src/infra`

- **Imports from:** `src/core`
- **Imported by:** `src`, `src/configure`, `src/continuity`, `src/data`, `src/packs`, `src/read`

### `src/metadata`

- **Imports from:** `src/core`, `src/data`
- **Imported by:** `src/read`

### `src/navigate`

- **Imports from:** `src/a11y`, `src/configure`, `src/continuity`, `src/core`, `src/data`, `src/packs`, `src/read`
- **Imported by:** `src`, `src/read`

### `src/onboard`

- **Imports from:** `src/configure`, `src/core`, `src/data`, `src/packs`
- **Imported by:** _(none)_

### `src/packs`

- **Imports from:** `src/core`, `src/infra`, `src/read`
- **Imported by:** `src/configure`, `src/continuity`, `src/core`, `src/data`, `src/navigate`, `src/onboard`, `src/read`

### `src/read`

- **Imports from:** `src/a11y`, `src/configure`, `src/continuity`, `src/core`, `src/data`, `src/infra`, `src/metadata`, `src/navigate`, `src/packs`
- **Imported by:** `src`, `src/configure`, `src/core`, `src/navigate`, `src/packs`

<!-- AUTO-GENERATED:dirs END -->
