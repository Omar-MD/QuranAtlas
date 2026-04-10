# Architecture — Core Checklist

**Weight: 4** | **Version: 4** | **Items: 27**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

1. **Module boundary enforcement** — No feature module imports from another feature module. Only `core/`, `data/`, `safety/`, and `a11y/` are shared.
   - Check: All `import` statements across `reader/`, `nav/`, `marks/`, `review/`, `settings/`, `about/`
   - Verify: No `../marks/` in `review/`, no `../reader/` in `nav/`, etc.

2. **Event bus discipline** — All cross-module communication flows through `core/events.js`. No module directly calls another feature module's functions.
   - Check: All inter-module calls — should be `emit()` not direct function calls
   - Verify: Event names follow `namespace:action` convention

3. **No circular dependencies** — Import graph is a DAG. No module A imports B which imports A (directly or transitively). Permitted cross-feature imports: `review/` → `marks/store.js` (data access), `safety/` and `a11y/` (any module). All others must go through `core/events.js`.
   - Check: Full dependency graph
   - Verify: `core/` has no `src/` imports, `data/` imports only `core/`, features import `core/` + `data/` + permitted exceptions only

4. **Single responsibility** — Each module has one clear purpose. Modules handling multiple concerns must be split regardless of line count.
   - Check: `reader/index.js`, `nav/index.js`, `marks/editor.js` — verify each handles a single concern
   - Verify: No module mixes rendering, data access, and event coordination. Line count alone is not a violation if responsibility is singular

5. **Event type contract** — Event types are defined as constants, not string literals. Typos in event names are caught at build time or documented.
   - Check: `core/events.js` — event name definitions
   - Verify: No ad-hoc event name strings scattered across modules

6. **Encapsulated state** — Module-level mutable state is guarded against concurrent access. `init()` before `cleanup()` is prevented or safe.
   - Check: All module-level state variables across features
   - Verify: Guards against double-init, state corruption

7. **Lifecycle management** — Every module with subscriptions, observers, or listeners has matching `cleanup()` / `destroy()` functions. All are called on route change.
   - Check: `cleanup()` exists and is comprehensive for each feature module
   - Verify: `app.js` calls cleanup before route change

8. **Centralized IDB connection** — All IDB connections go through `core/db.js`. Domain modules (`marks/store.js`, `review/state.js`) may own their store-specific CRUD but must use the shared connection from `core/db.js`. No module opens its own `indexedDB.open()` connection.
   - Check: All `indexedDB.open()` calls — must be in `core/db.js` only
   - Verify: `marks/store.js`, `review/state.js`, `settings/` modules use the shared `db.js` connection, not their own

9. **No dead code** — No deprecated re-exports, unused functions, or placeholder imports.
   - Check: `core/router.js` deprecated re-exports, unused imports
   - Verify: ESLint `no-unused-vars` catches dead code

10. **Phase 4 readiness** — Architecture has clear extension points for BroadcastChannel sync, custom tags, filtered review, bulk delete, font size controls.
    - Check: Event bus has capacity for new event types. `marks/store.js` can accommodate custom tags. `review/hub.js` can accommodate FVR and bulk delete
    - Verify: Module structure accommodates new features without restructuring. `safety/sync.js` stub exists for BroadcastChannel (Phase 4)

11. **Cross-cutting import whitelist** — Only `safety/` and `a11y/` modules may be imported by any feature module. No other cross-feature imports exist except `review/` → `marks/store.js`.
    - Check: All `import` statements in feature modules — verify no unauthorized cross-feature imports
    - Verify: Import whitelist matches tech-stack.md module communication rules exactly

12. **Route registration completeness** — All 6 defined routes are registered in `core/router.js`: `#/s/:surah`, `#/s/:surah/:ayah`, `#/review`, `#/settings`, `#/about`, `#/t/:tag`.
    - Check: `core/router.js` route table — all routes present, no orphaned or undocumented routes
    - Verify: Each route maps to the correct module per tech-stack.md routing table

13. **Event namespace convention** — All event names follow the `module:action` pattern (e.g., `marks:saved`, `reader:position-changed`, `dataset:update-available`). No ad-hoc event strings.
    - Check: All `emit()` and `on()` calls — event names use consistent `module:action` format
    - Verify: Event names are documented in the emitting module. No string literal event names outside of constants

14. **Minimal export surface** — Modules export only what consumers need. No internal helpers, private state, or implementation details are exported. Default exports for route handlers; named exports for utility modules.
    - Check: Each module's `export` statements — are any exports unused outside the module?
    - Verify: ESLint or manual review confirms no over-exported internals. Test files do not import private functions to test — they test through the public API

15. **Error boundary isolation** — A failure in one feature module does not crash the entire app. `reader/` failing does not break `nav/`. `marks/` failing does not break `reader/`. Each module's `init()` is wrapped in try/catch at the orchestration layer.
    - Check: `core/app.js` or `core/router.js` — route handler invocations wrapped in error boundaries
    - Verify: Simulating a throw in `marks/editor.js::init()` does not prevent `reader/index.js` from rendering. Error is logged and user sees degraded but functional UI

16. **Consistent module interface contract** — All route handler modules export `async init(params)` and `cleanup()` with the same signature. No module uses a different lifecycle pattern.
    - Check: `reader/index.js`, `nav/index.js`, `review/hub.js`, `settings/index.js`, `about/index.js` — all export `init()` and `cleanup()`
    - Verify: `core/router.js` can call any module's lifecycle methods without special-casing. No module requires unique initialization parameters beyond `params`

17. **Build configuration hygiene** — No hardcoded absolute paths, no environment-specific values baked into source. All environment-specific config flows through Vite `define` or `.env` files.
    - Check: Source files for hardcoded URLs, paths, or environment assumptions
    - Verify: `vite.config.js` `define` block is the sole injection point for build-time constants (e.g., `__APP_VERSION__`). No `process.env` references in browser code

18. **Dependency direction enforcement** — Import graph flows strictly downward: `core/` ← `data/` ← features. No upward imports (feature → core import that pulls in another feature). Enforceable via ESLint import rules or a dependency graph check script.
    - Check: Full import graph — `core/` never imports from `data/` or features. `data/` never imports from features
    - Verify: A circular dependency detection tool (e.g., `madge --circular`) reports zero cycles

### Vanilla JS Code Discipline

> These items address patterns that frameworks enforce automatically (component boundaries, state management, event delegation) but vanilla JS applications must enforce through convention and review.

19. **Render function organization** — Rendering logic is extracted into small, focused template functions (one per component/section). No render function exceeds 40 lines (excluding JSDoc comments). Render functions are pure: they take data and return DOM elements, with no side effects (no IDB reads, no event listener attachment, no module state mutation).
    - Check: `reader/index.js` render functions (`renderVerseChunk`, `renderSurahHeader`, `renderTopBar`), `nav/index.js` surah list rendering, `review/hub.js` mark rendering, `marks/editor.js` modal rendering
    - Verify: Each render function produces one logical component. No render function calls `get()`/`put()` on IDB, attaches `addEventListener`, or assigns to module-level state variables

20. **State mutation discipline** — All module state changes go through a centralized pattern (explicit setter functions, a single `updateState()` function, or clearly documented mutation points). No direct assignment to state objects from scattered event handlers or callbacks. UI updates derive from state, not from DOM reads.
    - Check: All module-level `let` state variables and every assignment to them. Trace who mutates `currentSurah`, `currentSurahNum`, `renderedCount`, etc.
    - Verify: State is updated in predictable, traceable locations per module — not scattered across event handlers, promise callbacks, and render functions. A reader of the code can identify all mutation points for a given state variable without searching the entire file

21. **No DOM-as-state** — Application state is never read from the DOM to drive business logic. The DOM is a projection of state, not the source of truth. No `element.classList.contains('active')` to determine application flow. No `getAttribute('data-...')` reads to check business state (reading `data-verse` for scroll tracking is acceptable — it's a DOM-to-state mapping, not state derivation).
    - Check: All `classList.contains()`, `getAttribute()`, `dataset` reads that drive logic (not styling) across all modules
    - Verify: Mark status comes from IDB/module state, not from checking if a DOM indicator element exists. Active surah comes from `currentSurahNum`, not from checking which nav item has `.active` class. Theme comes from settings state, not from reading `html[data-theme]`

22. **Event delegation** — DOM event listeners use delegation on container elements rather than attaching individual listeners to each verse, mark, surah item, or other repeated element. Click handlers on lists and grids attach to the parent container with `event.target.closest('[data-selector]')` dispatching, not one listener per child.
    - Check: `reader/index.js` verse interaction handlers, `nav/index.js` surah list click handling, `review/hub.js` mark list click handling
    - Verify: One listener on the container dispatches to the correct child, not N listeners on N children. Adding new items (via chunked rendering or dynamic lists) does not require re-attaching listeners

23. **No inline event handlers** — No `onclick`, `onchange`, `onsubmit`, or other inline event handler attributes in HTML strings or template literals. All event binding happens via `addEventListener()`. This includes dynamically constructed HTML strings.
    - Check: All template functions, `innerHTML` assignments, and HTML string construction across all modules
    - Verify: No `<button onclick="...">` or `<input onchange="...">` patterns in any template literal, string concatenation, or `innerHTML` assignment

24. **Function size discipline** — No function exceeds 50 lines (excluding JSDoc comments and blank lines within the function). Functions longer than 30 lines are candidates for extraction into well-named sub-functions. This applies to all source files — `init()` functions, event handlers, IDB operations, and render functions.
    - Check: All `.js` files in `src/` — measure function body lengths
    - Verify: Long functions are split into descriptively named sub-functions that each do one thing. No function requires scrolling to understand. `init()` functions in particular must not be monolithic — they should delegate to setup/render/bind sub-functions

25. **Naming conventions** — Functions use `verbNoun` naming (`renderVerse`, `savePosition`, `handleScroll`, `getSurah`). Files use `kebab-case` (`scroll-tracker.js`, `input-validator.js`). Constants use `SCREAMING_SNAKE_CASE` (`CHUNK_SIZE`, `SKELETON_TIMEOUT_MS`). Event names use `module:action` (`reader:position-changed`, `marks:saved`). No inconsistencies in convention within the codebase.
    - Check: All function names, file names, constant definitions, and event name constants across `src/`
    - Verify: No `doStuff`, `process` (without noun), `handleClick` (without context noun), or `data` (ambiguous) names. Each name communicates what it does. File names match their primary export's purpose

26. **Anti-pattern detection** — No global variables attached to `window` (except documented build-time constants like `__APP_VERSION__`). DOM writes (createElement, appendChild, innerHTML, textContent assignments) happen only in render functions and setup code, not in event handlers or data callbacks directly. No re-renders triggered without a preceding state change.
    - Check: All `window.` property assignments, all DOM manipulation calls outside render functions, all render function invocations without a state-change guard
    - Verify: Event handlers update state and then call a render function, not manipulate DOM directly. No `window.currentSurah` or similar ad-hoc globals. No `renderTopBar()` calls that aren't preceded by a state change that necessitates the re-render

27. **No test-only code in production source** — No `if (process.env.NODE_ENV === 'test')`, `window.__test_hook__`, or conditional test branches exist in `src/`. All test infrastructure lives in `tests/`.
    - Check: Source files in `src/` for test-only branches, mock stubs, or debug flags
    - Verify: `grep -r "NODE_ENV.*test\|__test_hook__\|__TEST__\|__mock__" src/` returns no results. Feature detection (`typeof IntersectionObserver`) is acceptable
