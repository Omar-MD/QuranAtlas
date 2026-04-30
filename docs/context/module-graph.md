# Module graph

> AUTO-GENERATED from `src/**/*.{ts,js,svelte}` import statements. Run `pnpm docs:derive` to regenerate.

Top-level src directories: **21**.

## Mermaid (top-level)

<!-- AUTO-GENERATED:mermaid START -->
```mermaid
graph LR
  src["src"]
  src_App_svelte["src/App.svelte"]
  src_a11y["src/a11y"]
  src_about["src/about"]
  src_audio["src/audio"]
  src_bookmarks["src/bookmarks"]
  src_core["src/core"]
  src_data["src/data"]
  src_edges["src/edges"]
  src_marks["src/marks"]
  src_nav["src/nav"]
  src_offline["src/offline"]
  src_onboarding["src/onboarding"]
  src_reader["src/reader"]
  src_review["src/review"]
  src_safety["src/safety"]
  src_settings["src/settings"]
  src_state["src/state"]
  src_surahs["src/surahs"]
  src_sw_handlers_js["src/sw-handlers.js"]
  src_tag["src/tag"]
  src --> src_App_svelte
  src --> src_about
  src --> src_audio
  src --> src_bookmarks
  src --> src_core
  src --> src_marks
  src --> src_nav
  src --> src_offline
  src --> src_reader
  src --> src_safety
  src --> src_settings
  src --> src_state
  src --> src_sw_handlers_js
  src --> src_tag
  src_about --> src_a11y
  src_about --> src_marks
  src_about --> src_settings
  src_audio --> src_core
  src_audio --> src_reader
  src_audio --> src_safety
  src_audio --> src_settings
  src_audio --> src_state
  src_bookmarks --> src_a11y
  src_bookmarks --> src_core
  src_bookmarks --> src_data
  src_bookmarks --> src_safety
  src_bookmarks --> src_state
  src_core --> src
  src_core --> src_a11y
  src_core --> src_data
  src_core --> src_state
  src_data --> src_core
  src_data --> src_settings
  src_data --> src_state
  src_edges --> src_core
  src_edges --> src_safety
  src_marks --> src_core
  src_marks --> src_safety
  src_nav --> src_a11y
  src_nav --> src_bookmarks
  src_nav --> src_core
  src_nav --> src_data
  src_nav --> src_marks
  src_nav --> src_reader
  src_nav --> src_settings
  src_nav --> src_state
  src_nav --> src_tag
  src_offline --> src_core
  src_onboarding --> src_core
  src_onboarding --> src_data
  src_onboarding --> src_settings
  src_reader --> src_a11y
  src_reader --> src_core
  src_reader --> src_data
  src_reader --> src_marks
  src_reader --> src_nav
  src_reader --> src_settings
  src_reader --> src_state
  src_review --> src_a11y
  src_review --> src_core
  src_review --> src_data
  src_review --> src_marks
  src_review --> src_safety
  src_review --> src_state
  src_safety --> src_core
  src_safety --> src_state
  src_settings --> src_a11y
  src_settings --> src_core
  src_settings --> src_data
  src_settings --> src_safety
  src_settings --> src_state
  src_state --> src_core
  src_state --> src_data
  src_surahs --> src_a11y
  src_surahs --> src_bookmarks
  src_surahs --> src_core
  src_surahs --> src_data
  src_surahs --> src_reader
  src_surahs --> src_state
  src_tag --> src_core
  src_tag --> src_data
  src_tag --> src_marks
  src_tag --> src_state
```
<!-- AUTO-GENERATED:mermaid END -->

## Per-directory

<!-- AUTO-GENERATED:dirs START -->
### `src`

- **Imports from:** `src/App.svelte`, `src/about`, `src/audio`, `src/bookmarks`, `src/core`, `src/marks`, `src/nav`, `src/offline`, `src/reader`, `src/safety`, `src/settings`, `src/state`, `src/sw-handlers.js`, `src/tag`
- **Imported by:** `src/core`

### `src/App.svelte`

- **Imports from:** _(none)_
- **Imported by:** `src`

### `src/a11y`

- **Imports from:** _(none)_
- **Imported by:** `src/about`, `src/bookmarks`, `src/core`, `src/nav`, `src/reader`, `src/review`, `src/settings`, `src/surahs`

### `src/about`

- **Imports from:** `src/a11y`, `src/marks`, `src/settings`
- **Imported by:** `src`

### `src/audio`

- **Imports from:** `src/core`, `src/reader`, `src/safety`, `src/settings`, `src/state`
- **Imported by:** `src`

### `src/bookmarks`

- **Imports from:** `src/a11y`, `src/core`, `src/data`, `src/safety`, `src/state`
- **Imported by:** `src`, `src/nav`, `src/surahs`

### `src/core`

- **Imports from:** `src`, `src/a11y`, `src/data`, `src/state`
- **Imported by:** `src`, `src/audio`, `src/bookmarks`, `src/data`, `src/edges`, `src/marks`, `src/nav`, `src/offline`, `src/onboarding`, `src/reader`, `src/review`, `src/safety`, `src/settings`, `src/state`, `src/surahs`, `src/tag`

### `src/data`

- **Imports from:** `src/core`, `src/settings`, `src/state`
- **Imported by:** `src/bookmarks`, `src/core`, `src/nav`, `src/onboarding`, `src/reader`, `src/review`, `src/settings`, `src/state`, `src/surahs`, `src/tag`

### `src/edges`

- **Imports from:** `src/core`, `src/safety`
- **Imported by:** _(none)_

### `src/marks`

- **Imports from:** `src/core`, `src/safety`
- **Imported by:** `src`, `src/about`, `src/nav`, `src/reader`, `src/review`, `src/tag`

### `src/nav`

- **Imports from:** `src/a11y`, `src/bookmarks`, `src/core`, `src/data`, `src/marks`, `src/reader`, `src/settings`, `src/state`, `src/tag`
- **Imported by:** `src`, `src/reader`

### `src/offline`

- **Imports from:** `src/core`
- **Imported by:** `src`

### `src/onboarding`

- **Imports from:** `src/core`, `src/data`, `src/settings`
- **Imported by:** _(none)_

### `src/reader`

- **Imports from:** `src/a11y`, `src/core`, `src/data`, `src/marks`, `src/nav`, `src/settings`, `src/state`
- **Imported by:** `src`, `src/audio`, `src/nav`, `src/surahs`

### `src/review`

- **Imports from:** `src/a11y`, `src/core`, `src/data`, `src/marks`, `src/safety`, `src/state`
- **Imported by:** _(none)_

### `src/safety`

- **Imports from:** `src/core`, `src/state`
- **Imported by:** `src`, `src/audio`, `src/bookmarks`, `src/edges`, `src/marks`, `src/review`, `src/settings`

### `src/settings`

- **Imports from:** `src/a11y`, `src/core`, `src/data`, `src/safety`, `src/state`
- **Imported by:** `src`, `src/about`, `src/audio`, `src/data`, `src/nav`, `src/onboarding`, `src/reader`

### `src/state`

- **Imports from:** `src/core`, `src/data`
- **Imported by:** `src`, `src/audio`, `src/bookmarks`, `src/core`, `src/data`, `src/nav`, `src/reader`, `src/review`, `src/safety`, `src/settings`, `src/surahs`, `src/tag`

### `src/surahs`

- **Imports from:** `src/a11y`, `src/bookmarks`, `src/core`, `src/data`, `src/reader`, `src/state`
- **Imported by:** _(none)_

### `src/sw-handlers.js`

- **Imports from:** _(none)_
- **Imported by:** `src`

### `src/tag`

- **Imports from:** `src/core`, `src/data`, `src/marks`, `src/state`
- **Imported by:** `src`, `src/nav`

<!-- AUTO-GENERATED:dirs END -->
