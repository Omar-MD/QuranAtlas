---
name: spec
description: Load a story spec, extract acceptance criteria, and create tasks for implementation
---

Usage: `/spec <N>` (e.g. `/spec 2`)

1. Glob `docs/specs/story-{N}-*.md` — no match → stop.
2. Read spec: extract title, FRs, acceptance criteria (`- [ ]` checklist), NFRs.
3. Read `.claude/rules/definition-of-done.md` for project-wide DoD criteria.
4. TaskCreate one task per AC (group naturally coupled criteria). Imperative, specific subjects.
5. Present: story scope, task list with IDs, ambiguities (ask via AskUserQuestion), suggested order.
6. Wait for user confirmation before implementing.
