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
  src_core["src/core"]
  src_data["src/data"]
  src_infra["src/infra"]
  src_listen["src/listen"]
  src_mark["src/mark"]
  src_navigate["src/navigate"]
  src_onboard["src/onboard"]
  src_read["src/read"]
  src_review["src/review"]
  src --> src_App_svelte
  src --> src_configure
  src --> src_core
  src --> src_infra
  src --> src_listen
  src --> src_mark
  src --> src_navigate
  src --> src_read
  src_configure --> src_a11y
  src_configure --> src_core
  src_configure --> src_data
  src_configure --> src_infra
  src_configure --> src_mark
  src_configure --> src_read
  src_core --> src
  src_core --> src_a11y
  src_core --> src_configure
  src_core --> src_data
  src_data --> src_configure
  src_data --> src_core
  src_data --> src_infra
  src_data --> src_read
  src_infra --> src_configure
  src_infra --> src_core
  src_infra --> src_data
  src_listen --> src_configure
  src_listen --> src_core
  src_listen --> src_infra
  src_listen --> src_read
  src_mark --> src_core
  src_mark --> src_data
  src_mark --> src_infra
  src_navigate --> src_a11y
  src_navigate --> src_configure
  src_navigate --> src_core
  src_navigate --> src_data
  src_navigate --> src_infra
  src_navigate --> src_mark
  src_navigate --> src_read
  src_onboard --> src_configure
  src_onboard --> src_core
  src_onboard --> src_data
  src_read --> src_a11y
  src_read --> src_configure
  src_read --> src_core
  src_read --> src_data
  src_read --> src_infra
  src_read --> src_navigate
  src_review --> src_a11y
  src_review --> src_configure
  src_review --> src_core
  src_review --> src_data
  src_review --> src_infra
  src_review --> src_mark
```
<!-- AUTO-GENERATED:mermaid END -->

## Per-directory

<!-- AUTO-GENERATED:dirs START -->
### `src`

- **Imports from:** `src/App.svelte`, `src/configure`, `src/core`, `src/infra`, `src/listen`, `src/mark`, `src/navigate`, `src/read`
- **Imported by:** `src/core`

### `src/App.svelte`

- **Imports from:** _(none)_
- **Imported by:** `src`

### `src/a11y`

- **Imports from:** _(none)_
- **Imported by:** `src/configure`, `src/core`, `src/navigate`, `src/read`, `src/review`

### `src/configure`

- **Imports from:** `src/a11y`, `src/core`, `src/data`, `src/infra`, `src/mark`, `src/read`
- **Imported by:** `src`, `src/core`, `src/data`, `src/infra`, `src/listen`, `src/navigate`, `src/onboard`, `src/read`, `src/review`

### `src/core`

- **Imports from:** `src`, `src/a11y`, `src/configure`, `src/data`
- **Imported by:** `src`, `src/configure`, `src/data`, `src/infra`, `src/listen`, `src/mark`, `src/navigate`, `src/onboard`, `src/read`, `src/review`

### `src/data`

- **Imports from:** `src/configure`, `src/core`, `src/infra`, `src/read`
- **Imported by:** `src/configure`, `src/core`, `src/infra`, `src/mark`, `src/navigate`, `src/onboard`, `src/read`, `src/review`

### `src/infra`

- **Imports from:** `src/configure`, `src/core`, `src/data`
- **Imported by:** `src`, `src/configure`, `src/data`, `src/listen`, `src/mark`, `src/navigate`, `src/read`, `src/review`

### `src/listen`

- **Imports from:** `src/configure`, `src/core`, `src/infra`, `src/read`
- **Imported by:** `src`

### `src/mark`

- **Imports from:** `src/core`, `src/data`, `src/infra`
- **Imported by:** `src`, `src/configure`, `src/navigate`, `src/review`

### `src/navigate`

- **Imports from:** `src/a11y`, `src/configure`, `src/core`, `src/data`, `src/infra`, `src/mark`, `src/read`
- **Imported by:** `src`, `src/read`

### `src/onboard`

- **Imports from:** `src/configure`, `src/core`, `src/data`
- **Imported by:** _(none)_

### `src/read`

- **Imports from:** `src/a11y`, `src/configure`, `src/core`, `src/data`, `src/infra`, `src/navigate`
- **Imported by:** `src`, `src/configure`, `src/data`, `src/listen`, `src/navigate`

### `src/review`

- **Imports from:** `src/a11y`, `src/configure`, `src/core`, `src/data`, `src/infra`, `src/mark`
- **Imported by:** _(none)_

<!-- AUTO-GENERATED:dirs END -->
