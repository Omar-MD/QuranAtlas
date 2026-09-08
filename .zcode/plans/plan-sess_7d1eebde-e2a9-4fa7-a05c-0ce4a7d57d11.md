Fix the confirmed routing defect and reconcile the drifted documents. No application code (`src/**`) is touched.

## 1. Restore the `ui_implementer` role (the confirmed defect)
- In `.omp/config.yml` `modelRoles`, add `ui_implementer: zai/glm-5.3-flash:high`.
  - `:high` matches the existing `thinking: high` frontmatter in `ui-implementer.md` and the "heavy implementation" seat description; plain `zai/glm-5.3-flash` (no suffix, like `ui_visual`) is the alternative if you prefer relying on the agent's `thinking:` frontmatter.
- Verify dispatch afterwards with a probe (e.g. `.scratch/` smoke log pattern) confirming `ui-implementer -> zai/glm-5.3-flash` resolves.

## 2. Reconcile stale roster documents
- `QURANATLAS_DESIGN_SYSTEM_PLAN.md`: update `opencode-go/kimi-k3:max` → current config reality (`:high`), and replace the "continuous DesignReview advisor enabled" instruction with the current bounded/optional review policy (advisor disabled by default; enable one only as a bounded independent review).
- `AGENTS.md` + `.omp/WATCHDOG.md`: resolve the "Luna Max" reference — either drop the claim or note it exists only as the global `slow` role, since no project role maps to `openai-codex/gpt-5.6-luna:max`.
- Leave `~/.omp/agent/models.yml` (quantization pinning) untouched but add a short pointer in the config.yml fallback-chain comment or AGENTS.md noting that the native-or-lossless pinning is machine-local and must be restored from that file's documented filters if lost (keeps the contract discoverable from the repo without duplicating it).

## 3. Optional hardening (separate, only if you want it)
- Reduce roster duplication: keep model IDs authoritative in `.omp/config.yml` and reference roles (not literal model names) from AGENTS.md / WATCHDOG.md / ui-design skill where feasible, so future re-routes don't require multi-file sync.
- Decide the failover direction for Kimi seats once `OPENROUTER_API_KEY` is set: flip `ui_director`/`ui_visual` to the `openrouter/*` slugs so the existing fallback chains actually engage, and record that flip procedure in one place.