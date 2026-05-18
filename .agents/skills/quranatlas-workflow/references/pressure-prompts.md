# QuranAtlas Skill Pressure Prompts

Use these prompts after editing repo-local skills. The goal is to check whether an agent selects the intended QuranAtlas workflow and avoids common mistakes.

## 1. Surface Behavior Change

Prompt: "Fix the reader so saved position restores after refresh."

Expected skills: `quranatlas-workflow`.

Expected behavior: reads `AGENTS.md` and `docs/context/surfaces/read.md`; treats this as a read/onboard or router cluster if launch restore is involved; updates dossier behavior/invariants if changed; defaults to unit tests unless reload/hydration proof requires e2e.

Wrong behavior to catch: edits `src/reader` directly without reading the dossier, skips docs, or creates a new e2e folder.

## 2. UI Redesign

Prompt: "Redesign the mobile navigation drawer header and implement only that component."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`, `superpowers:brainstorming`, and `imagegen` for any new visual direction.

Expected behavior: identifies navigate/drawer header as the active component; defines state/viewport matrix; creates or selects a component reference plus intent note; uses an available browser-proof path and states the fallback when needed for iteration-time inspection and screenshot comparison after each focused task; proves mobile and relevant desktop/tablet integration; uses `quranatlas-workflow` and `tests/e2e/AGENTS.md` for any checked-in Playwright coverage decision.

Wrong behavior to catch: makes a full drawer restyle, treats `imagegen` as optional for a new visual direction, implements from a composite moodboard, skips reference commit, assumes a specific browser-proof tool without naming a fallback, or does one final screenshot only.

## 3. Mobile Drawer Header Direction

Prompt: "Give the mobile drawer header a calmer visual direction, then implement only the header."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`, `superpowers:brainstorming`, `imagegen`.

Expected behavior: generates component/state options, chooses one, commits `docs/ui-references/navigate/drawer-header.mobile.png` and `.md`, then implements only header structure/spacing/type/state tasks with browser-proof comparison after each task, naming the fallback when it is not obvious.

Wrong behavior to catch: changes drawer actions, route list, or settings affordances; keeps rejected options without a tradeoff; treats generated Arabic as proof.

## 4. Surah Progress Directions

Prompt: "Create three Surah progress visual directions, choose one, commit the reference, and implement that one."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`, `superpowers:brainstorming`, `imagegen`.

Expected behavior: makes component-state references, selects one source of truth with intent note, implements one progress component variant, compares focused tasks with an available browser-proof path plus a stated fallback when needed, and proves responsive/theme fit.

Wrong behavior to catch: implements all three, invents extra implementation commits beyond the requested reference commit, uses a full-screen board as the source of truth, assumes a specific browser-proof tool without naming a fallback, or skips token/accessibility constraints.

## 5. Settings Source Selector Row

Prompt: "Polish only the Settings sheet source selector row; leave the rest of the sheet alone."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`, and brainstorming if the visual direction changes.

Expected behavior: treats the selector row as the active component; decides whether this is existing-direction polish or a new visual direction; targets one aspect per task; compares screenshots after each focused change with an available browser-proof path and a stated fallback when needed; proves sheet containment and touch targets.

Wrong behavior to catch: opportunistic full-sheet restyle, new settings behavior, broad token churn, assumes a specific browser-proof tool without naming a fallback, or only desktop proof.

## 6. Drawer Actions Existing Reference

Prompt: "Implement the drawer actions component from the existing committed reference."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`.

Expected behavior: uses the committed reference image and intent note as the visual source of truth; does not regenerate directions; implements actions only; compares every focused task against the reference with an available browser-proof path and a stated fallback when needed; does not confuse test-output artifacts with the committed reference.

Wrong behavior to catch: redesigns the component, edits unrelated drawer pieces, assumes a specific browser-proof tool without naming a fallback, or lets the reference override accessibility/real interaction behavior.

## 7. Reader Toolbar Compact State

Prompt: "Tighten the compact reader toolbar state and show phone plus desktop proof."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`, and brainstorming if changing direction.

Expected behavior: scopes to compact toolbar state; checks overlap, touch targets, text/icon fit, sticky/header cases, and unframed Mushaf invariants; captures phone plus desktop screenshots and adds a real development-time tablet-sized pass whenever the toolbar can differ at the tablet breakpoint.

Wrong behavior to catch: restyles the whole reader, misses compact state, assumes a specific browser-proof tool without naming a fallback, ignores desktop, or relies on screenshots without measured overlap/overflow checks.

## 8. Onboarding Language Selector

Prompt: "Redesign the onboarding language selector with multiple focused tasks and compare after each task."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`, `superpowers:brainstorming`, and `imagegen`.

Expected behavior: commits a selected component/state reference and intent note; implements focused passes such as structure, spacing, selected state, mobile fit, and theme parity; compares after every pass with an available browser-proof path and a stated fallback when needed and adds development-time tablet proof when the selector layout changes across tiers.

Wrong behavior to catch: treats `imagegen` as optional for a redesign, assumes a specific browser-proof tool without naming a fallback, one-shot implementation, full onboarding restyle, skipped responsive tiers, or rationale-heavy dossier updates.

## 9. Docs-Only Context Update

Prompt: "Update the context docs to reflect the new dataset source pipeline."

Expected skills: `quranatlas-workflow`.

Expected behavior: identifies `docs/context/source-data-flow.md` and possibly `docs/tech-stack.md` as owners; avoids hand-editing generated fences; runs `pnpm run docs` first only if generated context may need regeneration; always runs `pnpm run docs:check` and `git diff --check`; does not add data checks unless source/data files changed.

Wrong behavior to catch: runs app validation or data checks for docs-only edits, edits generated blocks manually, or leaves progress notes in docs.

## 10. Data Contract Change

Prompt: "Add a new persisted setting for the Mushaf page zoom."

Expected skills: `quranatlas-workflow`.

Expected behavior: reads `docs/context/data-model.md`, configure/read dossiers, and relevant tests; updates store types/validation and owner docs; treats data-model changes as cross-cutting; runs `pnpm run validate`.

Wrong behavior to catch: writes directly to the `settings` god-bag without typed/validated contract updates or skips dossier/data-model docs.

## 11. Removed-Scope Cleanup

Prompt: "Remove the old audio mini bar code that still blocks validation."

Expected skills: `quranatlas-workflow`.

Expected behavior: treats listen/audio as removed-scope cleanup only; reads `docs/context/surfaces/listen.md` and `docs/context/open-issues.md`; removes or contains implementation without adding new product behavior; verifies with the smallest command that proves the cleanup plus docs checks when docs change.

Wrong behavior to catch: adds new audio UX, new listen product coverage, or treats listen as active roadmap scope.

## 12. Explicit Product Audit

Prompt: "Run a QuranAtlas readiness audit before I deploy."

Expected skills: `quranatlas-audit`.

Expected behavior: reads product info, tech stack, implemented/open issues, and relevant dossiers; reports findings by severity with file references; separates defects from enhancements; verifies severe findings.

Wrong behavior to catch: starts implementing fixes, gives generic advice, or omits Reader First and removed-scope boundaries.

## 13. Library/API Question During Repo Work

Prompt: "How should we use the latest Svelte 5 event syntax in this component?"

Expected skills: `find-docs`/root Context7 rule first; `quranatlas-workflow` only if a repo behavior or implementation change follows.

Expected behavior: runs `npx ctx7@latest library "Svelte" "<full question>"`, then `npx ctx7@latest docs <id> "<full question>"`; applies QuranAtlas workflow if editing code.

Wrong behavior to catch: answers from memory, uses web search before Context7, or skips QuranAtlas docs when the answer becomes a code change.
