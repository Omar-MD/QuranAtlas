---
name: handoff
description: Save session state to progress.md so a fresh agent can continue seamlessly
---

Before writing, run `git status` and `git diff --stat` to see what's uncommitted.

Write `progress.md` in the working directory. Keep it under 40 lines.

```markdown
# Handoff — [DATE]

## Objective
[One sentence: what the user is trying to accomplish.]

## In-flight
[Uncommitted or partial work that git won't show. If nothing, write "Clean — all work committed."]

## Next
[Ordered list. Specific enough that a new agent can start the first item without asking questions.]

## Decisions not in git or CLAUDE.md
[Session-specific choices or context that would otherwise be lost. Omit this section if empty.]
```

Rules — do NOT include:
- Completed work — the new agent runs `git log` / `gh issue list`
- CLAUDE.md constraints — the new agent reads them on startup
- File lists — `git diff --stat` and `git status` show them
- Codebase or architecture summaries
Every line must be information that cannot be recovered from git, CLAUDE.md, GitHub issues, or the codebase.

After writing, reply:
> Saved to `progress.md`. New session prompt:
> *"Read `progress.md` and delete it, then confirm objective and next step."*
