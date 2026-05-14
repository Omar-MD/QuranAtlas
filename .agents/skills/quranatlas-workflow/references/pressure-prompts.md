# QuranAtlas Skill Pressure Prompts

Use these prompts after editing repo-local skills. The goal is to check whether an agent selects the intended QuranAtlas workflow and avoids common mistakes.

## 1. Surface Behavior Change

Prompt: "Fix the reader so saved position restores after refresh."

Expected skills: `quranatlas-workflow`.

Expected behavior: reads `AGENTS.md` and `docs/context/surfaces/read.md`; treats this as a read/onboard or router cluster if launch restore is involved; updates dossier behavior/invariants if changed; defaults to unit tests unless reload/hydration proof requires e2e.

Wrong behavior to catch: edits `src/reader` directly without reading the dossier, skips docs, or creates a new e2e folder.

## 2. UI Redesign

Prompt: "Polish the navigation drawer on mobile and show me screenshots."

Expected skills: `quranatlas-workflow`, `quranatlas-ui-workflow`, `frontend-design`, and brainstorming before creative changes.

Expected behavior: reads the navigate dossier and current drawer source/styles; establishes a design direction; uses existing tokens/components; captures mobile and desktop screenshots; critiques screenshots before completion.

Wrong behavior to catch: starts with placeholder mockups, skips browser proof, or documents pixel trivia in dossiers.

## 3. Docs-Only Context Update

Prompt: "Update the context docs to reflect the new dataset source pipeline."

Expected skills: `quranatlas-workflow`.

Expected behavior: identifies `docs/context/source-data-flow.md` and possibly `docs/tech-stack.md` as owners; avoids hand-editing generated fences; runs `pnpm run docs`, `pnpm run docs:check`, and `git diff --check`.

Wrong behavior to catch: runs app validation instead of docs checks, edits generated blocks manually, or leaves progress notes in docs.

## 4. Data Contract Change

Prompt: "Add a new persisted setting for the Mushaf page zoom."

Expected skills: `quranatlas-workflow`.

Expected behavior: reads `docs/context/data-model.md`, configure/read dossiers, and relevant tests; updates store types/validation and owner docs; treats data-model changes as cross-cutting; runs `pnpm run validate`.

Wrong behavior to catch: writes directly to the `settings` god-bag without typed/validated contract updates or skips dossier/data-model docs.

## 5. Removed-Scope Cleanup

Prompt: "Remove the old audio mini bar code that still blocks validation."

Expected skills: `quranatlas-workflow`.

Expected behavior: treats listen/audio as removed-scope cleanup only; reads `docs/context/surfaces/listen.md` and `docs/context/open-issues.md`; removes or contains implementation without adding new product behavior; verifies with the smallest command that proves the cleanup plus docs checks when docs change.

Wrong behavior to catch: adds new audio UX, new listen product coverage, or treats listen as active roadmap scope.

## 6. Explicit Product Audit

Prompt: "Run a QuranAtlas readiness audit before I deploy."

Expected skills: `quranatlas-audit`.

Expected behavior: reads product info, tech stack, implemented/open issues, and relevant dossiers; reports findings by severity with file references; separates defects from enhancements; verifies severe findings.

Wrong behavior to catch: starts implementing fixes, gives generic advice, or omits Reader First and removed-scope boundaries.

## 7. Library/API Question During Repo Work

Prompt: "How should we use the latest Svelte 5 event syntax in this component?"

Expected skills: root Context7 rule first; `quranatlas-workflow` only if a repo behavior or implementation change follows.

Expected behavior: runs `npx ctx7@latest library "Svelte" "<full question>"`, then `npx ctx7@latest docs <id> "<full question>"`; applies QuranAtlas workflow if editing code.

Wrong behavior to catch: answers from memory, uses web search before Context7, or skips QuranAtlas docs when the answer becomes a code change.
