# QuranAtlas

Distraction-free Quran reader PWA. Translation: Bridges' Translation by Fadel Soliman — verify license before commercial use.

## Stack
Vanilla JS ES2022+, Vite 6, Lightning CSS (built-in), vite-plugin-pwa + Workbox 7 (injectManifest), idb 8, Vitest 3 + fake-indexeddb, Playwright (Chromium), ESLint v9 flat, Prettier 3, lefthook, Cloudflare Pages, Node 22 LTS.

## Architecture
Modules (all under `src/`): `core/` `reader/` `navigation/` `marks/` `review/` `dataset/` `offline/` `settings/` `about/` `safety/` `a11y/` `sw.js`
- Cross-module: `src/core/events.js` pub/sub only. No direct sibling imports. Exceptions: `safety/input-validator.js`, `a11y/announcer.js`.
- Data: IDB for metadata; Cache Storage for corpus. No localStorage.
- Quran text: `textContent`/`createTextNode` only — never `innerHTML` with corpus data.

## Conventions
- Named exports only. No default exports.
- CSS classes: `qa-` prefix. CSS vars: `--qa-{category}-{name}`.
- IDB stores: `camelCase`. Events: `domain:action` (e.g. `marks:saved`).
- No `px` for layout (use `rem`/`em`/logical units). No string manipulation of Arabic corpus text.

## Hard Constraints
- No new npm deps without approval. No new top-level dirs outside module map.
- `public/dataset/` is build output only — never modify directly.
- Don't modify `docs/master-plan.md` or `docs/tech-stack-decision-record.md`.
- `localStorage`/`sessionStorage` and `innerHTML` with untrusted data forbidden.

## UI: Design Before Code
For any new surface: create 2–4 browser-renderable mockups in `mockups/`, get explicit approval, then implement. Never ASCII art. Applies to: verse card, nav, mark editor, review hub, settings, about, any new surface.

## Documentation
Don't silently update CLAUDE.md. State what changed + quote stale section → apply only after explicit approval. Never propose edits to master plan or tech decision record unprompted.

## Context Management
- Estimate context usage continuously. Never interrupt a task to report it.
- After each completed task, if usage >50%: report `~[X]%` and offer `1` Save & hand off (`/handoff`) | `2` Continue. Report once per 10% threshold.
- If usage >85%, proactively suggest `/handoff` without waiting.
- **New session:** If `progress.md` exists → read it, delete it, confirm: *"Loaded. Continuing: [objective]. Up next: [Y]. Proceed?"* Never ask for context already in the file.

## Workflow

**Delivery tail (shared):** `/verify` → `/commit` → `/ship` | `/ci` (check status only)
- `/verify` — lint + tests + coverage + build + forbidden patterns + module boundaries
- `/ship` — full CI + push (`[full-ci]` triggers e2e + Lighthouse + deploy)

**Feature:** `/write-a-prd` → `/grill-me` → `/prd-to-plan` | `/prd-to-issues` → `/design-an-interface` → `/spec <N>` → `/tdd` → delivery tail

**Bug:** `/qa` (conversational → GH issues) | `/triage-issue` (root cause → TDD fix plan → GH issue) → `/tdd` → delivery tail

**Refactor:** `/improve-codebase-architecture` | `/request-refactor-plan` → delivery tail

**Utility:** `/ubiquitous-language` (DDD glossary) · `/write-a-skill` (new skill)
**Setup (one-time):** `/git-guardrails-claude-code` · `/setup-pre-commit`

**GitHub Issues (token-efficient fetching):**
- **List issues:** `gh issue list --json number,title,state --limit N` (no body)
- **Full body:** `gh issue view N --json body --jq '.body'` (JSON + pipe-friendly)
- **Extract section:** `gh issue view N --json body --jq '.body | split("\n### ") | .[] | select(startswith("SECTION"))'`
- Never use bare `gh issue view N` (returns decorated TTY output with extra formatting). Always use `--json` with specific fields.

`scripts/build-dataset.js`: quran.com API primary, quran-json GitHub fallback.

```bash
npm run dev | build | preview | lint | format | test | test:e2e | ci:local
```
