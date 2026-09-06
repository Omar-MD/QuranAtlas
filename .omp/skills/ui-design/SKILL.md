---
name: ui-design
description: QuranAtlas UI feedback-loop protocol — Kimi-K3 brief, GLM-5.3-Flash implementation, continuous GLM-5.3-Flash advisor review, GLM-5.3-Flash visual QA, Sol correctness, Kimi-K3 sign-off.
---

# UI feedback loop

Follow this exact sequence for QuranAtlas UI work. Roles resolve through
project `modelRoles` in `.omp/config.yml`; agents live in `.omp/agents/`.

1. **Brief (Kimi-K3 — `ui-director` agent, `ui_director` role).** Read the current
   live UI, `src/design-system/tokens/{primitives,semantic,tailwind-theme}.css`,
   `src/design-system/registry/component-registry.json`, and every relevant
   `src/components/ui/**` primitive before choosing a design. The brief
   specifies exact tokens, components, states, themes, viewports, and motion —
   zero choices left to the implementer.
2. **Advisor on.** For main-session UI implementation run `/advisor on`; the
   `ui-implementer` child enables its advisor automatically through
   `advisor: "@advisor"`.
3. **Implement (GLM — `ui-implementer`).** Applies the brief exactly. No
   independent color/spacing/type/animation decisions; a missing design choice
   is reported, not invented.
4. **Continuous review (GLM-5.3-Flash — WATCHDOG `DesignReview`).** Reviews
   code/design-system conformance against `.omp/WATCHDOG.yml` priorities while
   work proceeds.
5. **Visual QA (GLM-5.3-Flash — `ui-visual-reviewer`).** After each coherent
   screen-level change, reviews rendered pixels at 1280x900 and 375x812 with
   transient screenshots.
6. **Correctness review (Sol — `ui-correctness-reviewer`).** Runs only when
   behavior, state, or accessibility semantics changed. Never chooses styling.
7. **Final sign-off (Kimi-K3 — `ui-director`).** One final visual sign-off
   after all other findings are resolved. Then run `/advisor off` in the
   main session.

Escalation: only `slow` (GPT-5.6-Luna) for hard architecture/debug problems —
never for visual design. OpenAI seats stay out of visual-design decisions.
