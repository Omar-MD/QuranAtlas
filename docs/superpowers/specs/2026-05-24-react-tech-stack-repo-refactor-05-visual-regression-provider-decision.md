# React Tech Stack Refactor 05 - Visual Regression Provider Decision

## Status

Decision owner: React rebuild Wave 1.
Selected strategy: local Playwright screenshot baselines.
Provider snapshots are regression evidence only. They do not replace
`docs/ui-references/**`, the Svelte reference baseline, Storybook interaction
tests, Playwright journey tests, or accessibility gates.

## Context7 / Official Docs Appendix

| Candidate | Context7 library id | Query | Retrieved | Fallback source | Notes |
| --- | --- | --- | --- | --- | --- |
| Chromatic | `/websites/chromatic` | How does Chromatic handle Storybook visual testing, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review? | 2026-05-25 | none | Cloud service with Storybook, Playwright, Cypress, CI, PR comments, and baseline acceptance workflows. |
| Percy | `/websites/browserstack` | How does Percy handle Storybook or Playwright visual testing, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review? | 2026-05-25 | none | Context7 `Percy` search matched an unrelated TypeScript compiler, so `BrowserStack Percy` was used and resolved to BrowserStack docs. |
| Argos | `/argos-ci/argos` | How does Argos visual testing handle Playwright or Storybook screenshots, privacy, retention, deterministic assets, baseline updates, CI gating, and PR review? | 2026-05-25 | none | Open-source visual platform with Playwright/Storybook SDKs, screenshot upload/finalize APIs, and review workflow. |
| Loki | `/oblador/loki` | How does Loki handle Storybook screenshot visual regression, deterministic assets, baseline updates, CI gating, and local reproduction? | 2026-05-25 | none | Local/CI Storybook screenshot tool with update/test/approve workflow and checked-in references. |
| Playwright screenshots | `/microsoft/playwright` | How should Playwright screenshot baselines be configured for deterministic visual regression, baseline updates, CI gating, multiple viewports, and local reproduction? | 2026-05-25 | none | Built-in `toHaveScreenshot`, multi-project viewport config, per-assertion diff thresholds, and `--update-snapshots` baseline update flow. |

## Candidate Comparison

Score key: 3 = strong fit, 2 = workable with constraints, 1 = weak fit, 0 = blocker.

| Candidate | Privacy / retention | Local reproduction | Storybook support | Playwright route support | Determinism controls | CI / PR review | Cost / runtime | Risks | Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chromatic | Hosted upload; Quran/Mushaf screenshots would leave local repo, so retention/deletion needs approval before use | Weak local-only story review; strongest in hosted service | Strong Storybook visual, interaction, and accessibility support | Supports Playwright visual tests through hosted workflow | Good for managed baselines; deterministic assets still need seeded local data and font control | Strong PR comments and baseline acceptance | Hosted account/runtime cost | Hosted privacy/retention approval needed before Quran/Mushaf upload | 2 |
| Percy | Hosted BrowserStack/Percy upload; Quran/Mushaf screenshot scope needs approval | Local capture possible, but comparison/review is hosted | Supports static or live Storybook snapshot commands | Supports Playwright snapshots with `@percy/playwright` | Determinism depends on same-origin assets, stable fonts, and Percy capture settings | PR/build summaries and branch policy integration available | Hosted account/runtime cost | BrowserStack terms and retention policy must be approved before broad use | 2 |
| Argos | Hosted by default, but open-source/self-host path is possible to investigate | Workable if self-hosted or SDK output is reproducible | SDK support for Storybook noted | SDK/API support for Playwright screenshots and metadata | Screenshot metadata includes viewport, color scheme, browser, automation library, and thresholds | CI integrations and approve/reject workflow | Medium setup cost; self-hosting adds ops | Docs in Context7 emphasize APIs more than retention details; self-host decision needed | 2 |
| Loki | Local checked-in references; no hosted upload by default | Strong local reproduction from Storybook build/server | Strong Storybook-only support | Weak for app-route Playwright proof | References stored in repo; update/test/approve workflow | CI can require references | Low service cost; Storybook-only runtime | Does not cover React app routes/offline flows, so insufficient as first app-level gate | 2 |
| Playwright screenshot baselines | Local checked-in screenshots; retention is git history and branch cleanup | Strong local reproduction using existing Playwright stack | Indirect: can screenshot Storybook later through a local server if needed | Strong route support with existing Playwright skills and config | `toHaveScreenshot`, viewport projects, animation disabling, diff thresholds, stable same-origin assets | CI can block on `pnpm run visual:react`; baseline updates reviewed as code | Low additional dependency/runtime cost | Baseline review UX is less polished than hosted providers | 3 |

## Selected Strategy

Selected: local Playwright screenshot baselines.

Rationale:

- Local baselines keep Quran/Mushaf screenshots inside the repository and avoid hosted retention questions during early React parity work.
- Playwright can cover app routes, mobile and desktop viewports, deterministic fonts, and same-origin assets already used by QuranAtlas e2e.
- The strategy is reproducible through `pnpm run visual:react` and can later be replaced by a hosted provider if review ergonomics become more important than local-only privacy.

Rejected alternatives:

- Chromatic: strong Storybook review ergonomics, but hosted upload and retention require explicit approval before Quran/Mushaf screenshots leave local infrastructure.
- Percy: strong route/story support, but hosted upload and account/retention policy need a later approval gate.
- Argos: promising CI review flow and open-source posture, but selection depends on a self-hosting/retention decision outside this initial React parity gate.
- Loki: local Storybook screenshots are useful, but Playwright route coverage is the initial QuranAtlas app-level need.

## Privacy And Retention Policy

- Visual fixtures use deterministic QuranAtlas local assets only.
- Screenshots must not include real user data, account data, notes, tags, comments, or sync state.
- Quran/Mushaf screenshots are allowed only from committed same-origin baseline assets and seeded public-domain/product-approved text packs.
- Hosted uploads are limited to approved fixture routes/stories; no broad crawls.
- Retention/deletion follows the selected provider's documented policy; for local Playwright baselines, retention is normal git history and branch cleanup policy.
- If retention terms change or hosted upload scope expands, visual upload is blocked until this decision is updated.

## Baseline Update Policy

- Baseline updates require code review.
- Baseline updates must cite the changed component/story/route and the active visual-intent reference when one exists.
- Do not update baselines to hide broken fonts, missing dataset assets, layout overlap, inaccessible focus, or unintended product scope.
- React visual baselines are regression evidence only; `docs/ui-references/**` remains visual intent where present.
- Temporary local-proof-only baselines must name a promotion/removal condition and cannot satisfy cutover readiness.

## Initial Screenshot Scope

Storybook:

- `React Shell/App/Default` in mobile, tablet, desktop, light, sepia, dark.
- Future Level 1 primitives: default, focus-visible, disabled, loading/error where reachable.

Playwright routes:

- React shell root `/`.
- Svelte baseline fixture ids from the 02 appendix only as comparison references until React route parity exists.

Out of scope for initial visual gate:

- Remote upstream fetching.
- User-generated private data.
- Full Mushaf page pack sweeps.
- Removed mark/review/listen/audio branches.

## CI And Local Reproduction Plan

The stable local command is `pnpm run visual:react`.

Initial wiring uses `playwright.visual.react.config.js` and
`tests/e2e/react-visual/shell.spec.ts`, targeting the React dev server on
`127.0.0.1:5174`. Baseline updates use Playwright's reviewed
`--update-snapshots` flow and must be staged with the code or token change that
requires the visual change.
