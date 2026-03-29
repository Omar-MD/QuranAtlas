---
name: verify
description: Run the full Definition of Done checklist and report pass/fail per criterion
---

Verify that the current working state meets the project's Definition of Done before committing.

## Steps

1. **Lint** — run `npm run lint`. Report pass/fail. If it fails, show the first 20 lines of errors.

2. **Unit tests** — run `npm run test`. Report pass/fail and coverage summary. Flag if coverage is below 80% lines or 80% functions.

3. **Build + chunk check** — run `npm run build && npm run check:chunks`. Report pass/fail. If a chunk exceeds 150 KB gzip, name it and its size.

4. **Forbidden patterns** — grep `src/` for:
   - `eval(`, `new Function(`, `setTimeout(` with string arg
   - `innerHTML`, `outerHTML`, `insertAdjacentHTML`
   - `localStorage`, `sessionStorage`
   - `document.write`
     Report any matches with file and line number.

5. **Module boundary violations** — grep for cross-module imports in `src/`:
   - Find imports from `../` that cross domain boundaries (e.g., `src/reader/` importing from `src/marks/`)
   - Exclude allowed cross-imports: `core/`, `safety/`, `a11y/`
     Report any violations with file and line number.

6. **Formatting** — run `npx prettier --check "src/**" "tests/**"`. Report pass/fail.

7. **Summary** — present a table:

   | Check              | Status  |
   | ------------------ | ------- |
   | Lint               | ✅ / ❌ |
   | Unit tests         | ✅ / ❌ |
   | Coverage ≥ 80%     | ✅ / ❌ |
   | Build              | ✅ / ❌ |
   | Chunk sizes        | ✅ / ❌ |
   | Forbidden patterns | ✅ / ❌ |
   | Module boundaries  | ✅ / ❌ |
   | Formatting         | ✅ / ❌ |

   If all pass, say "Ready to commit." If any fail, list what needs fixing.
