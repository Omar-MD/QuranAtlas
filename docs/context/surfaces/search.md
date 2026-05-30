---
surface: search
src_paths:
  - 'src/app/routes/search/**'
  - 'src/components/search/**'
  - 'src/search/**'
  - 'src/offline/search/**'
test_paths:
  unit:
    - 'tests/unit/react-search/**'
  e2e: []
style_paths:
  - 'src/design-system/**'
---

# Surface: search

> Deferred search prototype and retrieval infrastructure. Full-text `#/search` is not a shipped MVP route.

## Reach

| Entry | Trigger | Result |
| --- | --- | --- |
| `#/search` | URL | Renders the unsupported-route state |
| Search story | Storybook only | Shows the deferred prototype surface for review |
| Search helpers | Internal callers | Provide deferred index schemas, aliases, and search engine utilities |

## Inventory

<!-- AUTO-GENERATED:inventory START -->
| Path | Role |
| --- | --- |
| `src/app/routes/search/SearchRoute.tsx` | _(no leading comment)_ |
| `src/components/search/SearchBox.tsx` | _(no leading comment)_ |
| `src/components/search/SearchIndexGate.tsx` | _(no leading comment)_ |
| `src/components/search/SearchPage.tsx` | _(no leading comment)_ |
| `src/components/search/SearchResults.tsx` | _(no leading comment)_ |
| `src/components/search/search.stories.tsx` | _(no leading comment)_ |
| `src/offline/search/search-pack.ts` | _(no leading comment)_ |
| `src/search/index-client.ts` | _(no leading comment)_ |
| `src/search/result-aliases.ts` | _(no leading comment)_ |
| `src/search/schema.ts` | _(no leading comment)_ |
| `src/search/search-engine.ts` | _(no leading comment)_ |
<!-- AUTO-GENERATED:inventory END -->

## Behavior

The shipped route contract keeps Search out of the MVP. `matchReactRoute('#/search')` returns `unsupported`, and `App` renders the route-unavailable state. Search UI files under `src/components/search/**` are prototype/story material only until the product promotes Search into shipped scope.

Search utilities under `src/search/**` and `src/offline/search/**` may support future retrieval and index planning. They must not introduce user-facing assistant, chat, synthesis, or reflection-prompt UI.

## Style Inventory

<!-- AUTO-GENERATED:style-inventory START -->
| Path | Role |
| --- | --- |
| _(no files match `style_paths`)_ | |
<!-- AUTO-GENERATED:style-inventory END -->

## Data

<!-- AUTO-GENERATED:data-owned START -->
_(none)_
<!-- AUTO-GENERATED:data-owned END -->

<!-- AUTO-GENERATED:data-read START -->
_(no cross-surface reads detected)_
<!-- AUTO-GENERATED:data-read END -->

## Events

<!-- AUTO-GENERATED:events-emit START -->
| Event | Constant | Sites |
| --- | --- | --- |
| _(none)_ | | |
<!-- AUTO-GENERATED:events-emit END -->

<!-- AUTO-GENERATED:events-listen START -->
| Event | Constant | Sites |
| --- | --- | --- |
| _(none)_ | | |
<!-- AUTO-GENERATED:events-listen END -->

## Invariants

- Full-text Search is future scope and must stay route-unsupported until explicitly promoted.
- Prototype Search components must remain story/prototype-only and must not be linked from Reader First navigation.
- Search infrastructure must stay same-origin and offline-aware when it fetches runtime assets.
- Search must not introduce AI assistant, chat, synthesis, or reflection-prompt product scope.

## Regression Guards

<!-- AUTO-GENERATED:tests START -->
**Unit (1):**

- `tests/unit/react-search/search-wave3.test.ts`

**E2E (0):**

_(none)_
<!-- AUTO-GENERATED:tests END -->
