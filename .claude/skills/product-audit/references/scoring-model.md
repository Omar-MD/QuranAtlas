# Scoring Model

This is the single source of truth for weights, scoring, severity, and cross-dimensional rules. Referenced by SKILL.md and subagent prompts.

## Dimension Weights

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| Functional correctness | 5 | Wrong verse or broken navigation is unacceptable for a religious text app |
| Security | 5 | XSS or data corruption destroys user trust |
| Reliability | 5 | Offline-first PWA — data loss or broken offline is the #1 failure mode |
| Performance | 4 | Mobile-first on 4x CPU throttle — jank kills the reading experience |
| Architecture | 4 | Must scale cleanly to Phase 4 features without restructuring |
| Testability | 3 | Quality foundation — without tests, regressions are invisible |
| UI Quality | 3 | Accessibility barriers prevent users from accessing content; responsive failures break mobile-first PWA; inconsistency erodes trust |
| Observability | 1 | Acceptable to fly blind short-term, but limits debugging long-term |
| **Total** | **30** | |

## Scoring Formula

```
weighted_score = sum(dimension_score * weight) / 30
```

Example:
```
Functional:   7 * 5 = 35
Security:     6 * 5 = 30
Reliability:  5 * 5 = 25
Performance:  7 * 4 = 28
Architecture: 8 * 4 = 32
Testability:  7 * 3 = 21
UI Quality:   6 * 3 = 18
Observability:3 * 1 = 3
Total: 192 / 30 = 6.4
```

## Health Status Bands

| Range | Status | Action |
|-------|--------|--------|
| 8.0-10.0 | Healthy | Ship with confidence |
| 6.0-7.9 | Caution | Fix all P0s before shipping |
| 4.0-5.9 | At risk | Significant work needed before release |
| 0.0-3.9 | Critical | Do not ship — foundational issues |

## Severity Definitions

| Severity | Name | Definition | Response |
|----------|------|------------|----------|
| P0 | Blocker | Data loss, wrong verse text, XSS vector, broken navigation. App fundamentally broken for some users. | Fix immediately. Blocks any release. |
| P1 | Critical | Broken feature, offline failure, security gap. Core functionality impaired. | Fix before next release. |
| P2 | Warning | Degrades user experience, tech debt, maintainability issue. Works but poorly. | Plan for upcoming sprint. |
| P3 | Info | Improvement opportunity, nice-to-have, future-proofing. | Backlog candidate. |

## Severity Calibration Rules

These rules are hard constraints, not guidelines. Both subagents and the orchestrator must apply them.

### P0 Hard Requirements

A finding can only be P0 if it demonstrates **one of these in existing code**:
- Data loss (user marks, positions, or settings destroyed or corrupted)
- Wrong verse text (incorrect Arabic, wrong translation, mismatched verse numbers)
- XSS vector (untrusted input reaching `innerHTML`, `eval`, or DOM attributes)
- Broken navigation (user cannot reach a surah/verse that should be accessible)

If the finding does not demonstrate one of these with a code excerpt, it cannot be P0 regardless of how important it feels.

### P1 Hard Requirements

A finding can only be P1 if it demonstrates **one of these in existing code**:
- A broken feature (core functionality that exists but fails under normal use)
- Offline failure (PWA offline path that doesn't work when network is unavailable)
- Exploitable security gap (a concrete attack vector with a code path, not a theoretical concern)

### The Absence Test

If a finding starts with "No [tool/service/feature]..." or describes something that **doesn't exist** rather than something that **is wrong**, it is an *absence*, not a *defect*.

**Absences are capped at P2** unless the missing thing directly enables data loss, XSS, wrong verse text, or broken navigation in existing code.

Examples:
- "No Sentry integration" → P2 (absence of a tool, not a defect)
- "No performance monitoring" → P2 (absence)
- "No input validation on verse rendering path" → P0 (absence directly enables wrong text or XSS)
- "No error boundary in app init" → P1 (absence directly enables broken app state)

The key question: *Does existing code have a bug, or does missing code leave a gap?* Bugs can be any severity. Gaps are capped at P2 unless they directly enable a P0/P1 condition.

### Weight-Severity Coherence

A dimension's weight signals its urgency ceiling. If a weight-1 dimension (e.g., Observability) produces P0 findings, this is a red flag. The orchestrator must review and justify or downgrade. A dimension the team has explicitly deprioritized ("acceptable to fly blind short-term") should not produce findings that block a release.

## Scoring Guide

| Score | Meaning |
|-------|---------|
| 0-2 | Non-existent or fundamentally broken |
| 3-4 | Major gaps. Core functionality exists but unreliable or incomplete |
| 5-6 | Functional but significant issues. Works on happy path, fails on edge cases |
| 7-8 | Solid. Works well with minor improvements needed |
| 9-10 | Excellent. Best-practice level implementation |

## Not-Assessable Scoring Rule

Not-assessable items (modules that don't exist yet, features deferred to future phases) are **excluded from the score denominator**.

- A dimension with 18 checklist items where 4 are not-assessable is scored against 14 assessable items
- The subagent must state the denominator in its score justification: "Scored 7/10 against 14 assessable items (4 not-assessable: Phase 2/3 modules)"
- The orchestrator must note dimensions with >50% not-assessable items — the score is based on a small sample and may not be representative
- Not-assessable is NOT a passing grade — it means "cannot be evaluated yet." The items remain on the checklist for future audits

## Confidence Weighting

Each subagent reports a confidence level (high/medium/low). The orchestrator must:

- **High confidence** — Subagent read all relevant source files. Score is trustworthy.
- **Medium confidence** — Subagent sampled key files but wasn't exhaustive. Score is directional.
- **Low confidence** — Key files were inaccessible or too large to fully review. Score is unreliable.

If a subagent reports low confidence, the orchestrator must note this prominently in the report. A low-confidence score of 8 is less trustworthy than a high-confidence score of 6.

## Cross-Dimensional Analysis Rules

1. **Same finding, multiple dimensions** — If the same issue (same file, same code) appears in 2+ dimensions, the orchestrator MAY escalate severity by one level but MUST justify the escalation with a sentence explaining why the cross-dimensional nature increases the risk. Mechanical escalation without justification is not permitted.

2. **Contradictory scores** — If one dimension scores an area 8+ while another finds P1 issues in the same area, flag the discrepancy. Lower score wins — evidence of problems overrides absence of evidence.

3. **Systemic patterns** — If 3+ dimensions flag the same module or pattern, this is an architecture-level concern for the cross-cutting observations section.

## Effort Estimates (for Recovery Plan)

| Size | Meaning |
|------|---------|
| S | Under 1 hour — point fix, single file change |
| M | 1 hour to 1 day — multi-file change, requires testing |
| L | More than 1 day — refactor, new module, significant testing |
