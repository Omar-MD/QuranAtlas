---
name: verify
description: Run the full Definition of Done checklist and report pass/fail per criterion
---

1. `npm run lint` — pass/fail; show first 20 error lines on fail.
2. `npm run test` — pass/fail + coverage summary; flag if lines or functions < 80%.
3. `npm run build && npm run check:chunks` — pass/fail; name any chunk > 150 KB gzip.
4. Grep `src/` for forbidden patterns — report file:line for any match:
   `eval(` · `new Function(` · `setTimeout(` with string arg · `innerHTML` · `outerHTML` · `insertAdjacentHTML` · `localStorage` · `sessionStorage` · `document.write`
5. Grep `src/` for cross-domain imports (`../` crossing module boundaries). Exclude: `core/`, `safety/`, `a11y/`.
6. `npx prettier --check "src/**" "tests/**"` — pass/fail.
7. Present results table (Lint / Unit tests / Coverage ≥ 80% / Build / Chunk sizes / Forbidden patterns / Module boundaries / Formatting). All pass → "Ready to commit." Otherwise list fixes needed.
