---
name: ui-design
description: QuranAtlas UI feedback loop — director design brief, implementer implementation, targeted independent review, visual review sign-off, and correctness review. Opt-in only: never auto-start; confirm seat models with the user first.
---

# UI feedback loop

Follow this sequence for QuranAtlas UI work. Roles resolve through
`modelRoles` in `.omp/config.yml` — the single source of model bindings;
never restate model IDs in skills, agents, or docs. Agents live in
`.omp/agents/`.

## Activation gate

- NEVER start this loop automatically because UI work was requested. Run it
  only when the user explicitly asks for the UI loop/design brief flow.
- Before starting, ask the user which model each seat should use (director,
  implementer, visual, correctness). Read the current `modelRoles` bindings
  from `.omp/config.yml` and present them concisely in the prompt — one line
  per seat, `role: model` — as defaults the user can accept or override per
  seat.
- Apply the user's choices as explicit per-task model overrides for that run
  only; never edit `.omp/config.yml`. "Use defaults" accepts the presented
  bindings.

1. **Brief (`ui-director`, `@ui_director`; one-shot).** The director owns
   the complete polish/design/style surface — every decision that changes
   how the product looks, reads, feels, animates, or responds perceptually
   (aesthetics, palette, tokens, typography, spacing, motion,
   interaction-state visuals, responsive behavior, page/screen designs,
   per-component implementation instructions — illustrative, not
   exhaustive). It runs a single self-contained pass per coherent design
   scope and writes durable briefs under `docs/design/**` — canonical
   system brief `docs/design/Design.md`, scoped companion briefs in
   `docs/design/briefs/` — specifying exact tokens, components, states,
   themes, viewports, and motion, with no design choice left to
   implementation. Iteration reads the written brief; the director is
   never re-engaged for the same scope.
2. **Implement/repair (`ui-implementer`, `@ui_implementer`).** Apply the
   director brief exactly. The implementer is the broad implementation seat,
   not a UI-only seat. Use `skill://ui-verify` and exercise the affected
   desktop/mobile states.
3. **Targeted independent review.** Advisors are off by default. Enable one
   only when it adds independent evidence not already produced by the
   implementer; use a bounded correctness review for behavior changes.
4. **Visual review/sign-off (`ui-visual-reviewer`, `@ui_visual`).** Review
   rendered pixels at 1280x900 and 375x812 with transient screenshots after
   coherent screen changes, judging the implementer's work against the
   director's written brief — it is the foundation for every visual
   judgment. At milestones return `approve` or concrete visual deltas.
5. **Correctness review (`ui-correctness-reviewer`, `@ui_correctness`).**
   Run only when behavior, state, persistence, routing, focus,
   accessibility, or TypeScript contracts changed. Never choose styling.

The main session remains the orchestrator (`default` role). It schedules
these seats and does not implement or make aesthetic decisions. Do not
enable a continuous advisor stream or duplicate a worker's reasoning.

UI boundaries: use `src/components/ui/**`, keep Radix imports inside that
layer, use design tokens instead of literals, persist no screenshots, and
verify desktop/mobile across all themes and reduced-motion states.
