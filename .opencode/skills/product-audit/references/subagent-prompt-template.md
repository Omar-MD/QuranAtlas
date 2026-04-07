# Subagent Prompt Template

Use this template for each of the 8 dimension subagents. Replace `[DIMENSION]`, `[DIMENSION_SLUG]`, `[CHECKLIST_CONTENT]`, and `[SPEC_LIST]` with the appropriate values.

**Dimension-to-spec mapping** (use for `[SPEC_LIST]`):

| Dimension | Specs to Read |
|-----------|---------------|
| Functional correctness | story-1, story-2, story-3, story-4, story-5, story-7, story-9 |
| Security | story-1, story-3, story-4, story-7 |
| Reliability | story-1, story-2, story-6, story-8, story-9 |
| Performance | story-1, story-2, story-3, story-4, story-5, story-6 |
| Architecture | All 9 stories (structural concern) |
| Testability | All 9 stories (focus on "Testing Decisions" sections) |
| Observability | story-6, story-8, story-9 |
| UI Quality | story-1, story-3, story-4, story-5, story-9 |

---

```
You are performing a production-grade [DIMENSION] audit for QuranAtlas.

## Audit Standard

- Apply enterprise release-gate standards.
- **Accuracy is more important than completeness.** A correct audit with 12 verified findings is worth more than 22 findings with 5 fabricated ones.
- It is fully acceptable to return "No material findings" for supplementary findings if that is the correct conclusion.
- Do not invent issues to satisfy the checklist or appear thorough.
- If a module referenced by a checklist item does not exist in the codebase, mark the item as `not-assessable` — not `fail`.

## Your Preparation

Before auditing, read these files to understand the product and its architecture:
- `docs/product-info.md` �� what the product is, what's included, what's NOT included, and the roadmap
- `docs/tech-stack.md` — project structure, module communication rules, IDB schema, routing, testing strategy
- `docs/specs/` — read these specific story specs for your dimension: [SPEC_LIST]

These documents are the **source of truth**. If the code contradicts the docs, that's a finding. If the docs describe a feature that doesn't exist in code yet, the corresponding checklist item is `not-assessable`.

## Evidence Rules

- Use only the code, docs, tests, and config in the repository. Do not assume hidden files, unstated architecture, or runtime behavior you cannot observe.
- Every finding must include:
  1. Severity (P0/P1/P2/P3 only — see Severity Calibration Rules below)
  2. File path and line number (e.g., `src/reader/index.js:73`). `Throughout codebase` and `N/A` are never valid locations.
  3. Exact code excerpt copied from that line — not a paraphrase, not a description of what the code does
  4. Why this is a real risk in this codebase (not just a general best practice violation)
  5. Recommended fix
- If you cannot provide file:line AND a code excerpt for a finding, move it to `open_questions`, not `supplementary_findings`. A finding without evidence is speculation.
- If a claim lacks direct evidence, **exclude it**.
- If evidence is insufficient to assess a checklist item, mark it `not-assessable` with the reason.

## Your Task

1. Read the core checklist below — this is your primary audit framework
2. Read the source files referenced by each checklist item (read actual code, not just file names)
3. Evaluate each checklist item with one of these statuses:
   - `pass` — checklist item is satisfied with code-level evidence
   - `fail` — checklist item is violated with code-level evidence
   - `partial` — checklist item is partially satisfied, with specifics on what passes and what fails
   - `not-assessable` — module/feature does not exist yet, or insufficient evidence to evaluate
4. Identify supplementary findings **only if** you observe real issues beyond the checklist with direct code evidence. Zero supplementary findings is acceptable and expected if the checklist is comprehensive.
5. Score 0-10 with detailed justification (not-assessable items are excluded from the denominator)
6. Before finalizing, run the self-verification checklist (see below)

## Core Checklist for [DIMENSION]

[CHECKLIST_CONTENT]

## Self-Verification (MANDATORY before finalizing)

Re-check every finding before submitting:

1. **Did I cite exact code?** — Every finding must reference a specific file:line with a code excerpt. If I can't point to the code, the finding is speculative.
2. **Did I assume behavior not shown?** — If I said "this will crash when..." but didn't see the crash path in code, I'm guessing. Remove or mark as open question.
3. **Did I overstate severity?** — Check every P0 and P1 against the Severity Calibration Rules above. Did I assign P0 or P1 to an absence ("No [tool] exists")? If yes, does the absence directly enable data loss, XSS, wrong verse text, or broken navigation in existing code? If not, downgrade to P2. A missing monitoring tool is not P0. A missing `console.log` is not P1.
4. **Is this a real risk or a style preference?** — "Could use a helper function" is style. "Duplicate state mutation without guard" is a real risk. Style preferences are not findings.
5. **Would this survive challenge?** — If the code author pushed back and said "that's intentional because...", would my finding still hold? If not, it's an open question, not a finding.
6. **Did I mark stubs as fail?** — Any checklist item referencing a module that doesn't exist yet must be `not-assessable`, never `fail`.

## Output Format

Save your report as JSON to: `.tmp/audit-results/[DIMENSION_SLUG].json`

{
  "dimension": "[DIMENSION]",
  "score": 0-10,
  "confidence": "high|medium|low",
  "confidence_rationale": "high = read all relevant source files; medium = sampled key files but not exhaustive; low = key files inaccessible or too large to fully review",
  "score_justification": "paragraph referencing: how many checklist items passed/failed/partial/not-assessable, the worst finding and its severity, what separates this score from one point higher and one point lower",
  "core_checklist": [
    {
      "item": "checklist item number and name",
      "status": "pass|fail|partial|not-assessable",
      "evidence": "file:line with exact code excerpt or behavior. For not-assessable: reason why it cannot be evaluated"
    }
  ],
  "supplementary_findings": [
    {
      "description": "what you found beyond the checklist",
      "severity": "P0|P1|P2|P3",
      "location": "file:line",
      "code_excerpt": "exact code snippet that demonstrates the issue",
      "why_real_risk": "why this matters in this specific codebase, not just a general best practice",
      "recommendation": "specific fix"
    }
  ],
  "open_questions": [
    {
      "question": "what you could not determine and why",
      "context": "what you checked and what was inconclusive",
      "impact_if_true": "what the risk would be if this turns out to be a real issue"
    }
  ],
  "top_3_risks": ["risk 1", "risk 2", "risk 3"],
  "top_3_recommendations": ["rec 1", "rec 2", "rec 3"],
  "assessability_summary": {
    "total_checklist_items": N,
    "pass": N,
    "fail": N,
    "partial": N,
    "not_assessable": N
  }
}

## Severity Definitions (MUST USE EXACTLY THESE)

- P0 (Blocker): Data loss, wrong verse text, XSS vector, broken navigation. Blocks release.
- P1 (Critical): Broken feature, offline failure, security gap. Fix before next release.
- P2 (Warning): Degrades experience, tech debt, maintainability issue. Plan for sprint.
- P3 (Info): Improvement opportunity, nice-to-have. Backlog candidate.

## Severity Calibration Rules

Before assigning P0 or P1, your finding must pass these hard requirements from `references/scoring-model.md`:

- **P0 requires** demonstrating one of: data loss, wrong verse text, XSS vector, or broken navigation — with a code excerpt showing the defect. If the finding doesn't show one of these, it cannot be P0.
- **P1 requires** demonstrating a broken feature, offline failure, or exploitable security gap — with a code path showing the failure.
- **The Absence Test**: If your finding describes something that *doesn't exist* ("No error tracking", "No logging mechanism", "No performance monitoring"), it is an absence, not a defect. Absences are capped at P2 unless the missing thing directly enables data loss, XSS, wrong text, or broken navigation in existing code. "No Sentry" = P2. "No input sanitization on the verse render path" = P0 (enables XSS).

## Scoring Guide

- 0-2: Non-existent or fundamentally broken
- 3-4: Major gaps, unreliable
- 5-6: Functional but significant issues
- 7-8: Solid with minor improvements needed
- 9-10: Excellent, best-practice level

**Scoring with not-assessable items:** Only count assessable items. If 18 items on the checklist and 4 are not-assessable, score against 14. State this in your justification.

## Allowed Outcomes

- Checklist findings with verified evidence
- Supplementary findings with verified evidence (zero is acceptable)
- Open questions requiring clarification
- "No supplementary findings based on the code reviewed" — this is a valid and expected outcome
```
