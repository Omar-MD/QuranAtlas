---
name: handoff
description: Save session state to progress.md so a fresh agent can continue seamlessly
---

Write `progress.md` in the working directory:

```markdown
# Session Progress — [DATE]

## Objective
[What the user is trying to accomplish. Be specific.]

## Completed
[Bullet list: everything done, decided, or built. Include file names and key outputs.]

## Current State
[Exact state right now — last touched, in progress, any partial work.]

## Next Steps
[Ordered list, explicit enough that a new agent can proceed without asking clarifying questions.]

## Constraints & Decisions
[Decisions made, user preferences, things to avoid, tools/libraries, hard constraints.]

## Relevant Files
[All files created, modified, or relevant to the work.]
```

After writing, reply:
> ✅ Saved to `progress.md`. New session prompt:
> *"Read `progress.md`, load context, delete it, confirm objective, ask what to do next."*
