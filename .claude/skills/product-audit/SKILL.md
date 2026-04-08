---
name: product-audit
description: "EXPLICIT TRIGGER ONLY — invoke this skill only when the user explicitly says /product-audit or literally asks to 'run a product audit'. Do NOT auto-trigger for general questions about code quality, health, readiness, or assessments. This skill spawns 8 parallel subagents and is very expensive; never invoke speculatively."
---
# Product Audit — QuranAtlas

## Overview

A structured, multi-dimensional audit that spawns 8 parallel specialist subagents, each scoring their dimension 0-10 against a core checklist with code-level evidence. An orchestrator cross-analyzes all reports, verifies findings, calculates a weighted health score, and generates a prioritized recovery plan with a gate decision.

**Core principle:** Accuracy over completeness. A correct audit with 12 verified findings is worth more than 22 findings with 5 fabricated. No score without code-level evidence.

## When to Use

- User says "run a product audit", "health check", "codebase assessment"
- User asks about readiness for a new phase or release
- User wants a structured multi-dimensional analysis
- User asks "how healthy is this codebase?" or "what needs fixing?"

**Do NOT use for:** Single-file reviews, PR reviews, or quick "is this OK?" questions. Use Full Audit for first-time or periodic assessment. Use Follow-Up Audit to verify fixes after a full audit.

## The Iron Law

**Full Audit: NO audit without all 8 dimensions.** A security issue may also be a reliability issue. Your job is the complete picture.

**Follow-Up Audit:** Re-audit only dimensions that had P0/P1 findings in a previous full audit. Produces a delta report. See "Follow-Up Audit Mode" section below.

**No exceptions to full audit:**
- Not for "quick passes" — quick passes miss cross-dimensional issues
- Not for "just one dimension" — isolated audits create blind spots
- Not for "everything else is fine" — that's exactly what you need to verify
- Not for "we're in a hurry" — a partial audit is worse than no audit (false confidence)

## Full Audit Flow

### Step 0: Pre-Audit Setup

Before spawning subagents:

1. Capture `git rev-parse --short HEAD` — this is the commit being audited
2. Read `docs/product-info.md` and `docs/tech-stack.md` — the orchestrator needs product context to validate subagent reports later
3. Check `docs/audit/` for previous audit reports — if one exists, note it for the delta section
4. Read `references/subagent-prompt-template.md` and all 8 checklist files — you need these to construct subagent prompts in Step 1

### Step 1: Spawn 8 Subagents in Parallel

Spawn all 8 simultaneously — do NOT wait for one to finish before starting the next. Each subagent gets the prompt template from `references/subagent-prompt-template.md` with the dimension-specific checklist inserted and the correct spec list from the dimension-to-spec mapping table in that template.

**Dimension-to-slug mapping:**

| Dimension | Slug | Checklist File |
|-----------|------|----------------|
| Functional correctness | functional-correctness | checklists/functional-correctness.md |
| Security | security | checklists/security.md |
| Reliability | reliability | checklists/reliability.md |
| Performance | performance | checklists/performance.md |
| Architecture | architecture | checklists/architecture.md |
| Testability | testability | checklists/testability.md |
| Observability | observability | checklists/observability.md |
| UI Quality | ui-quality | checklists/ui-quality.md |

**How to spawn subagents:**

1. For each of the 8 dimensions:
   a. Read the corresponding checklist file from the table above
   b. Look up the spec list from the dimension-to-spec mapping in `references/subagent-prompt-template.md`
   c. Fill the template placeholders: `[DIMENSION]`, `[DIMENSION_SLUG]`, `[CHECKLIST_CONTENT]`, `[SPEC_LIST]`
   d. Use the filled template as the `prompt` parameter in an Agent tool call
2. Make all 8 Agent tool calls in a **single message** (parallel execution)
3. Each Agent tool call returns the subagent's JSON report directly as its return value — no file I/O needed

### Step 2: Collect Results and Handle Failures

Each Agent tool call returns the subagent's report directly. Check each result:

- **Success** — The return value contains valid JSON with `dimension`, `score`, `core_checklist`, and `assessability_summary` fields. Collect it.
- **Failure** — The return value is empty, an error message, or missing required fields. Respawn that single dimension with the same prompt. If it fails a second time, flag that dimension as incomplete.
- **3+ incomplete dimensions** — ABORT the audit and tell the user. Partial results are misleading.
- **1-2 incomplete dimensions** — Proceed but prominently flag the gaps in the report.

### Step 3: Cross-Analyze Findings

Read all completed reports and perform:

1. **Deduplication** — If the same finding (same file, same issue) appears in multiple dimensions, merge into a single entry. Tag it as "cross-dimensional" and note which dimensions flagged it. Use the highest severity assigned by any dimension.

2. **Overlapping issues** — Same root cause manifesting differently across dimensions. Group these under a systemic pattern.

3. **Contradictions** — One dimension scores high while another finds critical issues in the same area. The lower score wins — evidence of problems overrides absence of evidence.

4. **Systemic patterns** — 3+ dimensions flag the same module or pattern → architecture-level concern for cross-cutting observations.

5. **Shallow report detection** — If a subagent marked 0 items as `fail`, has 0 supplementary findings, AND reported confidence as "medium" or "low" — flag this report as potentially shallow. Note it in the report.

6. **Severity consistency** — ALL findings must use ONLY P0/P1/P2/P3 labels. Convert any other labels.

7. **Absence-vs-defect triage** — Classify each P0/P1 as either a *defect* (something wrong in existing code) or an *absence* (something that doesn't exist). Apply the Absence Test from `references/scoring-model.md`: absences are capped at P2 unless the missing thing directly enables data loss, XSS, wrong text, or broken navigation. "No Sentry" is an absence → P2. "No input validation on verse rendering" is an absence that enables wrong text → P0.

8. **Weight-severity coherence** — If a weight-1 dimension (e.g., Observability) produces P0 findings, this is a red flag. The dimension's own weight signals its urgency ceiling — a dimension the team explicitly deprioritized should not produce release-blocking findings unless the finding meets P0 hard requirements from `references/scoring-model.md`.

### Step 4: Orchestrator Verification (MANDATORY)

Before calculating scores, the orchestrator MUST verify every P0 and P1 finding. This step produces visible artifacts — if the report has no "Orchestrator verified" fields, verification was skipped.

**For each P0 and P1 finding**, read the actual file:line referenced and produce one of three outcomes:

- **Confirmed** — Code exists at the cited location, matches the claim, and severity is justified. Add to the finding: `Orchestrator verified: Yes — [brief note on what was confirmed by reading the file]`
- **Downgraded** — Code exists but severity is overstated (e.g., an absence classified as P0 that doesn't meet P0 hard requirements). Change severity, note the original: `Orchestrator verified: Downgraded from P0 to P2 — [reason]`
- **Rejected** — Code doesn't exist at the cited location, doesn't say what was claimed, or the finding is an absence that doesn't meet severity requirements. Remove from Critical Findings. Add to a "Rejected Findings" note in the methodology section.

**Reliability check**: If >30% of a subagent's P0/P1 findings are rejected, flag that dimension's report as unreliable in the methodology section. The dimension score should be treated with skepticism.

**Additional verification checks:**

1. **Score-finding consistency** — If a subagent gave a score of 8+ but reported a P1 finding, flag the inconsistency. An 8+ score with a P1 finding is suspicious — either the score is inflated or the P1 is overstated.

2. **Math verification** — Recalculate all weighted scores. Do not trust subagent arithmetic.

3. **Open questions aggregation** — Collect all `open_questions` from subagent reports. These go in the report's Open Questions section.

4. **Not-assessable audit** — If any dimension has >50% items as `not-assessable`, note this prominently. The dimension score is based on a small sample and may not be representative.

### Step 5: Calculate Weighted Scores

Use `references/scoring-model.md` for weights, formula, health bands, severity definitions, and not-assessable scoring rules.

### Step 6: Generate Recovery Plan

Prioritize by severity, then by dimension weight (highest first):

1. **Phase 1: Stop the bleeding** — All P0 findings (with effort estimate: S/M/L)
2. **Phase 2: Stabilize** — All P1 findings (with effort estimate: S/M/L)
3. **Phase 3: Strengthen** — All P2 findings (grouped by theme)
4. **Phase 4: Optimize** — All P3 findings (grouped by theme)

**Effort estimates:** S = under 1 hour, M = 1 hour to 1 day, L = more than 1 day.

Each Phase 1 and Phase 2 finding must include: what to fix, where (file:line), why it matters, how to fix, and effort estimate.

### Step 7: Write the Report

Use `references/report-template.md` as the structure. Before saving, verify every required section is present:

- [ ] Executive Summary (score + gate decision + P0/P1/P2/P3 counts)
- [ ] Methodology table (items, assessable, not-assessable, confidence per dimension)
- [ ] Dimension Scores table (score, weight, weighted, status per dimension)
- [ ] Delta from Previous Audit (or "First audit — no delta available")
- [ ] Critical Findings — each with `Orchestrator verified` field
- [ ] All Findings Summary table
- [ ] Not Assessed table (modules/features that couldn't be evaluated)
- [ ] Open Questions (aggregated from all subagents)
- [ ] Recovery Plan (Phase 1-4 with effort estimates S/M/L on each P0/P1)
- [ ] Cross-Cutting Observations (patterns, architecture risks, strengths, phase readiness)
- [ ] Gate Decision with rationale

Missing section = incomplete audit. Do not save until all sections are present.

**Output path:** Run `mkdir -p docs/audit` then save to: `docs/audit/YYYY-MM-DD-product-health-report.md`

### Step 8: Gate Decision

Based on the audit results, declare one of:

- **PASS** — No P0 findings. P1 findings are acceptable for current phase. Ship with confidence.
- **CONDITIONAL** — P0 findings exist but are fixable. List conditions that must be met before shipping.
- **FAIL** — Systemic P0 issues, multiple critical dimensions below 4.0, or 3+ dimensions with P1 findings. Do not ship.

---

## Follow-Up Audit Mode

Use when the user wants to verify fixes after a previous full audit.

**Trigger detection:** Use follow-up mode (not full audit) when the user's request contains any of:
- "follow-up audit", "follow up", "re-audit", "delta audit"
- "verify fixes", "check if fixed", "did the fixes work"
- "compare to previous", "compare to last audit"
- Reference to a specific previous audit report file

If ambiguous, ask the user: "Would you like a full audit or a follow-up comparing to [most recent report]?"

**Prerequisites:**
- A previous full audit report must exist in `docs/audit/`
- The user specifies which report to compare against (or use the most recent)

**Process:**
1. Read the previous audit report
2. Identify dimensions that had P0 or P1 findings
3. Re-audit ONLY those dimensions using the same checklists and subagent prompt
4. For each previously-reported P0/P1 finding: verify whether it is now resolved, still present, or partially addressed
5. Produce a delta report (not a full report) with:
   - Previous score → current score per re-audited dimension
   - Findings resolved (with evidence of the fix)
   - Findings still open
   - New findings discovered during re-audit
   - Updated gate decision

**Follow-up audit does NOT:**
- Produce a new overall weighted health score (only the full audit does)
- Re-audit dimensions that had no P0/P1 findings
- Replace the need for periodic full audits

---

## Report Management

- Reports accumulate in `docs/audit/`. Keep the most recent full audit and most recent follow-up audit. Older reports can be deleted at the user's discretion.
- If a same-day full audit report already exists, append `-v2`, `-v3`, etc. to the filename (e.g., `2026-04-07-product-health-report-v2.md`).
- Follow-up reports use the suffix `-followup` (e.g., `2026-04-07-product-health-followup.md`).

---

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "Just a quick pass" | Quick passes miss cross-dimensional issues. You need the full picture. |
| "Everything else is fine" | That's exactly what you need to verify, not assume. |
| "Not enough time for all 8" | A partial audit gives false confidence. All 8 or don't call it an audit. |
| "This dimension looks clean" | "Looks clean" without code-level evidence is not an audit. |
| "The user only asked about X" | The user may not know about hidden risks. Complete picture is your job. |
| "I'll do the others later" | Later never comes. Do all 8 now. |
| "Severity labels don't matter" | Inconsistent labels break recovery plan prioritization. ONLY P0-P3. |
| "I verified the findings mentally" | Mental verification is not verification. Read the actual file:line. Step 4 is mandatory. |
| "The subagent seems thorough" | Trust but verify. Subagents hallucinate. Spot-check ALL P0/P1 evidence. |

## Red Flags — STOP and Restart

- Skipping any of the 8 dimensions (full audit)
- Giving a score without code-level evidence (file:line references)
- Using ANY severity labels other than P0/P1/P2/P3
- Not calculating the weighted overall score
- Not including cross-dimensional analysis
- Writing a narrative report instead of structured findings
- Proceeding with 3+ missing dimension reports
- Skipping the orchestrator verification step (Step 4)
- Not reading file:line references for P0/P1 findings
- Publishing a gate decision without completing all prior steps

## Common Mistakes

1. **Shallow analysis** — Reading file names without reading file contents. Fix: Actually read source code.
2. **Inventing findings** — Fabricating issues to appear thorough. Fix: Zero supplementary findings is acceptable. Accuracy > completeness.
3. **No evidence** — "Security looks good" without citing files. Fix: Every score needs file references.
4. **Wrong severity** — Calling a P3 a P1. Fix: Use severity definitions from scoring-model.md exactly.
5. **No cross-analysis** — Concatenating 8 reports without synthesizing. Fix: Look for overlaps, contradictions, systemic patterns.
6. **Stale context** — Auditing against assumptions instead of reading current code and docs. Fix: Read `docs/product-info.md` and `docs/tech-stack.md` first.
7. **Marking stubs as failures** — Phase 2/3 modules that don't exist yet are `not-assessable`, not `fail`.
8. **Skipping verification** — Trusting subagent findings without reading the cited code. Fix: Step 4 is mandatory for all P0/P1.
9. **No deduplication** — Same finding counted multiple times across dimensions. Fix: Merge duplicates in Step 3.
