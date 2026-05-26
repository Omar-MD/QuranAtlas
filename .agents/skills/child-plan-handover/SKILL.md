---
name: child-plan-handover
description: Use when executing, resuming, or revising a child plan/spec from a master spec or multi-plan implementation, especially after prior agents, handovers, blockers, divergence, dependency changes, or completion summaries.
---

# Child Plan Handover

## Overview

Use this before starting a child plan in a larger implementation. Its job is to prevent silent drift: every agent should know what previous agents completed, where they diverged, what is blocked, and whether the current child plan must change before execution.

## Intake

Before editing product code, read:

- The master spec or parent plan.
- The current child plan.
- The shared handoff log named by the master spec or parent plan.
- Any completion notes, PR notes, commit messages, or sibling-plan summaries named by the master spec.
- `git status` and relevant diffs so unrelated dirty work is not mistaken for prior completion.

If the master spec names no shared log, say so explicitly and use the nearest
coordination artifact only as a fallback. Do not invent per-agent or per-plan
handoff files unless the master spec explicitly splits the logs.

## Shared Handoff Log

Prefer one constant log per master-spec track. The master spec or parent plan
should name the path, for example:

```text
Shared handoff log:
docs/superpowers/plans/<master-slug>-handoff-log.md
```

When a shared log exists:

- read it before reconciling the current child plan;
- append or update the entry for the current child plan before handing over;
- record blockers there immediately instead of leaving them only in chat;
- keep sibling-plan summaries in that log unless the master spec names a
  different artifact;
- include exact validation commands and results so later agents can trust the
  trail without reading chat history.

## Reconcile Before Work

Check for:

- Completed work that satisfies, replaces, or changes this child plan.
- Blockers, failed validations, missing dependencies, or deferred follow-ups.
- Divergence from the master spec, including renamed scope, changed sequencing, altered file ownership, or new constraints.
- File-set overlap with other active or recently completed child plans.
- Assumptions in the current child plan that are no longer true.

If previous work changes this child plan, update the plan first. Do not start implementation from stale instructions and explain the mismatch later.

If the plan cannot be updated safely because the master spec is unclear or contradictory, stop and report the blocker with the exact decision needed.

## Execution Rules

- Keep work inside the current child plan unless the reconciliation step justifies a scoped plan update.
- Preserve unrelated dirty files and stage only explicit paths you changed.
- Record newly discovered blockers immediately in the shared handoff log and, when relevant, the current plan.
- If a validation, dependency, or architecture choice differs from the master spec, record the reason and the new expected downstream impact.
- Use the repo's normal implementation, testing, review, and verification skills after this handover check.

## Completion Summary

Before handing over, update the shared handoff log with:

- Status: complete, partial, blocked, or retired.
- Summary: what landed and which plan items it satisfies.
- Divergence: anything that changed from the child plan or master spec, or `none`.
- Blockers and follow-ups: include owner or next decision when known.
- Tests and validation: commands run, results, and why anything could not run.
- Dependency intake: package, tool, data, or environment changes, or `none`.
- Files changed and commits: exact paths and commit SHAs when available.
- Next-agent note: the shortest useful warning or starting point for the next child plan.

The summary should be useful to an agent that has not read the chat history. Prefer concrete evidence over optimism.
