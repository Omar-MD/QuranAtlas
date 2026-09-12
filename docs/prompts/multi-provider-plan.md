# Multi-Provider Planning Prompt

Use this prompt with a new work request, an existing specification, or a draft
plan. It produces a reviewable master specification and independent task
packages that can be handed to different IDEs and model providers.

The role assignments are capability-informed preferences, not universal model
rankings. They are based on the following current references:

- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model)
  describes GPT-6 Astra's instruction following, long-task coherence, and
  thorough testing behavior.
- [Kimi K2.5 technical blog](https://www.kimi.com/en/blog/kimi-k2-5) describes
  native vision, frontend development, visual debugging, and image/video-to-code.
- [Kimi K3 technical blog](https://www.kimi.com/en/blog/kimi-k3) describes
  native vision, long-horizon coding, and knowledge work.
- [Z.AI GLM-5.3 documentation](https://docs.z.ai/guides/llm/glm-5.3) describes
  complex software engineering, terminal workflows, and long-horizon agent
  tasks.

The exact model and IDE must still be verified before each assignment. In
particular, do not assume that a separately named “GLM-5.3 Plus” model exists,
and resolve “Kimi K” to the model actually available in the selected IDE.

## Prompt

```text
Turn the work described below into a reviewable master specification and an
execution plan that I can distribute manually across multiple IDEs and model
providers.

If I supply an existing specification or plan, assess and refine it. If I
supply only an idea or work request, develop the specification first.

Your assignment is planning only. Do not implement changes, launch agents,
install skills, or dispatch work. Present the proposed specification and task
breakdown for my confirmation before creating or modifying files.

Read the repository’s AGENTS.md and inspect the relevant current source before
planning. Follow its project constraints and shared-artifact conventions.

MODEL RESPONSIBILITIES AND ALLOCATION RATIONALE

Allocate work using the following preferred roles. These assignments combine
documented capabilities with my workflow preferences. They are not universal
rankings, and they do not authorize any agent to expand its scope.

Identify the actual model version and IDE before releasing an assignment. Do
not transfer capability claims from one model version to another without
evidence. Do not invent model identifiers or silently substitute models.

1. KIMI — VISUAL ANALYSIS AND DESIGN SPECIFICATION

Why this role:
Kimi’s documented visual understanding and reference-driven frontend
capabilities make it a suitable choice for interpreting visual inputs and
turning design intent into an implementation-ready specification.

Preferred scope:
- Consume the accepted audit, user goals, current UI, and design-system rules.
- Translate identified usability problems into design requirements.
- Develop visual direction: palette, typography, spacing, hierarchy, density,
  layout, and appropriate motion.
- Explain how each major choice addresses a requirement or audit finding.
- Produce a precise brief another model can implement without needing access
  to Kimi’s conversation.

Required deliverables:
- Traceability from audit finding to proposed design response.
- Concrete token values and their semantic uses.
- Existing approved components to reuse and explicit proposed additions.
- Layout and responsive behavior for the affected screens.
- Relevant loading, empty, error, offline, disabled, selected, and focus states.
- Accessibility requirements and testable visual acceptance criteria.
- A clear distinction between mandatory decisions and optional suggestions.

For QuranAtlas, account for Arabic and right-to-left content, reading comfort,
mobile and desktop use, and offline states. Preserve the repository’s design
system and content constraints.

Boundaries:
Kimi proposes design decisions for my approval. It does not independently
change application behavior or implement production code in a design task. If
visual access is unavailable, disclose that limitation and identify which
judgments are based only on text.

2. Z AI / GLM — ENGINEERING AND UI IMPLEMENTATION

Why this role:
GLM-5.3’s documented emphasis on complex engineering, terminal workflows,
and sustained execution makes it a suitable implementation owner for
substantial work with established requirements.

Preferred scope:
- Implement approved designs using the existing component system.
- Implement application behavior, state management, data integration, offline
  behavior, and scoped engineering repairs.
- Investigate technical causes and choose implementation details within the
  approved requirements and file boundaries.
- Run the project’s appropriate checks and repair failures caused by its
  changes.

Required inputs:
- Approved assignment and observable acceptance criteria.
- Approved design brief when visual decisions are involved.
- Existing interface contracts, relevant source paths, and available data.
- Explicit write ownership and verification requirements.

Required deliverables:
- Working changes within the assigned boundaries.
- Verification results, including failures or checks that could not run.
- A concise explanation of material technical decisions.
- A handoff identifying changed files and remaining issues.

Boundaries:
A substantial task must still have one coherent outcome. Do not assign
“implement the whole project” merely because the model supports long tasks.
GLM may resolve routine technical details, but must surface missing product or
design decisions. Local verification remains its responsibility even when a
separate reviewer will follow.

3. OPENAI / GPT-6 ASTRA — AUDIT, SPECIFICATION REVIEW, AND QA

Why this role:
Astra’s documented instruction following, sustained task coherence, and
thorough verification make it a suitable choice for checking work against
explicit requirements and investigating discrepancies.

Preferred scope:
- Audit the relevant current code and rendered behavior before planning.
- Check specifications for contradictions, omitted states, ambiguous
  acceptance criteria, and hidden task dependencies.
- Independently review implementation against the approved assignment.
- Verify relevant behavior, accessibility, regressions, and design fidelity.
- Examine interactions across affected components where the change creates
  risk.

Required deliverables:
- Findings tied to a requirement, source location, or reproducible behavior.
- Expected versus observed behavior and practical impact.
- Severity and supporting evidence for each defect.
- An acceptance matrix: passed, failed, or not verified.
- A recommendation of accepted, changes required, or blocked.

Review discipline:
- Separate verified defects, suspected defects, and subjective preferences.
- Do not infer correctness from the implementer’s summary or test claims.
- Inspect the relevant code and perform appropriate independent checks.
- Use the approved design brief as the visual acceptance contract.
- Keep verification proportional to the change and follow repository rules.
- Report uncovered checks explicitly; absence of findings is not proof that
  untested behavior works.
- Review assignments do not authorize implementation repairs.
- I retain final acceptance and integration authority.

MODEL CAPABILITY AND IDE CAPABILITY ARE SEPARATE

For every assignment, record:
- Exact model and version, if confirmed.
- IDE or execution environment.
- Repository access and write permissions.
- Terminal and project-check access.
- Browser interaction and visual-input availability where required.
- Relevant locally available skills.
- Any missing capability that prevents completion.

Do not assume a capable model has access to the tools its task needs. A
reviewer without runtime access can review supplied evidence and code, but
cannot claim to have performed live QA.

Keep each IDE’s skills local. Shared assignments must express requirements in
ordinary language and must not depend on another IDE’s skill names.

TASK ROUTING

For a design change, the usual sequence is:
Astra audit → my acceptance of findings → Kimi brief → my design approval →
GLM implementation and local checks → Astra independent QA.

For a behavior-only engineering task, use an audit or specification review
when needed, then GLM implementation and Astra QA. Do not add a design stage
without a design decision to make.

For a review finding, create a bounded GLM repair assignment, followed by
targeted Astra reverification of the repair and its relevant effects.

All arrows represent manual handovers controlled by me. Do not dispatch agents
or start an automatic review loop.

INDEPENDENCE AND READINESS

Tasks may be sequential, but each must be independently executable when
released. A downstream task is not ready until its required inputs exist.

For each task:
- Identify the exact approved input artifacts and their versions.
- Record the relevant source baseline and any in-scope uncommitted changes.
- Give a fresh agent enough context to execute without another conversation.
- Define allowed changes, exclusions, outputs, and observable completion.
- Prevent overlapping write ownership among concurrent tasks.
- Mark missing inputs as release blockers rather than filling them with guesses.

ALLOCATION QUALITY

For each proposed model assignment, give one short reason connecting the
task’s actual demands to the model’s documented capability and available
tools.

Treat provider benchmarks as supporting evidence, not guarantees. Do not claim
one model is better at design, implementation, or review without comparable
evidence for that exact claim.

As completed work accumulates, use observed project results—design fidelity,
accepted changes, reproducible findings, rework, and execution time—to propose
improvements to this allocation. Any change to my preferred ownership requires
my approval.

REQUIRED OUTPUT

1. Readiness assessment
   Explain whether the supplied work is ready for specification, design,
   implementation, or review. Identify blocking decisions and missing inputs.

2. Master specification
   State the objective, requirements, scope, exclusions, constraints,
   relevant current-state evidence, and acceptance criteria.

3. Task allocation table
   For each task, show:
   - ID and title
   - Preferred provider responsibility and IDE, if known
   - Reason for that assignment
   - Inputs and required approval gates
   - Owned files or write boundaries
   - Deliverables
   - Acceptance checks
   - Whether it is ready now or waiting for named inputs

4. Copy-ready assignment for each ready task
   Include enough context for a fresh agent to execute it without this
   conversation: objective, approved requirements, input paths, scope,
   exclusions, allowed changes, verification, artifact destination, stop
   conditions, and handoff requirements.

   For tasks awaiting an audit, brief, or implementation, describe the task
   and its release gate. Do not pretend the missing input already exists.

5. Manual handover sequence
   Explain what I give each IDE, what I should receive back, what approval
   releases the next task, and which tasks can run concurrently.

6. Approval request
   Present the concrete decisions I need to confirm before artifacts are
   written or implementation begins.

WORK REQUEST OR EXISTING PLAN:
[Paste the new work, specification, or plan here.]

OPTIONAL CONTEXT:
[Available IDEs and model variants, relevant files, existing audits, design
preferences, constraints, and desired outcomes.]
```
