# Module graph

> AUTO-GENERATED from `src/**/*.{ts,tsx,js}` import statements. Run `pnpm run docs` to regenerate.

Top-level src directories: **11**.

## Mermaid (top-level)

<!-- AUTO-GENERATED:mermaid START -->
```mermaid
graph LR
  src_app["src/app"]
  src_components["src/components"]
  src_continuity["src/continuity"]
  src_data["src/data"]
  src_design_system["src/design-system"]
  src_launch["src/launch"]
  src_metadata["src/metadata"]
  src_offline["src/offline"]
  src_packs["src/packs"]
  src_search["src/search"]
  src_storage["src/storage"]
  src_app --> src_components
  src_app --> src_continuity
  src_app --> src_data
  src_app --> src_design_system
  src_app --> src_metadata
  src_app --> src_packs
  src_app --> src_storage
  src_components --> src_app
  src_components --> src_continuity
  src_components --> src_data
  src_components --> src_design_system
  src_components --> src_metadata
  src_components --> src_packs
  src_components --> src_search
  src_components --> src_storage
  src_continuity --> src_data
  src_continuity --> src_launch
  src_continuity --> src_packs
  src_continuity --> src_storage
  src_data --> src_storage
  src_launch --> src_storage
  src_metadata --> src_search
  src_offline --> src_data
  src_offline --> src_packs
  src_packs --> src_data
  src_packs --> src_offline
  src_packs --> src_storage
  src_search --> src_data
  src_search --> src_storage
```
<!-- AUTO-GENERATED:mermaid END -->

## Per-directory

<!-- AUTO-GENERATED:dirs START -->
### `src/app`

- **Imports from:** `src/components`, `src/continuity`, `src/data`, `src/design-system`, `src/metadata`, `src/packs`, `src/storage`
- **Imported by:** `src/components`

### `src/components`

- **Imports from:** `src/app`, `src/continuity`, `src/data`, `src/design-system`, `src/metadata`, `src/packs`, `src/search`, `src/storage`
- **Imported by:** `src/app`

### `src/continuity`

- **Imports from:** `src/data`, `src/launch`, `src/packs`, `src/storage`
- **Imported by:** `src/app`, `src/components`

### `src/data`

- **Imports from:** `src/storage`
- **Imported by:** `src/app`, `src/components`, `src/continuity`, `src/offline`, `src/packs`, `src/search`

### `src/design-system`

- **Imports from:** _(none)_
- **Imported by:** `src/app`, `src/components`

### `src/launch`

- **Imports from:** `src/storage`
- **Imported by:** `src/continuity`

### `src/metadata`

- **Imports from:** `src/search`
- **Imported by:** `src/app`, `src/components`

### `src/offline`

- **Imports from:** `src/data`, `src/packs`
- **Imported by:** `src/packs`

### `src/packs`

- **Imports from:** `src/data`, `src/offline`, `src/storage`
- **Imported by:** `src/app`, `src/components`, `src/continuity`, `src/offline`

### `src/search`

- **Imports from:** `src/data`, `src/storage`
- **Imported by:** `src/components`, `src/metadata`

### `src/storage`

- **Imports from:** _(none)_
- **Imported by:** `src/app`, `src/components`, `src/continuity`, `src/data`, `src/launch`, `src/packs`, `src/search`

<!-- AUTO-GENERATED:dirs END -->
