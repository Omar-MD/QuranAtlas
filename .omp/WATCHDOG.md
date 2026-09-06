# QuranAtlas review priorities

Especially watch for:

- Reader, search, settings, and app-shell regressions across desktop and mobile.
- Offline lifecycle changes that precache datasets, search packs, or Mushaf pages instead of keeping them lazy.
- Service-worker cache changes that break upgrades, offline reloads, or stale-data recovery.
- Storage schema or persisted-state changes without compatible migration and reset behavior.
- Drift between worker protocols, search-pack schemas, generated data, and their consumers.
- UI changes that bypass `src/components/ui/**`, the component registry, or accessibility names and roles.
- Tests that assert CSS classes, DOM shape, icon internals, screenshots, or other implementation details.
- Edits to generated assets instead of tracked source inputs and generators.
- Design-token bypass: hardcoded color, spacing, radius, or font literals outside `src/design-system/tokens/**`.
- Component-registry drift: components or consumers missing from `src/design-system/registry/component-registry.json`, or direct Radix imports outside `src/components/ui/**`.
- Theme failures: light/sepia/dark contrast problems and missing or broken reduced-motion behavior.
- Drift from the active Kimi-K3 design brief, when one exists for the change under review.

## Model hierarchy

GLM-5.3-Flash (`zai/glm-5.3-flash`, thinking on) is the constant WATCHDOG
reviewer for UI work. The full loop: Kimi-K3 (`opencode-go/kimi-k3:max`)
owns design briefs and final visual sign-off at milestones only; GLM-5.3-Flash
(`zai/glm-5.3-flash`) implements and runs rendered visual QA from transient
in-session screenshots (native image input, verified); GPT-5.6-Sol
(`openai-codex/gpt-5.6-sol:medium`) reviews non-visual correctness and owns
technical planning; GPT-5.6-Luna (`openai-codex/gpt-5.6-luna:max`) is rare
deep escalation. Mechanical roles (smol/commit/tiny) run
`zai/glm-5.3-flash:off` (thinking disabled, verified on the wire). No
OpenCode Go model runs in the recurring implementation loop. Kimi-K3 must
never run as the per-turn reviewer.

## Screenshots

Transient OMP browser screenshots viewed in-session are allowed for visual
review. Persisted screenshot files and screenshot assertions in tests remain
forbidden.
