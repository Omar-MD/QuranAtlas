# Security — Core Checklist

**Weight: 5** | **Version: 2** | **Items: 18**

## Must-Check Items

> **Not-assessable rule:** If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` with evidence: "Module not yet implemented (Phase N)". Not-assessable items are excluded from the score denominator.

1. **XSS prevention** — All dynamic content uses `textContent`, never `innerHTML` with untrusted data. No `eval()`, `new Function()`, or `setTimeout(string)`.
   - Check: All DOM manipulation across `reader/`, `nav/`, `marks/`, `review/`
   - Verify: Corpus data rendering, surah names, verse numbers, translation text

2. **Input validation completeness** — All user inputs (search, navigation, tag labels) pass through `safety/input-validator.js`. No raw input reaches DOM or storage.
   - Check: `safety/input-validator.js` — coverage of all input types
   - Verify: Search input, navigation params, tag labels, any future user-generated content

3. **CSP configuration** — Content-Security-Policy in `index.html` does NOT include `'unsafe-eval'` or `'unsafe-inline'` in production. Separate dev/prod CSP.
   - Check: `index.html` CSP meta tag
   - Verify: Production build strips dev-only directives

4. **Service worker message validation** — `sw.js` message handler validates `event.source` (a `WindowClient`) before processing. Only same-origin clients can trigger `CACHE_DATASET`, `SKIP_WAITING`, `PURGE_DATASET_CACHE`, `APPLY_DATASET_UPDATE`. Note: SW message events use `event.source`, not `event.origin`.
   - Check: `src/sw.js` message event handler — `event.source` validation
   - Verify: Unknown message types are ignored. Only recognized `type` values are processed

5. **Deep link sanitization** — URL hash params are validated before use. No HTML-special characters (`<`, `>`, `&`, `"`, `'`) survive into DOM attributes or content.
   - Check: `core/router.js` param extraction, `reader/index.js` param usage
   - Verify: Crafted URLs with XSS payloads are rejected or sanitized

6. **Service worker registration** — SW registration is handled by `vite-plugin-pwa` with `injectManifest` mode. Dev mode uses the plugin's dev SW. No manual `navigator.serviceWorker.register()` calls exist outside the plugin.
   - Check: `vite.config.js` — PWA plugin configuration, `injectManifest` mode
   - Verify: No manual SW registration in `core/app.js` or anywhere else. Plugin handles dev/prod separation

7. **IndexedDB access control** — Raw IDB operations are encapsulated in `core/db.js`. No feature module opens direct IDB connections.
   - Check: All IDB `indexedDB.open()` calls are in `db.js` only
   - Verify: Feature modules use `db.js` convenience functions

8. **Input length limits** — All validated inputs have maximum length constraints to prevent ReDoS and buffer issues.
   - Check: `safety/input-validator.js` regex patterns have length bounds
   - Verify: Search input, navigation input, tag labels all have max lengths

9. **No external dependencies** — Zero third-party CDN scripts or external resource loads that could be compromised.
   - Check: `index.html` for external `<script>` tags
   - Verify: `package.json` dependencies — all are build-time only

10. **Dataset integrity** — Dataset is fetched via HTTPS only. Version is tracked in `datasetMeta` IDB store. Full cache invalidation on version mismatch. Per-file SHA-256 checksums were deliberately cut (Story 8 Q6) — full re-download on version change is sufficient.
    - Check: `data/dataset.js` — fetch uses HTTPS. `data/dataset-updater.js` — version comparison triggers full re-download
    - Verify: No HTTP fallback for dataset fetches. Version mismatch triggers complete cache invalidation, not partial update

11. **Clear data confirmation bypass prevention** — "CLEAR" button is disabled until user types "DELETE" (case-insensitive) in the confirmation input (Story 9). No keyboard shortcut or programmatic bypass exists.
    - Check: `settings/clear-data.js` — button disabled state, input validation
    - Verify: Button cannot be clicked or submitted without correct input. Form submission does not bypass the check

12. **Modal history interception** — Mark editor modal pushes a history entry (Story 4 Q). Browser back button dismisses modal, not the page. No unintended navigation occurs.
    - Check: `marks/editor.js` — `history.pushState()` on modal open, `popstate` listener
    - Verify: Back button closes modal. Forward/back after modal close does not produce ghost history entries

13. **URL param post-decode sanitization** — After URL-decoding hash params in `core/router.js`, XSS payloads in encoded form (e.g., `%3Cscript%3E`) are rejected. Sanitization must happen after decoding, not before.
    - Check: `core/router.js` param extraction — decoding then validation order
    - Verify: `#/s/%3Cscript%3E/1` and similar encoded payloads are rejected after decode. `safety/input-validator.js` receives decoded strings

14. **Dependency vulnerability scanning** — `pnpm audit` runs as part of CI and produces zero high/critical vulnerabilities. All dependencies are build-time only — no runtime third-party code ships to users.
    - Check: `pnpm audit --prod` output — zero vulnerabilities in production dependencies (should be none, as all deps are devDependencies)
    - Verify: `package.json` has zero `dependencies` (only `devDependencies`). No vendored scripts in `public/` beyond the dataset

15. **Prototype pollution prevention** — No use of `Object.assign()` with untrusted input, no deep merge of user-controlled objects, no dynamic property access with unsanitized keys on shared objects.
    - Check: All object manipulation involving user input or IDB data
    - Verify: IDB records are used as data only — never as templates for `Object.assign()` or `spread` into module state without validation. `__proto__`, `constructor`, `prototype` keys are not writable via any input path

16. **DOM clobbering prevention** — No reliance on `document.getElementById()` return values for security decisions. Element IDs do not shadow global names. Named form elements cannot override DOM APIs.
    - Check: `index.html` element IDs — no ID matches a global property name (e.g., `name`, `action`, `form`)
    - Verify: Code uses `querySelector` with specific selectors rather than relying on named access. No `document.forms`, `document.embeds`, or similar auto-collections used

17. **No sensitive data in logs** — Console output does not include full IDB records, user marks, reading positions, or any data that could be considered personal. Error messages include context but not data values.
    - Check: All `console.log`, `console.error`, `console.warn` calls
    - Verify: Logs include module name, operation name, and error type — not verse keys, tag labels, or position data. Debug-level logging is stripped or gated behind a flag in production

18. **Cache poisoning prevention** — Service worker only caches responses from the app's own origin. No third-party responses are cached. Cache keys are deterministic and not influenced by user input.
    - Check: `src/sw.js` — `cache.put()` and `cache.match()` calls
    - Verify: Cache names are hardcoded constants (`quran-dataset-v1`, etc.). Cached URLs are from `manifest.json` only — no user-constructed URLs enter the cache. Opaque responses (cross-origin) are not cached
