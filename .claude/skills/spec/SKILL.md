---
name: spec
description: Load a story spec, extract acceptance criteria, and create tasks for implementation
---

Load the spec for a given story and bootstrap the implementation session.

## Usage

`/spec <story-number>` — e.g., `/spec 2` loads Story 2 (Continuous Reader).

## Steps

1. **Find the spec** — glob for `docs/specs/story-{N}-*.md`. If no match, tell the user and stop.

2. **Read the spec** — read the full spec file. Extract:
   - Story title and summary
   - All functional requirements (FR-xxx)
   - All acceptance criteria (the `- [ ]` checklist)
   - Any non-functional requirements (performance, a11y, offline)

3. **Read the Definition of Done** — read `.claude/rules/definition-of-done.md` to include project-wide DoD criteria alongside story-specific acceptance criteria.

4. **Create tasks** — use TaskCreate to create one task per acceptance criterion. Group related criteria if they are naturally implemented together (e.g., "IDB store creation" + "IDB persistence test"). Each task subject should be imperative and specific.

5. **Present the plan** — summarize for the user:
   - Story scope (one paragraph)
   - Task list with IDs
   - Any ambiguities or questions about the spec (ask via AskUserQuestion)
   - Suggested implementation order (based on dependencies)

6. **Wait for approval** — do not start implementation until the user confirms the task breakdown.
