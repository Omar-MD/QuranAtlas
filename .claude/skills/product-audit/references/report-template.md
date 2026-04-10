# Product Health Report Template

Use this exact structure for all audit reports.

```markdown
# QuranAtlas Product Health Report

**Date:** YYYY-MM-DD
**Commit:** [short hash from `git rev-parse --short HEAD`]
**Auditor:** Product Audit Skill v2
**Checklist version:** [total checklist items across all 6 dimensions]
**Previous audit:** [date and file path of previous audit, or "None — first audit"]

---

## Executive Summary

One paragraph: overall assessment, what's working, what's concerning.

**Weighted Overall Score: X.X / 10** — [Health Status: Healthy / Caution / At risk / Critical]

**Gate Decision: PASS / CONDITIONAL / FAIL**

[If CONDITIONAL: list the specific conditions that must be met before shipping]

- P0 count: N
- P1 count: N
- P2 count: N
- P3 count: N

---

## Methodology

| Dimension | Checklist Items | Assessable | Not Assessable | Confidence |
|-----------|----------------|------------|----------------|------------|
| Functional correctness | N | N | N | high/medium/low |
| Security | N | N | N | high/medium/low |
| UI Quality | N | N | N | high/medium/low |
| Architecture | N | N | N | high/medium/low |
| Reliability | N | N | N | high/medium/low |
| Performance | N | N | N | high/medium/low |
| **Total** | **N** | **N** | **N** | |

**Audit scope:** Full codebase audit against v4 checklists. [Note any incomplete dimensions here.]

---

## Dimension Scores

| Dimension | Score | Weight | Weighted | Status |
|-----------|-------|--------|----------|--------|
| Functional correctness | X/10 | 5 | X.X | [Healthy/Caution/At risk/Critical] |
| Security | X/10 | 5 | X.X | [status] |
| UI Quality | X/10 | 5 | X.X | [status] |
| Architecture | X/10 | 4 | X.X | [status] |
| Reliability | X/10 | 4 | X.X | [status] |
| Performance | X/10 | 3 | X.X | [status] |
| **Total** | | **26** | **XX.X / 260** | |

**Overall: X.X / 10**

Status thresholds: 8+ = Healthy, 6-7.9 = Caution, 4-5.9 = At risk, <4 = Critical

---

## Delta from Previous Audit

[If no previous audit exists, write "First audit — no delta available." and skip this section.]

| Dimension | Previous | Current | Change |
|-----------|----------|---------|--------|
| Functional correctness | X.X | X.X | +/-X.X |
| ... | | | |
| **Overall** | **X.X** | **X.X** | **+/-X.X** |

- P0 count: N → N (resolved: N, new: N)
- P1 count: N → N (resolved: N, new: N)

**Resolved findings:** [list of findings from previous audit that are now fixed]

**New findings:** [list of findings not in previous audit]

---

## Critical Findings (P0 + P1)

### [P0] Finding title

- **Dimension:** Dimension name (cross-dimensional: also flagged by X, Y)
- **Location:** `file:line`
- **Code excerpt:** `exact code that demonstrates the issue`
- **Evidence:** Specific behavior observed and why it's a risk in this codebase
- **Impact:** What happens if this is not fixed
- **Recommendation:** Specific, actionable fix
- **Effort:** S / M / L
- **Orchestrator verified:** Yes — [brief note on what was confirmed by reading the file]

[Repeat for each P0 and P1]

---

## All Findings Summary

| Severity | Count | Top Items |
|----------|-------|-----------|
| P0 | N | Brief description |
| P1 | N | Brief description |
| P2 | N | Brief description |
| P3 | N | Brief description |

---

## Enhancement Suggestions

> The following are improvement suggestions that do not affect dimension scores or the gate decision.

| # | Description | Dimension | Recommendation |
|---|-------------|-----------|----------------|
| 1 | [description] | [dimension] | [recommendation] |

**Note:** Enhancements are new capabilities not required by any current spec. They are tracked separately and do not count toward severity tallies or scoring.

---

## Not Assessed

[List modules and features that could not be assessed, with the reason.]

| Module / Feature | Reason | Checklist Items Affected |
|-----------------|--------|------------------------|
| `marks/editor.js` | Module not yet implemented (Phase 2) | Functional #5, #16, #17; Security #12 |
| ... | | |

**Impact:** N of N total checklist items were not assessable. Scores for affected dimensions are based on reduced denominators.

---

## Open Questions

[Aggregate all open_questions from subagent reports. These are things the audit could not determine.]

1. **[Question]** — [Context: what was checked and what was inconclusive] — Impact if true: [risk]
2. ...

---

## Recovery Plan

### Phase 1: Stop the bleeding (P0s)

1. **[Finding title]** (`file:line`) — Effort: S/M/L
   - Why: impact description
   - How: specific fix recommendation

[Repeat for each P0]

### Phase 2: Stabilize (P1s)

1. **[Finding title]** (`file:line`) — Effort: S/M/L
   - Why: impact description
   - How: specific fix recommendation

[Repeat for each P1]

### Phase 3: Strengthen (P2s)

[Grouped by theme if more than 5]

### Phase 4: Optimize (P3s)

[Bulleted list, grouped by theme if more than 5]

---

## Cross-Cutting Observations

### Patterns Across Dimensions

[Identify systemic issues that appear in multiple dimensions]

### Architecture-Level Risks

[Issues that affect the overall architecture, not just individual modules]

### Strengths

[What's working well — be specific with evidence]

### Phase Readiness Assessment

[Is the codebase ready for the next phase? What must be fixed first?]

---

## Incomplete Dimensions

[If any dimensions failed to complete, list them here with the reason. If all 6 completed, omit this section.]

---

## Gate Decision

**Decision: PASS / CONDITIONAL / FAIL**

**Rationale:** [1-3 sentences explaining the decision]

**Conditions for PASS (if CONDITIONAL):**
- [ ] [P0 finding that must be resolved]
- [ ] [P0 finding that must be resolved]

**Reviewed by:** _________________ (human reviewer sign-off)

---

*End of report.*
```
